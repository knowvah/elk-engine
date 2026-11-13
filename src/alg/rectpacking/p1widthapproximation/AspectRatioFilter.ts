// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { DrawingData } from '../util/DrawingData.js';
import type { BestCandidateFilter } from './BestCandidateFilter.js';

/**
 * This class implements a concrete strategy in the strategy pattern given by {@link BestCandidateFilter}.
 * <p>
 * This class offers a method that filters the given list regarding the aspect ratio. The candidate or candidates with
 * equal aspect ratio that are closest to the desired aspect ratio are returned in the filtered list.
 * </p>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AspectRatioFilter.java
 */
export class AspectRatioFilter implements BestCandidateFilter {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/AspectRatioFilter.java */
  filterList(candidates: readonly DrawingData[], aspectRatio: number, padding: ElkPadding): DrawingData[] {
    const remainingCandidates: DrawingData[] = [];
    let smallestDeviation = Number.POSITIVE_INFINITY;
    for (const opt of candidates) {
      smallestDeviation = Math.min(
        smallestDeviation,
        Math.abs(
          (opt.getDrawingWidth() + padding.getHorizontal()) / (opt.getDrawingHeight() + padding.getVertical()) -
            aspectRatio,
        ),
      );
    }
    for (const candidate of candidates) {
      // Exact float equality against the computed minimum is verbatim (AspectRatioFilter.java:46).
      if (
        Math.abs(
          (candidate.getDrawingWidth() + padding.getHorizontal()) /
            (candidate.getDrawingHeight() + padding.getVertical()) -
            aspectRatio,
        ) === smallestDeviation
      ) {
        remainingCandidates.push(candidate);
      }
    }
    return remainingCandidates;
  }
}
