// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
import type { PortSide } from '../../../../../core/options/PortSide.js';
import * as Sets from '../../../../../guava/Sets.js';
import { hashable } from '../../../../../java/util/HashStrategy.js';
import type { JavaHashSet } from '../../../../../java/util/JavaHashSet.js';
import type { LEdge } from '../../../graph/LEdge.js';
import type { LPort } from '../../../graph/LPort.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import type { HyperEdgeSegment } from '../HyperEdgeSegment.js';
import { ORTHOGONAL_ROUTING_TOLERANCE } from '../OrthogonalRoutingGeneratorTolerance.js';

/**
 * The segment a strategy computes bend points for, with its trunk position (`segmentX` / `segmentY` of the Java) and
 * the two parameters `calculateBendPoints` received. Bundles what the per-edge helper of each strategy needs, so the
 * helper stays within the parameter limit.
 */
export interface BendPointTrunk {
  readonly segment: HyperEdgeSegment;
  readonly startPos: number;
  readonly edgeSpacing: number;
  readonly segmentPosition: number;
}

/**
 * A routing direction strategy adapts the {@link OrthogonalRoutingGenerator} to different routing directions.
 * Commonly, edges are routed from a left source layer to a right target layer. However, with northern and southern
 * external ports, this can be different. Routing direction strategies abstract from the actual direction.
 *
 * Use `forRoutingDirection` (the module function in `BaseRoutingDirectionStrategyForRoutingDirection.ts`: the factory
 * reaches the three subclasses, which extend this class, so a static here would close an import cycle at the base
 * class) to obtain a routing direction strategy for a given {@link RoutingDirection}.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/direction/BaseRoutingDirectionStrategy.java
 */
export abstract class BaseRoutingDirectionStrategy {
  /**
   * Set of already created junction points, to avoid multiple points at the same position. Membership only (AD-10,
   * R9): `KVector.equals` semantics through a hash strategy; never iterated.
   *
   * @see BaseRoutingDirectionStrategy.java:44
   */
  private readonly createdJunctionPoints: JavaHashSet<KVector> = Sets.newHashSet(hashable<KVector>());

  /**
   * Add a junction point to the given edge if necessary. It is necessary to add a junction point if the bend point is
   * not at one of the two end positions of the hyperedge segment.
   *
   * @param edge an edge
   * @param segment the corresponding hyperedge segment
   * @param pos the bend point position
   * @param vertical `true` if the connecting segment is vertical, `false` if it is horizontal
   * @see BaseRoutingDirectionStrategy.java:87
   */
  protected addJunctionPointIfNecessary(edge: LEdge, segment: HyperEdgeSegment, pos: KVector, vertical: boolean): void {
    const p = vertical ? pos.y : pos.x;

    // If we already have this junction point, don't bother
    if (this.createdJunctionPoints.contains(pos)) {
      return;
    }

    // Whether the point lies somewhere inside the edge segment (without boundaries)
    const pointInsideEdgeSegment = p > segment.getStartCoordinate() && p < segment.getEndCoordinate();

    // Check if the point lies somewhere at the segment's boundary
    const pointAtSegmentBoundary = BaseRoutingDirectionStrategy.isPointAtSegmentBoundary(p, segment);

    if (pointInsideEdgeSegment || pointAtSegmentBoundary) {
      // create a new junction point for the edge at the bend point's position
      let junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
      if (junctionPoints === null) {
        junctionPoints = new KVectorChain();
        edge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
      }

      const jpoint = new KVector(pos);
      junctionPoints.add(jpoint);
      this.createdJunctionPoints.add(jpoint);
    }
  }

  /**
   * The block of `addJunctionPointIfNecessary` that computes `pointAtSegmentBoundary` (`:101-118`), split from the Java
   * method body (complexity limits); the two `|=` terms keep their order.
   */
  private static isPointAtSegmentBoundary(p: number, segment: HyperEdgeSegment): boolean {
    let pointAtSegmentBoundary = false;
    const incoming = segment.getIncomingConnectionCoordinates();
    const outgoing = segment.getOutgoingConnectionCoordinates();
    if (!incoming.isEmpty() && !outgoing.isEmpty()) {
      // Is the bend point at the start and joins another edge at the same position?
      pointAtSegmentBoundary ||=
        Math.abs(p - incoming.getFirst()) < ORTHOGONAL_ROUTING_TOLERANCE &&
        Math.abs(p - outgoing.getFirst()) < ORTHOGONAL_ROUTING_TOLERANCE;

      // Is the bend point at the end and joins another edge at the same position?
      pointAtSegmentBoundary ||=
        Math.abs(p - incoming.getLast()) < ORTHOGONAL_ROUTING_TOLERANCE &&
        Math.abs(p - outgoing.getLast()) < ORTHOGONAL_ROUTING_TOLERANCE;
    }
    return pointAtSegmentBoundary;
  }

  /**
   * Returns the set of junction points created so far.
   *
   * @see BaseRoutingDirectionStrategy.java:137
   */
  getCreatedJunctionPoints(): JavaHashSet<KVector> {
    return this.createdJunctionPoints;
  }

  /**
   * Removes all junction points created so far.
   *
   * @see BaseRoutingDirectionStrategy.java:144
   */
  clearCreatedJunctionPoints(): void {
    this.createdJunctionPoints.clear();
  }

  /**
   * Returns the port's position on a hyper edge axis. In the west-to-east routing case, this would be the port's
   * exact y coordinate.
   *
   * @param port the port.
   * @return the port's coordinate on the hyper edge axis.
   * @see BaseRoutingDirectionStrategy.java:159
   */
  abstract getPortPositionOnHyperNode(port: LPort): number;

  /**
   * Returns the side of ports that should be considered on a source layer. For a west-to-east routing, this would
   * probably be the eastern ports of each western layer.
   *
   * @return the side of ports to be considered in the source layer.
   * @see BaseRoutingDirectionStrategy.java:167
   */
  abstract getSourcePortSide(): PortSide;

  /**
   * Returns the side of ports that should be considered on a target layer. For a west-to-east routing, this would
   * probably be the western ports of each eastern layer.
   *
   * @return the side of ports to be considered in the target layer.
   * @see BaseRoutingDirectionStrategy.java:175
   */
  abstract getTargetPortSide(): PortSide;

  /**
   * Calculates and assigns bend points for edges incident to the ports belonging to the given hyper edge.
   *
   * @param hyperNode the hyper edge.
   * @param startPos the position of the trunk of the first hyper edge between the layers. This position, together with
   *   the current hyper node's rank allows the calculation of the hyper node's trunk's position.
   * @param edgeSpacing spacing between adjacent edges. This is used to turn an edge segment's routing slot into a
   *   proper position.
   * @see BaseRoutingDirectionStrategy.java:189
   */
  abstract calculateBendPoints(hyperNode: HyperEdgeSegment, startPos: number, edgeSpacing: number): void;
}
