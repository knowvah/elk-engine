// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { LEdge } from '../../../graph/LEdge.js';
import type { LPort } from '../../../graph/LPort.js';
import type { HyperEdgeSegment } from '../HyperEdgeSegment.js';
import { ORTHOGONAL_ROUTING_TOLERANCE } from '../OrthogonalRoutingGeneratorTolerance.js';
import { BaseRoutingDirectionStrategy, type BendPointTrunk } from './BaseRoutingDirectionStrategy.js';

/**
 * Routing strategy for routing layers from south to north.
 *
 * `calculateBendPoints` is split after the check of the edge's ends (complexity limits): the per-edge part is
 * {@link SouthToNorthRoutingStrategy.routeEdge}, with the segment, its trunk position and the spacing parameters bundled in a
 * {@link BendPointTrunk}; the Java order of the statements is unchanged.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/direction/SouthToNorthRoutingStrategy.java
 */
export class SouthToNorthRoutingStrategy extends BaseRoutingDirectionStrategy {
  /** @see SouthToNorthRoutingStrategy.java:30 */
  getPortPositionOnHyperNode(port: LPort): number {
    return port.getNode()!.getPosition().x + port.getPosition().x + port.getAnchor().x;
  }

  /** @see SouthToNorthRoutingStrategy.java:35 */
  getSourcePortSide(): PortSide {
    return PortSide.NORTH;
  }

  /** @see SouthToNorthRoutingStrategy.java:40 */
  getTargetPortSide(): PortSide {
    return PortSide.SOUTH;
  }

  /** @see SouthToNorthRoutingStrategy.java:45 */
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
      segmentPosition: startPos - segment.getRoutingSlot() * edgeSpacing,
    };

    for (const port of segment.getPorts()) {
      const sourceX = port.getAbsoluteAnchor().x;

      for (const edge of port.getOutgoingEdges()) {
        if (!edge.isSelfLoop()) {
          const target = edge.getTarget()!;
          const targetX = target.getAbsoluteAnchor().x;

          if (Math.abs(sourceX - targetX) > ORTHOGONAL_ROUTING_TOLERANCE) {
            this.routeEdge(edge, trunk, sourceX, targetX);
          }
        }
      }
    }
  }

  /** The body of the innermost `if` of `calculateBendPoints` (SouthToNorthRoutingStrategy.java:63-92). */
  private routeEdge(edge: LEdge, trunk: BendPointTrunk, sourceX: number, targetX: number): void {
    // We'll update these if we find that the segment was split
    let currentY = trunk.segmentPosition;
    let currentSegment = trunk.segment;

    let bend = new KVector(sourceX, currentY);
    edge.getBendPoints().add(bend);
    this.addJunctionPointIfNecessary(edge, currentSegment, bend, false);

    // If this segment was split, we need two additional bend points
    const splitPartner = trunk.segment.getSplitPartner();
    if (splitPartner !== null) {
      const splitX = splitPartner.getIncomingConnectionCoordinates().get(0);

      bend = new KVector(splitX, currentY);
      edge.getBendPoints().add(bend);
      this.addJunctionPointIfNecessary(edge, currentSegment, bend, false);

      // Advance to the split partner's routing slot
      currentY = trunk.startPos - splitPartner.getRoutingSlot() * trunk.edgeSpacing;
      currentSegment = splitPartner;

      bend = new KVector(splitX, currentY);
      edge.getBendPoints().add(bend);
      this.addJunctionPointIfNecessary(edge, currentSegment, bend, false);
    }

    bend = new KVector(targetX, currentY);
    edge.getBendPoints().add(bend);
    this.addJunctionPointIfNecessary(edge, currentSegment, bend, false);
  }
}
