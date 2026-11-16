// SPDX-License-Identifier: EPL-2.0
import { l2i, roundToLong } from '../../../../java/lang/JavaMath.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { GraphStats } from './GraphStats.js';
import type { ICutIndexCalculator } from './ICutIndexCalculator.js';

/**
 * Calculates cut indexes based on a desired aspect ratio. Given a layering and estimations on the width and height of
 * each layer, first the number of desired 'chunks' is calculated, which is then used to select equidistant cut indexes.
 *
 * `(int) Math.round(x)` is the `long` to `int` narrowing (`l2i` of the saturating `roundToLong`), as the translation
 * rules prescribe.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/ARDCutIndexHeuristic.java
 */
export class ARDCutIndexHeuristic implements ICutIndexCalculator {
  getCutIndexes(_graph: LGraph, gs: GraphStats): number[] {
    const rows = ARDCutIndexHeuristic.getChunkCount(gs);

    // the number of cuts is one less than the number of rows
    const cuts: number[] = [];
    const step = gs.longestPath / rows;
    // plain number loop counter: idx < rows <= longestPath (a layer count)
    for (let idx = 1; idx < rows; ++idx) {
      cuts.push(l2i(roundToLong(idx * step)));
    }

    return cuts;
  }

  /**
   * Given the estimations on width and height in `gs`, the method seeks a number of 'chunks' s.t.
   *
   * ```
   * desiredAr = ((longestPath / chunks) * maxWidth) / (chunks * maxHeight)
   * ```
   *
   * @param gs statistics about the graph.
   * @returns the number of chunks the graph should be split into. The resulting number of cuts should therefore be one
   *   less.
   */
  static getChunkCount(gs: GraphStats): number {
    const rowsd = Math.sqrt(gs.getSumWidth() / (gs.dar * gs.getMaxHeight()));
    let rows = l2i(roundToLong(rowsd));
    rows = Math.min(rows, gs.longestPath);
    return rows;
  }

  guaranteeValid(): boolean {
    return false;
  }
}
