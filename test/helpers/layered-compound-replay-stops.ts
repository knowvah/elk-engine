// SPDX-License-Identifier: EPL-2.0
// Replay of the rows of the compound ref (mission 7h, T2, H2). Every row goes through the engine (layered-compound-replay-run.ts):
//   runToStop       a `models` row: the run is made as the recorder makes it, the whole `LGraph` tree is snapshotted at the stop
//                   numbered `expected.stop.index` (only the hierarchical stops of the run header count, see the run module), the
//                   stop's `processor`, `className` and `levelPath` are checked against `expected.stop` and the tree is compared with
//                   `expected.tree`. Stopping is by capture: the run completes (`abortAtStop` aborts it right after the capture
//                   instead, for a test that needs only the stage up to that stop). A mismatch is a diff, not a throw; an error the run
//                   throws propagates.
//   replayFull      a `full` row: the export (AD-4, `compareLayout`) and the per-level plans (exact), the plans captured by the
//                   controller in the real run (the recorder's `PlanRecorder`, compound processors included).
//   replayScenario  a `scenarios` row: replayFull's comparison, the number of stops, and the tree at the last stop (the
//                   CompoundGraphPostprocessor on the root).
// Twins (H3, a reversed iteration order inside the compound processors): `env.around` wraps the engine call, so a caller installs
// replacements before it (`vi.spyOn(CompoundGraphPreprocessor.prototype, 'process')`) and restores them after.
import { formatDiffs, type Diff } from '../golden/compare-json.js';
import { exportLikeOracle } from './graph-json-oracle.js';
import { compareFullRow } from './layered-pipeline-replay-ops.js';
import { strictNumbers } from './layered-site-replay-ops-transform.js';
import type { CompoundModelsRow, CompoundScenarioRow, FullRow } from './layered-compound-replay-rows.js';
import { compareTree } from './layered-compound-replay-dump.js';
import {
  COMPOUND_POSTPROCESSOR,
  runRow,
  type RowRun,
  type RunEnvironment,
  type RunnableRow,
  type StopRecord,
} from './layered-compound-replay-run.js';

/** The result of a replay: `diffs` is empty when the row is reproduced. */
export interface ReplayResult {
  readonly diffs: string[];
}

/** The seams of a replay; every member defaults to the real thing. */
export interface ReplayEnvironment {
  /** Wraps the engine call (see the header: the twins). */
  readonly around?: RunEnvironment['around'];
  /** The snapshot taken at a wanted stop (default: `dumpTree`). */
  readonly snapshot?: RunEnvironment['snapshot'];
  /** The run itself (default: `runRow`); a test passes a stub that drives the listener by hand. */
  readonly run?: (row: RunnableRow, env: RunEnvironment) => RowRun;
  /** The comparison of `(expected, actual)` trees (default: `compareTree`). */
  readonly compare?: (expected: unknown, actual: unknown) => string[];
  /** `runToStop` only: abort the run by an internal signal right after the capture (default: false). */
  readonly abortAtStop?: boolean;
  /** `replayScenario` only: the monitor of the run (a logged site row passes one with logging on and reads its logged graphs). */
  readonly monitor?: RunEnvironment['monitor'];
}

const runOf = (env: ReplayEnvironment): ((row: RunnableRow, env: RunEnvironment) => RowRun) => env.run ?? runRow;
const compareOf = (env: ReplayEnvironment): ((e: unknown, a: unknown) => string[]) => env.compare ?? compareTree;

/** The diffs of the stop itself: the processor names and the level path at the index. */
export function stopDiffs(expected: CompoundModelsRow['expected']['stop'], actual: StopRecord): string[] {
  const at = String(expected.index);
  return (['processor', 'className', 'levelPath'] as const).flatMap((field) =>
    actual[field] === expected[field] ? [] : [`stop ${at} ${field}: expected ${expected[field]}, got ${actual[field]}`],
  );
}

/**
 * Replays a `models` row: runs the layout, snapshots the tree at `expected.stop.index` and compares it with `expected.tree`.
 * A stop that was never reached is one diff.
 */
export function runToStop(row: CompoundModelsRow, env: ReplayEnvironment = {}): ReplayResult {
  const { stop, tree } = row.expected;
  const run = runOf(env)(row, {
    around: env.around,
    snapshot: env.snapshot,
    wantTree: (candidate) => candidate.index === stop.index,
    abortAfter: env.abortAtStop === true ? stop.index : undefined,
  });
  const reached = run.stops[stop.index];
  if (reached === undefined) {
    return { diffs: [`stop ${String(stop.index)} was not reached: the run made ${String(run.stops.length)} stops`] };
  }
  return { diffs: [...stopDiffs(stop, reached), ...compareOf(env)(tree, reached.tree)] };
}

// ------------------------------------------------------------------------------------------------------------
// full and scenario rows

/** `JSON.parse` of the export through `strictNumbers`: Gson prints a non-finite double bare, the recording quotes it. */
function exportOf(run: RowRun): unknown {
  return JSON.parse(strictNumbers(exportLikeOracle(run.root))) as unknown;
}

const formatted = (diffs: Diff[]): string[] => diffs.map((diff) => formatDiffs([diff]));

function layoutAndPlanDiffs(row: FullRow | CompoundScenarioRow, run: RowRun): string[] {
  return formatted(compareFullRow({ layout: exportOf(run), plans: run.plans }, row as FullRow));
}

/** Replays a `full` row: the engine run, the export at AD-4 and the plans of every level (nested levels included), exactly. */
export function replayFull(row: FullRow, env: ReplayEnvironment = {}): ReplayResult {
  const run = runOf(env)(row, { around: env.around });
  return { diffs: layoutAndPlanDiffs(row, run) };
}

/** Replays a `scenarios` row: layout and plans as a `full` row, the number of stops, the tree at the last stop. */
export function replayScenario(row: CompoundScenarioRow, env: ReplayEnvironment = {}): ReplayResult {
  const run = runOf(env)(row, {
    around: env.around,
    snapshot: env.snapshot,
    wantTree: (stop) => stop.processor === COMPOUND_POSTPROCESSOR,
    monitor: env.monitor,
  });
  const diffs = layoutAndPlanDiffs(row, run);
  if (run.stops.length !== row.expected.stops) {
    diffs.push(`stops: expected ${String(row.expected.stops)}, got ${String(run.stops.length)}`);
  }
  const last = run.stops.at(-1);
  if (last?.tree === undefined) {
    diffs.push(`tree: the last stop is ${last?.processor ?? '(none)'}, not ${COMPOUND_POSTPROCESSOR}`);
  } else {
    diffs.push(...compareOf(env)(row.expected.tree, last.tree));
  }
  return { diffs };
}
