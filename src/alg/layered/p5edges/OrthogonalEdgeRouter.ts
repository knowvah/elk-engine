// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import * as Float32 from '../../../java/lang/Float32.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { placeNodesHorizontally } from '../graph/LGraphUtilLayers.js';
import type { LNode } from '../graph/LNode.js';
import type { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { RoutingDirection } from './orthogonal/direction/RoutingDirection.js';
import { OrthogonalRoutingGenerator } from './orthogonal/OrthogonalRoutingGenerator.js';
import { PolylineEdgeRouter } from './PolylineEdgeRouter.js';

type LayeredConfiguration = LayoutProcessorConfiguration<LayeredPhases, LGraph>;

/** The three spacings `process` reads from the graph (`:221-226`), bundled for the helper that advances `xpos`. */
interface RoutingSpacings {
  readonly nodeNode: number;
  readonly edgeEdge: number;
  readonly edgeNode: number;
}

/** What the loop of `process` reads from one side (left or right) of a layer pair: the Java's three locals. */
interface LayerSide {
  readonly layer: Layer | null;
  readonly nodes: LNode[] | null;
  readonly index: number;
}

/** The values of `process` that `routeBetween` shares with every iteration. */
interface RoutingRun {
  readonly monitor: IElkProgressMonitor;
  readonly layeredGraph: LGraph;
  readonly routingGenerator: OrthogonalRoutingGenerator;
  readonly spacings: RoutingSpacings;
}

/**
 * Edge routing implementation that creates orthogonal bend points. Inspired by
 *
 * - Georg Sander, Layout of directed hypergraphs with orthogonal hyperedges. In _Proceedings of the 11th International
 *   Symposium on Graph Drawing (GD '03)_, LNCS vol. 2912, pp. 381-386, Springer, 2004.
 * - Giuseppe di Battista, Peter Eades, Roberto Tamassia, Ioannis G. Tollis, _Graph Drawing: Algorithms for the
 *   Visualization of Graphs_, Prentice Hall, New Jersey, 1999 (Section 9.4, for cycle breaking in the hyperedge segment
 *   graph)
 *
 * Precondition: the graph has a proper layering with assigned node and port positions; the size of each layer is
 * correctly set; edges connected to ports on strange sides were processed. Postcondition: each node is assigned a
 * horizontal coordinate; the bend points of each edge are set; the width of the whole graph is set.
 *
 * The eight static configurations are cached static getters built on first use, as Java builds the static fields at
 * class initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
 * evaluating (mission 7b decision E1, mission 7e R4).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/OrthogonalEdgeRouter.java
 */
export class OrthogonalEdgeRouter implements ILayoutPhase<LayeredPhases, LGraph> {
  /* The basic processing strategy for this phase is empty. Depending on the graph features, dependencies on
   * intermediate processors are added dynamically as follows:
   *
   * Before phase 1:
   *   - None.
   *
   * Before phase 2:
   *   - For center edge labels:
   *      - LABEL_DUMMY_INSERTER
   *
   * Before phase 3:
   *   - For non-free ports:
   *     - NORTH_SOUTH_PORT_PREPROCESSOR
   *     - INVERTED_PORT_PROCESSOR
   *
   *   - For self-loops:
   *     - SELF_LOOP_PROCESSOR
   *
   *   - For hierarchical ports:
   *     - HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR
   *
   *   - For center edge labels:
   *     - LABEL_DUMMY_SWITCHER
   *
   * Before phase 4:
   *   - For hyperedges:
   *     - HYPEREDGE_DUMMY_MERGER
   *
   *   - For hierarchical ports:
   *     - HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR
   *
   *   - For edge labels:
   *     - LABEL_SIDE_SELECTOR
   *
   *   - For end edge labels:
   *     - END_LABEL_PREPROCESSOR
   *
   * Before phase 5:
   *
   * After phase 5:
   *   - For non-free ports:
   *     - NORTH_SOUTH_PORT_POSTPROCESSOR
   *
   *   - For hierarchical ports:
   *     - HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER
   *
   *   - For center edge labels:
   *     - LABEL_DUMMY_REMOVER
   *
   *   - For end edge labels:
   *     - END_LABEL_POSTPROCESSOR
   */

  static #HYPEREDGE_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #INVERTED_PORT_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #NORTH_SOUTH_PORT_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #HIERARCHICAL_PORT_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #SELF_LOOP_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #HYPERNODE_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #CENTER_EDGE_LABEL_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;
  static #END_EDGE_LABEL_PROCESSING_ADDITIONS: LayeredConfiguration | undefined;

  /**
   * Additional processor dependencies for graphs with hyperedges.
   *
   * @see OrthogonalEdgeRouter.java:115
   */
  private static get HYPEREDGE_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#HYPEREDGE_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.HYPEREDGE_DUMMY_MERGER));
  }

  /**
   * Additional processor dependencies for graphs with possible inverted ports.
   *
   * @see OrthogonalEdgeRouter.java:120
   */
  private static get INVERTED_PORT_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#INVERTED_PORT_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.INVERTED_PORT_PROCESSOR));
  }

  /**
   * Additional processor dependencies for graphs with northern / southern non-free ports.
   *
   * @see OrthogonalEdgeRouter.java:125
   */
  private static get NORTH_SOUTH_PORT_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#NORTH_SOUTH_PORT_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.NORTH_SOUTH_PORT_POSTPROCESSOR));
  }

  /**
   * Additional processor dependencies for graphs with hierarchical ports.
   *
   * @see OrthogonalEdgeRouter.java:131
   */
  private static get HIERARCHICAL_PORT_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#HIERARCHICAL_PORT_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER));
  }

  /**
   * Additional processor dependencies for graphs with self-loops.
   *
   * @see OrthogonalEdgeRouter.java:141
   */
  private static get SELF_LOOP_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#SELF_LOOP_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
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
   * Additional processor dependencies for graphs with hypernodes.
   *
   * @see OrthogonalEdgeRouter.java:150
   */
  private static get HYPERNODE_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#HYPERNODE_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HYPERNODE_PROCESSOR));
  }

  /**
   * Additional processor dependencies for graphs with center edge labels.
   *
   * @see OrthogonalEdgeRouter.java:155
   */
  private static get CENTER_EDGE_LABEL_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#CENTER_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
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
   * @see OrthogonalEdgeRouter.java:163
   */
  private static get END_EDGE_LABEL_PROCESSING_ADDITIONS(): LayeredConfiguration {
    return (OrthogonalEdgeRouter.#END_EDGE_LABEL_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.END_LABEL_PREPROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.END_LABEL_POSTPROCESSOR));
  }

  /** @see OrthogonalEdgeRouter.java:170 */
  getLayoutProcessorConfiguration(graph: LGraph): LayeredConfiguration {
    const graphProperties = graph.getProperty(InternalProperties.GRAPH_PROPERTIES)!;

    // Basic configuration
    const configuration = LayoutProcessorConfiguration.create<LayeredPhases, LGraph>();

    // Additional dependencies
    if (graphProperties.contains(GraphProperties.HYPEREDGES)) {
      configuration.addAll(OrthogonalEdgeRouter.HYPEREDGE_PROCESSING_ADDITIONS);
      configuration.addAll(OrthogonalEdgeRouter.INVERTED_PORT_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.NON_FREE_PORTS) || graph.getProperty(LayeredOptions.FEEDBACK_EDGES)) {
      configuration.addAll(OrthogonalEdgeRouter.INVERTED_PORT_PROCESSING_ADDITIONS);

      if (graphProperties.contains(GraphProperties.NORTH_SOUTH_PORTS)) {
        configuration.addAll(OrthogonalEdgeRouter.NORTH_SOUTH_PORT_PROCESSING_ADDITIONS);
      }
    }

    if (graphProperties.contains(GraphProperties.EXTERNAL_PORTS)) {
      configuration.addAll(OrthogonalEdgeRouter.HIERARCHICAL_PORT_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.SELF_LOOPS)) {
      configuration.addAll(OrthogonalEdgeRouter.SELF_LOOP_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.HYPERNODES)) {
      configuration.addAll(OrthogonalEdgeRouter.HYPERNODE_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.CENTER_LABELS)) {
      configuration.addAll(OrthogonalEdgeRouter.CENTER_EDGE_LABEL_PROCESSING_ADDITIONS);
    }

    if (graphProperties.contains(GraphProperties.END_LABELS)) {
      configuration.addAll(OrthogonalEdgeRouter.END_EDGE_LABEL_PROCESSING_ADDITIONS);
    }

    return configuration;
  }

  /**
   * `xpos` is a Java `float` (`:231`): every `+=` rounds through `Float32.add` and the final `getSize().x = xpos`
   * widens it (R6). The Java loop keeps the six locals `leftLayer`, `rightLayer`, `leftLayerNodes`, `rightLayerNodes`,
   * `leftLayerIndex` and `rightLayerIndex`; here a {@link LayerSide} holds the three of each side, and the loop body
   * after the fetch of the next layer (`:249-289`) is the private {@link routeBetween} (complexity limits). The order
   * of the statements is unchanged.
   *
   * @see OrthogonalEdgeRouter.java:217
   */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Orthogonal edge routing', 1);

    // Retrieve some generic values
    const spacings = OrthogonalEdgeRouter.readSpacings(layeredGraph);

    // Prepare for iteration!
    const routingGenerator = new OrthogonalRoutingGenerator(RoutingDirection.WEST_TO_EAST, spacings.edgeEdge, 'phase5');
    const run: RoutingRun = { monitor, layeredGraph, routingGenerator, spacings };
    let xpos = 0.0;
    const layerIter = new ArrayListIterator<Layer>(layeredGraph.getLayers());
    let left: LayerSide = { layer: null, nodes: null, index: -1 };
    let right: LayerSide;

    // Iterate!
    do {
      // Fetch the next layer, if any
      const rightLayer = layerIter.hasNext() ? layerIter.next() : null;
      right = {
        layer: rightLayer,
        nodes: rightLayer === null ? null : rightLayer.getNodes(),
        index: layerIter.previousIndex(),
      };

      xpos = OrthogonalEdgeRouter.routeBetween(run, xpos, left, right);

      left = right;
    } while (right.layer !== null);

    layeredGraph.getSize().x = xpos;

    monitor.done();
  }

  /** The three `Retrieve some generic values` statements of `process` (`:221-226`), split from the Java method body. */
  private static readSpacings(layeredGraph: LGraph): RoutingSpacings {
    return {
      nodeNode: layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS)!,
      edgeEdge: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS)!,
      edgeNode: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS)!,
    };
  }

  /**
   * The loop body of `process` after the fetch of the next layer (`:249-285`): place the left layer, route the edges
   * between the two layers and advance `xpos` by the width of the routing area. Split from the Java method body
   * (complexity limits).
   *
   * @returns the new `xpos`
   */
  private static routeBetween(run: RoutingRun, xposBefore: number, left: LayerSide, right: LayerSide): number {
    let xpos = xposBefore;

    // Place the left layer's nodes, if any
    if (left.layer !== null) {
      placeNodesHorizontally(left.layer, xpos);
      xpos = Float32.add(xpos, left.layer.getSize().x);
    }

    // Route edges between the two layers
    const startPos = left.layer === null ? xpos : xpos + run.spacings.edgeNode;
    const slotsCount = run.routingGenerator.routeEdges(
      run.monitor,
      run.layeredGraph,
      left.nodes,
      left.index,
      right.nodes,
      startPos,
    );

    return OrthogonalEdgeRouter.advanceXpos(xpos, slotsCount, left.nodes, right.nodes, run.spacings);
  }

  /**
   * The part of the loop body of `process` that follows the routing call (`:260-285`): the width of the routing area
   * is added to `xpos` (a `float`, so through `Float32.add`). A `null` layer is the missing first or last layer, which
   * counts as external (`leftLayer == null` is `leftLayerNodes == null`).
   *
   * @returns the new `xpos`
   */
  private static advanceXpos(
    xpos: number,
    slotsCount: number,
    leftLayerNodes: LNode[] | null,
    rightLayerNodes: LNode[] | null,
    spacings: RoutingSpacings,
  ): number {
    const isLeftLayerExternal = OrthogonalEdgeRouter.isExternal(leftLayerNodes);
    const isRightLayerExternal = OrthogonalEdgeRouter.isExternal(rightLayerNodes);

    if (slotsCount > 0) {
      // Compute routing area's width
      let routingWidth = (slotsCount - 1) * spacings.edgeEdge;

      if (leftLayerNodes !== null) {
        routingWidth += spacings.edgeNode;
      }

      if (rightLayerNodes !== null) {
        routingWidth += spacings.edgeNode;
      }

      // If we are between two layers, make sure their minimal spacing is preserved
      if (routingWidth < spacings.nodeNode && !isLeftLayerExternal && !isRightLayerExternal) {
        routingWidth = spacings.nodeNode;
      }
      return Float32.add(xpos, routingWidth);
    } else if (!isLeftLayerExternal && !isRightLayerExternal) {
      // If all edges are straight, use the usual spacing
      return Float32.add(xpos, spacings.nodeNode);
    }
    return xpos;
  }

  /**
   * `layer == null || Iterables.all(layerNodes, PRED_EXTERNAL_WEST_OR_EAST_PORT)` (`:260-263`): a missing layer counts
   * as external.
   */
  private static isExternal(layerNodes: LNode[] | null): boolean {
    return layerNodes === null || Iterables.all(layerNodes, PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT);
  }
}
