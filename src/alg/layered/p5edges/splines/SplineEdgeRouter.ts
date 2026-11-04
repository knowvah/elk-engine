// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../../guava/Iterables.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import { LayeredPhases } from '../../LayeredPhases.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { placeNodesHorizontally } from '../../graph/LGraphUtilLayers.js';
import type { LNode } from '../../graph/LNode.js';
import type { Layer } from '../../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { SplineRoutingMode } from '../../options/SplineRoutingMode.js';
import { PolylineEdgeRouter } from '../PolylineEdgeRouter.js';
import { SplineEdgeRouterSideToProcess as SideToProcess } from './SplineEdgeRouterSideToProcess.js';
import {
  clearThenFillMappings,
  createDependency,
  createSplineRouterState,
  createSplineSegments,
  createSplineSegmentsForHyperEdges,
  isQualifiedAsStartingNode,
  type SplineRouterState,
} from './SplineEdgeRouterSegments.js';
import {
  breakCycles,
  computeIncrement,
  countSlots,
  topologicalNumbering,
  type LayerPair,
  type RoutingSettings,
} from './SplineEdgeRouterRanking.js';
import { SplineSegment, isNormalNode, isStraight } from './SplineSegment.js';

type LayeredConfiguration = LayoutProcessorConfiguration<LayeredPhases, LGraph>;

/** The first and the last layer of the graph and whether they hold external port dummies only (`:211-216`). */
interface BoundaryLayers {
  readonly firstLayer: Layer;
  readonly lastLayer: Layer;
  readonly isLeftLayerExternal: boolean;
  readonly isRightLayerExternal: boolean;
}

/** Where the right layer starts and the offset the vertical segments between the layers receive (`:249-285`). */
interface LayerPlacement {
  readonly rightLayerPosition: number;
  readonly xSegmentDelta: number;
}

/**
 * Implements a way of routing the edges with splines. Uses the dummy nodes as reference points for a spline
 * calculation, but the dummy nodes do not necessarily lay on the edge. They are only approximated.
 *
 * Implementation Details. A convenience class `SplineSegment` is used to represent spline segments between adjacent
 * layers. The segments are combined to a contiguous spline later by the `FinalSplineBendpointsCalculator`. As such, no
 * final bend points are calculated by this layout phase implementation. The x-coordinates of the nodes are fixed,
 * however, usually to `max{nodeNodeSpacing, 2 * edgeNodeSpacing + (slots-1) * edgeEdgeSpacing}`. At this, a `slot` is a
 * vertical strip between a pair of layers in which a non-straight edge will be routed. The more edges in-between a pair
 * of layers, the more slots are required. If the splines are to be routed `SplineRoutingMode.SLOPPY`, the spacing may
 * be increased further as computed by the {@link SplineEdgeRouter.computeSloppySpacing} method.
 *
 * Precondition: the graph has a proper layering with assigned node and port positions; the size of each layer is
 * correctly set. Postcondition: each node is assigned a horizontal coordinate; the width of the whole graph is set; the
 * bend points of each edge are not yet set.
 *
 * Sections (complexity limits, P1): `SplineEdgeRouterSegments` holds `clearThenFillMappings`, `findAndAddSuccessor`,
 * `createSplineSegments`, `createSplineSegmentsForHyperEdges` and `createDependency`, `SplineEdgeRouterRanking` holds
 * `breakCycles`, `updateNeighbors` and `topologicalNumbering` and, moved out for the 500-line limit, `countSlots`,
 * `computeIncrement` and `computeSloppySpacing`. The five static configurations are cached static
 * getters built on first use, as Java builds the static fields at class initialisation: a module-level read of
 * `IntermediateProcessorStrategy` would run before that enum finishes evaluating (mission 7b decision E1, 7e R4).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineEdgeRouter.java
 */
export class SplineEdgeRouter implements ILayoutPhase<LayeredPhases, LGraph> {
  // Constants
  /** Default dimension of an edge-spline. */
  static readonly SPLINE_DIMENSION: number = 3;

  // Intermediate processing configurations
  static #BASELINE_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #SELF_LOOP_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #CENTER_EDGE_LABEL_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #NORTH_SOUTH_PORT_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #END_EDGE_LABEL_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;

  /**
   * baseline processor dependencies, always required.
   *
   * @see SplineEdgeRouter.java:87
   */
  private static get BASELINE_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (SplineEdgeRouter.#BASELINE_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.FINAL_SPLINE_BENDPOINTS_CALCULATOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.INVERTED_PORT_PROCESSOR));
  }

  /**
   * additional processor dependencies for graphs with self-loops.
   *
   * @see SplineEdgeRouter.java:94
   */
  private static get SELF_LOOP_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (SplineEdgeRouter.#SELF_LOOP_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.SELF_LOOP_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.SELF_LOOP_POSTPROCESSOR)
      .before(LayeredPhases.P4_NODE_PLACEMENT)
      .add(IntermediateProcessorStrategy.SELF_LOOP_PORT_RESTORER)
      .add(IntermediateProcessorStrategy.SELF_LOOP_ROUTER));
  }

  /**
   * additional processor dependencies for graphs with center edge labels.
   *
   * @see SplineEdgeRouter.java:102
   */
  private static get CENTER_EDGE_LABEL_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (SplineEdgeRouter.#CENTER_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LABEL_DUMMY_INSERTER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_DUMMY_SWITCHER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.LABEL_DUMMY_REMOVER));
  }

  /**
   * additional processor dependencies for graphs with northern / southern non-free ports. The postprocessor runs before
   * this phase here (the other routers run it after).
   *
   * @see SplineEdgeRouter.java:108
   */
  private static get NORTH_SOUTH_PORT_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (SplineEdgeRouter.#NORTH_SOUTH_PORT_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_PREPROCESSOR)
      .addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_POSTPROCESSOR));
  }

  /**
   * additional processor dependencies for graphs with head or tail edge labels.
   *
   * @see SplineEdgeRouter.java:114
   */
  private static get END_EDGE_LABEL_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (SplineEdgeRouter.#END_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.END_LABEL_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.END_LABEL_POSTPROCESSOR));
  }

  /** @see SplineEdgeRouter.java:126 */
  getLayoutProcessorConfiguration(graph: LGraph): LayeredConfiguration {
    // Basic configuration
    const configuration = LayoutProcessorConfiguration.create<LayeredPhases, LGraph>();

    configuration.addAll(SplineEdgeRouter.BASELINE_PROCESSING_ADDITIONS);

    const graphProperties = graph.getProperty(InternalProperties.GRAPH_PROPERTIES)!;

    if (graphProperties.contains(GraphProperties.SELF_LOOPS)) {
      configuration.addAll(SplineEdgeRouter.SELF_LOOP_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.CENTER_LABELS)) {
      configuration.addAll(SplineEdgeRouter.CENTER_EDGE_LABEL_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.NORTH_SOUTH_PORTS)) {
      configuration.addAll(SplineEdgeRouter.NORTH_SOUTH_PORT_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.END_LABELS)) {
      configuration.addAll(SplineEdgeRouter.END_EDGE_LABEL_PROCESSING_ADDITIONS);
    }
    return configuration;
  }

  // some variables valid during one iteration (a pair of layers), and the variables for the whole edge routing
  // process, are the {@link SplineRouterState} fields (`SplineEdgeRouter.java:136-162`)
  private readonly state: SplineRouterState = createSplineRouterState();
  private lGraph: LGraph | null = null;

  /** @see SplineEdgeRouter.java:183 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Spline edge routing', 1);

    if (layeredGraph.getLayers().length === 0) {
      layeredGraph.getSize().x = 0;
      monitor.done();
      return;
    }

    // Retrieve some generic values, and find out if splines should be routed thoroughly or sloppy
    const settings = SplineEdgeRouter.readSettings(layeredGraph);

    this.lGraph = layeredGraph;
    this.state.startEdges.length = 0;
    this.state.allSplineSegments.length = 0;
    this.state.successingEdge.clear();

    const boundaries = SplineEdgeRouter.findBoundaryLayers(layeredGraph);

    const layerIterator = new ArrayListIterator<Layer>(layeredGraph.getLayers());
    let leftLayer: Layer | null = null;
    let rightLayer: Layer | null;

    // initial x position
    let xpos = 0.0;
    do {
      rightLayer = layerIterator.hasNext() ? layerIterator.next() : null;
      xpos = this.routeLayerPair(settings, boundaries, { leftLayer, rightLayer }, xpos);

      // The Java also assigns `isSpecialLeftLayer = isSpecialRightLayer` here (`:279`); both are locals declared inside
      // the loop, so the store is dead and omitted.
      leftLayer = rightLayer;
    } while (rightLayer !== null);

    this.assignSplinePaths();

    // assign final width of the layering and thus the overall graph
    layeredGraph.getSize().x = xpos;

    this.lGraph = null;
    monitor.done();
  }

  /**
   * The loop over the start edges after the layers have been processed (`:296-308`): remember the spline paths for
   * control point calculation to be done by a later intermediate processor. Split from the Java method body
   * (complexity limits).
   */
  private assignSplinePaths(): void {
    for (const edge of this.state.startEdges) {
      const edgeChain = this.getEdgeChain(edge);
      edge.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, edgeChain);

      const spline = this.getSplinePath(edge);
      edge.setProperty(InternalProperties.SPLINE_ROUTE_START, spline);
    }
  }

  /** The generic values `process` reads from the graph (`:192-202`). */
  private static readSettings(layeredGraph: LGraph): RoutingSettings {
    const mode = layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING_SPLINES_MODE);
    return {
      nodeNodeSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS)!,
      edgeNodeSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS)!,
      edgeEdgeSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS)!,
      sloppyRouting: mode === SplineRoutingMode.SLOPPY,
      sloppyLayerSpacingFactor: layeredGraph.getProperty(
        LayeredOptions.EDGE_ROUTING_SPLINES_SLOPPY_LAYER_SPACING_FACTOR,
      )!,
    };
  }

  /** Checks if the first and/or last layer are populated with external port dummies (`:211-216`). */
  private static findBoundaryLayers(layeredGraph: LGraph): BoundaryLayers {
    const firstLayer = layeredGraph.getLayers()[0]!;
    const isLeftLayerExternal = Iterables.all(
      firstLayer.getNodes(),
      PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT,
    );
    const lastLayer = layeredGraph.getLayers()[layeredGraph.getLayers().length - 1]!;
    const isRightLayerExternal = Iterables.all(
      lastLayer.getNodes(),
      PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT,
    );
    return { firstLayer, lastLayer, isLeftLayerExternal, isRightLayerExternal };
  }

  /**
   * The loop body of `process` after the fetch of the next layer (`:222-277`), split from the Java method body
   * (complexity limits): routes the segments between the two layers, places the right layer and returns the new `xpos`.
   */
  private routeLayerPair(settings: RoutingSettings, boundaries: BoundaryLayers, pair: LayerPair, xpos: number): number {
    // fresh start for this pair of layers
    clearThenFillMappings(this.state, pair.leftLayer, pair.rightLayer);

    // creation of the SplineSegments
    this.createSegmentsAndComputeRanking();

    // count the number of required slots for vertical segments
    //  (edges to be drawn straight are assigned a rank but must be omitted here)
    const slotCount = countSlots(this.state.splineSegmentsLayer);
    const placement = SplineEdgeRouter.computePlacement(settings, boundaries, pair, slotCount, xpos);

    // place right layer's nodes
    if (pair.rightLayer !== null) {
      placeNodesHorizontally(pair.rightLayer, placement.rightLayerPosition);
    }

    // Assign tentative start and end points to the spline segments
    //  they may be modified before final spline coordinates
    //  are determined by the FinalSplineBendpointsCaluclator
    for (const segment of this.state.splineSegmentsLayer) {
      segment.boundingBox.x = xpos;
      segment.boundingBox.width = placement.rightLayerPosition - xpos;
      segment.xDelta = placement.xSegmentDelta;
      segment.isWestOfInitialLayer = pair.leftLayer === null;
    }
    for (const segment of this.state.splineSegmentsLayer) {
      this.state.allSplineSegments.push(segment);
    }

    // proceed to the next layer
    let nextXpos = placement.rightLayerPosition;
    if (pair.rightLayer !== null) {
      nextXpos += pair.rightLayer.getSize().x;
    }
    return nextXpos;
  }

  /** `leftLayer == null || (isLeftLayerExternal && leftLayer == firstLayer)` (`:244`). */
  private static isSpecialLeftLayer(boundaries: BoundaryLayers, pair: LayerPair): boolean {
    return pair.leftLayer === null || (boundaries.isLeftLayerExternal && pair.leftLayer === boundaries.firstLayer);
  }

  /** `rightLayer == null || (isRightLayerExternal && rightLayer == lastLayer)` (`:245`). */
  private static isSpecialRightLayer(boundaries: BoundaryLayers, pair: LayerPair): boolean {
    return pair.rightLayer === null || (boundaries.isRightLayerExternal && pair.rightLayer === boundaries.lastLayer);
  }

  /**
   * The code below ensures that at least nodeNodeSpacing is preserved between a pair of layers (`:237-277`). If this
   * spacing is larger than what would be required to route the vertical segments in-between a pair of layers, it looks
   * nicer to move the vertical segments halfway between the layers. The xSegmentDelta holds the required offset.
   */
  private static computePlacement(
    settings: RoutingSettings,
    boundaries: BoundaryLayers,
    pair: LayerPair,
    slotCount: number,
    xpos: number,
  ): LayerPlacement {
    let xSegmentDelta = 0;
    let rightLayerPosition = xpos;
    const isSpecialLeftLayer = SplineEdgeRouter.isSpecialLeftLayer(boundaries, pair);
    const isSpecialRightLayer = SplineEdgeRouter.isSpecialRightLayer(boundaries, pair);

    // compute horizontal positions just as for the OrthogonalEdgeRouter
    if (slotCount > 0) {
      let increment = computeIncrement(settings, pair, slotCount);

      // if we are between two layers, make sure their minimal spacing is preserved
      if (increment < settings.nodeNodeSpacing && !isSpecialLeftLayer && !isSpecialRightLayer) {
        xSegmentDelta = (settings.nodeNodeSpacing - increment) / 2;
        increment = settings.nodeNodeSpacing;
      }
      rightLayerPosition += increment;
    } else if (!isSpecialLeftLayer && !isSpecialRightLayer) {
      // If all edges are straight, use the usual spacing
      rightLayerPosition += settings.nodeNodeSpacing;
    }
    return { rightLayerPosition, xSegmentDelta };
  }

  /** @see SplineEdgeRouter.java:318 */
  private createSegmentsAndComputeRanking(): void {
    const state = this.state;

    // create the hyperEdges having their start port on the left side.
    createSplineSegmentsForHyperEdges(state, SideToProcess.LEFT, true);
    createSplineSegmentsForHyperEdges(state, SideToProcess.LEFT, false);

    // create the hyperEdges having their start port on the right side.
    createSplineSegmentsForHyperEdges(state, SideToProcess.RIGHT, true);
    createSplineSegmentsForHyperEdges(state, SideToProcess.RIGHT, false);

    // remaining edges are single edges that cannot be combined with others to a hyper-edge
    createSplineSegments(state);

    ////////////////////////////////////
    // Creation of the dependencies of the spline segments
    // (the Java walks two list iterators; the target iterator starts at the index after the source)
    const segments = state.splineSegmentsLayer;
    for (let sourceIndex = 0; sourceIndex < segments.length; sourceIndex++) {
      const hyperEdge1 = segments[sourceIndex]!;
      for (let targetIndex = sourceIndex + 1; targetIndex < segments.length; targetIndex++) {
        createDependency(hyperEdge1, segments[targetIndex]!);
      }
    }

    ////////////////////////////////////
    // Apply the topological numbering
    // break cycles
    breakCycles(segments, this.lGraph!.getProperty(InternalProperties.RANDOM)!);

    // assign ranks to the hyper-nodes
    topologicalNumbering(segments);
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Convenience

  /**
   * Checks if the two Y coordinates are resulting in a straight edge. The body (and `MAX_VERTICAL_DIFF_FOR_STRAIGHT`)
   * is the module function of `SplineSegment.ts`, which the segment needs and which cannot import this class.
   *
   * @param firstY First Y coordinate.
   * @param secondY Second Y coordinate.
   * @return True, if the two Y coordinates result in a straight edge.
   * @see SplineEdgeRouter.java:937
   */
  static isStraight(firstY: number, secondY: number): boolean {
    return isStraight(firstY, secondY);
  }

  /** @see SplineEdgeRouter.java:941 */
  private getEdgeChain(start: LEdge): LEdge[] {
    const edgeChain: LEdge[] = [];
    let current: LEdge | undefined = start;
    do {
      edgeChain.push(current);
      current = this.state.successingEdge.get(current);
    } while (current !== undefined);
    return edgeChain;
  }

  /** @see SplineEdgeRouter.java:951 */
  private getSplinePath(start: LEdge): SplineSegment[] {
    const segmentChain: SplineSegment[] = [];
    let current: LEdge | undefined = start;
    do {
      // a missing segment is a NullPointerException in the Java; the property write below throws the TypeError here
      const segment = this.state.edgeToSegmentMap.get(current)!;
      segment.sourcePort = current.getSource();
      segment.targetPort = current.getTarget();
      segmentChain.push(segment);
      current = this.state.successingEdge.get(current);
    } while (current !== undefined);

    const initialSegment = segmentChain[0]!;
    initialSegment.initialSegment = true;
    initialSegment.sourceNode = initialSegment.edges.values().next().value!.getSource()!.getNode();

    const lastSegment = segmentChain[segmentChain.length - 1]!;
    lastSegment.lastSegment = true;
    lastSegment.targetNode = lastSegment.edges.values().next().value!.getTarget()!.getNode();

    return segmentChain;
  }

  /**
   * Additionally to the `NodeType.NORMAL` nodes, we deem `NodeType.BIG_NODE` and `NodeType.BREAKING_POINT` to be normal
   * nodes. The body is the module function of `SplineSegment.ts`.
   *
   * @param node the node to test
   * @return true if we consider {@code node} to be normal.
   * @see SplineEdgeRouter.java:980
   */
  static isNormalNode(node: LNode): boolean {
    return isNormalNode(node);
  }

  /**
   * A node {@code n} qualifies as 'starting node' for a 'starting edge' if it is not a long edge dummy or label dummy.
   * That is, any edge connected to {@code n} can potentially be the first segment of a chain of edges (i.e. long edge).
   * The body is the function of `SplineEdgeRouterSegments.ts`, which the segment creation needs.
   *
   * @param node the node to test
   * @return true if {@code node} qualifies as starting node.
   * @see SplineEdgeRouter.java:995
   */
  static isQualifiedAsStartingNode(node: LNode): boolean {
    return isQualifiedAsStartingNode(node);
  }
}
