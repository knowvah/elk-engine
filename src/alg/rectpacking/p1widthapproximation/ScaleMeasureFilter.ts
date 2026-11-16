// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { DrawingData } from '../util/DrawingData.js';
import { DrawingUtil } from '../util/DrawingUtil.js';
import type { BestCandidateFilter } from './BestCandidateFilter.js';

/**
 * This class implements a concrete strategy in the strategy pattern given by {@link BestCandidateFilter}.
 * <p>
 * This class offers a method that filters the given list regarding the scale measure. The candidate or candidates with
 * equal scale measure with the biggest scale measure are returned in the filtered list.
 * </p>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/ScaleMeasureFilter.java
 */
export class ScaleMeasureFilter implements BestCandidateFilter {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/ScaleMeasureFilter.java */
  filterList(candidates: readonly DrawingData[], _aspectRatio: number, padding: ElkPadding): DrawingData[] {
    const remainingCandidates: DrawingData[] = [];
    let maxScale = Number.NEGATIVE_INFINITY;
    for (const opt of candidates) {
      maxScale = Math.max(
        maxScale,
        DrawingUtil.computeScaleMeasure(
          opt.getDrawingWidth() + padding.getHorizontal(),
          opt.getDrawingHeight() + padding.getVertical(),
          opt.getDesiredAspectRatio(),
        ),
      );
    }
    for (const candidate of candidates) {
      // Exact float equality against the computed maximum is verbatim (ScaleMeasureFilter.java:48).
      if (
        DrawingUtil.computeScaleMeasure(
          candidate.getDrawingWidth() + padding.getHorizontal(),
          candidate.getDrawingHeight() + padding.getVertical(),
          candidate.getDesiredAspectRatio(),
        ) === maxScale
      ) {
        remainingCandidates.push(candidate);
      }
    }
    return remainingCandidates;
  }
}
