// SPDX-License-Identifier: EPL-2.0
// Replay of a recorded rectpacking stop (mission 8c, T6): imports the row's input, restores the stop's recorded state onto the layout
// node (boxes, child order, extras, InternalProperties, padding) and rebuilds the `RectRow` object graph of `state.rows` around the
// restored nodes. Each call builds a fresh, independent graph, so a test can mutate it freely.
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { rebuildRectRows, type RebuiltRows } from './rectpacking-replay-dump.js';
import { importInput, layoutNodeOf, nodesById, restoreElk, restoreProps } from './rectpacking-replay-elk.js';
import {
  collectStops,
  P2_ROW_STOPS,
  type GraphRun,
  type RowsState,
  type Stop,
  type StopsRow,
} from './rectpacking-replay-rows.js';

/** A stop of a graph run of a stops row. */
export interface FoundStop {
  readonly row: StopsRow;
  readonly run: GraphRun;
  readonly stop: Stop;
}

/** A p2 stop with its recorded `state.rows` (`rec`). */
export type P2Stop = FoundStop & { readonly rec: RowsState };

/** The replay of a p2 stop: the restored layout node and the rebuilt object graph. */
export type RowsReplay = P2Stop & StopReplay & { readonly rebuilt: RebuiltRows };

/** Every p2 stop (after the Compactor or SimplePlacement) that carries a `state.rows` object graph, in file order. */
export function p2Stops(): readonly P2Stop[] {
  return collectStops(P2_ROW_STOPS).flatMap((found) =>
    found.stop.state.rows === null ? [] : [{ ...found, rec: found.stop.state.rows }],
  );
}

/** A restored stop: the layout node with its recorded state and, when the stop has `rows`, the rebuilt object graph. */
export interface StopReplay extends FoundStop {
  readonly layout: ElkNode;
  readonly nodes: Map<string, ElkNode>;
  readonly rebuilt: RebuiltRows | null;
}

/** Imports the row's input and restores the recorded state of `found.stop` onto the layout node of its graph run. */
export function replayStop<F extends FoundStop>(found: F): F & StopReplay {
  const layout = layoutNodeOf(importInput(found.row), found.run.graph);
  restoreElk(layout, found.stop.state);
  restoreProps(layout, found.stop.state);
  const nodes = nodesById(layout);
  const { rows } = found.stop.state;
  return { ...found, layout, nodes, rebuilt: rows === null ? null : rebuildRectRows(rows, nodes) };
}

/** `replayStop` of a stop whose `state.rows` is set. */
export function replayRows<F extends FoundStop>(found: F): F & StopReplay & { readonly rebuilt: RebuiltRows } {
  const replay = replayStop(found);
  if (replay.rebuilt === null) {
    throw new Error(`stop ${found.stop.stop} of ${found.row.id} has no rows`);
  }
  return { ...replay, rebuilt: replay.rebuilt };
}
