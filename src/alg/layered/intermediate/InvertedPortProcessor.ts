// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';

/**
 * Inserts dummy nodes to cope with inverted ports.
 *
 * The problem is with edges coming from the left of a node being connected to a port that's on its right side, or the
 * other way around. Let a node of that kind be in layer `i`. This processor now takes the offending edge and connects
 * it to a new dummy node, also in layer `i`. Finally, the dummy is connected with the offending port. This means that
 * once one of these cases occurs in the graph, the layering is not proper anymore.
 *
 * The dummy nodes are decorated with a `LayeredOptions.NODE_TYPE` property. They are treated just like ordinary
 * `NodeType.LONG_EDGE` dummy nodes.
 *
 * This processor supports self-loops by not doing anything about them. That is, no dummy nodes are created for edges
 * whose source and target node are identical.
 *
 * Note: the following phases must support in-layer connections for this to work.
 *
 * Precondition: a layered graph; nodes have fixed port sides. Postcondition: dummy nodes have been inserted for edges
 * connected to ports on odd sides; the graph may contain new in-layer connections. Slots: before phase 3. Same-slot
 * dependencies: `PortSideProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/InvertedPortProcessor.java
 */
export class InvertedPortProcessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Inverted port preprocessing', 1);

    // Retrieve the layers in the graph
    const layers = layeredGraph.getLayers();

    // Iterate through the layers and for each layer create a list of dummy nodes
    // that were created, but not yet assigned to the layer (to avoid concurrent
    // modification exceptions)
    const layerIterator = new ArrayListIterator<Layer>(layers);
    let currentLayer: Layer | null = null;
    const unassignedNodes: LNode[] = Lists.newArrayList<LNode>();

    while (layerIterator.hasNext()) {
      // Update previous and current layers
      const previousLayer: Layer | null = currentLayer;
      currentLayer = layerIterator.next();

      // If the previous layer had unassigned nodes, assign them now and clear the list
      for (const node of unassignedNodes) {
        node.setLayer(previousLayer);
      }
      unassignedNodes.length = 0;

      // Iterate through the layer's nodes
      for (const node of currentLayer) {
        // Skip dummy nodes
        if (node.getType() !== NodeType.NORMAL) {
          continue;
        }

        // Skip nodes whose port sides are not fixed (because in that case, the odd
        // port side problem won't appear)
        if (!node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
          continue;
        }

        this.#lookForInputPortsOnTheRight(layeredGraph, node, unassignedNodes);
        this.#lookForOutputPortsOnTheLeft(layeredGraph, node, unassignedNodes);
      }
    }

    // There may be unassigned nodes left
    for (const node of unassignedNodes) {
      node.setLayer(currentLayer);
    }

    monitor.done();
  }

  /** The first loop over the node's ports in `process`: input ports on the east side. */
  #lookForInputPortsOnTheRight(layeredGraph: LGraph, node: LNode, unassignedNodes: LNode[]): void {
    // Look for input ports on the right side
    for (const port of node.getPorts(PortType.INPUT, PortSide.EAST)) {
      // For every edge going into this port, insert dummy nodes (do this using
      // a copy of the current list of edges, since the edges are modified when
      // dummy nodes are created)
      const edges = port.getIncomingEdges();
      const edgeArray = LGraphUtil.toEdgeArray(edges);

      for (const edge of edgeArray) {
        this.#createEastPortSideDummies(layeredGraph, port, edge, unassignedNodes);
      }
    }
  }

  /** The second loop over the node's ports in `process`: output ports on the west side. */
  #lookForOutputPortsOnTheLeft(layeredGraph: LGraph, node: LNode, unassignedNodes: LNode[]): void {
    // Look for ports on the left side connected to edges going to higher layers
    for (const port of node.getPorts(PortType.OUTPUT, PortSide.WEST)) {
      // For every edge going out of this port, insert dummy nodes (do this using
      // a copy of the current list of edges, since the edges are modified when
      // dummy nodes are created)
      const edges = port.getOutgoingEdges();
      const edgeArray = LGraphUtil.toEdgeArray(edges);

      for (const edge of edgeArray) {
        this.#createWestPortSideDummies(layeredGraph, port, edge, unassignedNodes);
      }
    }
  }

  /**
   * Creates the necessary dummy nodes for an input port on the east side of a node, provided that the edge connects
   * two different nodes.
   *
   * @param layeredGraph the layered graph.
   * @param eastwardPort the offending port.
   * @param edge the edge connected to the port.
   * @param layerNodeList list of unassigned nodes belonging to the layer of the node the port belongs to. The new dummy
   *   node is added to this list and must be assigned to the layer later.
   */
  #createEastPortSideDummies(layeredGraph: LGraph, eastwardPort: LPort, edge: LEdge, layerNodeList: LNode[]): void {
    // (Java `assert edge.getTarget() == eastwardPort`: disabled without -ea, translation rules 6.8)

    // Ignore self loops
    if (edge.getSource()!.getNode() === eastwardPort.getNode()) {
      return;
    }

    // Dummy node in the same layer
    const dummy = new LNode(layeredGraph);
    dummy.setType(NodeType.LONG_EDGE);
    dummy.setProperty(InternalProperties.ORIGIN, edge);
    dummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    layerNodeList.push(dummy);

    const dummyInput = new LPort();
    dummyInput.setNode(dummy);
    dummyInput.setSide(PortSide.WEST);

    const dummyOutput = new LPort();
    dummyOutput.setNode(dummy);
    dummyOutput.setSide(PortSide.EAST);

    // Reroute the original edge
    edge.setTarget(dummyInput);

    // Connect the dummy with the original port
    const dummyEdge = new LEdge();
    dummyEdge.copyProperties(edge);
    dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
    dummyEdge.setSource(dummyOutput);
    dummyEdge.setTarget(eastwardPort);

    // Set LONG_EDGE_SOURCE and LONG_EDGE_TARGET properties on the LONG_EDGE dummy
    this.#setLongEdgeSourceAndTarget(dummy, dummyInput, dummyOutput, eastwardPort);

    // Move head labels from the old edge over to the new one
    this.#moveHeadLabelsEast(edge, dummyEdge);
  }

  /** The head label loop of `createEastPortSideDummies`: moves head labels, keeping a known `END_LABEL_EDGE`. */
  #moveHeadLabelsEast(edge: LEdge, dummyEdge: LEdge): void {
    const labelIterator = new ArrayListIterator(edge.getLabels());
    while (labelIterator.hasNext()) {
      const label = labelIterator.next();
      const labelPlacement = label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT);

      if (labelPlacement === EdgeLabelPlacement.HEAD) {
        // Remember which edge the label originally belonged to, unless it already knows
        if (!label.hasProperty(InternalProperties.END_LABEL_EDGE)) {
          label.setProperty(InternalProperties.END_LABEL_EDGE, edge);
        }

        labelIterator.remove();
        dummyEdge.getLabels().push(label);
      }
    }
  }

  /**
   * Creates the necessary dummy nodes for an output port on the west side of a node, provided that the edge connects
   * two different nodes.
   *
   * @param layeredGraph the layered graph
   * @param westwardPort the offending port.
   * @param edge the edge connected to the port.
   * @param layerNodeList list of unassigned nodes belonging to the layer of the node the port belongs to. The new dummy
   *   node is added to this list and must be assigned to the layer later.
   */
  #createWestPortSideDummies(layeredGraph: LGraph, westwardPort: LPort, edge: LEdge, layerNodeList: LNode[]): void {
    // (Java `assert edge.getSource() == westwardPort`: disabled without -ea, translation rules 6.8)

    // Ignore self loops
    if (edge.getTarget()!.getNode() === westwardPort.getNode()) {
      return;
    }

    // Dummy node in the same layer
    const dummy = new LNode(layeredGraph);
    dummy.setType(NodeType.LONG_EDGE);
    dummy.setProperty(InternalProperties.ORIGIN, edge);
    dummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    layerNodeList.push(dummy);

    const dummyInput = new LPort();
    dummyInput.setNode(dummy);
    dummyInput.setSide(PortSide.WEST);

    const dummyOutput = new LPort();
    dummyOutput.setNode(dummy);
    dummyOutput.setSide(PortSide.EAST);

    // Reroute the original edge
    const originalTarget = edge.getTarget();
    edge.setTarget(dummyInput);

    // Connect the dummy with the original port
    const dummyEdge = new LEdge();
    dummyEdge.copyProperties(edge);
    dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
    dummyEdge.setSource(dummyOutput);
    dummyEdge.setTarget(originalTarget);

    // Move any head labels over to the new dummy edge
    this.#moveHeadLabelsWest(edge, dummyEdge);

    // Set LONG_EDGE_SOURCE and LONG_EDGE_TARGET properties on the LONG_EDGE dummy
    this.#setLongEdgeSourceAndTarget(dummy, dummyInput, dummyOutput, westwardPort);
  }

  /** The head label loop of `createWestPortSideDummies`: moves head labels, always setting `END_LABEL_EDGE`. */
  #moveHeadLabelsWest(edge: LEdge, dummyEdge: LEdge): void {
    const labelIterator = new ArrayListIterator(edge.getLabels());
    while (labelIterator.hasNext()) {
      const label = labelIterator.next();

      if (label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.HEAD) {
        // Remember which edge the label belonged to originally
        // (Java `assert !label.hasProperty(InternalProperties.END_LABEL_EDGE)`: disabled without -ea)
        label.setProperty(InternalProperties.END_LABEL_EDGE, edge);

        labelIterator.remove();
        dummyEdge.getLabels().push(label);
      }
    }
  }

  /**
   * Properly sets the `LayeredOptions.LONG_EDGE_SOURCE` and `LayeredOptions.LONG_EDGE_TARGET` properties for the given
   * long edge dummy. This is required for the `HyperedgeDummyMerger` to work correctly.
   *
   * @param longEdgeDummy the long edge dummy whose properties to set.
   * @param dummyInputPort the dummy node's input port.
   * @param dummyOutputPort the dummy node's output port.
   * @param oddPort the odd port that prompted the dummy to be created (unused in Java as well).
   */
  #setLongEdgeSourceAndTarget(
    longEdgeDummy: LNode,
    dummyInputPort: LPort,
    dummyOutputPort: LPort,
    _oddPort: LPort,
  ): void {
    // There's exactly one edge connected to the input and output port
    const sourcePort = dummyInputPort.getIncomingEdges()[0]!.getSource()!;
    const sourceNode = sourcePort.getNode()!;
    const sourceNodeType = sourceNode.getType();

    const targetPort = dummyOutputPort.getOutgoingEdges()[0]!.getTarget()!;
    const targetNode = targetPort.getNode()!;
    const targetNodeType = targetNode.getType();

    // Set the LONG_EDGE_SOURCE property
    if (sourceNodeType === NodeType.LONG_EDGE) {
      // The source is a LONG_EDGE node; use its LONG_EDGE_SOURCE
      longEdgeDummy.setProperty(
        InternalProperties.LONG_EDGE_SOURCE,
        sourceNode.getProperty(InternalProperties.LONG_EDGE_SOURCE),
      );
    } else {
      // The target is the original node; use it
      longEdgeDummy.setProperty(InternalProperties.LONG_EDGE_SOURCE, sourcePort);
    }

    // Set the LONG_EDGE_TARGET property
    if (targetNodeType === NodeType.LONG_EDGE) {
      // The target is a LONG_EDGE node; use its LONG_EDGE_TARGET
      longEdgeDummy.setProperty(
        InternalProperties.LONG_EDGE_TARGET,
        targetNode.getProperty(InternalProperties.LONG_EDGE_TARGET),
      );
    } else {
      // The target is the original node; use it
      longEdgeDummy.setProperty(InternalProperties.LONG_EDGE_TARGET, targetPort);
    }
  }
}
