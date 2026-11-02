// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { CMGroupModelOrderCalculator } from './CMGroupModelOrderCalculator.js';
import { orderByGreater, orderByPortModelOrder } from './ModelOrderPortComparatorAssociations.js';
import type {
  KnownTargetNodePair,
  ModelOrderPortComparatorState,
  PortPair,
  ReverseOrder,
  TargetNodePair,
} from './ModelOrderPortComparatorState.js';

/*
 * The outgoing-edges section of Java's `ModelOrderPortComparator.compare` (`:229-314`): sort outgoing edges by sorting
 * their ports based on the model order of their edges. Every path of the section returns.
 */

/** @see ModelOrderPortComparator.java:231 */
function reversesOutgoingOrder(p1: LPort, p2: LPort): boolean {
  return (
    (p1.getSide() === PortSide.WEST && p2.getSide() === PortSide.WEST) ||
    (p1.getSide() === PortSide.SOUTH && p2.getSide() === PortSide.SOUTH)
  );
}

/** @see ModelOrderPortComparator.java:241 */
function prefersTargetNodeModelOrder(
  s: ModelOrderPortComparatorState,
  p1TargetNode: LNode | null,
  p2TargetNode: LNode | null,
): boolean {
  return (
    s.strategy === OrderingStrategy.PREFER_NODES &&
    p1TargetNode !== null &&
    p2TargetNode !== null &&
    p1TargetNode.hasProperty(InternalProperties.MODEL_ORDER) &&
    p2TargetNode.hasProperty(InternalProperties.MODEL_ORDER)
  );
}

/** @see ModelOrderPortComparator.java:230 */
export function compareOutgoing(
  s: ModelOrderPortComparatorState,
  p1: LPort,
  p2: LPort,
  reverseOrder: ReverseOrder,
): number {
  if (reversesOutgoingOrder(p1, p2)) {
    // Some ports are ordered in the way around.
    // Previously this did not matter, since the north south processor did override the ordering.
    reverseOrder.value = -reverseOrder.value;
  }
  const p1TargetNode = p1.getProperty(InternalProperties.LONG_EDGE_TARGET_NODE) as LNode | null;
  const p2TargetNode = p2.getProperty(InternalProperties.LONG_EDGE_TARGET_NODE) as LNode | null;

  // If node order is preferred and both edges have a target node use the model order of the long edge target.
  if (prefersTargetNodeModelOrder(s, p1TargetNode, p2TargetNode)) {
    return compareByTargetNodeModelOrder(s, [p1, p2], [p1TargetNode!, p2TargetNode!], reverseOrder);
  }

  // If port order is used instead of edge order, consult it to make decisions.
  // If not both ports have a model order fall back to the edge order.
  if (s.portModelOrder) {
    const byPort = orderByPortModelOrder(s, p1, p2, reverseOrder);
    if (byPort !== null) {
      return byPort;
    }
    // If one of the ports has no model order, find something else to compare them which is the edge order.
  }
  return compareByEdgeModelOrder(s, [p1, p2], [p1TargetNode, p2TargetNode], reverseOrder);
}

/** @see ModelOrderPortComparator.java:244 */
function compareByTargetNodeModelOrder(
  s: ModelOrderPortComparatorState,
  ports: PortPair,
  targetNodes: KnownTargetNodePair,
  reverseOrder: ReverseOrder,
): number {
  const [p1TargetNode, p2TargetNode] = targetNodes;
  const p1MO = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
    p1TargetNode,
    p2TargetNode,
    s.graph,
    s.graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
  );
  const p2MO = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
    p2TargetNode,
    p1TargetNode,
    s.graph,
    s.graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
  );
  return orderByGreater(s, p1MO, p2MO, ports, reverseOrder);
}

/**
 * One of the two blocks computing `p1Order`/`p2Order` from the first outgoing edge (`:275` for `p1`, `:279` for `p2`):
 * `self` is the port whose order is computed, `other` the second argument of the calculator.
 *
 * @see ModelOrderPortComparator.java:275
 */
function firstOutgoingEdgeOrder(s: ModelOrderPortComparatorState, self: LPort, other: LPort): number {
  if (self.getOutgoingEdges()[0]!.hasProperty(InternalProperties.MODEL_ORDER)) {
    return CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
      self.getOutgoingEdges()[0]!,
      other.getOutgoingEdges()[0]!,
      s.graph,
      self.getOutgoingEdges().length + self.getIncomingEdges().length,
    );
  }
  return 0;
}

/**
 * The model order of the first outgoing edges, then the target nodes' order (`:273-312`).
 *
 * @see ModelOrderPortComparator.java:273
 */
function compareByEdgeModelOrder(
  s: ModelOrderPortComparatorState,
  ports: PortPair,
  targetNodes: TargetNodePair,
  reverseOrder: ReverseOrder,
): number {
  const [p1, p2] = ports;
  const [p1TargetNode, p2TargetNode] = targetNodes;
  let p1Order = firstOutgoingEdgeOrder(s, p1, p2);
  let p2Order = firstOutgoingEdgeOrder(s, p2, p1);

  // If both ports have the same target nodes, make sure that the backward edge is below the normal edge.
  if (p1TargetNode !== null && p1TargetNode === p2TargetNode) {
    // If both edges are reversed or not reversed, just use their model order.
    return orderByGreater(s, p1Order, p2Order, ports, reverseOrder);
  }
  // Use precomputed ordering value if possible to utilize order inheritence of edges connected to a node.
  // This allows to bundle edges leading to the same node, disregarding their model order.
  if (s.targetNodeModelOrder !== null) {
    if (p1TargetNode !== null && s.targetNodeModelOrder.has(p1TargetNode)) {
      p1Order = s.targetNodeModelOrder.get(p1TargetNode)!;
    }
    if (p2TargetNode !== null && s.targetNodeModelOrder.has(p2TargetNode)) {
      p2Order = s.targetNodeModelOrder.get(p2TargetNode)!;
    }
  }
  // If the nodes have different targets just use their order.
  return orderByGreater(s, p1Order, p2Order, ports, reverseOrder);
}
