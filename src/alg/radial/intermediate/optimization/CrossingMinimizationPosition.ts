// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IEvaluation } from './IEvaluation.js';

/**
 * Count the number of crossings of the edges between root and the first radius. The algorithm expects the
 * {@link CoreOptions.POSITION} option to be set. <em>Warning</em>: It makes assumptions that the position points to a
 * node <em>in</em> the tree-parent node!
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/optimization/CrossingMinimizationPosition.java
 */
export class CrossingMinimizationPosition implements IEvaluation {
  /** The root node of the graph. */
  private root: ElkNode | null = null;

  evaluate(rootNode: ElkNode): number {
    this.root = rootNode;
    let crossings = 0;
    const nodes = RadialUtil.getSuccessors(rootNode);

    let k = 0;
    for (const node1 of nodes) {
      k++;
      for (let i = k; i < nodes.length; i++) {
        if (this.isCrossing(node1, nodes[i] as ElkNode)) {
          crossings += 1;
        }
      }
    }
    return crossings;
  }

  /**
   * Calculate if two edges are crossing by calculating the line between the nodes and their node position.
   *
   * A node without the POSITION option makes `position1.x` throw a `TypeError` (Java's NullPointerException,
   * CrossingMinimizationPosition.java:72: the property has no default).
   *
   * @param node1 The first node for checking the crossing.
   * @param node2 The second node for checking the crossing.
   * @return Returns if the lines of the nodes are crossing.
   */
  private isCrossing(node1: ElkNode, node2: ElkNode): boolean {
    const root = this.root as ElkNode;
    // root
    const rootX = root.getX() + root.getWidth() / 2;
    // upstream oddity kept verbatim (CrossingMinimizationPosition.java:64): rootY is computed from the root's X and width
    const rootY = root.getX() + root.getWidth() / 2;

    // node1
    const xPos1 = node1.getX() + node1.getWidth() / 2;
    const yPos1 = node1.getY() + node1.getHeight() / 2;
    const node1Vector = new KVector(xPos1, yPos1);

    // upstream oddity kept verbatim (:71-73, :83-85): the node's own POSITION KVector is mutated in place
    const position1 = node1.getProperty(CoreOptions.POSITION);
    position1.x = position1.x + rootX;
    position1.y = position1.y + rootY;

    const m1 = (node1Vector.y - position1.y) / (node1Vector.x - position1.x);
    const b1 = node1Vector.y - m1 * node1Vector.x;

    // node2
    const xPos2 = node2.getX() + node2.getWidth() / 2;
    const yPos2 = node2.getY() + node2.getHeight() / 2;
    const node2Vector = new KVector(xPos2, yPos2);

    const position2 = node2.getProperty(CoreOptions.POSITION);
    position2.x = position2.x + rootX;
    position2.y = position2.y + rootY;

    const m2 = (node2Vector.y - position2.y) / (node2Vector.x - position2.x);
    const b2 = node2Vector.y - m2 * node2Vector.x;

    const xCut = (b1 - b2) / (m2 - m1);
    // check whether the cut occurs on the relevant line segment
    if ((position1.x < xCut && node1Vector.x < xCut) || (xCut < position1.x && xCut < node1Vector.x)) {
      return false;
    } else if ((position2.x < xCut && node2Vector.x < xCut) || (xCut < position2.x && xCut < node2Vector.x)) {
      return false;
    }
    return true;
  }
}
