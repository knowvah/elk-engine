// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { DrawingData } from '../util/DrawingData.js';
import type { BestCandidateFilter } from './BestCandidateFilter.js';

/**
 * This class implements a concrete strategy in the strategy pattern given by {@link BestCandidateFilter}.
 * <p>
 * This class offers a method that filters the given list regarding the area. The candidate or candidates with equal
 * area with the smallest area are returned in the filtered list.
 * </p>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaFilter.java
 */
export class AreaFilter implements BestCandidateFilter {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AreaFilter.java */
  filterList(candidates: readonly DrawingData[], _aspectRatio: number, padding: ElkPadding): DrawingData[] {
    const remainingCandidates: DrawingData[] = [];
    let minArea = Number.POSITIVE_INFINITY;
    for (const opt of candidates) {
      minArea = Math.min(
        minArea,
        (opt.getDrawingWidth() + padding.getHorizontal()) * (opt.getDrawingHeight() + padding.getVertical()),
      );
    }
    for (const candidate of candidates) {
      // Exact float equality against the computed minimum is verbatim (AreaFilter.java:43).
      if (
        (candidate.getDrawingWidth() + padding.getHorizontal()) *
          (candidate.getDrawingHeight() + padding.getVertical()) ===
        minArea
      ) {
        remainingCandidates.push(candidate);
      }
    }
    return remainingCandidates;
  }
}
