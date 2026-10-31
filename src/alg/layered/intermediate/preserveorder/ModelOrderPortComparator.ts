// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { CMGroupModelOrderCalculator } from './CMGroupModelOrderCalculator.js';
import {
  checkPortModelOrder,
  orderByGreater,
  updateBiggerAndSmallerAssociations,
} from './ModelOrderPortComparatorAssociations.js';
import { compareIncoming } from './ModelOrderPortComparatorIncoming.js';
import { compareOutgoing } from './ModelOrderPortComparatorOutgoing.js';
import { ModelOrderPortComparatorPortSideComparator } from './ModelOrderPortComparatorPortSideComparator.js';
import { ModelOrderPortComparatorState } from './ModelOrderPortComparatorState.js';
import type { ReverseOrder } from './ModelOrderPortComparatorState.js';

/**
 * Orders {@link LPort}s in the same layer by their edges `InternalProperties.MODEL_ORDER` or the order of the nodes
 * they connect to in the previous layer. This takes into account that ports that connect to the same (long edge)
 * target should be ordered next to each other. Outgoing ports are ordered before incoming ports. Incoming ports choose
 * a position that does not create conflicts with the previous layer. FIXME optimize this by setting ids on all already
 * handled nodes in the previous and current layer (e.g. after the node order was set) to avoid searching for the
 * correct order and using the ids instead to compare.
 *
 * Facade over the section files `ModelOrderPortComparatorAssociations`, `ModelOrderPortComparatorIncoming` and
 * `ModelOrderPortComparatorOutgoing` (Java is 445 lines, `compare` alone 245); the Java fields are the
 * `ModelOrderPortComparatorState` they share. The section helpers answer `null` where the Java falls through. The Java
 * constructors `(LGraph, Layer, ...)` and `(LGraph, LNode[], ...)` are one overloaded constructor (translation-rules
 * 6.5, distinguished at run time).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.java
 */
export class ModelOrderPortComparator {
  private readonly state: ModelOrderPortComparatorState;

  /**
   * Creates a comparator to compare {@link LPort}s in the same layer. Java overloads `(LGraph, Layer, ...)` (`:81`,
   * copies the layer's nodes into an array) and `(LGraph, LNode[], ...)` (`:97`, keeps the array).
   *
   * @param previousLayer The previous layer
   * @param targetNodeModelOrder The minimal model order connecting to a target node.
   */
  constructor(
    graph: LGraph,
    previousLayer: Layer | LNode[],
    strategy: OrderingStrategy,
    targetNodeModelOrder: Map<LNode, number> | null,
    portModelOrder: boolean,
  ) {
    this.state = new ModelOrderPortComparatorState(
      graph,
      previousLayer instanceof Layer ? [...previousLayer.getNodes()] : previousLayer,
      strategy,
      targetNodeModelOrder,
      portModelOrder,
    );
  }

  /** @see ModelOrderPortComparator.java:107 */
  compare(originalP1: LPort, originalP2: LPort): number {
    const p1 = originalP1;
    const p2 = originalP2;

    const known = this.compareByKnownAssociations(p1, p2);
    if (known !== null) {
      return known;
    }
    // Sort nodes by their ports sides NORTH < EAST < SOUTH < WEST.
    if (p1.getSide() !== p2.getSide()) {
      return this.compareBySide(p1, p2);
    }
    const reverseOrder: ReverseOrder = { value: 1 };

    // Sort incoming edges by sorting their ports by the order of the nodes they connect to.
    if (p1.getIncomingEdges().length !== 0 && p2.getIncomingEdges().length !== 0) {
      const incoming = compareIncoming(this.state, p1, p2, reverseOrder);
      if (incoming !== null) {
        return incoming;
      }
    }

    // Sort outgoing edges by sorting their ports based on the model order of their edges.
    if (p1.getOutgoingEdges().length !== 0 && p2.getOutgoingEdges().length !== 0) {
      return compareOutgoing(this.state, p1, p2, reverseOrder);
    }
    // Sort outgoing ports before incoming ports.
    return this.compareWithoutCommonEdges(p1, p2, reverseOrder);
  }

  /**
   * The four lookups opening `compare` (`:111-130`): each creates the missing set, else answers from the transitive
   * associations; `null` where the Java falls through. The last lookup reads `biggerThan` for `p2`, as the Java does.
   *
   * @see ModelOrderPortComparator.java:111
   */
  private compareByKnownAssociations(p1: LPort, p2: LPort): number | null {
    const { biggerThan, smallerThan } = this.state;
    if (!biggerThan.has(p1)) {
      biggerThan.set(p1, new Set());
    } else if (biggerThan.get(p1)!.has(p2)) {
      return 1;
    }
    if (!biggerThan.has(p2)) {
      biggerThan.set(p2, new Set());
    } else if (biggerThan.get(p2)!.has(p1)) {
      return -1;
    }
    if (!smallerThan.has(p1)) {
      smallerThan.set(p1, new Set());
    } else if (smallerThan.get(p1)!.has(p2)) {
      return -1;
    }
    if (!smallerThan.has(p2)) {
      smallerThan.set(p2, new Set());
    } else if (biggerThan.get(p2)!.has(p1)) {
      return 1;
    }
    return null;
  }

  /** @see ModelOrderPortComparator.java:132 */
  private compareBySide(p1: LPort, p2: LPort): number {
    const result = new ModelOrderPortComparatorPortSideComparator().compare(p1.getSide(), p2.getSide());
    if (result > 0) {
      updateBiggerAndSmallerAssociations(this.state, p1, p2, 1);
    } else {
      updateBiggerAndSmallerAssociations(this.state, p2, p1, 1);
    }
    return result;
  }

  /**
   * Sort outgoing ports before incoming ports; the last section of `compare`, every path returns.
   *
   * @see ModelOrderPortComparator.java:315
   */
  private compareWithoutCommonEdges(p1: LPort, p2: LPort, reverseOrder: ReverseOrder): number {
    if (p1.getIncomingEdges().length !== 0 && p2.getOutgoingEdges().length !== 0) {
      updateBiggerAndSmallerAssociations(this.state, p1, p2, reverseOrder.value);
      return 1;
    } else if (p1.getOutgoingEdges().length !== 0 && p2.getIncomingEdges().length !== 0) {
      updateBiggerAndSmallerAssociations(this.state, p2, p1, reverseOrder.value);
      return -1;
    } else if (p1.hasProperty(InternalProperties.MODEL_ORDER) && p2.hasProperty(InternalProperties.MODEL_ORDER)) {
      return this.compareUnconnectedPorts(p1, p2, reverseOrder);
    } else {
      updateBiggerAndSmallerAssociations(this.state, p2, p1, reverseOrder.value);
      return -reverseOrder.value;
    }
  }

  /**
   * The ports have no edges. Use the port model order to compare them. This can always be very bad since these
   * unconnected ports can transitively order nodes that should be ordered differently. This can only be prevented, if
   * one handles the sorting such that unconnected ports are handled last.
   *
   * @see ModelOrderPortComparator.java:322
   */
  private compareUnconnectedPorts(p1: LPort, p2: LPort, reverseOrder: ReverseOrder): number {
    const graph = this.state.graph;
    const numberOfPorts = p1.getNode()!.getPorts().length;
    const p1MO = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(p1, p2, graph, numberOfPorts);
    const p2MO = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(p2, p1, graph, numberOfPorts);
    // Still check the side, since WEST and SOUTH must be the other way around.
    if (
      (p1.getSide() === PortSide.WEST && p2.getSide() === PortSide.WEST) ||
      (p1.getSide() === PortSide.SOUTH && p2.getSide() === PortSide.SOUTH)
    ) {
      // Some ports are ordered in the way around.
      // Previously this did not matter, since the north south processor did override the ordering.
      reverseOrder.value = -reverseOrder.value;
    }

    return orderByGreater(this.state, p1MO, p2MO, [p1, p2], reverseOrder);
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
  checkPortModelOrder(p1: LPort, p2: LPort): number {
    return checkPortModelOrder(this.state, p1, p2);
  }

  /**
   * Clears the transitive ordering.
   *
   * @see ModelOrderPortComparator.java:441
   */
  clearTransitiveOrdering(): void {
    this.state.biggerThan = new Map();
    this.state.smallerThan = new Map();
  }
}
