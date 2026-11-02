// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { ModelOrderNodeComparatorState } from './ModelOrderNodeComparatorState.js';

/*
 * The shared helpers of Java's `ModelOrderNodeComparator`: the transitive bigger/smaller bookkeeping, the model order
 * of the connected edges, and the first-port lookups.
 */

/** Java `Set.addAll`. */
function addAll<T>(target: Set<T>, source: Iterable<T>): void {
  for (const element of source) {
    target.add(element);
  }
}

/**
 * The model order of the first incoming edge of a node.
 *
 * @param n The node
 * @returns The model order of the first incoming edge of the given node. Returns Integer.MAX_VALUE if no such edge
 *   exists.
 * @see ModelOrderNodeComparator.java:292
 */
export function getModelOrderFromConnectedEdges(s: ModelOrderNodeComparatorState, n: LNode): number {
  const sourcePort = n.getPorts().find((p) => p.getIncomingEdges().length !== 0) ?? null;
  if (sourcePort !== null) {
    const edge = sourcePort.getIncomingEdges()[0];
    if (edge !== undefined) {
      // FIX ME I guess I should use group model order here.
      // Java unboxes the `Integer` here: a missing property is a NullPointerException.
      const modelOrder = edge.getProperty(InternalProperties.MODEL_ORDER) as number | null;
      if (modelOrder === null) {
        throw new TypeError('Cannot unbox the model order of an edge without one');
      }
      return modelOrder;
    }
  }
  // Set to MAX_INT to sort dummy nodes over nodes without a connection to the previous layer.
  // Set to -MAX_INT to sort dummy nodes under nodes without a connection to the previous layer.
  // Set to 0 if you do not care about their order.
  // One of this has to be chosen, since dummy nodes are not comparable with nodes
  // that do not have a connection to the previous layer.
  return s.longEdgeNodeOrder.returnValue();
}

/** @see ModelOrderNodeComparator.java:309 */
export function updateBiggerAndSmallerAssociations(
  s: ModelOrderNodeComparatorState,
  bigger: LNode,
  smaller: LNode,
): void {
  const biggerNodeBiggerThan = s.biggerThan.get(bigger)!;
  const smallerNodeBiggerThan = s.biggerThan.get(smaller)!;
  const biggerNodeSmallerThan = s.smallerThan.get(bigger)!;
  const smallerNodeSmallerThan = s.smallerThan.get(smaller)!;
  biggerNodeBiggerThan.add(smaller);
  smallerNodeSmallerThan.add(bigger);
  for (const verySmall of smallerNodeBiggerThan) {
    biggerNodeBiggerThan.add(verySmall);
    s.smallerThan.get(verySmall)!.add(bigger);
    addAll(s.smallerThan.get(verySmall)!, biggerNodeSmallerThan);
  }

  for (const veryBig of biggerNodeSmallerThan) {
    smallerNodeSmallerThan.add(veryBig);
    s.biggerThan.get(veryBig)!.add(smaller);
    addAll(s.biggerThan.get(veryBig)!, smallerNodeBiggerThan);
  }
}

/**
 * Helper method to get the first incoming port of a node.
 *
 * @param node The node
 * @returns The first incoming port.
 * @see ModelOrderNodeComparator.java:492
 */
function getFirstIncomingPortOfNode(node: LNode): LPort | null {
  return node.getPorts().find((p) => p.getIncomingEdges().length !== 0) ?? null;
}

/**
 * Helper method to get the source port of the first incoming port of a node.
 *
 * @param node The node
 * @returns The source port of the first incoming port.
 * @see ModelOrderNodeComparator.java:503
 */
export function getFirstIncomingSourcePortOfNode(node: LNode): LPort {
  return getFirstIncomingPortOfNode(node)!.getIncomingEdges()[0]!.getSource()!;
}

/**
 * Helper method to get the first outgoing port of a node.
 *
 * @param node The node
 * @returns The first outgoing port.
 * @see ModelOrderNodeComparator.java:513
 */
function getFirstOutgoingPortOfNode(node: LNode): LPort | null {
  return node.getPorts().find((p) => p.getOutgoingEdges().length !== 0) ?? null;
}

/**
 * Helper method to get the target port of the first outgoing port of a node.
 *
 * @param node The node
 * @returns The target port of the first outgoing port.
 * @see ModelOrderNodeComparator.java:523
 */
export function getFirstOutgoingTargetPortOfNode(node: LNode): LPort {
  return getFirstOutgoingPortOfNode(node)!.getOutgoingEdges()[0]!.getTarget()!;
}
