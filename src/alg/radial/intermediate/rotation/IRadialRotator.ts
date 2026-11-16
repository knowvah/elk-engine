// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';

/**
 * An interface for rotating the radial layout.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/rotation/IRadialRotator.java
 */
export interface IRadialRotator {
  /** Rotates the graph, which is already radial. */
  rotate(graph: ElkNode): void;
}
