// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { EdgeConstraint } from '../options/EdgeConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';

/**
 * Makes sure nodes with edge or layer constraints have only incoming or only outgoing edges, as appropriate. This is
 * done even before cycle breaking because the result may already break some cycles (or, indeed, cause new ones). This
 * processor is required for `LayerConstraintProcessor` to work correctly. If edge constraints are in conflict with
 * layer constraints, the latter take precedence. Furthermore, this processor handles nodes with fixed port sides for
 * which all ports are reversed, i.e. input ports are on the right and output ports are on the left. All incident edges
 * are reversed in such cases.
 *
 * Special handling applies to nodes that are to be placed in the `FIRST` or `LAST` layer if they have incoming or
 * outgoing edges with labels, respectively. The labels are represented by label dummy nodes, which will later be
 * placed in a separate layer between `FIRST_SEPARATE` and `FIRST` (or `LAST` and `LAST_SEPARATE`).
 *
 * For this processor, outer nodes are nodes with their layer constraint set to `FIRST_SEPARATE`, `FIRST`, `LAST` or
 * `LAST_SEPARATE`. Nodes that are not outer nodes are called inner nodes.
 *
 * Precondition: an unlayered graph. Postcondition: nodes with layer constraints have only incoming or only outgoing
 * edges, as appropriate. Slots: before phase 1. Same-slot dependencies: none.
 *
 * Complexity-limit splits (Java order kept): the Java's two identical `switch` blocks become `edgeConstraintOf`, the
 * two identical constraint-applying blocks become `applyEdgeConstraint`, and the all-ports-reversed test of
 * `handleInnerNodes` becomes `areAllPortsReversed` plus three one-test helpers. Java `assert`s in `canReverse*` are omitted (translation-rules
 * 6.8: no `devAssert` helper, the JVM runs without `-ea`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.java
 */
export class EdgeAndLayerConstraintEdgeReverser implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Edge and layer constraint edge reversal', 1);

    // Apply edge reversal to all FIRST and FIRST_SEPARATE as well as LAST and LAST_SEPARATE nodes
    const remainingNodes = this.handleOuterNodes(layeredGraph);

    // Apply edge reversal to remaining nodes
    this.handleInnerNodes(layeredGraph, remainingNodes);

    monitor.done();
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Outer Nodes

  /**
   * Ensures that edges incident to outer nodes are correct.
   *
   * @return list of those nodes that are not outer nodes.
   */
  private handleOuterNodes(layeredGraph: LGraph): LNode[] {
    const remainingNodes: LNode[] = [];
    for (const node of layeredGraph.getLayerlessNodes()) {
      // Check if there is a layer constraint
      const layerConstraint = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
      const edgeConstraint = this.edgeConstraintOf(layerConstraint);

      if (edgeConstraint !== null) {
        this.applyEdgeConstraint(layeredGraph, node, layerConstraint, edgeConstraint);
      } else {
        // Remember this node for the next loop
        remainingNodes.push(node);
      }
    }

    return remainingNodes;
  }

  /** The edge constraint a layer constraint implies (the Java's inline `switch`), or `null`. */
  private edgeConstraintOf(layerConstraint: LayerConstraint): EdgeConstraint | null {
    switch (layerConstraint) {
      case LayerConstraint.FIRST:
      case LayerConstraint.FIRST_SEPARATE:
        return EdgeConstraint.OUTGOING_ONLY;

      case LayerConstraint.LAST:
      case LayerConstraint.LAST_SEPARATE:
        return EdgeConstraint.INCOMING_ONLY;

      default:
        return null;
    }
  }

  /** The Java's inline `if (edgeConstraint != null)` body, shared by the outer and inner loops. */
  private applyEdgeConstraint(
    layeredGraph: LGraph,
    node: LNode,
    layerConstraint: LayerConstraint,
    edgeConstraint: EdgeConstraint,
  ): void {
    // Set the edge constraint on the node
    node.setProperty(InternalProperties.EDGE_CONSTRAINT, EdgeConstraint.OUTGOING_ONLY);

    if (edgeConstraint === EdgeConstraint.INCOMING_ONLY) {
      this.reverseEdges(layeredGraph, node, layerConstraint, PortType.INPUT);
    } else if (edgeConstraint === EdgeConstraint.OUTGOING_ONLY) {
      this.reverseEdges(layeredGraph, node, layerConstraint, PortType.OUTPUT);
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Inner Nodes

  private handleInnerNodes(layeredGraph: LGraph, remainingNodes: readonly LNode[]): void {
    // Iterate over the remaining nodes
    for (const node of remainingNodes) {
      // Check if there is a layer constraint
      const layerConstraint = node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
      const edgeConstraint = this.edgeConstraintOf(layerConstraint);

      if (edgeConstraint !== null) {
        this.applyEdgeConstraint(layeredGraph, node, layerConstraint, edgeConstraint);
      } else {
        // If the port sides are fixed, but all ports are reversed, that probably means that we have a feedback node.
        // Normally, the connected edges would be routed around the node, but that hides the feedback node character.
        // We thus simply reverse all connected edges and thus make ELK Layered think we have a regular node
        //
        // Note that this behavior is only desired if none of the connected nodes have layer constraints set.
        // Otherwise this processing causes issues with an external port dummy with FIRST_SEPARATE and an inverted
        // ports on the target node's EAST side.
        if (node.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed() && node.getPorts().length !== 0) {
          if (this.areAllPortsReversed(node)) {
            // Reverse all kinds of edges
            this.reverseEdges(layeredGraph, node, layerConstraint, PortType.UNDEFINED);
          }
        }
      }
    }
  }

  /**
   * The Java's inline `allPortsReversed` loop of `handleInnerNodes`; the inner `break`s leave only their own loop, so
   * the three per-port tests below (each side-effect free) are evaluated in the Java order.
   */
  private areAllPortsReversed(node: LNode): boolean {
    let allPortsReversed = true;

    for (const port of node.getPorts()) {
      // A non-reversed eastern port has more outgoing than incoming edges (net flow <= 0). A non-reversed western port
      // has more incoming than outgoing edges (net flow >= 0). If this port doesn't violate one of these conditions,
      // not all of the node's ports are reversed.
      if (!this.isReversedSideAndFlow(port)) {
        allPortsReversed = false;
        break;
      }

      // no LAST or LAST_SEPARATE allowed for the target of outgoing edges
      if (this.hasLastTarget(port)) {
        allPortsReversed = false;
      }
      // no FIRST or FIRST_SEPARATE allowed for the source of incoming edgs
      if (this.hasFirstSource(port)) {
        allPortsReversed = false;
      }
    }

    return allPortsReversed;
  }

  /** `port.getSide() == EAST && netFlow > 0 || port.getSide() == WEST && netFlow < 0`. */
  private isReversedSideAndFlow(port: LPort): boolean {
    return (
      (port.getSide() === PortSide.EAST && port.getNetFlow() > 0) ||
      (port.getSide() === PortSide.WEST && port.getNetFlow() < 0)
    );
  }

  /** The first of the Java's inner loops: does an outgoing edge end at a LAST or LAST_SEPARATE node? */
  private hasLastTarget(port: LPort): boolean {
    for (const e of port.getOutgoingEdges()) {
      const lc = e.getTarget()!.getNode()!.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
      if (lc === LayerConstraint.LAST || lc === LayerConstraint.LAST_SEPARATE) {
        return true;
      }
    }
    return false;
  }

  /** The second of the Java's inner loops: does an incoming edge start at a FIRST or FIRST_SEPARATE node? */
  private hasFirstSource(port: LPort): boolean {
    for (const e of port.getIncomingEdges()) {
      const lc = e.getSource()!.getNode()!.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
      if (lc === LayerConstraint.FIRST || lc === LayerConstraint.FIRST_SEPARATE) {
        return true;
      }
    }
    return false;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Edge Reversal

  /**
   * Reverses edges as appropriate.
   *
   * @param layeredGraph the layered graph
   * @param node the node to place in the layer
   * @param nodeLayerConstraint the layer constraint put on the node
   * @param targetPortType what ports should be turned into. If this is `PortType.OUTPUT`, for example, all incoming
   *   edges are reversed such that the ports become pure output ports.
   */
  private reverseEdges(
    layeredGraph: LGraph,
    node: LNode,
    nodeLayerConstraint: LayerConstraint,
    targetPortType: PortType,
  ): void {
    // Iterate through the node's edges and reverse them, if necessary
    for (const port of LGraphUtil.toPortArray(node.getPorts())) {
      // Only incoming edges
      if (targetPortType === PortType.INPUT || targetPortType === PortType.UNDEFINED) {
        const outgoing = LGraphUtil.toEdgeArray(port.getOutgoingEdges());

        for (const edge of outgoing) {
          // Reverse the edge if we're allowed to do so
          if (this.canReverseOutgoingEdge(nodeLayerConstraint, edge)) {
            edge.reverse(layeredGraph, true);
          }
        }
      }

      // Only outgoing edges
      if (targetPortType === PortType.OUTPUT || targetPortType === PortType.UNDEFINED) {
        const incoming = LGraphUtil.toEdgeArray(port.getIncomingEdges());

        for (const edge of incoming) {
          // Reverse the edge if we're allowed to do so
          if (this.canReverseIncomingEdge(nodeLayerConstraint, edge)) {
            edge.reverse(layeredGraph, true);
          }
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Reversal Testing

  /**
   * Checks whether or not a given edge outgoing edge can actually be reversed. It cannot be reversed if it already has
   * been, or if it connects a node in the `LAST` layer to either a node in the `LAST_SEPARATE` layer or to a label
   * dummy node.
   *
   * @param sourceNodeLayerConstraint the source node's layer constraint
   * @param edge the edge to possibly be reversed
   * @return `true` if it's okay to reverse the edge
   */
  private canReverseOutgoingEdge(sourceNodeLayerConstraint: LayerConstraint, edge: LEdge): boolean {
    // If the edge is already reversed, we don't want to reverse it again
    if (edge.getProperty(InternalProperties.REVERSED)) {
      return false;
    }

    const targetNode = edge.getTarget()!.getNode()!;

    // If the node is supposed to be in the lAST layer...
    if (sourceNodeLayerConstraint === LayerConstraint.LAST) {
      // ...and is connected to a label dummy, we won't reverse it since that dummy has to be placed between the LAST
      // and the LAST_SEPARATE layer
      if (targetNode.getType() === NodeType.LABEL) {
        return false;
      }
    }

    // If the target is a node in the LAST_SEPARATE layer, we won't reverse it
    const targetLayerConstraint = targetNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
    if (targetLayerConstraint === LayerConstraint.LAST_SEPARATE) {
      return false;
    }

    return true;
  }

  /**
   * Checks whether or not a given edge incoming edge can actually be reversed. It cannot be reversed if it already has
   * been, or if it connects a node in the `FIRST` layer to either a node in the `FIRST_SEPARATE` layer or to a label
   * dummy node.
   *
   * @param targetNodeLayerConstraint the target node's layer constraint
   * @param edge the edge to possibly be reversed
   * @return `true` if it's okay to reverse the edge
   */
  private canReverseIncomingEdge(targetNodeLayerConstraint: LayerConstraint, edge: LEdge): boolean {
    // If the edge is already reversed, we don't want to reverse it again
    if (edge.getProperty(InternalProperties.REVERSED)) {
      return false;
    }

    const sourceNode = edge.getSource()!.getNode()!;

    // If the node is supposed to be in the FIRST layer...
    if (targetNodeLayerConstraint === LayerConstraint.FIRST) {
      // ...and is connected to a label dummy, we won't reverse it since that dummy has to be placed between the
      // FIRST_SEPARATE and the FIRST layer
      if (sourceNode.getType() === NodeType.LABEL) {
        return false;
      }
    }

    // If the source is a node in the FIRST_SEPARATE layer, we won't reverse it
    const sourceLayerConstraint = sourceNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT);
    if (sourceLayerConstraint === LayerConstraint.FIRST_SEPARATE) {
      return false;
    }

    return true;
  }
}
