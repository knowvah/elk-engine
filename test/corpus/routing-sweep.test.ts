// SPDX-License-Identifier: EPL-2.0
// B6 sweep (mission 7e, T12, R11): the layered pipeline to the stops P4 BRANDES_KOEPF, P5 ORTHOGONAL, P5 POLYLINE and
// FINAL_SPLINE_BENDPOINTS_CALCULATOR under SPLINES, replayed through the real factories over every edge-bearing
// hierarchy level of every realworld/ptolemy model, hash the same canonical routing dump as the oracle's
// tools/vectors/LayeredRoutingSweep.java (written by tools/oracle/routing-sweep.sh to test/corpus/.routing-sweep/, or
// to $ROUTING_SWEEP_DIR). Each ok case replays the `prefix` and `options` the oracle ran; a `throws` case must throw the
// recorded class; `refused` and `timeout` cases are counted. Skipped with a message when the models dir or the sweep dir
// is absent. A hash that differs is diagnosed with `routing-sweep.sh --dump <case id> <dir>`, never by touching the
// port, a helper or the canonical form.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../../src/alg/layered/p5edges/EdgeRouterFactory.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { importDumpOf } from '../helpers/layered-phase-replay-dump.js';
import type { Factories } from '../helpers/layered-phase-replay-ops.js';
import { routingDump } from '../helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix } from '../helpers/layered-routing-replay-ops.js';
import {
  isOk,
  isThrows,
  readSweep,
  routingHash,
  routingShapeOf,
  routingSweepRow,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type RoutingSweepOk,
  type SweepLine,
  type SweepThrows,
} from '../helpers/layered-routing-sweep.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const SWEEP_DIR_ENV = 'ROUTING_SWEEP_DIR';
const SWEEP_DIR = process.env[SWEEP_DIR_ENV] ?? path.join(repoRoot(), 'test', 'corpus', '.routing-sweep');
const RESULTS_FILE = path.join(SWEEP_DIR, 'results.jsonl');
const SWEEP_SCRIPT = 'tools/oracle/routing-sweep.sh';
const SWEEP_TIMEOUT_MS = 900_000;
const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const ID_SEPARATOR = '/';
const MS_PER_SECOND = 1000;

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
      case ROUTING_PHASE:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** The four stops of a level, in the oracle's order; the id of a case ends with one of them. */
const STOPS = [
  'P4/BRANDES_KOEPF',
  'P5/ORTHOGONAL',
  'P5/POLYLINE',
  'FINAL_SPLINE_BENDPOINTS_CALCULATOR/SPLINES',
] as const;

/**
 * The sampling rule that keeps the sweep inside the ~5 minute budget: with stride N, a case runs when
 * (model index + stop index) % N === 0, where the model index counts the sweep's models in file (sorted) order and the
 * stop index is the stop's position in `STOPS`. ROUTING_SWEEP_STRIDE=1 runs every case.
 */
const STRIDE_ENV = 'ROUTING_SWEEP_STRIDE';
const DEFAULT_STRIDE = 2;

function stopIndex(line: SweepLine): number {
  return STOPS.findIndex((stop) => line.id.endsWith(`${ID_SEPARATOR}${stop}`));
}

/** The hash of the port's canonical dump of an ok case, replaying the prefix and options the oracle ran. */
function portHash(line: RoutingSweepOk, modelsDir: string): string {
  const graph = runRoutingPrefix(routingSweepRow(line, modelsDir), factories);
  return routingHash(routingDump(graph, importDumpOf(graph)), routingShapeOf(line));
}

const nameOf = (error: unknown): string => (error instanceof Error ? error.constructor.name : typeof error);

/** Verdict on a case the oracle threw on: undefined when the port throws an error of the recorded simple class name. */
function throwsVerdict(line: SweepThrows, modelsDir: string): string | undefined {
  if (line.prefix === null) {
    return undefined;
  }
  try {
    runRoutingPrefix(routingSweepRow({ ...line, prefix: line.prefix }, modelsDir), factories);
  } catch (error) {
    const name = nameOf(error);
    return name === line.class ? undefined : `${line.id} oracle threw ${line.class}, port threw ${name}`;
  }
  return `${line.id} oracle threw ${line.class}, port did not throw`;
}

/** A mismatch line for an ok case: the hash differs, or the port threw where the oracle did not. */
function okVerdict(line: RoutingSweepOk, modelsDir: string): string | undefined {
  try {
    const actual = portHash(line, modelsDir);
    return actual === line.sha256 ? undefined : `${line.id} oracle ${line.sha256} port ${actual}`;
  } catch (error) {
    return `${line.id} UNEXPECTED THROW ${nameOf(error)}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** The index of the line's model among the models with a replayable (ok or throws) case, in file order. */
function modelIndexOf(lines: readonly SweepLine[]): Map<string, number> {
  const index = new Map<string, number>();
  lines.forEach((line) => {
    if ((isOk(line) || isThrows(line)) && !index.has(line.model)) {
      index.set(line.model, index.size);
    }
  });
  return index;
}

function tally(lines: readonly SweepLine[], keyOf: (line: SweepLine) => string | undefined): string {
  const counts = new Map<string, number>();
  lines.forEach((line) => {
    const key = keyOf(line);
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  return [...counts].map(([key, count]) => `${key}=${String(count)}`).join(' ');
}

const statusOf = (line: SweepLine): string => ('status' in line ? line.status : 'ok');

describe('layered routing sweep vs the oracle', () => {
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
      const started = Date.now();
      const lines: SweepLine[] = readSweep(RESULTS_FILE);
      const stride = Number(process.env[STRIDE_ENV] ?? DEFAULT_STRIDE);
      const modelIndex = modelIndexOf(lines);
      const mismatches: string[] = [];
      let checked = 0;
      let throwsChecked = 0;
      const perStop = STOPS.map(() => 0);
      lines.forEach((line) => {
        if (!(isOk(line) || isThrows(line))) {
          return;
        }
        if (((modelIndex.get(line.model) as number) + stopIndex(line)) % stride !== 0) {
          return;
        }
        checked++;
        perStop[stopIndex(line)] = (perStop[stopIndex(line)] ?? 0) + 1;
        const verdict = isThrows(line) ? throwsVerdict(line, dir) : okVerdict(line, dir);
        throwsChecked += isThrows(line) ? 1 : 0;
        if (verdict !== undefined) {
          mismatches.push(verdict);
        }
      });
      console.log(
        `routing sweep: cases=${String(lines.length)} checked=${String(checked)} mismatches=${String(mismatches.length)} ` +
          `throws-checked=${String(throwsChecked)} stride=${String(stride)} ` +
          `status: ${tally(lines, statusOf)} ` +
          `checked-per-stop: ${STOPS.map((stop, i) => `${stop}=${String(perStop[i])}`).join(' ')} ` +
          `refused-by-processor: ${tally(lines, (l) => ('status' in l && l.status === STATUS_REFUSED ? (l as { processor: string }).processor : undefined))} ` +
          `timeout=${String(lines.filter((l) => 'status' in l && l.status === STATUS_TIMEOUT).length)} ` +
          `replay-seconds=${String((Date.now() - started) / MS_PER_SECOND)}`,
      );
      expect(mismatches.join('\n')).toBe('');
    },
    SWEEP_TIMEOUT_MS,
  );
});
