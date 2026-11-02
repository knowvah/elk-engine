// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { init } from './counting/IInitializable.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

/** The Java local `portCount` of `process`, shared by the layers (a mutable counter, as it is in Java). */
interface PortCounter {
  count: number;
}

/**
 * A crossing minimizer that allows user interaction by respecting previous node positions.
 *
 * - Preconditions: The graph has a proper layering. All nodes have at least fixed port sides.
 * - Postconditions: The order of nodes in each layer is rearranged according to previous positions give by the input
 *   graph. Long edge dummy nodes have their calculated original position set as property
 *   `InternalProperties.ORIGINAL_DUMMY_NODE_POSITION`.
 *
 * `process` is split at the Java loop boundaries of its per-layer loop (`:91-146`) and `getPos` at its two `case`
 * arms (`:162-207`, `:209-227`); statement order is unchanged.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/InteractiveCrossingMinimizer.java
 */
export class InteractiveCrossingMinimizer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   *
   * @see InteractiveCrossingMinimizer.java:57
   */
  private static get INTERMEDIATE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (InteractiveCrossingMinimizer.#INTERMEDIATE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LONG_EDGE_SPLITTER)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.IN_LAYER_CONSTRAINT_PROCESSOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.LONG_EDGE_JOINER));
  }

  /** @see InteractiveCrossingMinimizer.java:64 */
  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    const configuration = LayoutProcessorConfiguration.createFrom(
      InteractiveCrossingMinimizer.INTERMEDIATE_PROCESSING_CONFIGURATION,
    );

    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.NON_FREE_PORTS)) {
      configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.PORT_LIST_SORTER);
    }

    return configuration;
  }

  /** @see InteractiveCrossingMinimizer.java:76 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Interactive crossing minimization', 1);

    // Set ID's for each layer since they will be used by the port distribution code to index into arrays
    let layerIndex = 0;
    for (const layer of layeredGraph.getLayers()) {
      layer.id = layerIndex++;
    }

    const nodeOrder = layeredGraph.toNodeArray();
    const portDistributor = new NodeRelativePortDistributor(nodeOrder.length);
    init([portDistributor], nodeOrder);
    const portCount: PortCounter = { count: 0 };
    layerIndex = 0;
    for (const layer of layeredGraph) {
      // determine a horizontal position for edge bend points comparison
      const horizPos = this.determineHorizontalPosition(layer, portCount);

      // create an array of vertical node positions
      const pos = this.calculateVerticalPositions(layer, horizPos);

      // sort the nodes using the position array
      this.sortNodes(layer, pos);
      portDistributor.distributePortsWhileSweeping(nodeOrder, layerIndex, true);
      layerIndex++;
    }

    monitor.done();
  }

  /** The first loop over the layer's nodes and the averaging of `horizPos` (`InteractiveCrossingMinimizer.java:92-106`). */
  private determineHorizontalPosition(layer: Layer, portCount: PortCounter): number {
    let horizPos = 0;
    let nodeCount = 0;
    for (const node of layer.getNodes()) {
      if (node.getPosition().x > 0) {
        horizPos += node.getPosition().x + node.getSize().x / 2;
        nodeCount++;
      }
      for (const port of node.getPorts()) {
        port.id = portCount.count++;
      }
    }

    if (nodeCount > 0) {
      horizPos /= nodeCount;
    }
    return horizPos;
  }

  /** The `pos` array and its fill loop (`InteractiveCrossingMinimizer.java:108-121`). */
  private calculateVerticalPositions(layer: Layer, horizPos: number): number[] {
    const pos: number[] = new Array<number>(layer.getNodes().length).fill(0);
    let nextIndex = 0;
    for (const node of layer) {
      node.id = nextIndex++;
      pos[node.id] = this.getPos(node, horizPos);

      // if we have a long edge dummy node, save the calculated position in a property
      // to be used by the interactive node placer (for dummy nodes other than long edge
      // dummies, we haven't calculated meaningful positions)
      if (node.getType() === NodeType.LONG_EDGE) {
        node.setProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION, pos[node.id]!);
      }
    }
    return pos;
  }

  /**
   * `Collections.sort(layer.getNodes(), comparator)` (`InteractiveCrossingMinimizer.java:123-145`): in place, stable.
   * The comparator is not a total preorder when successor constraints apply; Java's `TimSort` and V8's sort agree on
   * the recorded rows (T7 replays `scenarios/Interactive/*`).
   */
  private sortNodes(layer: Layer, pos: readonly number[]): void {
    layer.getNodes().sort((node1: LNode, node2: LNode): number => {
      const compare = doubleCompare(pos[node1.id]!, pos[node2.id]!);

      if (compare === 0) {
        // The two nodes have the same y coordinate. Check for node successor
        // constraints
        const node1Successors: LNode[] = node1.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS);
        const node2Successors: LNode[] = node2.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS);

        if (node1Successors.includes(node2)) {
          return -1;
        } else if (node2Successors.includes(node1)) {
          return 1;
        }
      }

      return compare;
    });
  }

  /**
   * Determine a vertical position for the given node.
   *
   * @param node a node
   * @param horizPos the horizontal position at which to measure (relevant for edges)
   * @returns the vertical position used for sorting
   * @see InteractiveCrossingMinimizer.java:160
   */
  private getPos(node: LNode, horizPos: number): number {
    let found: number | null = null;
    switch (node.getType()) {
      case NodeType.LONG_EDGE:
        found = this.getPosOfLongEdgeDummy(node, horizPos);
        break;

      case NodeType.NORTH_SOUTH_PORT:
        found = this.getPosOfNorthSouthDummy(node);
        break;

      // FIXME What about the other node types?
    }
    if (found !== null) {
      return found;
    }

    // the fallback solution is to take the previous position of the node's anchor point
    return node.getInteractiveReferencePoint()!.y;
  }

  /**
   * The `LONG_EDGE` arm of `getPos` (`InteractiveCrossingMinimizer.java:162-207`); `null` stands for the `break` that
   * leaves the switch and takes the fallback.
   */
  private getPosOfLongEdgeDummy(node: LNode, horizPos: number): number | null {
    const edge = node.getProperty(InternalProperties.ORIGIN) as LEdge;

    // reconstruct the original bend points from the node annotations
    let bendpoints: KVectorChain | null = edge.getProperty(InternalProperties.ORIGINAL_BENDPOINTS);
    if (bendpoints === null) {
      bendpoints = new KVectorChain();
    } else if (edge.getProperty(InternalProperties.REVERSED)) {
      bendpoints = KVectorChain.reverse(bendpoints);
    }

    // Check if we can determine the position just by using the source point, if we can determine it
    const source: LPort | null = node.getProperty(InternalProperties.LONG_EDGE_SOURCE);
    if (source !== null) {
      const sourcePoint = source.getAbsoluteAnchor();
      if (horizPos <= sourcePoint.x) {
        return sourcePoint.y;
      }

      bendpoints.addFirst(sourcePoint);
    }

    // Check if we can determine the position just by using the target point
    const target: LPort | null = node.getProperty(InternalProperties.LONG_EDGE_TARGET);
    if (target !== null) {
      const targetPoint = target.getAbsoluteAnchor();
      if (targetPoint.x <= horizPos) {
        return targetPoint.y;
      }

      bendpoints.addLast(targetPoint);
    }

    // Find the two points along the edge that the horizontal point lies between
    if (bendpoints.size() >= 2) {
      return this.interpolate(bendpoints, horizPos);
    }
    return null;
  }

  /**
   * The last block of the `LONG_EDGE` arm (`InteractiveCrossingMinimizer.java:195-206`): the walk along the chain with
   * a Java `Iterator`; `hasNext()` is an index check on the chain's elements.
   */
  private interpolate(bendpoints: KVectorChain, horizPos: number): number {
    const points: KVector[] = [...bendpoints];
    let next = 0;
    let point1 = points[next++]!;
    let point2 = points[next++]!;
    while (point2.x < horizPos && next < points.length) {
      point1 = point2;
      point2 = points[next++]!;
    }
    return point1.y + ((horizPos - point1.x) / (point2.x - point1.x)) * (point2.y - point1.y);
  }

  /**
   * The `NORTH_SOUTH_PORT` arm of `getPos` (`InteractiveCrossingMinimizer.java:209-227`); `null` stands for the `break`
   * taken when the origin port is on neither the north nor the south side.
   */
  private getPosOfNorthSouthDummy(node: LNode): number | null {
    // Get one of the ports the dummy node was created for, and its original node
    const originPort = node.getPorts()[0]!.getProperty(InternalProperties.ORIGIN) as LPort;
    const originNode = originPort.getNode()!;

    switch (originPort.getSide()) {
      case PortSide.NORTH:
        // Use the position of the node's northern side. This causes northern dummies to
        // have the same y coordinate as the node they were created from if TOP_LEFT is
        // used as the anchor point. We solve this when sorting the nodes by y coordinate
        // by respecting node successor constraints.
        return originNode.getPosition().y;

      case PortSide.SOUTH:
        // Use the position of the node's southern side
        return originNode.getPosition().y + originNode.getSize().y;
    }
    return null;
  }
}
