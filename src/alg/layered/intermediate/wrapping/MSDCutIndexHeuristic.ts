// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { ARDCutIndexHeuristic } from './ARDCutIndexHeuristic.js';
import type { GraphStats } from './GraphStats.js';
import type { ICutIndexCalculator } from './ICutIndexCalculator.js';

/** The per-layering data `getCutIndexes` precomputes once and reads for every candidate number of cuts. */
interface LayeringData {
  readonly gs: GraphStats;
  readonly heights: readonly number[];
  readonly widthAtIndex: readonly number[];
  readonly total: number;
}

/** The maximum row width and the sum of the row height maximums of one candidate; the cuts are filled in place. */
interface RowResult {
  readonly width: number;
  readonly height: number;
}

/**
 * As opposed to the simple {@link ARDCutIndexHeuristic}, this heuristic tries to directly optimize the max scale value
 * of the resulting drawing. The underlying idea is to find, for a fixed number of cut indexes, those indexes that
 * minimize the 'width part' of max scale.
 *
 * Additionally, it allows to slightly alter the number of cut indexes via the
 * `LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM` layout option at the expense of more iterations.
 *
 * `getCutIndexes` is split at its statement boundaries (precomputation, the per-candidate row scan) to meet the
 * complexity limits; statement order is the Java's.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/MSDCutIndexHeuristic.java
 */
export class MSDCutIndexHeuristic implements ICutIndexCalculator {
  guaranteeValid(): boolean {
    return false;
  }

  getCutIndexes(graph: LGraph, gs: GraphStats): number[] {
    // minimize the max of the sums of the widths
    const widths = gs.getWidths();
    const heights = gs.getHeights();

    const { widthAtIndex, total } = MSDCutIndexHeuristic.#accumulateWidths(widths);
    const data: LayeringData = { gs, heights, widthAtIndex, total };

    // initial guess on a good number of cuts
    const cutCnt = Int32.sub(ARDCutIndexHeuristic.getChunkCount(gs), 1);
    const freedom = graph.getProperty(LayeredOptions.WRAPPING_CUTTING_MSD_FREEDOM);

    let bestMaxScale = Number.NEGATIVE_INFINITY;
    let bestCuts: number[] = [];

    // now find the best set of cut indexes
    // plain number loop counter m: bounded by min(longestPath - 1, cutCnt + freedom) + 1
    for (
      let m = Math.max(0, Int32.sub(cutCnt, freedom));
      m <= Math.min(Int32.sub(gs.longestPath, 1), Int32.add(cutCnt, freedom));
      m++
    ) {
      // calculate cuts
      const cuts: number[] = [];
      const { width, height } = MSDCutIndexHeuristic.#evaluate(data, m, cuts);

      // are they better?
      const maxScale = Math.min(1 / width, 1 / gs.dar / height);

      if (maxScale > bestMaxScale) {
        bestMaxScale = maxScale;
        bestCuts = cuts;
      }
    }

    return bestCuts;
  }

  /** The Java prologue that records the accumulated width at each index of the original layering, and the total. */
  static #accumulateWidths(widths: readonly number[]): { widthAtIndex: number[]; total: number } {
    const widthAtIndex = new Array<number>(widths.length).fill(0);
    if (widths.length === 0) {
      // Java `widthAtIndex[0] = widths[0]` on an empty array
      throw new ArrayIndexOutOfBoundsException('Index 0 out of bounds for length 0');
    }
    widthAtIndex[0] = widths[0]!;
    let total = widths[0]!;
    // plain number loop counter: bounded by the array length (a layer count)
    for (let i = 1; i < widths.length; i++) {
      widthAtIndex[i] = widthAtIndex[i - 1]! + widths[i]!;
      total += widths[i]!;
    }
    return { widthAtIndex, total };
  }

  /** The body of the Java loop over `m`: fills `cuts` for `m` cuts and returns the width and height parts. */
  static #evaluate(data: LayeringData, m: number, cuts: number[]): RowResult {
    const { gs, total } = data;
    const rowSum = total / Int32.add(m, 1);

    if (m === 0) {
      return { width: total, height: gs.getMaxHeight() };
    }
    return MSDCutIndexHeuristic.#scanRows(data, rowSum, cuts);
  }

  /** The `else` arm of the Java loop body: walks the layer indexes and cuts once a row reaches `rowSum`. */
  static #scanRows(data: LayeringData, rowSum: number, cuts: number[]): RowResult {
    const { gs, heights, widthAtIndex } = data;
    let sumSoFar = 0;
    let index = 1; // plain number: bounded by longestPath

    // maximum of any row width
    let width = Number.NEGATIVE_INFINITY;
    let lastCutWidth = 0;
    // sum of the row height maximums
    let height = 0;
    let rowHeightMax = heights[0]!;

    while (index < gs.longestPath) {
      if (widthAtIndex[index - 1]! - sumSoFar >= rowSum) {
        // cut _before_ index
        cuts.push(index);

        // update state
        width = Math.max(width, widthAtIndex[index - 1]! - lastCutWidth);
        height += rowHeightMax;

        sumSoFar += widthAtIndex[index - 1]! - sumSoFar;
        lastCutWidth = widthAtIndex[index - 1]!;
        rowHeightMax = heights[index]!;
      }

      rowHeightMax = Math.max(rowHeightMax, heights[index]!);

      index++;
    }

    // add heights of last row
    height += rowHeightMax;
    return { width, height };
  }
}
