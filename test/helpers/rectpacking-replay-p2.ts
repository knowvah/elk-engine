// SPDX-License-Identifier: EPL-2.0
// Replay of the p2 stops of `test/golden/refs/java/rectpacking.json` (mission 8c, T10): the stop before each p2 stop is restored with
// the T6 helpers, the phase named by the stop runs, and the whole dumped state (boxes, extras, props, padding and `state.rows`) is
// returned for a comparison with the recorded stop. Adds nothing to the landed helpers.
import type { ILayoutPhase } from '../../src/core/alg/ILayoutPhase.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import { Compactor } from '../../src/alg/rectpacking/p2packing/Compactor.js';
import { NoPlacement } from '../../src/alg/rectpacking/p2packing/NoPlacement.js';
import { SimplePlacement } from '../../src/alg/rectpacking/p2packing/SimplePlacement.js';
import { InternalProperties } from '../../src/alg/rectpacking/options/InternalProperties.js';
import type { RectPackingLayoutPhases } from '../../src/alg/rectpacking/RectPackingLayoutPhases.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { dumpRectRows } from './rectpacking-replay-dump.js';
import { dumpState } from './rectpacking-replay-elk.js';
import {
  loadRectPackingRows,
  STOP_AFTER_COMPACTOR,
  STOP_AFTER_NO_PLACEMENT,
  STOP_AFTER_SIMPLE_PLACEMENT,
  type GraphRun,
  type Stop,
  type StopState,
  type StopsRow,
} from './rectpacking-replay-rows.js';
import { replayStop, type FoundStop } from './rectpacking-replay-run.js';

/** The three p2 stop names. */
export const P2_STOPS = [STOP_AFTER_COMPACTOR, STOP_AFTER_SIMPLE_PLACEMENT, STOP_AFTER_NO_PLACEMENT] as const;

/** A p2 stop with the stop recorded right before it (the phase's input). */
export interface P2Found extends FoundStop {
  readonly previous: Stop;
}

/** Every p2 stop of every graph run of the stops rows, in file order, each with its predecessor stop. */
export function p2StopsWithPrevious(): readonly P2Found[] {
  const found: P2Found[] = [];
  for (const row of loadRectPackingRows('stops')) {
    for (const run of row.expected.graphs) {
      run.stops.forEach((stop, index) => {
        const previous = run.stops[index - 1];
        if ((P2_STOPS as readonly string[]).includes(stop.stop) && previous !== undefined) {
          found.push({ row, run, stop, previous });
        }
      });
    }
  }
  return found;
}

/** The phase a p2 stop name records. */
export function p2PhaseOf(stopName: string): ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  switch (stopName) {
    case STOP_AFTER_COMPACTOR:
      return new Compactor();
    case STOP_AFTER_SIMPLE_PLACEMENT:
      return new SimplePlacement();
    case STOP_AFTER_NO_PLACEMENT:
      return new NoPlacement();
    default:
      throw new Error(`${stopName} is not a p2 stop`);
  }
}

/** The recorded state of a stop without the optional `drawing` (only the greedy stop has one). */
export function recordedState(stop: Stop): Omit<StopState, 'drawing'> {
  const { drawing: _drawing, ...state } = stop.state;
  void _drawing;
  return state;
}

/** The dumped state the recorder takes at a p2 stop: `dumpState` plus `rows` (`null` when ROWS is not set). */
export function dumpP2State(layout: ElkNode): Omit<StopState, 'drawing'> {
  const rows = layout.hasProperty(InternalProperties.ROWS)
    ? dumpRectRows(layout.getProperty(InternalProperties.ROWS))
    : null;
  return { ...dumpState(layout), rows };
}

/** What a replay of a p2 stop leaves: the restored layout node after the phase ran, and its dumped state. */
export interface P2Replay {
  readonly layout: ElkNode;
  readonly state: Omit<StopState, 'drawing'>;
}

/** Restores the predecessor stop onto a fresh import of the row, runs the phase of the stop, and dumps the layout node. */
export function replayP2(found: P2Found, monitor: IElkProgressMonitor = new BasicProgressMonitor()): P2Replay {
  const { layout } = replayStop({ row: found.row, run: found.run, stop: found.previous });
  p2PhaseOf(found.stop.stop).process(layout, monitor);
  return { layout, state: dumpP2State(layout) };
}

export type { GraphRun, StopsRow };
