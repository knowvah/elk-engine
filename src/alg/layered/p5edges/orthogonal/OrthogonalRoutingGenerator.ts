// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { LinkedList } from '../../../../java/util/LinkedList.js';
import type { Random } from '../../../../java/util/Random.js';
import { DebugUtil } from '../../DebugUtil.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { PortType } from '../../options/PortType.js';
import type { BaseRoutingDirectionStrategy } from './direction/BaseRoutingDirectionStrategy.js';
import { forRoutingDirection } from './direction/BaseRoutingDirectionStrategyForRoutingDirection.js';
import type { RoutingDirection } from './direction/RoutingDirection.js';
import { HyperEdgeCycleDetector } from './HyperEdgeCycleDetector.js';
import { HyperEdgeSegment } from './HyperEdgeSegment.js';
import { HyperEdgeSegmentDependency } from './HyperEdgeSegmentDependency.js';
import { HyperEdgeSegmentSplitter } from './HyperEdgeSegmentSplitter.js';
import {
  countConflicts,
  countCrossings,
  CRITICAL_CONFLICTS_DETECTED,
  minimumDifference,
} from './OrthogonalRoutingGeneratorConflicts.js';
import { breakNonCriticalCycles, topologicalNumbering } from './OrthogonalRoutingGeneratorCycles.js';
import { ORTHOGONAL_ROUTING_TOLERANCE } from './OrthogonalRoutingGeneratorTolerance.js';

/** The last four parameters of Java's `routeEdges` (`:159-161`), a rest tuple (complexity limits: five parameters). */
type RouteEdgesLayers = [
  sourceLayerNodes: Iterable<LNode> | null,
  sourceLayerIndex: number,
  targetLayerNodes: Iterable<LNode> | null,
  startPos: number,
];

/** The layer index, source layer index and kind of a debug graph (`:190-198`, `:212-220`), a rest tuple. */
type DebugGraphLabel = [layerIndex: number, sourceLayerIndex: number, kind: 'full' | 'acyclic'];

/**
 * Edge routing implementation that creates orthogonal bend points. Inspired by:
 *
 * - Georg Sander. Layout of directed hypergraphs with orthogonal hyperedges. In _Proceedings of the 11th International
 *   Symposium on Graph Drawing (GD '03)_, volume 2912 of LNCS, pp. 381-386. Springer, 2004.
 * - Giuseppe di Battista, Peter Eades, Roberto Tamassia, Ioannis G. Tollis, _Graph Drawing: Algorithms for the
 *   Visualization of Graphs_, Prentice Hall, New Jersey, 1999 (Section 9.4, for cycle breaking in the hyperedge segment
 *   graph)
 *
 * This is a generic implementation that can be applied to all four routing directions. Usually, edges will be routed
 * from west to east. However, with northern and southern external ports, this changes: edges are routed from south to
 * north and north to south, respectively. To support these different requirements, the routing direction-related code
 * is factored out into routing strategies.
 *
 * When instantiating a new routing generator, the concrete directional strategy must be specified. Once that is done,
 * {@link routeEdges} is called repeatedly to route edges between given lists of nodes.
 *
 * Sections behind this facade (file-size limit): `OrthogonalRoutingGeneratorConflicts.ts` (`minimumDifference`,
 * `countConflicts`, `countCrossings`) and `OrthogonalRoutingGeneratorCycles.ts` (`breakNonCriticalCycles`,
 * `topologicalNumbering`). The static `countCrossings` and `breakNonCriticalCycles` are kept here under their Java
 * names and delegate.
 *
 * AD-10: `portToEdgeSegmentMap` (`Maps.newHashMap`, `:164`) is only read by key, so it is a plain `Map`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/OrthogonalRoutingGenerator.java
 */
export class OrthogonalRoutingGenerator {
  /** differences below this tolerance value are treated as zero. */
  static readonly TOLERANCE: number = ORTHOGONAL_ROUTING_TOLERANCE;

  /** factor for edge spacing used to determine the {@link conflictThreshold} (determined experimentally). */
  private static readonly CONFLICT_THRESHOLD_FACTOR = 0.5;
  /** factor to compute {@link criticalConflictThreshold} (determined experimentally). */
  private static readonly CRITICAL_CONFLICT_THRESHOLD_FACTOR = 0.2;

  /** weight penalty for (non-critical) conflicts. */
  private static readonly CONFLICT_PENALTY = 1;
  /** weight penalty for crossings. */
  private static readonly CROSSING_PENALTY = 16;

  /** we'll be using this thing to split hyper edge segments, if necessary. */
  private segmentSplitter: HyperEdgeSegmentSplitter | null = null;

  /** routing direction strategy. */
  private readonly routingStrategy: BaseRoutingDirectionStrategy;
  /** spacing between edges. */
  private readonly edgeSpacing: number;

  /**
   * Threshold at which horizontal line segments are considered to be too close to one another. A conflict will cause
   * the involved hyperedges to be assigned to different routing slots in order to resolve the conflict.
   *
   * This value is a constant fraction of the edge spacing.
   */
  private readonly conflictThreshold: number;
  /**
   * Threshold at which horizontal line segments are considered to overlap. A critical conflict will cause the involved
   * hyperedges to be assigned to different routing slots in order to resolve the critical conflict. If there is a
   * cycle of critical conflicts, there is no assignment that will resolve all overlaps. This will result in one of the
   * involved hyperedges to be split into two vertical segments.
   *
   * This value depends on how close edges from the source layer and edges from the target layer come to each other,
   * respectively. We cannot change that. The critical conflict threshold is thus a fraction of that minimum proximity
   * and is different for each pair of layers. Hence, this is not a constant.
   */
  private criticalConflictThreshold = 0;

  /** prefix of debug output files. */
  private readonly debugPrefix: string | null;

  /**
   * Constructs a new instance.
   *
   * @param direction the direction edges should point at.
   * @param edgeSpacing the space between edges.
   * @param debugPrefix prefix of debug output files, or `null` if no debug output should be generated.
   * @see OrthogonalRoutingGenerator.java:129
   */
  constructor(direction: RoutingDirection, edgeSpacing: number, debugPrefix: string | null) {
    this.routingStrategy = forRoutingDirection(direction);
    this.edgeSpacing = edgeSpacing;
    this.conflictThreshold = OrthogonalRoutingGenerator.CONFLICT_THRESHOLD_FACTOR * edgeSpacing;
    this.debugPrefix = debugPrefix;
  }

  /**
   * Route edges between the given layers. The Java signature is `routeEdges(monitor, layeredGraph, sourceLayerNodes,
   * sourceLayerIndex, targetLayerNodes, startPos)`; the last four parameters are a rest tuple here (complexity limits:
   * at most five parameters), so every call keeps the Java argument list.
   *
   * @param monitor the progress monitor we're using.
   * @param layeredGraph the layered graph.
   * @param rest `sourceLayerNodes` (the left layer, may be `null`), `sourceLayerIndex` (the source layer's index,
   *   ignored if there is no source layer), `targetLayerNodes` (the right layer, may be `null`) and `startPos`
   *   (horizontal position of the first routing slot)
   * @returns the number of routing slots for this layer
   * @see OrthogonalRoutingGenerator.java:159
   */
  routeEdges(monitor: IElkProgressMonitor, layeredGraph: LGraph, ...rest: RouteEdgesLayers): number {
    const [sourceLayerNodes, sourceLayerIndex, targetLayerNodes, startPos] = rest;

    // Keep track of our hyperedge segements, and which ports they were created for
    const portToEdgeSegmentMap = new Map<LPort, HyperEdgeSegment>();
    const edgeSegments: HyperEdgeSegment[] = [];

    // create hyperedge segments for eastern output ports of the left layer and for western output ports of the
    // right layer
    this.createHyperEdgeSegmentsOfBothLayers(sourceLayerNodes, targetLayerNodes, edgeSegments, portToEdgeSegmentMap);

    // Our critical conflict threshold is a fraction of the minimum distance between two horizontal hyperedge
    // segments
    this.criticalConflictThreshold =
      OrthogonalRoutingGenerator.CRITICAL_CONFLICT_THRESHOLD_FACTOR *
      this.minimumHorizontalSegmentDistance(edgeSegments);

    // create dependencies for the hyperedge segment ordering graph and note how many critical dependencies have
    // been created
    const criticalDependencyCount = this.createDependencies(edgeSegments);

    // write the full dependency graph to an output file
    // elkjs-exclude-start
    const debugLayerIndex = sourceLayerNodes === null ? 0 : sourceLayerIndex + 1;
    this.logDebugGraph(monitor, layeredGraph, edgeSegments, debugLayerIndex, sourceLayerIndex, 'full');
    // elkjs-exclude-end

    // if there are at least two critical dependencies, there may be critical cycles that need to be broken
    const random = layeredGraph.getProperty(InternalProperties.RANDOM)!;
    if (criticalDependencyCount >= 2) {
      this.breakCriticalCycles(edgeSegments, random);
    }

    // break non-critical cycles
    OrthogonalRoutingGenerator.breakNonCriticalCycles(edgeSegments, random);

    // write the acyclic dependency graph to an output file
    // elkjs-exclude-start
    this.logDebugGraph(monitor, layeredGraph, edgeSegments, debugLayerIndex, sourceLayerIndex, 'acyclic');
    // elkjs-exclude-end

    // assign ranks to the edge segments
    topologicalNumbering(edgeSegments);

    // set bend points with appropriate coordinates
    const rankCount = this.calculateBendPoints(edgeSegments, startPos);

    // release the created resources
    this.routingStrategy.clearCreatedJunctionPoints();
    return rankCount + 1;
  }

  /**
   * The two calls of `createHyperEdgeSegments` at the start of `routeEdges` (`:169-172`), split from the Java method
   * body (complexity limits): the eastern output ports of the left layer, then the western output ports of the right
   * layer.
   */
  private createHyperEdgeSegmentsOfBothLayers(
    sourceLayerNodes: Iterable<LNode> | null,
    targetLayerNodes: Iterable<LNode> | null,
    edgeSegments: HyperEdgeSegment[],
    portToEdgeSegmentMap: Map<LPort, HyperEdgeSegment>,
  ): void {
    this.createHyperEdgeSegments(
      sourceLayerNodes,
      this.routingStrategy.getSourcePortSide(),
      edgeSegments,
      portToEdgeSegmentMap,
    );
    this.createHyperEdgeSegments(
      targetLayerNodes,
      this.routingStrategy.getTargetPortSide(),
      edgeSegments,
      portToEdgeSegmentMap,
    );
  }

  /**
   * The double `for` loop of `routeEdges` that creates the dependencies between all pairs of segments (`:181-186`),
   * split from the Java method body (complexity limits).
   *
   * @returns the number of critical dependencies created
   */
  private createDependencies(edgeSegments: HyperEdgeSegment[]): number {
    let criticalDependencyCount = 0;
    for (let firstIdx = 0; firstIdx < edgeSegments.length - 1; firstIdx++) {
      const firstSegment = edgeSegments[firstIdx]!;
      for (let secondIdx = firstIdx + 1; secondIdx < edgeSegments.length; secondIdx++) {
        criticalDependencyCount += this.createDependencyIfNecessary(firstSegment, edgeSegments[secondIdx]!);
      }
    }
    return criticalDependencyCount;
  }

  /**
   * The loop at the end of `routeEdges` that sets the bend points (`:227-237`), split from the Java method body
   * (complexity limits).
   *
   * @returns the highest routing slot of a segment that is not a straight line, or `-1` if there is none
   */
  private calculateBendPoints(edgeSegments: HyperEdgeSegment[], startPos: number): number {
    let rankCount = -1;
    for (const node of edgeSegments) {
      // edges that are just straight lines don't take up a slot and don't need bend points
      if (Math.abs(node.getStartCoordinate() - node.getEndCoordinate()) < OrthogonalRoutingGenerator.TOLERANCE) {
        continue;
      }

      rankCount = Math.max(rankCount, node.getRoutingSlot());

      this.routingStrategy.calculateBendPoints(node, startPos, this.edgeSpacing);
    }
    return rankCount;
  }

  /**
   * The two guarded `DebugUtil.logDebugGraph` calls of `routeEdges` (`:190-198`, `:212-220`; the label is
   * `sourceLayerIndex + "-" + kind`), split from the Java method body (complexity limits). The guard and the call are
   * verbatim; `DebugUtil.logDebugGraphHyperedges` throws until mission 7f.
   *
   * @param rest the layer index handed to the debug graph (`sourceLayerNodes == null ? 0 : sourceLayerIndex + 1`),
   *   the source layer index of the label, and the kind of graph
   */
  private logDebugGraph(
    monitor: IElkProgressMonitor,
    layeredGraph: LGraph,
    edgeSegments: HyperEdgeSegment[],
    ...rest: DebugGraphLabel
  ): void {
    const [layerIndex, sourceLayerIndex, kind] = rest;
    if (this.debugPrefix !== null && monitor.isLoggingEnabled()) {
      DebugUtil.logDebugGraphHyperedges(
        monitor,
        layeredGraph,
        layerIndex,
        edgeSegments,
        this.debugPrefix,
        `${String(sourceLayerIndex)}-${kind}`,
      );
    }
  }

  /**
   * Computes and returns the minimum distance between any two adjacent source connections and any two adjacent target
   * connections.
   *
   * @see OrthogonalRoutingGenerator.java:248
   */
  private minimumHorizontalSegmentDistance(edgeSegments: HyperEdgeSegment[]): number {
    const minIncomingDistance = minimumDifference(
      edgeSegments.flatMap((segment) => [...segment.getIncomingConnectionCoordinates()]),
    );
    const minOutgoingDistance = minimumDifference(
      edgeSegments.flatMap((segment) => [...segment.getOutgoingConnectionCoordinates()]),
    );

    return Math.min(minIncomingDistance, minOutgoingDistance);
  }

  /**
   * Creates hyperedge segments for the given layer.
   *
   * @param nodes the layer. May be `null`, in which case nothing happens.
   * @param portSide side of the output ports for whose outgoing edges hyperedge segments should be created.
   * @param hyperEdges list the created hyperedge segments should be added to.
   * @param portToHyperEdgeSegmentMap map from ports to hyperedge segments that should be filled.
   * @see OrthogonalRoutingGenerator.java:298
   */
  private createHyperEdgeSegments(
    nodes: Iterable<LNode> | null,
    portSide: PortSide,
    hyperEdges: HyperEdgeSegment[],
    portToHyperEdgeSegmentMap: Map<LPort, HyperEdgeSegment>,
  ): void {
    if (nodes !== null) {
      for (const node of nodes) {
        for (const port of node.getPorts(PortType.OUTPUT, portSide)) {
          let hyperEdge = portToHyperEdgeSegmentMap.get(port);
          if (hyperEdge === undefined) {
            hyperEdge = new HyperEdgeSegment(this.routingStrategy);
            hyperEdges.push(hyperEdge);
            hyperEdge.addPortPositions(port, portToHyperEdgeSegmentMap);
          }
        }
      }
    }
  }

  /**
   * Create dependencies between the two given hyperedge segments, if one is needed. This method is used not just here,
   * but also by {@link HyperEdgeSegmentSplitter}.
   *
   * @param he1 first hyperedge segments
   * @param he2 second hyperedge segments
   * @returns the number of critical dependencies that were added
   * @see OrthogonalRoutingGenerator.java:325
   */
  createDependencyIfNecessary(he1: HyperEdgeSegment, he2: HyperEdgeSegment): number {
    // check if at least one of the two nodes is just a straight line; those don't
    // create dependencies since they don't take up a slot
    if (
      Math.abs(he1.getStartCoordinate() - he1.getEndCoordinate()) < OrthogonalRoutingGenerator.TOLERANCE ||
      Math.abs(he2.getStartCoordinate() - he2.getEndCoordinate()) < OrthogonalRoutingGenerator.TOLERANCE
    ) {
      return 0;
    }

    // compare number of conflicts for both variants
    const conflicts1 = this.countConflicts(
      he1.getOutgoingConnectionCoordinates(),
      he2.getIncomingConnectionCoordinates(),
    );
    const conflicts2 = this.countConflicts(
      he2.getOutgoingConnectionCoordinates(),
      he1.getIncomingConnectionCoordinates(),
    );

    const criticalConflictsDetected =
      conflicts1 === CRITICAL_CONFLICTS_DETECTED || conflicts2 === CRITICAL_CONFLICTS_DETECTED;
    let criticalDependencyCount = 0;

    if (criticalConflictsDetected) {
      criticalDependencyCount = OrthogonalRoutingGenerator.createCriticalDependencies(he1, he2, conflicts1, conflicts2);
    } else {
      this.createRegularDependencies(he1, he2, conflicts1, conflicts2);
    }

    return criticalDependencyCount;
  }

  /**
   * The `if (criticalConflictsDetected)` branch of `createDependencyIfNecessary` (`:342-355`): adds the critical
   * dependencies. Split from the Java method body (complexity limits).
   *
   * @returns the number of critical dependencies added
   */
  private static createCriticalDependencies(
    he1: HyperEdgeSegment,
    he2: HyperEdgeSegment,
    conflicts1: number,
    conflicts2: number,
  ): number {
    let criticalDependencyCount = 0;

    // Check which critical dependencies have to be added
    if (conflicts1 === CRITICAL_CONFLICTS_DETECTED) {
      // hyperedge 1 MUST NOT be left of hyperedge 2, since that would cause critical conflicts
      HyperEdgeSegmentDependency.createAndAddCritical(he2, he1);
      criticalDependencyCount++;
    }

    if (conflicts2 === CRITICAL_CONFLICTS_DETECTED) {
      // hyperedge 2 MUST NOT be left of hyperedge 1, since that would cause critical conflicts
      HyperEdgeSegmentDependency.createAndAddCritical(he1, he2);
      criticalDependencyCount++;
    }

    return criticalDependencyCount;
  }

  /**
   * The `else` branch of `createDependencyIfNecessary` (`:356-382`): no critical conflicts were detected, so count the
   * crossings for both variants and add the regular dependencies. Split from the Java method body (complexity limits).
   */
  private createRegularDependencies(
    he1: HyperEdgeSegment,
    he2: HyperEdgeSegment,
    conflicts1: number,
    conflicts2: number,
  ): void {
    // we did not detect critical conflicts, so count the number of crossings for both variants
    const crossings1 = OrthogonalRoutingGenerator.countCrossingsOfVariant(he1, he2);
    const crossings2 = OrthogonalRoutingGenerator.countCrossingsOfVariant(he2, he1);

    // compute the penalty; crossings are deemed worse than (non-critical) conflicts
    const depValue1 =
      OrthogonalRoutingGenerator.CONFLICT_PENALTY * conflicts1 +
      OrthogonalRoutingGenerator.CROSSING_PENALTY * crossings1;
    const depValue2 =
      OrthogonalRoutingGenerator.CONFLICT_PENALTY * conflicts2 +
      OrthogonalRoutingGenerator.CROSSING_PENALTY * crossings2;

    if (depValue1 < depValue2) {
      // hyperedge 1 wants to be left of hyperedge 2
      HyperEdgeSegmentDependency.createAndAddRegular(he1, he2, depValue2 - depValue1);
    } else if (depValue1 > depValue2) {
      // hyperedge 2 wants to be left of hyperedge 1
      HyperEdgeSegmentDependency.createAndAddRegular(he2, he1, depValue1 - depValue2);
    } else if (depValue1 > 0 && depValue2 > 0) {
      // create two dependencies with zero weight
      HyperEdgeSegmentDependency.createAndAddRegular(he1, he2, 0);
      HyperEdgeSegmentDependency.createAndAddRegular(he2, he1, 0);
    }
  }

  /**
   * The crossings of the variant in which `left` is left of `right` (`:358-361` for `crossings1`, `:362-365` for
   * `crossings2`): the outgoing connections of `left` inside the extent of `right`, plus the incoming connections of
   * `right` inside the extent of `left`. The Java spells both sums out; they are this function of (he1, he2) and
   * (he2, he1). Split from the Java method body (complexity limits).
   */
  private static countCrossingsOfVariant(left: HyperEdgeSegment, right: HyperEdgeSegment): number {
    return (
      OrthogonalRoutingGenerator.countCrossings(
        left.getOutgoingConnectionCoordinates(),
        right.getStartCoordinate(),
        right.getEndCoordinate(),
      ) +
      OrthogonalRoutingGenerator.countCrossings(
        right.getIncomingConnectionCoordinates(),
        left.getStartCoordinate(),
        left.getEndCoordinate(),
      )
    );
  }

  /**
   * Counts the number of conflicts for the given lists of positions (`:397`; see
   * {@link countConflicts} in `OrthogonalRoutingGeneratorConflicts.ts`, which takes the two thresholds as parameters).
   */
  private countConflicts(posis1: LinkedList<number>, posis2: LinkedList<number>): number {
    return countConflicts(posis1, posis2, this.conflictThreshold, this.criticalConflictThreshold);
  }

  /**
   * Counts the number of crossings for a given list of positions.
   *
   * @param posis sorted list of positions
   * @param start start of the critical area
   * @param end end of the critical area
   * @returns number of positions in the critical area
   * @see OrthogonalRoutingGenerator.java:436
   */
  static countCrossings(posis: Iterable<number>, start: number, end: number): number {
    return countCrossings(posis, start, end);
  }

  /**
   * Finds and breaks critical cycles to avoid edge overlaps. The critical cycles we find will be handled by splitting
   * an edge segment into two.
   *
   * @see OrthogonalRoutingGenerator.java:455
   */
  private breakCriticalCycles(edgeSegments: HyperEdgeSegment[], random: Random): void {
    const cycleDependencies = HyperEdgeCycleDetector.detectCycles(edgeSegments, true, random);

    // Lazy initialisation
    this.segmentSplitter ??= new HyperEdgeSegmentSplitter(this);

    this.segmentSplitter.splitSegments(cycleDependencies, edgeSegments, this.criticalConflictThreshold);
  }

  /**
   * Finds and breaks non-critical cycles by removing and reversing non-critical dependencies. This method is used by
   * the self loop routing code as well.
   *
   * @see OrthogonalRoutingGenerator.java:471
   */
  static breakNonCriticalCycles(edgeSegments: HyperEdgeSegment[], random: Random): void {
    breakNonCriticalCycles(edgeSegments, random);
  }
}
