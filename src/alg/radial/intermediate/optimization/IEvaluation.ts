// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';

/**
 * The interface for translation optimizations.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/optimization/IEvaluation.java
 */
export interface IEvaluation {
  /** Evaluates the current graph status and returns a value representing the score of the evaluation. */
  evaluate(graph: ElkNode): number;
}
