// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Splits the long edges of the layered graph to obtain a proper layering. For each edge that connects two nodes that
 * are more than one layer apart from each other, create a dummy node to split the edge. The resulting layering is
 * _proper_, i.e. all edges connect only nodes from subsequent layers.
 *
 * The dummy nodes retain a reference to the ports the original long edge's source and target ports.
 *
 * The actual method that splits edges is declared as a public utility method to be called from other processors that
 * need to split edges.
 *
 * Precondition: a layered graph. Postcondition: the graph is properly layered. Slots: before phase 3. Same-slot
 * dependencies: `LayerConstraintProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LongEdgeSplitter.java
 */
export class LongEdgeSplitter implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Edge splitting', 1);

    if (layeredGraph.getLayers().length <= 2) {
      monitor.done();
      return;
    }

    // Iterate through the layers
    const layerIter = new ArrayListIterator<Layer>(layeredGraph.getLayers());
    let nextLayer = layerIter.next();
    while (layerIter.hasNext()) {
      const layer = nextLayer;
      nextLayer = layerIter.next();

      // Iterate through the nodes
      for (const node of layer) {
        // Iterate through the outgoing edges
        for (const port of node.getPorts()) {
          // Iterate through the edges
          for (const edge of port.getOutgoingEdges()) {
            const targetPort = edge.getTarget()!;
            const targetLayer = targetPort.getNode()!.getLayer();

            // If the edge doesn't go to the current or next layer, split it
            if (targetLayer !== layer && targetLayer !== nextLayer) {
              // If there is no next layer, something is wrong
              // (Java `assert layerIter.hasNext()`: disabled without -ea, translation rules 6.8; no devAssert helper)

              // Split the edge
              LongEdgeSplitter.splitEdge(edge, this.#createDummyNode(layeredGraph, nextLayer, edge));
            }
          }
        }
      }
    }

    monitor.done();
  }

  /**
   * Creates a long edge dummy node to split the given edge at the given layer and adds it to the layer.
   *
   * @param layeredGraph the graph.
   * @param targetLayer the layer the dummy node will be inserted into.
   * @param edgeToSplit the edge that will later be split by the dummy node. The edge will be set as the dummy node's
   *   `InternalProperties.ORIGIN`.
   * @return the created dummy node.
   */
  #createDummyNode(layeredGraph: LGraph, targetLayer: Layer, edgeToSplit: LEdge): LNode {
    const dummyNode = new LNode(layeredGraph);

    dummyNode.setType(NodeType.LONG_EDGE);
    dummyNode.setProperty(InternalProperties.ORIGIN, edgeToSplit);
    dummyNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    dummyNode.setLayer(targetLayer);

    return dummyNode;
  }

  /**
   * Does the actual work of splitting a given edge by rerouting it to the given dummy node and introducing a new edge.
   * Two ports are added to the dummy node and long edge properties are configured for it. Also, any head labels the old
   * edge has are moved to the new edge.
   *
   * @param edge the edge to be split.
   * @param dummyNode the dummy node to split the edge with.
   * @return the new edge.
   */
  static splitEdge(edge: LEdge, dummyNode: LNode): LEdge {
    const oldEdgeTarget = edge.getTarget();

    // Set thickness of the edge
    let thickness = edge.getProperty(LayeredOptions.EDGE_THICKNESS);
    if (thickness < 0) {
      thickness = 0;
      edge.setProperty(LayeredOptions.EDGE_THICKNESS, thickness);
    }
    dummyNode.getSize().y = thickness;
    const portPos = Math.floor(thickness / 2);

    // Create dummy input and output ports
    const dummyInput = new LPort();
    dummyInput.setSide(PortSide.WEST);
    dummyInput.setNode(dummyNode);
    dummyInput.getPosition().y = portPos;

    const dummyOutput = new LPort();
    dummyOutput.setSide(PortSide.EAST);
    dummyOutput.setNode(dummyNode);
    dummyOutput.getPosition().y = portPos;

    edge.setTarget(dummyInput);

    // Create a dummy edge
    const dummyEdge = new LEdge();
    dummyEdge.copyProperties(edge);
    dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
    dummyEdge.setSource(dummyOutput);
    dummyEdge.setTarget(oldEdgeTarget);

    LongEdgeSplitter.#setDummyNodeProperties(dummyNode, edge, dummyEdge);
    LongEdgeSplitter.#moveHeadLabels(edge, dummyEdge);

    return dummyEdge;
  }

  /**
   * Sets the `InternalProperties.LONG_EDGE_SOURCE` and `InternalProperties.LONG_EDGE_TARGET` properties on the given
   * dummy node.
   *
   * @param dummyNode the dummy node.
   * @param inEdge the edge going into the dummy node.
   * @param outEdge the edge going out of the dummy node.
   */
  static #setDummyNodeProperties(dummyNode: LNode, inEdge: LEdge, outEdge: LEdge): void {
    const inEdgeSourceNode = inEdge.getSource()!.getNode()!;
    const outEdgeTargetNode = outEdge.getTarget()!.getNode()!;

    if (inEdgeSourceNode.getType() === NodeType.LONG_EDGE) {
      // The incoming edge originates from a long edge dummy node, so we can just copy its properties
      dummyNode.setProperty(
        InternalProperties.LONG_EDGE_SOURCE,
        inEdgeSourceNode.getProperty(InternalProperties.LONG_EDGE_SOURCE),
      );
      dummyNode.setProperty(
        InternalProperties.LONG_EDGE_TARGET,
        inEdgeSourceNode.getProperty(InternalProperties.LONG_EDGE_TARGET),
      );
      dummyNode.setProperty(
        InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES,
        inEdgeSourceNode.getProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES),
      );
    } else if (inEdgeSourceNode.getType() === NodeType.LABEL) {
      // The incoming edge originates from a label dummy node, so we can just copy its properties
      LongEdgeSplitter.#copyLabelDummyProperties(dummyNode, inEdgeSourceNode);
    } else if (outEdgeTargetNode.getType() === NodeType.LABEL) {
      // The outgoing edge points to a label dummy node, so we can just copy its properties
      LongEdgeSplitter.#copyLabelDummyProperties(dummyNode, outEdgeTargetNode);
    } else {
      // The source is the input edge's source port, the target is the output edge's target port. Also,
      // the long edge doesn't seem to have label dummy nodes
      dummyNode.setProperty(InternalProperties.LONG_EDGE_SOURCE, inEdge.getSource());
      dummyNode.setProperty(InternalProperties.LONG_EDGE_TARGET, outEdge.getTarget());
    }
  }

  /** The shared body of the two label dummy arms of `setDummyNodeProperties` (same three statements in Java). */
  static #copyLabelDummyProperties(dummyNode: LNode, labelDummy: LNode): void {
    dummyNode.setProperty(
      InternalProperties.LONG_EDGE_SOURCE,
      labelDummy.getProperty(InternalProperties.LONG_EDGE_SOURCE),
    );
    dummyNode.setProperty(
      InternalProperties.LONG_EDGE_TARGET,
      labelDummy.getProperty(InternalProperties.LONG_EDGE_TARGET),
    );
    dummyNode.setProperty(InternalProperties.LONG_EDGE_HAS_LABEL_DUMMIES, true);
  }

  /**
   * Moves all head labels from a given split edge to the new edge created to split it.
   *
   * @param oldEdge the old edge whose head labels are to be moved.
   * @param newEdge the new edge whose head labels are to be moved.
   */
  static #moveHeadLabels(oldEdge: LEdge, newEdge: LEdge): void {
    const labelIterator = new ArrayListIterator(oldEdge.getLabels());
    while (labelIterator.hasNext()) {
      const label = labelIterator.next();
      const labelPlacement = label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT);

      if (labelPlacement === EdgeLabelPlacement.HEAD) {
        labelIterator.remove();
        newEdge.getLabels().push(label);

        if (!label.hasProperty(InternalProperties.END_LABEL_EDGE)) {
          label.setProperty(InternalProperties.END_LABEL_EDGE, oldEdge);
        }
      }
    }
  }
}
