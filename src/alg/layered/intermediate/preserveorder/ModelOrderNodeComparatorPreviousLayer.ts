// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import {
  getModelOrderFromConnectedEdges,
  updateBiggerAndSmallerAssociations,
} from './ModelOrderNodeComparatorAssociations.js';
import { handleHelperDummyNodes } from './ModelOrderNodeComparatorHelperDummies.js';
import type { ModelOrderNodeComparatorState } from './ModelOrderNodeComparatorState.js';

/*
 * The previous-layer section of Java's `ModelOrderNodeComparator.compare` (`:142-263`): order nodes by the order of the
 * nodes they connect to in the previous layer. Every helper answers `null` where the Java falls through.
 */

/**
 * Get the first port that actually connects to a previous layer (`:145-154` for `n1`, `:156-165` for `n2`: the Java
 * holds the same loop twice).
 *
 * @see ModelOrderNodeComparator.java:145
 */
function firstSourcePortInPreviousLayer(n: LNode): LPort | null {
  for (const p of n.getPorts()) {
    if (p.getIncomingEdges().length !== 0) {
      if (p.getIncomingEdges()[0]!.getSource()!.getNode()!.getLayer()!.id === n.getLayer()!.id - 1) {
        return p.getIncomingEdges()[0]!.getSource()!;
      }
    }
  }
  return null;
}

/** `p1SourcePort != null && p2SourcePort == null || p1SourcePort == null && p2SourcePort != null` (`:220`). */
function exactlyOneConnected(p1SourcePort: LPort | null, p2SourcePort: LPort | null): boolean {
  return (p1SourcePort !== null && p2SourcePort === null) || (p1SourcePort === null && p2SourcePort !== null);
}

/**
 * The block of `compare` that runs when the order of the edges has priority or a node has no model order.
 *
 * @see ModelOrderNodeComparator.java:142
 */
export function compareByPreviousLayer(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number | null {
  // In this case the order of the connected nodes in the previous layer should be respected
  const p1SourcePort = firstSourcePortInPreviousLayer(n1);
  const p2SourcePort = firstSourcePortInPreviousLayer(n2);

  // Case both nodes have connections to the previous layer.
  if (p1SourcePort !== null && p2SourcePort !== null) {
    const both = compareBothConnected(s, [n1, n2], [p1SourcePort, p2SourcePort]);
    if (both !== null) {
      return both;
    }
  }

  // One node has no source port
  if (exactlyOneConnected(p1SourcePort, p2SourcePort)) {
    const one = compareOneConnected(s, n1, n2);
    if (one !== null) {
      return one;
    }
  }

  // Both nodes are not connected to the previous layer
  if (p1SourcePort === null && p2SourcePort === null) {
    // Check whether one of them is a helper dummy node.
    const none = orderByHelperDummyNodes(s, n1, n2);
    if (none !== null) {
      return none;
    }
  }

  // Fall through case.
  // Both nodes are not connected to the previous layer and are normal nodes.
  // The node model order shall be used to order them.
  return null;
}

/**
 * Both nodes have a source port in the previous layer (`:168-217`).
 *
 * @see ModelOrderNodeComparator.java:168
 */
function compareBothConnected(
  s: ModelOrderNodeComparatorState,
  nodes: readonly [LNode, LNode],
  sourcePorts: readonly [LPort, LPort],
): number | null {
  const [n1, n2] = nodes;
  const p1Node = sourcePorts[0].getNode();
  const p2Node = sourcePorts[1].getNode();

  // If both nodes connect to the same node the order of their corresponding ports in the previous
  // layer should be used to order them.
  if (p1Node !== null && p1Node === p2Node) {
    return compareOnSameSourceNode(s, nodes, sourcePorts);
  }

  // If the nodes do not connect to the same node, the nodes are ordered by the nodes they connect to.
  // One can disregard the model order here
  // since the ordering in the previous layer does already reflect it.
  for (const previousNode of s.previousLayer) {
    if (previousNode === p1Node) {
      updateBiggerAndSmallerAssociations(s, n2, n1);
      return -1;
    } else if (previousNode === p2Node) {
      updateBiggerAndSmallerAssociations(s, n1, n2);
      return 1;
    }
  }
  // Again, I assume that such a node must exist, and I should never get here.
  return null;
}

/**
 * We are not allowed to look at the model order of the edges but we have to look at the actual port ordering since the
 * edge order might be broken here. If we have long edges the edge model order might not respect the ordering. Every
 * path returns.
 *
 * @see ModelOrderNodeComparator.java:174
 */
function compareOnSameSourceNode(
  s: ModelOrderNodeComparatorState,
  nodes: readonly [LNode, LNode],
  sourcePorts: readonly [LPort, LPort],
): number {
  const [n1, n2] = nodes;
  const [p1SourcePort, p2SourcePort] = sourcePorts;
  for (const port of p1SourcePort.getNode()!.getPorts()) {
    if (port === p1SourcePort) {
      // Case the port is the one connecting to n1, therefore, n1 has a smaller model order
      updateBiggerAndSmallerAssociations(s, n2, n1);
      return -1;
    } else if (port === p2SourcePort) {
      // Case the port is the one connecting to n2, therefore, n1 has a bigger model order
      updateBiggerAndSmallerAssociations(s, n1, n2);
      return 1;
    }
  }
  // assert (false): the JVM runs without -ea.
  // Cannot happen, since both nodes have a connection to the previous layer.
  // Nevertheless, if it does happen provide well defined behavior and use the model order of the edges.
  const n1EdgeOrder = getModelOrderFromConnectedEdges(s, n1);
  const n2EdgeOrder = getModelOrderFromConnectedEdges(s, n2);
  if (n1EdgeOrder > n2EdgeOrder) {
    updateBiggerAndSmallerAssociations(s, n1, n2);
    return 1;
  } else {
    // I assume that equal is not an alternative here.
    updateBiggerAndSmallerAssociations(s, n2, n1);
    return -1;
  }
}

/**
 * The tail the Java holds twice (`:222-230` and `:249-257`): check whether one of them is a helper dummy node and, if
 * `handleHelperDummyNodes` decides, record and return its feedback.
 *
 * @see ModelOrderNodeComparator.java:222
 */
function orderByHelperDummyNodes(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number | null {
  const comparedWithLongEdgeFeedback = handleHelperDummyNodes(s, n1, n2);
  if (comparedWithLongEdgeFeedback !== 0) {
    if (comparedWithLongEdgeFeedback > 0) {
      updateBiggerAndSmallerAssociations(s, n1, n2);
    } else {
      updateBiggerAndSmallerAssociations(s, n2, n1);
    }
    return comparedWithLongEdgeFeedback;
  }
  return null;
}

/**
 * Exactly one node has a source port in the previous layer (`:220-244`).
 *
 * @see ModelOrderNodeComparator.java:220
 */
function compareOneConnected(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number | null {
  // Check whether one of them is a helper dummy node.
  const helper = orderByHelperDummyNodes(s, n1, n2);
  if (helper !== null) {
    return helper;
  }

  // Otherwise use the model order of the connected edges if one of them is no dummy node.
  if (!n1.hasProperty(InternalProperties.MODEL_ORDER) || !n2.hasProperty(InternalProperties.MODEL_ORDER)) {
    const n1ModelOrder = getModelOrderFromConnectedEdges(s, n1);
    const n2ModelOrder = getModelOrderFromConnectedEdges(s, n2);
    if (n1ModelOrder > n2ModelOrder) {
      updateBiggerAndSmallerAssociations(s, n1, n2);
      return 1;
    } else {
      updateBiggerAndSmallerAssociations(s, n2, n1);
      return -1;
    }
  }
  return null;
}
