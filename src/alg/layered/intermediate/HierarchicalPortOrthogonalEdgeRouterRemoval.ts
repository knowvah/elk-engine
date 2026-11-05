// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';

/** The three ports of a temporary north / south dummy (`:617-634`). */
interface TemporaryDummyPorts {
  readonly nodeInPort: LPort | null;
  readonly nodeOutPort: LPort | null;
  readonly nodeOriginPort: LPort | null;
}

/**
 * Removes the temporary hierarchical port dummies, reconnecting their incoming and outgoing edges to the original
 * dummies and setting the appropriate bend points.
 *
 * @param layeredGraph the layered graph.
 * @see HierarchicalPortOrthogonalEdgeRouter.java:598
 */
export function removeTemporaryNorthSouthDummies(layeredGraph: LGraph): void {
  const nodesToRemove: LNode[] = [];

  // Iterate through all layers
  for (const layer of layeredGraph) {
    for (const node of layer) {
      if (node.getType() !== NodeType.EXTERNAL_PORT) {
        // We're only looking for hierarchical port dummies
        continue;
      }

      if (!node.hasProperty(InternalProperties.EXT_PORT_REPLACED_DUMMY)) {
        // We're only looking for temporary north / south dummies
        continue;
      }

      rerouteEdgesToOrigin(node);

      // Remember the temporary node for removal
      nodesToRemove.push(node);
    }
  }

  // Remove nodes
  for (const node of nodesToRemove) {
    node.setLayer(null);
  }
}

/**
 * The ports of a temporary dummy: there must be a port where all edges come in, another port where edges go out, and a
 * port with an edge connecting node and origin (that one was added previously by this processor).
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:614
 */
function findPorts(node: LNode): TemporaryDummyPorts {
  let nodeInPort: LPort | null = null;
  let nodeOutPort: LPort | null = null;
  let nodeOriginPort: LPort | null = null;

  for (const port of node.getPorts()) {
    switch (port.getSide()) {
      case PortSide.WEST:
        nodeInPort = port;
        break;

      case PortSide.EAST:
        nodeOutPort = port;
        break;

      default:
        nodeOriginPort = port;
    }
  }

  return { nodeInPort, nodeOutPort, nodeOriginPort };
}

/**
 * The body of the node loop of `removeTemporaryNorthSouthDummies` (`:614-679`), split out for the complexity limit.
 * A missing port is a `NullPointerException` in Java; here the dereference throws a `TypeError`.
 *
 * @see HierarchicalPortOrthogonalEdgeRouter.java:614
 */
function rerouteEdgesToOrigin(node: LNode): void {
  const { nodeInPort, nodeOutPort, nodeOriginPort } = findPorts(node);

  // Find the edge connecting this dummy to the original external port dummy that we restored just a while ago
  const nodeToOriginEdge = nodeOriginPort!.getOutgoingEdges()[0]!;

  // Compute bend points for incoming edges
  const incomingEdgeBendPoints = new KVectorChain(nodeToOriginEdge.getBendPoints());

  const firstBendPoint = new KVector(nodeOriginPort!.getPosition());
  firstBendPoint.add(node.getPosition());
  incomingEdgeBendPoints.addAt(0, firstBendPoint);

  // Compute bend points for outgoing edges
  const outgoingEdgeBendPoints = KVectorChain.reverse(nodeToOriginEdge.getBendPoints());

  const lastBendPoint = new KVector(nodeOriginPort!.getPosition());
  lastBendPoint.add(node.getPosition());
  outgoingEdgeBendPoints.add(lastBendPoint);

  // Retrieve the original hierarchical port dummy
  const replacedDummy = node.getProperty(InternalProperties.EXT_PORT_REPLACED_DUMMY);
  const replacedDummyPort = replacedDummy.getPorts()[0]!;

  // Reroute all the input port's edges
  let edges = [...nodeInPort!.getIncomingEdges()];

  for (const edge of edges) {
    edge.setTarget(replacedDummyPort);
    edge.getBendPoints().addAllAsCopies(edge.getBendPoints().size(), incomingEdgeBendPoints);
  }

  // Reroute all the output port's edges
  edges = LGraphUtil.toEdgeArray(nodeOutPort!.getOutgoingEdges());

  for (const edge of edges) {
    edge.setSource(replacedDummyPort);
    edge.getBendPoints().addAllAsCopies(0, outgoingEdgeBendPoints);
  }

  // Remove connection between node and original hierarchical port dummy
  nodeToOriginEdge.setSource(null);
  nodeToOriginEdge.setTarget(null);
}
