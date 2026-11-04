// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { LEdge } from '../../../graph/LEdge.js';
import type { LPort } from '../../../graph/LPort.js';
import type { HyperEdgeSegment } from '../HyperEdgeSegment.js';
import { ORTHOGONAL_ROUTING_TOLERANCE } from '../OrthogonalRoutingGeneratorTolerance.js';
import { BaseRoutingDirectionStrategy, type BendPointTrunk } from './BaseRoutingDirectionStrategy.js';

/**
 * Routing strategy for routing layers from west to east.
 *
 * `calculateBendPoints` is split after the check of the edge's ends (complexity limits): the per-edge part is
 * {@link WestToEastRoutingStrategy.routeEdge}, with the segment, its trunk position and the spacing parameters bundled in a
 * {@link BendPointTrunk}; the Java order of the statements is unchanged.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/direction/WestToEastRoutingStrategy.java
 */
export class WestToEastRoutingStrategy extends BaseRoutingDirectionStrategy {
  /** @see WestToEastRoutingStrategy.java:30 */
  getPortPositionOnHyperNode(port: LPort): number {
    return port.getNode()!.getPosition().y + port.getPosition().y + port.getAnchor().y;
  }

  /** @see WestToEastRoutingStrategy.java:35 */
  getSourcePortSide(): PortSide {
    return PortSide.EAST;
  }

  /** @see WestToEastRoutingStrategy.java:40 */
  getTargetPortSide(): PortSide {
    return PortSide.WEST;
  }

  /** @see WestToEastRoutingStrategy.java:45 */
  calculateBendPoints(segment: HyperEdgeSegment, startPos: number, edgeSpacing: number): void {
    // We don't do anything with dummy segments; they are dealt with when their partner is processed
    if (segment.isDummy()) {
      return;
    }

    // Calculate coordinates for each port's bend points
    const trunk: BendPointTrunk = {
      segment,
      startPos,
      edgeSpacing,
      segmentPosition: startPos + segment.getRoutingSlot() * edgeSpacing,
    };

    for (const port of segment.getPorts()) {
      const sourceY = port.getAbsoluteAnchor().y;

      for (const edge of port.getOutgoingEdges()) {
        if (!edge.isSelfLoop()) {
          const target = edge.getTarget()!;
          const targetY = target.getAbsoluteAnchor().y;

          if (Math.abs(sourceY - targetY) > ORTHOGONAL_ROUTING_TOLERANCE) {
            this.routeEdge(edge, trunk, sourceY, targetY);
          }
        }
      }
    }
  }

  /** The body of the innermost `if` of `calculateBendPoints` (WestToEastRoutingStrategy.java:63-92). */
  private routeEdge(edge: LEdge, trunk: BendPointTrunk, sourceY: number, targetY: number): void {
    // We'll update these if we find that the segment was split
    let currentX = trunk.segmentPosition;
    let currentSegment = trunk.segment;

    let bend = new KVector(currentX, sourceY);
    edge.getBendPoints().add(bend);
    this.addJunctionPointIfNecessary(edge, currentSegment, bend, true);

    // If this segment was split, we need two additional bend points
    const splitPartner = trunk.segment.getSplitPartner();
    if (splitPartner !== null) {
      const splitY = splitPartner.getIncomingConnectionCoordinates().get(0);

      bend = new KVector(currentX, splitY);
      edge.getBendPoints().add(bend);
      this.addJunctionPointIfNecessary(edge, currentSegment, bend, true);

      // Advance to the split partner's routing slot
      currentX = trunk.startPos + splitPartner.getRoutingSlot() * trunk.edgeSpacing;
      currentSegment = splitPartner;

      bend = new KVector(currentX, splitY);
      edge.getBendPoints().add(bend);
      this.addJunctionPointIfNecessary(edge, currentSegment, bend, true);
    }

    bend = new KVector(currentX, targetY);
    edge.getBendPoints().add(bend);
    this.addJunctionPointIfNecessary(edge, currentSegment, bend, true);
  }
}
