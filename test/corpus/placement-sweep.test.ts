// SPDX-License-Identifier: EPL-2.0
// B6 sweep (mission 7d, T10, N10): the node placers (SIMPLE, INTERACTIVE, LINEAR_SEGMENTS, BRANDES_KOEPF,
// NETWORK_SIMPLEX), replayed through the real factories over every hierarchy level of every realworld/ptolemy model,
// hash the same canonical placement dump as the oracle's tools/vectors/LayeredPlacementVectors.java --sweep (written by
// tools/oracle/placement-sweep.sh to test/corpus/.placement-sweep/). Each ok case replays the `prefix` and `options` the
// oracle ran. Skipped with a message when the models dir or the sweep dir is absent. A hash that differs is diagnosed with `--dump <case id>`, never by
// touching the port, a helper or the canonical form.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import {
  isOk,
  isThrows,
  placementHash,
  placementSweepRow,
  readSweep,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type PlacementSweepOk,
  type SweepLine,
  type SweepThrows,
} from '../helpers/layered-placement-sweep.js';
import { importDumpOf } from '../helpers/layered-phase-replay-dump.js';
import type { Factories } from '../helpers/layered-phase-replay-ops.js';
import { placementDump } from '../helpers/layered-placement-replay-dump.js';
import { runPlacementPrefix } from '../helpers/layered-placement-replay-ops.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'PLACEMENT_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.placement-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/placement-sweep.sh';
const SWEEP_TIMEOUT_MS = 900_000;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ID_SEPARATOR = '/';

const models = resolveModelsDir();
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(RESULTS_FILE)
      ? undefined
      : `no oracle sweep at ${SWEEP_DIR}; run ${SWEEP_SCRIPT}`;

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/**
 * The sampling rule that keeps the sweep inside the ~5 minute budget: with stride N, a case runs when
 * (model index + strategy index) % N === 0, where the model index counts the sweep's models in file (sorted) order and
 * the strategy index is the strategy's position in `NodePlacementStrategy`. PLACEMENT_SWEEP_STRIDE=1 runs every case.
 */
const STRIDE_ENV = 'PLACEMENT_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;

function strategyIndex(line: SweepLine): number {
  const strategy = line.id.slice(line.id.lastIndexOf(ID_SEPARATOR) + 1);
  return NodePlacementStrategy.values().findIndex((value) => value.name() === strategy);
}

/** The hash of the port's canonical dump of an ok case, replaying the prefix and options the oracle ran. */
function portHash(line: PlacementSweepOk, modelsDir: string): string {
  const graph = runPlacementPrefix(placementSweepRow(line, modelsDir), factories);
  return placementHash(placementDump(graph, importDumpOf(graph)), line.geometryExtras === true);
}

/** Verdict on a case the oracle threw on: undefined when the port throws an error of the recorded simple class name. */
function throwsVerdict(line: SweepThrows, modelsDir: string): string | undefined {
  if (line.prefix === null) {
    return undefined;
  }
  try {
    runPlacementPrefix(placementSweepRow({ ...line, prefix: line.prefix }, modelsDir), factories);
  } catch (error) {
    const name = error instanceof Error ? error.constructor.name : typeof error;
    return name === line.class ? undefined : `${line.id} oracle threw ${line.class}, port threw ${name}`;
  }
  return `${line.id} oracle threw ${line.class}, port did not throw`;
}

describe('layered placement sweep vs the oracle', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const dir = (models as { dir: string }).dir;
  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it(
    'every case matches the oracle',
    () => {
      const lines: SweepLine[] = readSweep(RESULTS_FILE);
      const stride = Number(process.env[STRIDE_ENV] ?? DEFAULT_STRIDE);
      const modelIndex = new Map<string, number>();
      lines.filter((line) => isOk(line) || isThrows(line)).forEach((line) => {
        const model = line.model;
        if (!modelIndex.has(model)) {
          modelIndex.set(model, modelIndex.size);
        }
      });
      const mismatches: string[] = [];
      let checked = 0;
      let throwsChecked = 0;
      lines.forEach((line) => {
        if (!(isOk(line) || isThrows(line))) {
          return;
        }
        if (((modelIndex.get(line.model) as number) + strategyIndex(line)) % stride !== 0) {
          return;
        }
        checked++;
        if (isThrows(line)) {
          throwsChecked++;
          const verdict = throwsVerdict(line, dir);
          if (verdict !== undefined) {
            mismatches.push(verdict);
          }
          return;
        }
        const actual = portHash(line, dir);
        if (actual !== line.sha256) {
          mismatches.push(`${line.id} oracle ${line.sha256} port ${actual}`);
        }
      });
      const count = (status: string): number => lines.filter((l) => 'status' in l && l.status === status).length;
      console.log(
        `placement sweep: cases=${String(lines.length)} checked=${String(checked)} mismatches=${String(mismatches.length)} ` +
          `throws-checked=${String(throwsChecked)} stride=${String(stride)} ` +
          `refused=${String(count(STATUS_REFUSED))} timeout=${String(count(STATUS_TIMEOUT))}`,
      );
      expect(mismatches.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
