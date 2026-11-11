// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { type ElkNode, isElkNode } from '../../../../graph/ElkNode.js';
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { InternalProperties } from '../../InternalProperties.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import type { IRadialRotator } from './IRadialRotator.js';

const ELK_NODE_CLASS = 'org.eclipse.elk.graph.ElkNode';

/**
 * Rotates the entire layout around the origin to a set target angle.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/rotation/AngleRotation.java
 */
export class AngleRotation implements IRadialRotator {
  rotate(graph: ElkNode): void {
    let targetAngle = graph.getProperty(RadialOptions.ROTATION_TARGET_ANGLE);

    if (graph.getProperty(RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE)) {
      targetAngle = AngleRotation.alignToWedge(graph, targetAngle);
    }

    // rotate all nodes around the origin, because the root node is positioned at the origin
    // nodes are positioned with their center on the radius so use that for the rotation
    for (const node of graph.getChildren()) {
      const pos = new KVector(node.getX() + node.getWidth() / 2, node.getY() + node.getHeight() / 2);
      pos.rotate(targetAngle);
      node.setLocation(pos.x - node.getWidth() / 2, pos.y - node.getHeight() / 2);
    }
  }

  /**
   * The body of the `if (ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE)` block of AngleRotation.java:31-72, split out of `rotate`
   * for the 30-line limit of this port: the centers of the last and the first node of the root's outgoing edges, in the
   * order of the Java (last node first, so that an empty list fails at `get(size - 1)`, AngleRotation.java:37).
   */
  private static centersOfLastAndFirst(root: ElkNode): [KVector, KVector] {
    // `get(size - 1)` on an empty list throws the IndexOutOfBoundsException of AngleRotation.java:37 (index=-1)
    const lastEdge = root.getOutgoingEdges().get(root.getOutgoingEdges().size() - 1);
    const lastNode = checkCast(lastEdge.getTargets().get(0), isElkNode, ELK_NODE_CLASS) as ElkNode;
    const firstNode = checkCast(
      root.getOutgoingEdges().get(0).getTargets().get(0),
      isElkNode,
      ELK_NODE_CLASS,
    ) as ElkNode;
    const lastVector = new KVector(
      lastNode.getX() + lastNode.getWidth() / 2,
      lastNode.getY() + lastNode.getHeight() / 2,
    );
    const firstVector = new KVector(
      firstNode.getX() + firstNode.getWidth() / 2,
      firstNode.getY() + firstNode.getHeight() / 2,
    );
    return [lastVector, firstVector];
  }

  /** The rest of that block: the target angle that centers the wedge between the first and last node on the incoming angle. */
  private static alignToWedge(graph: ElkNode, targetAngle: number): number {
    // Using the target angle as our base alignment we want to further rotate the layout such that a line
    // following the target angle runs directly through the middle of the wedge between the first and last node.
    const root = graph.getProperty(InternalProperties.ROOT_NODE);
    const [lastVector, firstVector] = AngleRotation.centersOfLastAndFirst(root);

    // we shift all angles into the range (0,pi] to avoid dealing with negative angles.
    let alpha = targetAngle;
    if (alpha <= 0) {
      alpha += 2 * Math.PI;
    }

    let wedgeAngle = lastVector.angle(firstVector);
    if (wedgeAngle <= 0) {
      wedgeAngle += 2 * Math.PI;
    }

    let alignmentAngle = Math.atan2(lastVector.y, lastVector.x);
    if (alignmentAngle <= 0) {
      alignmentAngle += 2 * Math.PI;
    }

    // alpha (originally targetAngle) is the angle of the incoming edge that we wish to align ourselves with.
    // wedgeAngle is the angle between the first and last nodes of our own layout. For the case of a single
    // node this is 360 degrees.
    // alignmentAngle is the angle of the vector pointing to the last node i.e. the end part of the segment
    // we rotate the entire layout by subtracting the incoming angle alpha and we add half the wedge angle back
    // to make the alignment go through the center of the wedge. Finally, we need to do a transformation to
    // make all this work in our downward facing coordinate system. So everything is inverted and we need subtract
    // the result from 180 degrees.
    return Math.PI - (alignmentAngle - alpha + wedgeAngle / 2);
  }
}
