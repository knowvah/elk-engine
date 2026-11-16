// SPDX-License-Identifier: EPL-2.0
// Replay of the p1 (width approximation) and p3 (whitespace elimination) stops of the rectpacking ref (mission 8c, T9). Every replay
// restores the PRECEDING recorded stop with the T6 helpers, runs the phase's `process` on the restored layout node and returns the
// state the recorder would dump after it, in the recorder's key order, for `compareJson` against the recorded stop.
// The options module is entered first on purpose: a phase base class (EqualWhitespaceEliminator) cannot be an entry point of the
// strategy-enum import cycle (decision journal, TDZ recipe), so it is reached through the options and the enum.
import { RectPackingOptions } from '../../src/alg/rectpacking/options/RectPackingOptions.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ILayoutPhase } from '../../src/core/alg/ILayoutPhase.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { AreaApproximation } from '../../src/alg/rectpacking/p1widthapproximation/AreaApproximation.js';
import { EqualWhitespaceEliminator } from '../../src/alg/rectpacking/p3whitespaceelimination/EqualWhitespaceEliminator.js';
import { GreedyWidthApproximator } from '../../src/alg/rectpacking/p1widthapproximation/GreedyWidthApproximator.js';
import { InternalProperties } from '../../src/alg/rectpacking/options/InternalProperties.js';
import type { RectPackingLayoutPhases } from '../../src/alg/rectpacking/RectPackingLayoutPhases.js';
import { TargetWidthWidthApproximator } from '../../src/alg/rectpacking/p1widthapproximation/TargetWidthWidthApproximator.js';
import { ToAspectratioNodeExpander } from '../../src/alg/rectpacking/p3whitespaceelimination/ToAspectratioNodeExpander.js';
import { dumpRectRows } from './rectpacking-replay-dump.js';
import { dumpState, importInput, layoutNodeOf } from './rectpacking-replay-elk.js';
import {
  collectStops,
  encodeHex,
  STOP_AFTER_ASPECT_RATIO_EXPANDER,
  STOP_AFTER_EQUAL_WHITESPACE,
  STOP_AFTER_NO_PLACEMENT,
  type DrawingEntry,
  type RowsState,
  type Stop,
  type StopsRow,
  type ThrowsRow,
} from './rectpacking-replay-rows.js';
import { replayRows, replayStop, type FoundStop, type StopReplay } from './rectpacking-replay-run.js';

export const STOP_AFTER_GREEDY = 'after:GreedyWidthApproximator';
export const STOP_AFTER_TARGET_WIDTH = 'after:TargetWidthWidthApproximator';
export const P1_STOPS = [STOP_AFTER_GREEDY, STOP_AFTER_TARGET_WIDTH] as const;
export const P3_STOPS = [STOP_AFTER_EQUAL_WHITESPACE, STOP_AFTER_ASPECT_RATIO_EXPANDER] as const;

/** A stop with the stop recorded right before it in the same graph run. */
export interface StopWithPrevious extends FoundStop {
  readonly previous: Stop;
}

/** Every stop named in `names` that has a predecessor in its graph run, with that predecessor. */
export function stopsWithPrevious(names: readonly string[]): readonly StopWithPrevious[] {
  return collectStops(names).map((found) => {
    const index = found.run.stops.indexOf(found.stop);
    const previous = found.run.stops[index - 1];
    if (previous === undefined) {
      throw new Error(`stop ${found.stop.stop} of ${found.row.id} has no predecessor`);
    }
    return { ...found, previous };
  });
}

/** The phase a recorded stop name belongs to. */
export function phaseOf(stopName: string): ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  switch (stopName) {
    case STOP_AFTER_GREEDY:
      return new GreedyWidthApproximator();
    case STOP_AFTER_TARGET_WIDTH:
      return new TargetWidthWidthApproximator();
    case STOP_AFTER_EQUAL_WHITESPACE:
      return new EqualWhitespaceEliminator();
    case STOP_AFTER_ASPECT_RATIO_EXPANDER:
      return new ToAspectratioNodeExpander();
    default:
      throw new Error(`no phase for stop ${stopName}`);
  }
}

/** The ELK part of a stop state in the recorder's key order (no `rows`, no `drawing`). */
export type ElkPart = ReturnType<typeof dumpState>;

/** The recorded state of a stop restricted to the keys `dumpState` produces. */
export function recordedElkPart(stop: Stop): ElkPart {
  const { graph, nodes, ports, labels, extras, props, padding } = stop.state;
  return { graph, nodes, ports, labels, extras, props, padding };
}

/**
 * The recorder's `drawing` object: the DrawingData `AreaApproximation.approxBoundingBox` returns when it is run again on the live graph
 * (`GreedyWidthApproximator` discards its own), as the recorder computes it. The re-run must not move a node (the recorder fails if it does).
 */
export function recomputeDrawing(layout: ElkNode): DrawingEntry {
  const before = dumpState(layout).nodes;
  const approximation = new AreaApproximation(
    layout.getProperty(RectPackingOptions.ASPECT_RATIO),
    layout.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL),
    layout.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT),
  );
  const drawing = approximation.approxBoundingBox(
    layout.getChildren(),
    layout.getProperty(RectPackingOptions.SPACING_NODE_NODE),
    layout.getProperty(RectPackingOptions.PADDING),
  );
  if (JSON.stringify(before) !== JSON.stringify(dumpState(layout).nodes)) {
    throw new Error('the recomputed approximation moved a node');
  }
  return {
    dar: encodeHex(drawing.getDesiredAspectRatio()),
    drawingWidth: encodeHex(drawing.getDrawingWidth()),
    drawingHeight: encodeHex(drawing.getDrawingHeight()),
    scaleMeasure: encodeHex(drawing.getScaleMeasure()),
    area: encodeHex(drawing.getArea()),
    aspectRatio: encodeHex(drawing.getAspectRatio()),
    placementOption: drawing.getPlacementOption().name(),
    nextX: encodeHex(drawing.getNextXcoordinate()),
    nextY: encodeHex(drawing.getNextYcoordinate()),
  };
}

/** A p1 replay: the dumped state after the phase and, for the greedy stop, the recomputed drawing. */
export interface P1Result {
  readonly state: ElkPart;
  readonly drawing: DrawingEntry | undefined;
}

/** Restores the stop before a p1 stop, runs the phase, and dumps. */
export function replayP1(found: StopWithPrevious): P1Result {
  const { layout } = replayStop({ row: found.row, run: found.run, stop: found.previous });
  phaseOf(found.stop.stop).process(layout, new BasicProgressMonitor());
  const state = dumpState(layout);
  return { state, drawing: found.stop.stop === STOP_AFTER_GREEDY ? recomputeDrawing(layout) : undefined };
}

/** A p3 replay: the dumped state after the phase and the dumped rebuilt rows. */
export interface P3Result {
  readonly state: ElkPart;
  readonly rows: RowsState;
}

/** Rebuilds the p2 state before a p3 stop (restored graph and props, rebuilt rows as ROWS), runs the phase, and dumps. */
export function replayP3(found: StopWithPrevious): P3Result {
  if (found.previous.state.rows === null) {
    throw new Error(`${found.row.id}: the stop before ${found.stop.stop} has no rows`);
  }
  const p2 = replayRows({ row: found.row, run: found.run, stop: found.previous });
  p2.layout.setProperty(InternalProperties.ROWS, p2.rebuilt.list);
  phaseOf(found.stop.stop).process(p2.layout, new BasicProgressMonitor());
  return { state: dumpState(p2.layout), rows: dumpRectRows(p2.rebuilt.list) };
}

/** The simple class name of a recorded Java class name (`a.b.C$D` gives `D`). */
export const simpleJavaName = (javaName: string): string =>
  javaName.slice(Math.max(javaName.lastIndexOf('.'), javaName.lastIndexOf('$')) + 1);

/** Restores the layout node a throws row names. */
export const throwsLayoutNode = (row: ThrowsRow): ElkNode => layoutNodeOf(importInput(row), row.expected.layoutNode);

/** The first recorded `after:NoPlacement` stop (its state sets the drawing properties but not ROWS), restored. */
export function noPlacementReplay(): StopReplay {
  const [found] = collectStops([STOP_AFTER_NO_PLACEMENT]);
  if (found === undefined) {
    throw new Error('no after:NoPlacement stop recorded');
  }
  return replayStop(found);
}

export type { StopsRow };
