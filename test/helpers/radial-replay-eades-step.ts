// SPDX-License-Identifier: EPL-2.0
// The EadesRadial stop pair of mission 8a as a test helper: the sorters, wedge criteria and translation optimizations of T7 are
// proven against the recorded stop after EadesRadial through the REAL EadesRadial (T13 replaced T7's test-side trace of it).
import { EadesRadial } from '../../src/alg/radial/p1position/EadesRadial.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { buildStopState, compareStop, dumpRadial, formatDiffs, type StopDiff } from './radial-replay-dump.js';
import { rowsWithStepPair, type RadialRow, type StepPair } from './radial-replay-rows.js';

/** EadesRadial.process on `graph`, which has ROOT_NODE and RADIUS set (the state after RootAndRadius). */
export function replayEadesRadial(graph: ElkNode): void {
  new EadesRadial().process(graph, new BasicProgressMonitor());
}

/** The root's `layoutOptions` of a row's input. */
export function layoutOptionsOf(row: RadialRow): Readonly<Record<string, string>> {
  return (row.input['layoutOptions'] ?? {}) as Readonly<Record<string, string>>;
}

/** The `stops`/`throws` rows that ran EadesRadial, with the pair around it, whose root options satisfy `predicate`. */
export function eadesRowsWhere(
  predicate: (options: Readonly<Record<string, string>>) => boolean,
): readonly (readonly [Exclude<RadialRow, { group: 'full' }>, StepPair])[] {
  return rowsWithStepPair('EadesRadial').filter(([row]) => predicate(layoutOptionsOf(row)));
}

/** Moves the row's input to the recorded state before EadesRadial, replays it and returns the differences to the recorded stop. */
export function eadesReplayDiffs(row: Exclude<RadialRow, { group: 'full' }>, pair: StepPair): StopDiff[] {
  const graph = buildStopState(row, pair.beforeIndex);
  replayEadesRadial(graph);
  return compareStop(pair.after, dumpRadial(graph));
}

/** `eadesReplayDiffs` as one readable string (empty when the replay equals the recorded stop). */
export function eadesReplayReport(row: Exclude<RadialRow, { group: 'full' }>, pair: StepPair): string {
  return formatDiffs(eadesReplayDiffs(row, pair));
}
