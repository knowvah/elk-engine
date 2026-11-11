// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import type { IEvaluation } from './IEvaluation.js';

/**
 * Calculate the edge length between the root node and the first radius nodes. The edge source is given by a position.
 * The algorithm expects the {@link CoreOptions.POSITION} option to be set. <em>Warning</em>: It makes the assumption
 * that the position points to a node <em>in</em> the tree-parent node!
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/optimization/EdgeLengthPositionOptimization.java
 */
export class EdgeLengthPositionOptimization implements IEvaluation {
  /**
   * This evaluation method calculates the sum of the length of each outgoing edge from the root node. The edge
   * starting at the given position.
   *
   * A target without the POSITION option makes `position.x` throw a `TypeError` (Java's NullPointerException,
   * EdgeLengthPositionOptimization.java:42: the property has no default).
   */
  evaluate(root: ElkNode): number {
    let edgeLength = 0;
    for (const edge of ElkGraphUtil.allOutgoingEdges(root)) {
      const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;
      const targetX = target.getX() + target.getWidth() / 2;
      const targetY = target.getY() + target.getHeight() / 2;

      const position = target.getProperty(CoreOptions.POSITION);
      const rootX = root.getX() + position.x + root.getWidth() / 2;
      const rootY = root.getY() + position.y + root.getHeight();

      const vectorX = targetX - rootX;
      const vectorY = targetY - rootY;
      edgeLength += Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    }
    return edgeLength;
  }
}
