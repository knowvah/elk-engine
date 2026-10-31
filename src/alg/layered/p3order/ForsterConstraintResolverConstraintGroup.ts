// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import type { LNode } from '../graph/LNode.js';
import type { ForsterConstraintResolver } from './ForsterConstraintResolver.js';

/**
 * A constraint group contains one or more nodes. Constraint groups are used to model sets of nodes that are placed
 * next to each other. A constraint group contains methods to calculate its barycenter value, to merge with another
 * group and to generally do cool stuff.
 *
 * Java's inner (non-static) class `ForsterConstraintResolver.ConstraintGroup` (M15 file naming): the implicit outer
 * instance is the first constructor argument, used for `stateOf`. The two Java constructors `(LNode)` and
 * `(ConstraintGroup, ConstraintGroup)` are one overloaded constructor (translation-rules 6.5, distinguished at run
 * time). The Java private fields are public here, because the resolver (the outer class) reads and writes them.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ForsterConstraintResolver.java:381
 */
export class ForsterConstraintResolverConstraintGroup {
  /** The sum of the node weights. Each node weight is the sum of the weights of adjacent ports. */
  summedWeight = 0;
  /** The number of ports relevant to the barycenter calculation. */
  degree = 0;
  /** List of nodes this vertex consists of. */
  private readonly nodes: LNode[];
  /** List of outgoing constraints. */
  private outgoingConstraints: ForsterConstraintResolverConstraintGroup[] | null = null;
  /** List of incoming constraints. */
  private incomingConstraints: ForsterConstraintResolverConstraintGroup[] | null = null;
  /** The number of incoming constraints. */
  incomingConstraintsCount = 0;

  private readonly outer: ForsterConstraintResolver;

  /**
   * Constructs a new instance containing the given node.
   *
   * @param node the node the group should contain
   * @see ForsterConstraintResolver.java:405
   */
  constructor(outer: ForsterConstraintResolver, node: LNode);
  /**
   * Constructs a new group that is the concatenation of the given two groups. The incoming constraints count is set to
   * zero, while the lists of successors are merged, updating the successors' incoming count appropriately if both
   * groups are predecessors. The new barycenter is derived from the barycenters of the given node groups.
   *
   * @param nodeGroup1 the first vertex
   * @param nodeGroup2 the second vertex
   * @see ForsterConstraintResolver.java:421
   */
  constructor(
    outer: ForsterConstraintResolver,
    nodeGroup1: ForsterConstraintResolverConstraintGroup,
    nodeGroup2: ForsterConstraintResolverConstraintGroup,
  );
  constructor(
    outer: ForsterConstraintResolver,
    first: LNode | ForsterConstraintResolverConstraintGroup,
    second?: ForsterConstraintResolverConstraintGroup,
  ) {
    this.outer = outer;
    if (second === undefined) {
      this.nodes = [first as LNode];
    } else {
      this.nodes = [];
      this.mergeOf(first as ForsterConstraintResolverConstraintGroup, second);
    }
  }

  /** The body of the two-group constructor. */
  private mergeOf(
    nodeGroup1: ForsterConstraintResolverConstraintGroup,
    nodeGroup2: ForsterConstraintResolverConstraintGroup,
  ): void {
    // create a combined nodes array
    const length1 = nodeGroup1.nodes.length;
    const length2 = nodeGroup2.nodes.length;
    for (let i = 0; i < length1; i++) {
      this.nodes[i] = nodeGroup1.nodes[i]!;
    }
    for (let i = 0; i < length2; i++) {
      this.nodes[length1 + i] = nodeGroup2.nodes[i]!;
    }

    // Add constraints, taking care not to add any constraints to vertex1 or vertex2
    // and to decrement the incoming constraints count of those that are successors to both
    this.mergeOutgoingConstraints(nodeGroup1, nodeGroup2);

    this.summedWeight = nodeGroup1.summedWeight + nodeGroup2.summedWeight;
    this.degree = nodeGroup1.degree + nodeGroup2.degree;

    if (this.degree > 0) {
      this.setBarycenter(this.summedWeight / this.degree);
    } else if (nodeGroup1.getBarycenter() !== null && nodeGroup2.getBarycenter() !== null) {
      this.setBarycenter((nodeGroup1.getBarycenter()! + nodeGroup2.getBarycenter()!) / 2);
    } else if (nodeGroup1.getBarycenter() !== null) {
      this.setBarycenter(nodeGroup1.getBarycenter());
    } else if (nodeGroup2.getBarycenter() !== null) {
      this.setBarycenter(nodeGroup2.getBarycenter());
    }
  }

  /** The constraint merging of the two-group constructor (`ForsterConstraintResolver.java:422-441`). */
  private mergeOutgoingConstraints(
    nodeGroup1: ForsterConstraintResolverConstraintGroup,
    nodeGroup2: ForsterConstraintResolverConstraintGroup,
  ): void {
    if (nodeGroup1.outgoingConstraints !== null) {
      // Lists.newLinkedList(...) is a copy; `List.remove(Object)` removes the first occurrence
      this.outgoingConstraints = [...nodeGroup1.outgoingConstraints];
      removeFirst(this.outgoingConstraints, nodeGroup2);
      if (nodeGroup2.outgoingConstraints !== null) {
        for (const candidate of nodeGroup2.outgoingConstraints) {
          if (candidate === nodeGroup1) {
            continue;
          } else if (this.outgoingConstraints.includes(candidate)) {
            // The candidate was in both vertices' successor list
            candidate.incomingConstraintsCount--;
          } else {
            this.outgoingConstraints.push(candidate);
          }
        }
      }
    } else if (nodeGroup2.outgoingConstraints !== null) {
      this.outgoingConstraints = [...nodeGroup2.outgoingConstraints];
      removeFirst(this.outgoingConstraints, nodeGroup1);
    }
  }

  /**
   * @param barycenter the barycenter value
   * @see ForsterConstraintResolver.java:477
   */
  setBarycenter(barycenter: number | null): void {
    for (const node of this.nodes) {
      this.outer.stateOf(node).barycenter = barycenter;
    }
  }

  /**
   * @returns barycenter of current constraint group.
   * @see ForsterConstraintResolver.java:486
   */
  getBarycenter(): number | null {
    return this.outer.stateOf(this.nodes[0]!).barycenter;
  }

  /**
   * Returns the list of outgoing constraints, creating it if not yet done before.
   *
   * @returns the outgoing constraints list of the node group
   * @see ForsterConstraintResolver.java:496
   */
  getOutgoingConstraints(): ForsterConstraintResolverConstraintGroup[] {
    if (this.outgoingConstraints === null) {
      this.outgoingConstraints = [];
    }
    return this.outgoingConstraints;
  }

  /**
   * Reset the list of outgoing constraints to `null`.
   *
   * @see ForsterConstraintResolver.java:506
   */
  resetOutgoingConstraints(): void {
    this.outgoingConstraints = null;
  }

  /**
   * Determine whether there are any outgoing constraints.
   *
   * @returns true if there are outgoing constraints
   * @see ForsterConstraintResolver.java:515
   */
  hasOutgoingConstraints(): boolean {
    return this.outgoingConstraints !== null && this.outgoingConstraints.length > 0;
  }

  /**
   * Returns the list of incoming constraints, creating it if not yet done before.
   *
   * @returns the incoming constraints list of the node group
   * @see ForsterConstraintResolver.java:525
   */
  getIncomingConstraints(): ForsterConstraintResolverConstraintGroup[] {
    if (this.incomingConstraints === null) {
      this.incomingConstraints = [];
    }
    return this.incomingConstraints;
  }

  /**
   * Reset the list of incoming constraints to `null`.
   *
   * @see ForsterConstraintResolver.java:535
   */
  resetIncomingConstraints(): void {
    this.incomingConstraints = null;
  }

  /**
   * Determine whether there are any incoming constraints.
   *
   * @returns true if there are incoming constraints
   * @see ForsterConstraintResolver.java:544
   */
  hasIncomingConstraints(): boolean {
    return this.incomingConstraints !== null && this.incomingConstraints.length > 0;
  }

  /**
   * Returns the array of nodes.
   *
   * @returns the contained nodes of the node group
   * @see ForsterConstraintResolver.java:553
   */
  getNodes(): LNode[] {
    return this.nodes;
  }

  /**
   * Returns the contained node. This may only be used for node groups with exactly one node.
   *
   * @returns the contained node
   * @see ForsterConstraintResolver.java:562
   */
  getNode(): LNode {
    // Java `assert nodes.length == 1` (ForsterConstraintResolver.java:563) is omitted (translation-rules 6.8)
    return this.nodes[0]!;
  }

  /** @see ForsterConstraintResolver.java:571 */
  toString(): string {
    let sb = '[';
    for (let i = 0; i < this.nodes.length; i++) {
      sb += this.nodes[i]!.toString();
      if (this.getBarycenter() !== null) {
        sb += `<${doubleToString(this.getBarycenter()!)}>`;
      }
      if (i < this.nodes.length - 1) {
        sb += ', ';
      }
    }
    return `${sb}]`;
  }
}

/** Java `List.remove(Object)`: removes the first occurrence, if any, and answers whether the list changed. */
export function removeFirst<T>(list: T[], element: T): boolean {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
    return true;
  }
  return false;
}
