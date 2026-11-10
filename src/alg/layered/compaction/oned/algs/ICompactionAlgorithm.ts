// SPDX-License-Identifier: EPL-2.0
import type { OneDimensionalCompactor } from '../OneDimensionalCompactor.js';

/**
 * An algorithm that compacts a given set of rectangles in one dimension.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/algs/ICompactionAlgorithm.java
 */
export interface ICompactionAlgorithm {
  /**
   * @param compactor the instance of the surrounding {@link OneDimensionalCompactor}.
   */
  compact(compactor: OneDimensionalCompactor): void;
}
