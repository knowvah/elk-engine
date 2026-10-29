// SPDX-License-Identifier: EPL-2.0
// B6 sweep (mission 7b, T10): every cycle breaker and layerer, replayed through the real strategy factories over every
// hierarchy level of every realworld/ptolemy model, hashes the same canonical phase dump as the oracle's
// tools/vectors/LayeredPhaseVectors.java --sweep (written by tools/oracle/phase-sweep.sh to test/corpus/.phase-sweep/).
// Each ok case replays the `prefix` and `options` the oracle ran. Skipped with a message when the models dir or the
// sweep dir is absent. A hash that differs is diagnosed with `--dump <case id>`, never by touching the port or a helper.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { phaseDump, importDumpOf } from '../helpers/layered-phase-replay-dump.js';
import { runPrefix, type Factories } from '../helpers/layered-phase-replay-ops.js';
import {
  isThrows,
  phaseHash,
  isOk,
  readSweep,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  sweepRow,
  type SweepLine,
  type SweepOk,
  type SweepThrows,
} from '../helpers/layered-phase-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'PHASE_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.phase-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/phase-sweep.sh';
const SWEEP_TIMEOUT_MS = 900_000;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const MODEL_SEPARATOR = '/';

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
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/**
 * The sampling rule that keeps the sweep inside the ~5 minute budget (the full sweep takes about 9 minutes):
 * with stride N, a case runs when (model index + strategy index) % N === 0, where the model index counts the sweep's
 * models in file (sorted) order and the strategy index is the strategy's position in its enum (`CycleBreakingStrategy`
 * for P1, `LayeringStrategy` for P2). Every strategy is covered by every N-th model, and every model by 1/N of the
 * strategies. PHASE_SWEEP_STRIDE=1 runs every case.
 */
const STRIDE_ENV = 'PHASE_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;
const STAGE_CYCLE = 'P1';

function strategyIndex(line: SweepLine): number {
  const parts = line.id.split(MODEL_SEPARATOR);
  const strategy = parts[parts.length - 1] as string;
  const names = (parts[parts.length - 2] === STAGE_CYCLE ? CycleBreakingStrategy : LayeringStrategy).values();
  return names.findIndex((value) => value.name() === strategy);
}

/** The hash of the port's canonical dump of an ok case, replaying the prefix and options the oracle ran. */
function portHash(line: SweepOk, modelsDir: string): string {
  const graph = runPrefix(sweepRow(line, modelsDir), factories);
  return phaseHash(phaseDump(graph, importDumpOf(graph)));
}

/** Verdict on a case the oracle threw on: undefined when the port throws an error of the recorded simple class name. */
function throwsVerdict(line: SweepThrows, modelsDir: string): string | undefined {
  if (line.prefix === null) {
    return undefined;
  }
  try {
    runPrefix(sweepRow({ ...line, prefix: line.prefix }, modelsDir), factories);
  } catch (error) {
    const name = error instanceof Error ? error.constructor.name : typeof error;
    return name === line.class ? undefined : `${line.id} oracle threw ${line.class}, port threw ${name}`;
  }
  return `${line.id} oracle threw ${line.class}, port did not throw`;
}

describe('layered phase sweep vs the oracle', () => {
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
      lines
        .filter((line) => isOk(line) || isThrows(line))
        .forEach((line) => {
          const model = (line as SweepOk).model;
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
        `phase sweep: cases=${String(lines.length)} checked=${String(checked)} mismatches=${String(mismatches.length)} ` +
          `throws-checked=${String(throwsChecked)} stride=${String(stride)} ` +
          `refused=${String(count(STATUS_REFUSED))} timeout=${String(count(STATUS_TIMEOUT))}`,
      );
      expect(mismatches.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
