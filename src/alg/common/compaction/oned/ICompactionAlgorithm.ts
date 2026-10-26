// SPDX-License-Identifier: EPL-2.0
import type { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

/**
 * An algorithm that compacts a given set of rectangles in one dimension. This can, for example,
 * be a longest path-based algorithm that compacts everything as much as possible "to the left"
 * or a network simplex based compaction algorithm that leverages some underlying graph
 * structure to keep edges as short as possible.
 *
 * The algorithm can use a {@link CNode}'s `startPos` for intermediate positions during compaction.
 * Once it finishes the new position should be written back to the node's `hitbox`.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ICompactionAlgorithm.java
 */
export interface ICompactionAlgorithm {
  /**
   * @param compactor the instance of the surrounding {@link OneDimensionalCompactor}.
   */
  compact(compactor: OneDimensionalCompactor): void;
}
