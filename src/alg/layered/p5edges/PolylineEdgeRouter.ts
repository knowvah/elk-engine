// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { HashStrategy } from '../../../java/util/HashStrategy.js';
import { JavaHashSet } from '../../../java/util/JavaHashSet.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PolylineEdgeRouterInLayer } from './PolylineEdgeRouterInLayer.js';

/** The `KVector.hashCode` / `KVector.equals` pair of `Sets.newHashSet()` over `KVector`s (R9: membership only). */
const KVECTOR_STRATEGY: HashStrategy<KVector> = {
  hash: (k) => k.hashCode(),
  equals: (a, b) => a.equals(b),
};

/** The values of `process` that every layer needs (the Java keeps them in locals of the one method). */
interface RoutingParameters {
  readonly slopedEdgeZoneWidth: number;
  readonly nodeSpacing: number;
  readonly edgeSpaceFac: number;
}

/**
 * Edge router module that draws edges with non-orthogonal line segments.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>the graph has a proper layering with assigned node and port positions</dd>
 *      <dd>the size of each layer is correctly set</dd>
 *      <dd>at least one of the nodes connected by an in-layer edge is a dummy node</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>each node is assigned a horizontal coordinate</dd>
 *      <dd>the bend points of each edge are set</dd>
 *      <dd>the width of the whole graph is set</dd>
 * </dl>
 *
 * The Java `process` is split along its loops (`processLayer`, `routeOutgoingEdges`) and `processNode` along its port
 * loop (`processPort`) for the complexity limits; the in-layer helpers (`processInLayerEdge`,
 * `calculateWestInLayerEdgeYDiff`, `isInLayerDummy`) and two further stateless pieces (`includeNextLayerWestYDiff`,
 * `alignNorthSouthDummy`) are the static methods of {@link PolylineEdgeRouterInLayer}, a section that keeps the file
 * under 500 lines (mission 7e, T5).
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/PolylineEdgeRouter.java
 */
export class PolylineEdgeRouter implements ILayoutPhase<LayeredPhases, LGraph> {
  /**
   * Predicate that checks whether nodes represent external ports.
   *
   * @see PolylineEdgeRouter.java:62-69
   */
  static PRED_EXTERNAL_WEST_OR_EAST_PORT(node: LNode): boolean {
    const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
    return (
      node.getType() === NodeType.EXTERNAL_PORT && (extPortSide === PortSide.WEST || extPortSide === PortSide.EAST)
    );
  }

  // The five static configurations are built on first use, as Java builds the static fields at class initialisation:
  // a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes evaluating (mission 7b
  // decision E1, mission 7e decision R4).
  static #BASELINE_PROCESSOR_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;
  static #NORTH_SOUTH_PORT_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;
  static #SELF_LOOP_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;
  static #CENTER_EDGE_LABEL_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;
  static #END_EDGE_LABEL_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Baseline config.
   *
   * @see PolylineEdgeRouter.java:121-123
   */
  private static get BASELINE_PROCESSOR_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (PolylineEdgeRouter.#BASELINE_PROCESSOR_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.INVERTED_PORT_PROCESSOR));
  }

  /**
   * Additional processor dependencies for graphs with northern / southern non-free ports.
   *
   * @see PolylineEdgeRouter.java:126-129
   */
  private static get NORTH_SOUTH_PORT_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (PolylineEdgeRouter.#NORTH_SOUTH_PORT_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_POSTPROCESSOR));
  }

  /**
   * Additional processor dependencies for graphs with self-loops.
   *
   * @see PolylineEdgeRouter.java:132-139
   */
  private static get SELF_LOOP_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (PolylineEdgeRouter.#SELF_LOOP_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
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
   * Additional processor dependencies for graphs with center edge labels.
   *
   * @see PolylineEdgeRouter.java:142-148
   */
  private static get CENTER_EDGE_LABEL_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (PolylineEdgeRouter.#CENTER_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LABEL_DUMMY_INSERTER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_DUMMY_SWITCHER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.LABEL_DUMMY_REMOVER));
  }

  /**
   * Additional processor dependencies for graphs with head or tail edge labels.
   *
   * @see PolylineEdgeRouter.java:151-156
   */
  private static get END_EDGE_LABEL_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (PolylineEdgeRouter.#END_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.END_LABEL_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.END_LABEL_POSTPROCESSOR));
  }

  /** @see PolylineEdgeRouter.java:159 */
  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    const graphProperties = graph.getProperty(InternalProperties.GRAPH_PROPERTIES);

    // Basic configuration
    const configuration = LayoutProcessorConfiguration.createFrom(PolylineEdgeRouter.BASELINE_PROCESSOR_CONFIGURATION);

    // Additional dependencies
    if (graphProperties.contains(GraphProperties.NORTH_SOUTH_PORTS)) {
      configuration.addAll(PolylineEdgeRouter.NORTH_SOUTH_PORT_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.SELF_LOOPS)) {
      configuration.addAll(PolylineEdgeRouter.SELF_LOOP_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.CENTER_LABELS)) {
      configuration.addAll(PolylineEdgeRouter.CENTER_EDGE_LABEL_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.END_LABELS)) {
      configuration.addAll(PolylineEdgeRouter.END_EDGE_LABEL_PROCESSING_ADDITIONS);
    }

    return configuration;
  }

  /** The minimal vertical difference for creating bend points. */
  private static readonly MIN_VERT_DIFF = 1.0;
  /** Factor for spacing apart layers between which edges are routed. */
  private static readonly LAYER_SPACE_FAC = 0.4;

  /**
   * Set of already created junction points, to avoid multiple points at the same position. Membership only (R9), with
   * `KVector.equals` semantics.
   */
  readonly #createdJunctionPoints: JavaHashSet<KVector> = new JavaHashSet(KVECTOR_STRATEGY);

  /*
   * Implementation Note:
   *
   * The process method works by going through each layer and possibly adding bend points to incoming
   * edges of nodes and to outgoing edges of nodes to avoid edge-node-overlaps. While other edge
   * routing algorithms insert all bend points required to route edges between a pair of layers, this
   * router actually routes any edge in two steps: first while iterating through the source layer, and
   * second while iterating through the target layer. Understanding causes the code below to make a
   * lot more sense.
   */

  /** @see PolylineEdgeRouter.java:202 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Polyline edge routing', 1);

    const parameters = PolylineEdgeRouter.routingParameters(layeredGraph);
    const { nodeSpacing, edgeSpaceFac } = parameters;

    let xpos = 0.0;

    // Determine the horizontal spacing required to route west-side in-layer edges of the first layer
    if (layeredGraph.getLayers().length !== 0) {
      const yDiff = PolylineEdgeRouterInLayer.calculateWestInLayerEdgeYDiff(layeredGraph.getLayers()[0]!);
      xpos = PolylineEdgeRouter.LAYER_SPACE_FAC * edgeSpaceFac * yDiff;
    }

    // Iterate over the layers
    const layerIter = new ArrayListIterator<Layer>(layeredGraph.getLayers());
    while (layerIter.hasNext()) {
      const layer = layerIter.next();
      const externalLayer = layer.getNodes().every((node) => PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node));

      // The rightmost layer is not given any node spacing if it's an external port layer
      if (externalLayer && xpos > 0) {
        xpos -= nodeSpacing;
      }

      // Set horizontal coordinates for all nodes of the layer
      LGraphUtil.placeNodesHorizontally(layer, xpos);

      let maxVertDiff = this.processLayer(layer, xpos, parameters);

      // Consider the span of west-side in-layer edges of the next layer to be sure to reserve
      // enough space for routing them during the next iteration
      maxVertDiff = PolylineEdgeRouterInLayer.includeNextLayerWestYDiff(layerIter, maxVertDiff);

      // Determine where next layer should start based on the maximal vertical span of edges
      // between the two layers
      let layerSpacing = PolylineEdgeRouter.LAYER_SPACE_FAC * edgeSpaceFac * maxVertDiff;
      if (!externalLayer && layerIter.hasNext()) {
        layerSpacing += nodeSpacing;
      }

      xpos += layer.getSize().x + layerSpacing;
    }

    this.#createdJunctionPoints.clear();

    // Set the graph's horizontal size
    layeredGraph.getSize().x = xpos;

    monitor.done();
  }

  /**
   * The property reads at the top of `process` (split out for the complexity limits).
   *
   * @see PolylineEdgeRouter.java:205-210
   */
  private static routingParameters(layeredGraph: LGraph): RoutingParameters {
    const slopedEdgeZoneWidth = layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING_POLYLINE_SLOPED_EDGE_ZONE_WIDTH);
    const nodeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS);
    const edgeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS);
    const edgeSpaceFac = Math.min(1.0, edgeSpacing / nodeSpacing);
    return { slopedEdgeZoneWidth, nodeSpacing, edgeSpaceFac };
  }

  /**
   * The node loop of `process` (split out for the complexity limits).
   *
   * While routing edges, we remember the maximum vertical span of any edge between this and the next layer to insert
   * enough space between the layers to keep the edge slopes from becoming too steep.
   *
   * @return the maximum vertical span of any output edge of the layer
   * @see PolylineEdgeRouter.java:247-295
   */
  private processLayer(layer: Layer, xpos: number, parameters: RoutingParameters): number {
    let maxVertDiff = 0.0;

    // Iterate over the layer's nodes
    for (const node of layer.getNodes()) {
      // Calculate the maximal vertical span of output edges. In-layer edges will also be
      // routed at this point
      const maxCurrOutputYDiff = this.routeOutgoingEdges(node, layer, xpos, parameters.edgeSpaceFac);

      // We currently only handle certain node types. This might change in the future
      switch (node.getType()) {
        case NodeType.NORMAL:
        case NodeType.LABEL:
        case NodeType.LONG_EDGE:
        case NodeType.NORTH_SOUTH_PORT:
        case NodeType.BREAKING_POINT:
          this.processNode(node, xpos, parameters.slopedEdgeZoneWidth);
          break;
        default:
          break;
      }

      maxVertDiff = Math.max(maxVertDiff, maxCurrOutputYDiff);
    }

    return maxVertDiff;
  }

  /**
   * The outgoing-edge loop of `process` (split out for the complexity limits).
   *
   * @return the maximal vertical span of the output edges of the node
   * @see PolylineEdgeRouter.java:252-273
   */
  private routeOutgoingEdges(node: LNode, layer: Layer, xpos: number, edgeSpaceFac: number): number {
    let maxCurrOutputYDiff = 0.0;
    for (const outgoingEdge of node.getOutgoingEdges()) {
      let sourcePos = outgoingEdge.getSource()!.getAbsoluteAnchor().y;
      let targetPos = outgoingEdge.getTarget()!.getAbsoluteAnchor().y;

      if (layer === outgoingEdge.getTarget()!.getNode()!.getLayer() && !outgoingEdge.isSelfLoop()) {
        // In-layer edges require an extra bend point to make them look nice
        PolylineEdgeRouterInLayer.processInLayerEdge(
          outgoingEdge,
          xpos,
          PolylineEdgeRouter.LAYER_SPACE_FAC * edgeSpaceFac * Math.abs(sourcePos - targetPos),
        );

        if (outgoingEdge.getSource()!.getSide() === PortSide.WEST) {
          // The spacing required for routing in-layer edges on the west side doesn't
          // contribute anything to the spacing required between this and the next
          // layer and was already taken into account previously
          sourcePos = 0;
          targetPos = 0;
        }
      }

      maxCurrOutputYDiff = Math.max(maxCurrOutputYDiff, Math.abs(targetPos - sourcePos));
    }
    return maxCurrOutputYDiff;
  }

  // //////////////////////////////////////////////////////////////////////////////////////////////////
  // Actual Edge Routing Code

  /**
   * Inserts bend points for edges incident to this node. The bend points are inserted such that the segments that
   * cross the layer's area are straight or pretty much straight. A bend point is only added if it's necessary: if the
   * bend point to be inserted differs from the edge's end point.
   *
   * @param node the node whose incident edges to insert bend points for.
   * @param layerLeftXPos the x position of the node's layer.
   * @param maxAcceptableXDiff the maximum space between node and layer boundary before bend points need to be
   *   inserted.
   * @see PolylineEdgeRouter.java:322
   */
  private processNode(node: LNode, layerLeftXPos: number, maxAcceptableXDiff: number): void {
    // The right side of the layer
    const layerRightXPos = layerLeftXPos + node.getLayer()!.getSize().x;

    for (const port of node.getPorts()) {
      this.processPort(node, port, layerLeftXPos, layerRightXPos, maxAcceptableXDiff);
    }
  }

  /**
   * The port loop body of `processNode` (split out for the complexity limits: a Java `continue` is a `return`).
   *
   * @see PolylineEdgeRouter.java:327-381
   */
  private processPort(
    node: LNode,
    port: LPort,
    layerLeftXPos: number,
    layerRightXPos: number,
    maxAcceptableXDiff: number,
  ): void {
    const absolutePortAnchor = port.getAbsoluteAnchor();

    if (node.getType() === NodeType.NORTH_SOUTH_PORT) {
      PolylineEdgeRouterInLayer.alignNorthSouthDummy(node, port, absolutePortAnchor);
    }

    const bendPoint = new KVector(0, absolutePortAnchor.y);

    if (port.getSide() === PortSide.EAST) {
      bendPoint.x = layerRightXPos;
    } else if (port.getSide() === PortSide.WEST) {
      bendPoint.x = layerLeftXPos;
    } else {
      // We only know what to do with eastern and western ports
      return;
    }

    // If the port's absolute anchor equals the bend point, we don't want to insert anything
    // (unless the node represents an in-layer dummy)
    const xDistance = Math.abs(absolutePortAnchor.x - bendPoint.x);
    if (xDistance <= maxAcceptableXDiff && !PolylineEdgeRouterInLayer.isInLayerDummy(node)) {
      return;
    }

    this.routeConnectedEdges(port, bendPoint);
  }

  /**
   * The edge loop at the end of the port loop body (split out for the complexity limits).
   *
   * @see PolylineEdgeRouter.java:368-380
   */
  private routeConnectedEdges(port: LPort, bendPoint: KVector): void {
    // Whether to add a junction point or not
    const addJunctionPoint = port.getOutgoingEdges().length + port.getIncomingEdges().length > 1;

    // Iterate over the edges and add bend (and possibly junction) points
    for (const e of port.getConnectedEdges()) {
      const otherPort = e.getSource() === port ? e.getTarget()! : e.getSource()!;
      if (Math.abs(otherPort.getAbsoluteAnchor().y - bendPoint.y) > PolylineEdgeRouter.MIN_VERT_DIFF) {
        // Insert bend point
        this.addBendPoint(e, bendPoint, addJunctionPoint, port);
      }
    }
  }

  /**
   * Adds a copy of the given bend point to the given edge at the appropriate place in the list of bend points. The
   * appropriate place is determined by the given port: if it's the source port, the bend point is prepended to the
   * list; otherwise is is appended. The bend point is not added to the list at all if it wouldn't have any visual
   * effect; that is, if the port's anchor equals the bend point.
   *
   * @param edge the edge to add the bend point to.
   * @param bendPoint the bend point to add.
   * @param addJunctionPoint if `true`, a copy of the bend point will be added to the edge's list of junction points,
   *   if necessary.
   * @param currPort the port the bend point is near.
   * @see PolylineEdgeRouter.java:464
   */
  private addBendPoint(edge: LEdge, bendPoint: KVector, addJunctionPoint: boolean, currPort: LPort): void {
    // Only insert the bend point if necessary; for in-layer edges we are extra save and add the bend point in
    // any case
    if ((edge.isInLayerEdge() || !currPort.getAbsoluteAnchor().equals(bendPoint)) && !edge.isSelfLoop()) {
      if (edge.getSource() === currPort) {
        edge.getBendPoints().addAt(0, new KVector(bendPoint));
      } else {
        edge.getBendPoints().add(new KVector(bendPoint));
      }

      if (addJunctionPoint && !this.#createdJunctionPoints.contains(bendPoint)) {
        // create a new junction point for the edge at the bend point's position
        let junctionPoints = edge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
        if (junctionPoints === null) {
          junctionPoints = new KVectorChain();
          edge.setProperty(LayeredOptions.JUNCTION_POINTS, junctionPoints);
        }

        const jpoint = new KVector(bendPoint);
        junctionPoints.add(jpoint);
        this.#createdJunctionPoints.add(jpoint);
      }
    }
  }
}
