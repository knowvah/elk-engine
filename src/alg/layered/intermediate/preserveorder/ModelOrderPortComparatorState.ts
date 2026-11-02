// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import type { OrderingStrategy } from '../../options/OrderingStrategy.js';

/** The two ports of a comparison, `(p1, p2)`. */
export type PortPair = readonly [LPort, LPort];

/** The two (possibly absent) long edge target nodes of a comparison. */
export type TargetNodePair = readonly [LNode | null, LNode | null];

/** The two long edge target nodes of a comparison where both exist. */
export type KnownTargetNodePair = readonly [LNode, LNode];

/**
 * Java's local `int reverseOrder` of `compare`, shared by reference with the section helpers: the incoming block can
 * negate it and fall through to the outgoing block, which sees the negated value.
 */
export interface ReverseOrder {
  value: number;
}

/**
 * The instance fields of Java's `ModelOrderPortComparator`. The section files (`ModelOrderPortComparatorAssociations`,
 * `ModelOrderPortComparatorIncoming`, `ModelOrderPortComparatorOutgoing`) hold the Java methods as functions over this
 * record and never import the facade, so the fields live in a file of their own. Java member docs are kept.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.java:47
 */
export class ModelOrderPortComparatorState {
  /** The model order associated to a target node of this node. */
  readonly targetNodeModelOrder: Map<LNode, number> | null;

  /** Whether ports should have a model order. */
  portModelOrder: boolean;

  /** The previous layer. */
  previousLayer: LNode[];

  /** The graph. */
  graph: LGraph;

  strategy: OrderingStrategy;

  /**
   * Each port has an entry of ports for which it is bigger. Java `HashMap<LPort, HashSet<LPort>>`: `LPort` does not
   * override `hashCode`/`equals`, so the map and sets are identity-hashed and become an insertion-ordered
   * `Map`/`Set` (AD-10). The sets are only probed and unioned, never iterated into an output order.
   */
  biggerThan = new Map<LPort, Set<LPort>>();

  /** Each port has an entry of ports for which it is smaller (identity-hashed, see `biggerThan`). */
  smallerThan = new Map<LPort, Set<LPort>>();

  constructor(
    graph: LGraph,
    previousLayer: LNode[],
    strategy: OrderingStrategy,
    targetNodeModelOrder: Map<LNode, number> | null,
    portModelOrder: boolean,
  ) {
    this.graph = graph;
    this.previousLayer = previousLayer;
    this.strategy = strategy;
    this.targetNodeModelOrder = targetNodeModelOrder;
    this.portModelOrder = portModelOrder;
  }
}
