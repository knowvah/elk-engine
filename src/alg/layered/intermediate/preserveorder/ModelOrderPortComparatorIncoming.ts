// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import {
  checkReferenceLayer,
  orderByPortModelOrder,
  orderBySign,
  updateBiggerAndSmallerAssociations,
} from './ModelOrderPortComparatorAssociations.js';
import type { ModelOrderPortComparatorState, ReverseOrder } from './ModelOrderPortComparatorState.js';

/*
 * The incoming-edges section of Java's `ModelOrderPortComparator.compare` (`:144-227`): sort incoming edges by sorting
 * their ports by the order of the nodes they connect to. Every helper answers `null` where the Java falls through.
 */

/** The locals the section shares between its steps (`:153-156`). */
interface IncomingSources {
  p1: LPort;
  p2: LPort;
  p1SourcePort: LPort;
  p2SourcePort: LPort;
  p1Node: LNode;
  p2Node: LNode;
}

/** @see ModelOrderPortComparator.java:145 */
function reversesIncomingOrder(p1: LPort, p2: LPort): boolean {
  return (
    (p1.getSide() === PortSide.WEST && p2.getSide() === PortSide.WEST) ||
    (p1.getSide() === PortSide.NORTH && p2.getSide() === PortSide.NORTH) ||
    (p1.getSide() === PortSide.SOUTH && p2.getSide() === PortSide.SOUTH)
  );
}

/** @see ModelOrderPortComparator.java:171 */
function connectsToLongEdgesInOneLayer(sources: IncomingSources): boolean {
  const { p1, p2, p1SourcePort, p2SourcePort, p1Node, p2Node } = sources;
  return (
    p1SourcePort.getNode()!.getType() === NodeType.LONG_EDGE &&
    p2SourcePort.getNode()!.getType() === NodeType.LONG_EDGE &&
    p1Node.getLayer()!.id === p2Node.getLayer()!.id &&
    p1Node.getLayer()!.id === p1.getNode()!.getLayer()!.id
  );
}

/** @see ModelOrderPortComparator.java:144 */
export function compareIncoming(
  s: ModelOrderPortComparatorState,
  p1: LPort,
  p2: LPort,
  reverseOrder: ReverseOrder,
): number | null {
  if (reversesIncomingOrder(p1, p2)) {
    // Some ports are ordered in the way around.
    // Previously this did not matter, since the north south processor did override the ordering.
    reverseOrder.value = -reverseOrder.value;
  }

  const p1SourcePort = p1.getIncomingEdges()[0]!.getSource()!;
  const p2SourcePort = p2.getIncomingEdges()[0]!.getSource()!;
  const p1Node = p1SourcePort.getNode()!;
  const p2Node = p2SourcePort.getNode()!;
  const sources: IncomingSources = { p1, p2, p1SourcePort, p2SourcePort, p1Node, p2Node };
  if (p1Node === p2Node) {
    const sameNode = compareOnSameSourceNode(s, sources, reverseOrder);
    if (sameNode !== null) {
      return sameNode;
    }
  }
  // If both ports connect to long edges in the same layer, reverse the order.
  if (connectsToLongEdgesInOneLayer(sources)) {
    const longEdges = compareLongEdgeSources(s, sources, reverseOrder);
    if (longEdges !== null) {
      return longEdges;
    }
  }

  return compareByPreviousLayer(s, sources, reverseOrder);
}

/**
 * Check which of the nodes connects first to the previous layer; if neither decides, use the port model order (`:200-226`).
 *
 * @see ModelOrderPortComparator.java:200
 */
function compareByPreviousLayer(
  s: ModelOrderPortComparatorState,
  sources: IncomingSources,
  reverseOrder: ReverseOrder,
): number | null {
  const { p1, p2, p1Node, p2Node } = sources;
  // Check which of the nodes connects first to the previous layer.
  // checkReferenceLayer already updates the transitive ordering association.
  const inPreviousLayer = checkReferenceLayer([...s.previousLayer], p1Node, p2Node, p1, p2);
  if (inPreviousLayer !== 0) {
    return orderBySign(s, inPreviousLayer, p1, p2, reverseOrder);
  }
  // If both ports do not connect to the previous layer, use the port model order.
  // If port order is used instead of edge order, consult it to make decisions.
  // If not both ports have a model order fall back to the edge order.
  if (s.portModelOrder) {
    return orderByPortModelOrder(s, p1, p2, reverseOrder);
  }
  return null;
}

/**
 * If both connect to the same node, check their occurrence order since these ports have to be handled first and should
 * hence be sorted.
 *
 * @see ModelOrderPortComparator.java:158
 */
function compareOnSameSourceNode(
  s: ModelOrderPortComparatorState,
  sources: IncomingSources,
  reverseOrder: ReverseOrder,
): number | null {
  const { p1, p2, p1SourcePort, p2SourcePort, p1Node } = sources;
  for (const port of p1Node.getPorts()) {
    if (p1SourcePort === port) {
      updateBiggerAndSmallerAssociations(s, p2, p1, reverseOrder.value);
      return -reverseOrder.value;
    } else if (p2SourcePort === port) {
      updateBiggerAndSmallerAssociations(s, p1, p2, reverseOrder.value);
      return reverseOrder.value;
    }
  }
  return null;
}

/**
 * Both ports connect to long edges in the same layer: reverse the order. The Java local `previousLayer` shadows the
 * field of that name inside this block.
 *
 * @see ModelOrderPortComparator.java:174
 */
function compareLongEdgeSources(
  s: ModelOrderPortComparatorState,
  sources: IncomingSources,
  reverseOrder: ReverseOrder,
): number | null {
  const { p1, p2, p1Node, p2Node } = sources;
  // _
  // n1 n2_|
  // || ||
  // |__2__||
  // ___1___|
  //
  const previousLayer = p1Node.getLayer()!;
  // if it is a SOUTH or EAST port reverse the order.
  // checkReferenceLayer already updates the transitive ordering association.
  const inPreviousLayer = checkReferenceLayer(previousLayer, p1Node, p2Node, p1, p2);
  if (inPreviousLayer !== 0) {
    if (p1.getSide() === PortSide.EAST && p2.getSide() === PortSide.EAST) {
      // Some ports are ordered in the way around.
      // Previously this did not matter, since the north south processor did override the ordering.
      reverseOrder.value = -reverseOrder.value;
    }
    return orderBySign(s, inPreviousLayer, p1, p2, reverseOrder);
  }
  return null;
}
