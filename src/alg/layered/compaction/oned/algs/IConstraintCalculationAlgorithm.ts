// SPDX-License-Identifier: EPL-2.0
import type { OneDimensionalCompactor } from '../OneDimensionalCompactor.js';

/**
 * An algorithm that calculates the constraints between the CNodes of a CGraph.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/algs/IConstraintCalculationAlgorithm.java
 */
export interface IConstraintCalculationAlgorithm {
  /**
   * @param compactor the instance of the surrounding {@link OneDimensionalCompactor}.
   */
  calculateConstraints(compactor: OneDimensionalCompactor): void;
}
