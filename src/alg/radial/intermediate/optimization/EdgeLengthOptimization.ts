// SPDX-License-Identifier: EPL-2.0
import { ElkMath } from '../../../../core/math/ElkMath.js';
import { KVector } from '../../../../core/math/KVector.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import type { IEvaluation } from './IEvaluation.js';

/**
 * The edge length optimization provides an evaluation method which allows to compare different layouts by the length of
 * all edges.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/optimization/EdgeLengthOptimization.java
 */
export class EdgeLengthOptimization implements IEvaluation {
  /**
   * This evaluation method calculates the sum of the length of each outgoing edge from the root node.
   */
  evaluate(root: ElkNode): number {
    let edgeLength = 0;
    for (const edge of ElkGraphUtil.allOutgoingEdges(root)) {
      const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;

      let targetX = target.getX() + target.getWidth() / 2;
      let targetY = target.getY() + target.getHeight() / 2;

      let rootX = root.getX() + root.getWidth() / 2;
      let rootY = root.getY() + root.getHeight() / 2;

      // Clipping
      const vector = new KVector();
      vector.x = targetX - rootX;
      vector.y = targetY - rootY;
      const sourceClip = new KVector(vector.x, vector.y);
      ElkMath.clipVector(sourceClip, root.getWidth(), root.getHeight());
      vector.x -= sourceClip.x;
      vector.y -= sourceClip.y;

      rootX = targetX - vector.x;
      rootY = targetY - vector.y;

      const targetClip = new KVector(vector.x, vector.y);
      ElkMath.clipVector(targetClip, target.getWidth(), target.getHeight());
      vector.x -= targetClip.x;
      vector.y -= targetClip.y;

      targetX = rootX + vector.x;
      targetY = rootY + vector.y;

      const vectorX = targetX - rootX;
      const vectorY = targetY - rootY;
      edgeLength += Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    }
    return edgeLength;
  }
}
