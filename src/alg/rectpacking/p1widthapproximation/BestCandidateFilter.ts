// SPDX-License-Identifier: EPL-2.0
import type { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { DrawingData } from '../util/DrawingData.js';

/**
 * Interface implementing the Strategy interface of the strategy pattern. This interface offers a method that filters a
 * given list of {@link DrawingData} objects and returns a filtered list.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/BestCandidateFilter.java
 */
export interface BestCandidateFilter {
  /**
   * Filters the given list of {@link DrawingData} objects and returns it.
   *
   * @param candidates The list to be filtered.
   * @param aspectRatio The desired aspect ratio.
   * @returns A list that is filtered by whatever the implementation filtered for.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/BestCandidateFilter.java
   */
  filterList(candidates: readonly DrawingData[], aspectRatio: number, padding: ElkPadding): DrawingData[];
}
