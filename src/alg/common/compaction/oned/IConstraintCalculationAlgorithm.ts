// SPDX-License-Identifier: EPL-2.0
import type { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

/**
 * An algorithm that calculates separation constraints in one dimension that are induced by a
 * set of boxes in the plane.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/IConstraintCalculationAlgorithm.java
 */
export interface IConstraintCalculationAlgorithm {
  /**
   * @param compactor the instance of the surrounding {@link OneDimensionalCompactor}.
   */
  calculateConstraints(compactor: OneDimensionalCompactor): void;
}
