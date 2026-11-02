// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { LongEdgeOrderingStrategy } from '../../options/LongEdgeOrderingStrategy.js';
import type { OrderingStrategy } from '../../options/OrderingStrategy.js';

/**
 * The last two Java constructor arguments (`groupOrderStrategy`, `beforePorts`), grouped to respect the
 * five-parameter limit.
 */
export interface ModelOrderNodeComparatorOptions {
  groupOrderStrategy: GroupOrderStrategy;
  beforePorts: boolean;
}

/**
 * The instance fields of Java's `ModelOrderNodeComparator`. The section files (`ModelOrderNodeComparatorAssociations`,
 * `ModelOrderNodeComparatorHelperDummies`, `ModelOrderNodeComparatorPreviousLayer`) hold the Java methods as functions
 * over this record and never import the facade, so the fields live in a file of their own; the facade installs its
 * `compare` as `compare` here, for the Java calls `this.compare(...)` of `handleHelperDummyNodes`. Java member docs
 * are kept.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/ModelOrderNodeComparator.java:41
 */
export class ModelOrderNodeComparatorState {
  /** The previous layer. */
  previousLayer: LNode[] = [];

  /** The graph. */
  graph: LGraph;

  /** The ordering strategy. */
  readonly orderingStrategy: OrderingStrategy;

  /** The group ordering strategy (assigned by the Java constructor, never read). */
  readonly groupOrderStrategy: GroupOrderStrategy;

  /**
   * Each node has an entry of nodes for which it is bigger. Java `HashMap<LNode, HashSet<LNode>>`: `LNode` does not
   * override `hashCode`/`equals`, so the map and sets are identity-hashed and become an insertion-ordered
   * `Map`/`Set` (AD-10). The sets are only probed and unioned, never iterated into an output order.
   */
  biggerThan = new Map<LNode, Set<LNode>>();

  /** Each node has an entry of nodes for which it is smaller (identity-hashed, see `biggerThan`). */
  smallerThan = new Map<LNode, Set<LNode>>();

  /** Dummy node sorting strategy when compared to nodes with no connection to the previous layer. */
  longEdgeNodeOrder: LongEdgeOrderingStrategy = LongEdgeOrderingStrategy.EQUAL;

  /** Whether the node comparator was called before ports. */
  beforePorts: boolean;

  /** The facade's `compare`. */
  compare: (n1: LNode, n2: LNode) => number = () => 0;

  /** @see ModelOrderNodeComparator.java:106 */
  constructor(
    graph: LGraph,
    orderingStrategy: OrderingStrategy,
    longEdgeOrderingStrategy: LongEdgeOrderingStrategy,
    groupOrderStrategy: GroupOrderStrategy,
    beforePorts: boolean,
  ) {
    this.graph = graph;
    this.orderingStrategy = orderingStrategy;
    this.groupOrderStrategy = groupOrderStrategy;
    this.longEdgeNodeOrder = longEdgeOrderingStrategy;
    this.beforePorts = beforePorts;
  }
}
