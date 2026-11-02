// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { CMGroupModelOrderCalculator } from './CMGroupModelOrderCalculator.js';
import type { ModelOrderPortComparatorState, PortPair, ReverseOrder } from './ModelOrderPortComparatorState.js';

/*
 * The shared decision helpers of Java's `ModelOrderPortComparator`: the transitive bigger/smaller bookkeeping, the
 * reference-layer search and the port model order, with the tails of `compare` that the Java repeats.
 */

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/** Java `Set.addAll`. */
function addAll<T>(target: Set<T>, source: Iterable<T>): void {
  for (const element of source) {
    target.add(element);
  }
}

/** @see ModelOrderPortComparator.java:376 */
export function updateBiggerAndSmallerAssociations(
  s: ModelOrderPortComparatorState,
  biggerOri: LPort,
  smallerOri: LPort,
  reverseOrder: number,
): void {
  let bigger = biggerOri;
  let smaller = smallerOri;
  if (reverseOrder < 0) {
    bigger = smallerOri;
    smaller = biggerOri;
  }
  const biggerPortBiggerThan = s.biggerThan.get(bigger)!;
  const smallerPortBiggerThan = s.biggerThan.get(smaller)!;
  const biggerPortSmallerThan = s.smallerThan.get(bigger)!;
  const smallerPortSmallerThan = s.smallerThan.get(smaller)!;
  biggerPortBiggerThan.add(smaller);
  smallerPortSmallerThan.add(bigger);
  for (const verySmall of smallerPortBiggerThan) {
    biggerPortBiggerThan.add(verySmall);
    s.smallerThan.get(verySmall)!.add(bigger);
    addAll(s.smallerThan.get(verySmall)!, biggerPortSmallerThan);
  }

  for (const veryBig of biggerPortSmallerThan) {
    smallerPortSmallerThan.add(veryBig);
    s.biggerThan.get(veryBig)!.add(smaller);
    addAll(s.biggerThan.get(veryBig)!, smallerPortBiggerThan);
  }
}

/**
 * Given a previous layer, check which of the two reference nodes of a port is the first in it.
 *
 * @param layer The layer to check
 * @param p1Node The reference node of port p1
 * @param p2Node The reference node of port p2
 * @param _p1 The first port (unused by the Java too)
 * @param _p2 The second port (unused by the Java too)
 * @returns A comparator value showing which port should be first.
 * @see ModelOrderPortComparator.java:413
 */
export function checkReferenceLayer(
  layer: Iterable<LNode>,
  p1Node: LNode,
  p2Node: LNode,
  _p1: LPort,
  _p2: LPort,
): number {
  for (const node of layer) {
    if (node === p1Node) {
      // If the first node is found first, it has to be above the second one and does hence have a smaller
      // Model order.
      return -1;
    } else if (node === p2Node) {
      return 1;
    }
  }
  return 0; // Should never happen, the previous layer needs these nodes in it.
}

/**
 * Compares two ports by considering the model order of them.
 *
 * @param p1 The first port.
 * @param p2 The second port.
 * @returns a negative integer, zero, or a positive integer as the first argument is less than, equal to, or greater
 *   than the second.
 * @see ModelOrderPortComparator.java:362
 */
export function checkPortModelOrder(s: ModelOrderPortComparatorState, p1: LPort, p2: LPort): number {
  const numberOfPorts = p1.getNode()!.getPorts().length;
  if (p1.hasProperty(InternalProperties.MODEL_ORDER) && p2.hasProperty(InternalProperties.MODEL_ORDER)) {
    const p1Order = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(p1, p2, s.graph, numberOfPorts);
    const p2Order = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(p2, p1, s.graph, numberOfPorts);
    return integerCompare(p1Order, p2Order);
  }
  return 0;
}

/**
 * The `if (x > 0) { update(p1, p2); return reverseOrder; } else { update(p2, p1); return -reverseOrder; }` tail the
 * Java repeats after each `checkReferenceLayer`/`checkPortModelOrder` decision (`:190`, `:204`, `:218`, `:262`).
 *
 * @see ModelOrderPortComparator.java:204
 */
export function orderBySign(
  s: ModelOrderPortComparatorState,
  result: number,
  p1: LPort,
  p2: LPort,
  reverseOrder: ReverseOrder,
): number {
  if (result > 0) {
    updateBiggerAndSmallerAssociations(s, p1, p2, reverseOrder.value);
    return reverseOrder.value;
  } else {
    updateBiggerAndSmallerAssociations(s, p2, p1, reverseOrder.value);
    return -reverseOrder.value;
  }
}

/**
 * The `if (a > b) { update(p1, p2); return reverseOrder; } else { update(p2, p1); return -reverseOrder; }` tail the
 * Java repeats after comparing two computed model orders (`:248`, `:287`, `:306`, `:340`).
 *
 * @see ModelOrderPortComparator.java:248
 */
export function orderByGreater(
  s: ModelOrderPortComparatorState,
  a: number,
  b: number,
  ports: PortPair,
  reverseOrder: ReverseOrder,
): number {
  return orderBySign(s, a > b ? 1 : -1, ports[0], ports[1], reverseOrder);
}

/**
 * The `if (portModelOrder)` blocks of the incoming (`:215`) and outgoing (`:259`) sections: decide by
 * `checkPortModelOrder` if it is not 0, else `null` (fall through).
 *
 * @see ModelOrderPortComparator.java:215
 */
export function orderByPortModelOrder(
  s: ModelOrderPortComparatorState,
  p1: LPort,
  p2: LPort,
  reverseOrder: ReverseOrder,
): number | null {
  const result = checkPortModelOrder(s, p1, p2);
  if (result !== 0) {
    return orderBySign(s, result, p1, p2, reverseOrder);
  }
  return null;
}
