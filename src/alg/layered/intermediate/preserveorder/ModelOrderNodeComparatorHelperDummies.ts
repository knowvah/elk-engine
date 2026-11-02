// SPDX-License-Identifier: EPL-2.0
import { ModelOrderPortComparator } from './ModelOrderPortComparator.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import {
  getFirstIncomingSourcePortOfNode,
  getFirstOutgoingTargetPortOfNode,
  updateBiggerAndSmallerAssociations,
} from './ModelOrderNodeComparatorAssociations.js';
import type { ModelOrderNodeComparatorState } from './ModelOrderNodeComparatorState.js';

/*
 * Java's `ModelOrderNodeComparator.handleHelperDummyNodes` (`:330-484`), one function per arm of its type dispatch.
 * Its calls `this.compare(...)` go through `ModelOrderNodeComparatorState.compare`.
 */

/**
 * The per-node locals of the long edge/long edge arm (`:389-424`): the dummy's end ports and nodes, and the reference
 * node that stands in for the dummy when comparing.
 */
interface FeedbackNode {
  sourcePort: LPort;
  targetPort: LPort;
  referenceNode: LNode;
  sourceFeedbackNode: boolean;
  targetFeedbackNode: boolean;
}

/** @see ModelOrderNodeComparator.java:330 */
export function handleHelperDummyNodes(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number {
  if (n1.getType() === NodeType.LONG_EDGE && n2.getType() === NodeType.NORMAL) {
    return handleLongEdgeAndNormal(s, n1, n2);
  } else if (n1.getType() === NodeType.NORMAL && n2.getType() === NodeType.LONG_EDGE) {
    return handleNormalAndLongEdge(s, n1, n2);
  } else if (n1.getType() === NodeType.LONG_EDGE && n2.getType() === NodeType.LONG_EDGE) {
    return handleTwoLongEdges(s, n1, n2);
  } else {
    // These nodes are just two normal nodes and need to be handled by node model order.
    return 0;
  }
}

/** n1 could be a long edge node feedback node (`:331-357`). */
function handleLongEdgeAndNormal(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number {
  const dummyNodeSourcePort = getFirstIncomingSourcePortOfNode(n1);
  const dummyNodeSourceNode = dummyNodeSourcePort.getNode()!;
  const dummyNodeTargetPort = getFirstOutgoingTargetPortOfNode(n1);
  const dummyNodeTargetNode = dummyNodeTargetPort.getNode()!;
  const dummyLayerId = n1.getLayer()!.id;

  // Check whether the dummy node is feedback source or feedback target if not return.
  if (dummyNodeSourceNode.getLayer()!.id !== dummyLayerId && dummyNodeTargetNode.getLayer()!.id !== dummyLayerId) {
    return 0;
  }
  // Case the source of the dummy is the same node as n2, than the dummy node is routed below.
  if (dummyNodeSourceNode === n2) {
    updateBiggerAndSmallerAssociations(s, n1, n2);
    return 1;
  } else {
    // Calculate whether the dummy node leads to the target node.
    if (dummyNodeTargetNode === n2) {
      updateBiggerAndSmallerAssociations(s, n1, n2);
      return 1;
    }

    // If the two nodes are not the same, order them based on the source model order.
    return s.compare(dummyNodeSourceNode, n2);
  }
}

/** n2 could be a long edge node feedback node (`:358-383`); `dummyLayerId` is read from `n1`, as in the Java. */
function handleNormalAndLongEdge(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number {
  const dummyNodeSourcePort = getFirstIncomingSourcePortOfNode(n2);
  const dummyNodeSourceNode = dummyNodeSourcePort.getNode()!;
  const dummyNodeTargetPort = getFirstOutgoingTargetPortOfNode(n2);
  const dummyNodeTargetNode = dummyNodeTargetPort.getNode()!;
  const dummyLayerId = n1.getLayer()!.id;

  // Check whether the dummy node is feedback source or feedback target if not return.
  if (dummyNodeSourceNode.getLayer()!.id !== dummyLayerId && dummyNodeTargetNode.getLayer()!.id !== dummyLayerId) {
    return 0;
  }
  // Case the source of the dummy is the same node as n2, than the dummy node is routed below.
  if (dummyNodeSourceNode === n1) {
    updateBiggerAndSmallerAssociations(s, n2, n1);
    return -1;
  } else {
    // Calculate whether the dummy node leads to the target node.
    if (dummyNodeTargetNode === n1) {
      updateBiggerAndSmallerAssociations(s, n2, n1);
      return -1;
    }

    // If the two nodes are not the same, order them based on the source model order.
    return s.compare(n1, dummyNodeSourceNode);
  }
}

/**
 * One of these edges is a feedback edge. This has to be the case since at least one of them is not connected to the
 * previous layer. If only one is a long edge feedback node, I have a problem since these are not comparable. I must find
 * the reference node in the current layer of each edge and use it instead (`:384-483`).
 */
function handleTwoLongEdges(s: ModelOrderNodeComparatorState, n1: LNode, n2: LNode): number {
  const f1 = feedbackNodeOf(n1);
  const f2 = feedbackNodeOf(n2);

  // After this each reference node should be a real node in this layer that I can use to compare n1 and n2.

  // Case both are on the same node.
  if (f1.referenceNode === f2.referenceNode) {
    // Find the first port that occurs on the node.
    // Since we have a feedback node, we need to reverse the decision.
    // If the side we connect to is WEST. we also have to reverse the decision.
    // This may be a problem since here the node comparator depends on the port order in the same layer.
    const sameNode = s.beforePorts
      ? orderBeforePorts(s, [n1, n2], [f1, f2])
      : orderByReferencePorts(s, [n1, n2], [f1, f2]);
    if (sameNode !== null) {
      return sameNode;
    }
  }

  // If the nodes are different, just compare them since one should be a normal non-feedback dummy now.
  // Worst case would be that one is a dummy and one a normal dangling node, where this would just create a
  // static ordering.
  return s.compare(f1.referenceNode, f2.referenceNode);
}

/** The locals of one dummy in `:389-424`, in the Java order (source port, target port, then the reference node). */
function feedbackNodeOf(n: LNode): FeedbackNode {
  const sourcePort = getFirstIncomingSourcePortOfNode(n);
  const targetPort = getFirstOutgoingTargetPortOfNode(n);
  const sourceNode = sourcePort.getNode()!;
  const targetNode = targetPort.getNode()!;
  const layerId = n.getLayer()!.id;
  let referenceNode = n;
  let sourceFeedbackNode = false;
  let targetFeedbackNode = false;
  if (sourceNode.getLayer()!.id === layerId) {
    // This means that the dummy's source node is the reference node that we need to consider for ordering it;
    sourceFeedbackNode = true;
    referenceNode = sourceNode;
  } else if (targetNode.getLayer()!.id === layerId) {
    // This means that the dummy's target node is the reference node that we need to consider for ordering it;
    targetFeedbackNode = true;
    referenceNode = targetNode;
  }
  return { sourcePort, targetPort, referenceNode, sourceFeedbackNode, targetFeedbackNode };
}

/**
 * The `this.beforePorts` branch (`:434-459`); `null` where no case applies and the Java falls through.
 *
 * @see ModelOrderNodeComparator.java:434
 */
function orderBeforePorts(
  s: ModelOrderNodeComparatorState,
  nodes: readonly [LNode, LNode],
  feedback: readonly [FeedbackNode, FeedbackNode],
): number | null {
  const [n1, n2] = nodes;
  const [f1, f2] = feedback;
  // The order on the reference node ports may just be wrong since the ports are not yet sorted.
  // If both reference nodes are source feedback nodes, then the model order (considering reversing) does the trick.
  // If one is source one is target, I will just order them but it will always create a crossing.
  // If both are target, I should not have this problem and can never be here, since these nodes
  // should have a previous layer node.
  if (f1.sourceFeedbackNode && f2.sourceFeedbackNode) {
    return orderSourceFeedbackNodes(s, nodes, feedback);
  } else if (f1.sourceFeedbackNode && f2.targetFeedbackNode) {
    updateBiggerAndSmallerAssociations(s, n2, n1);
    return 1;
  } else if (f1.targetFeedbackNode && f2.sourceFeedbackNode) {
    updateBiggerAndSmallerAssociations(s, n1, n2);
    return -1;
  } else if (f1.targetFeedbackNode && f2.targetFeedbackNode) {
    // In this case, there must be incoming edges that can be used for ordering.
    return 0;
  }
  return null;
}

/**
 * Both reference nodes are source feedback nodes: the model order of the source ports, through a
 * `ModelOrderPortComparator` (`:441-449`; its `portModelOrder` argument is `n2TargetFeedbackNode`, as in the Java).
 *
 * @see ModelOrderNodeComparator.java:441
 */
function orderSourceFeedbackNodes(
  s: ModelOrderNodeComparatorState,
  nodes: readonly [LNode, LNode],
  feedback: readonly [FeedbackNode, FeedbackNode],
): number {
  const [n1, n2] = nodes;
  const [f1, f2] = feedback;
  const returnValue = new ModelOrderPortComparator(
    s.graph,
    s.previousLayer,
    s.orderingStrategy,
    null,
    f2.targetFeedbackNode,
  ).compare(f1.sourcePort, f2.sourcePort);
  if (returnValue > 0) {
    updateBiggerAndSmallerAssociations(s, n2, n1);
    return 1;
  } else {
    updateBiggerAndSmallerAssociations(s, n1, n2);
    return -1;
  }
}

/**
 * The `else` of `this.beforePorts` (`:460-473`): in this case, the order of the ports can just be used. Since the
 * order of WEST ports is reversed and the order for feedback edges connecting to WEST ports is reversed, I may just do
 * nothing here. `null` where no port matches.
 *
 * @see ModelOrderNodeComparator.java:464
 */
function orderByReferencePorts(
  s: ModelOrderNodeComparatorState,
  nodes: readonly [LNode, LNode],
  feedback: readonly [FeedbackNode, FeedbackNode],
): number | null {
  const [n1, n2] = nodes;
  const [f1, f2] = feedback;
  for (const port of f1.referenceNode.getPorts()) {
    if (f1.sourcePort === port) {
      updateBiggerAndSmallerAssociations(s, n2, n1);
      return -1;
    } else if (f2.sourcePort === port) {
      updateBiggerAndSmallerAssociations(s, n1, n2);
      return 1;
    }
  }
  return null;
}
