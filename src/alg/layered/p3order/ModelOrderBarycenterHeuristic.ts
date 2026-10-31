// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import type { Random } from '../../../java/util/Random.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { CMGroupModelOrderCalculator } from '../intermediate/preserveorder/CMGroupModelOrderCalculator.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';
import { BarycenterHeuristic } from './BarycenterHeuristic.js';
import type { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import { insertionSort } from './ModelOrderBarycenterHeuristicInsertionSort.js';
import type { ClearsTransitiveOrdering, LNodeComparator } from './ModelOrderBarycenterHeuristicInsertionSort.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Minimizes crossing with the barycenter method. However, the node order given by the order in the model does not
 * change. I.e. only the dummy nodes are sorted in the already sorted real nodes.
 *
 * The Java lambda of the constructor is the private method `compareNodes`, split along its comments into
 * `hasSeparateLayerConstraint` and `compareBasedOnModelOrder` (the complexity limits); the overridden
 * `minimizeCrossings(List<LNode>, ...)` is `minimizeCrossingsInLayer` (see `BarycenterHeuristic`). The identity-hashed
 * `HashMap<LNode, HashSet<LNode>>` fields are insertion-ordered `Map<LNode, Set<LNode>>` (AD-10): they are only probed
 * and unioned, never iterated for an order-dependent result.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ModelOrderBarycenterHeuristic.java
 */
export class ModelOrderBarycenterHeuristic extends BarycenterHeuristic implements ClearsTransitiveOrdering {
  /** Each node has an entry of nodes for which it is bigger. */
  private biggerThan = new Map<LNode, Set<LNode>>();
  /** Each node has an entry of nodes for which it is smaller. */
  private smallerThan = new Map<LNode, Set<LNode>>();

  /**
   * Constructs a model order barycenter heuristic for crossing minimization. After sorting `clearTransitiveOrdering`
   * should be called.
   *
   * @param constraintResolver the constraint resolver
   * @param random the random number generator
   * @param portDistributor calculates the port ranks for the barycenter heuristic.
   * @param graph current node order
   * @see ModelOrderBarycenterHeuristic.java:60
   */
  constructor(
    constraintResolver: ForsterConstraintResolver,
    random: Random,
    portDistributor: AbstractBarycenterPortDistributor,
    graph: LNode[][],
  ) {
    super(constraintResolver, random, portDistributor, graph);
    // This may have the problem that the real nodes need to be compared first such that the dummy nodes do not
    // overrule model order using the barycenter method.
    this.barycenterStateComparator = (n1, n2) => this.compareNodes(n1, n2);
  }

  /** `n.hasProperty(LAYERING_LAYER_CONSTRAINT) && (... == FIRST_SEPARATE || ... == LAST_SEPARATE)`, one operand. */
  private hasSeparateLayerConstraint(n: LNode): boolean {
    return (
      n.hasProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT) &&
      (n.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT) === LayerConstraint.FIRST_SEPARATE ||
        n.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT) === LayerConstraint.LAST_SEPARATE)
    );
  }

  /** The lambda of the constructor, assigned to `barycenterStateComparator` (`ModelOrderBarycenterHeuristic.java:65`). */
  private compareNodes(n1: LNode, n2: LNode): number {
    if (this.hasSeparateLayerConstraint(n1) || this.hasSeparateLayerConstraint(n2)) {
      return 0;
    }
    // First check whether the transitive dependencies already determine the ordering.
    const transitiveComparison = this.compareBasedOnTansitiveDependencies(n1, n2);
    if (transitiveComparison !== 0) {
      return transitiveComparison;
    }
    // If this is not the case, consider the different ordering modes for group model order for the comparator.
    if (n1.hasProperty(InternalProperties.MODEL_ORDER) && n2.hasProperty(InternalProperties.MODEL_ORDER)) {
      const value = this.compareBasedOnModelOrder(n1, n2);
      if (value < 0) {
        this.updateBiggerAndSmallerAssociations(n1, n2);
        return value;
      } else if (value > 0) {
        this.updateBiggerAndSmallerAssociations(n2, n1);
        return value;
      }
    }
    // If one of the nodes has no model order, fall back to the barycenter method.
    return this.compareBasedOnBarycenter(n1, n2);
  }

  /** The model order block of the lambda (`ModelOrderBarycenterHeuristic.java:83-100`). */
  private compareBasedOnModelOrder(n1: LNode, n2: LNode): number {
    const lgraph = n1.getGraph()!;
    // The value is either a comparison both model orders or both group model orders with
    // model order as secondary criterion.
    let value = integerCompare(
      CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
        n1,
        n2,
        lgraph,
        lgraph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
      ),
      CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
        n2,
        n1,
        lgraph,
        lgraph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
      ),
    );
    if (this.isInSeparateGroupsOnlyWithinGroup(lgraph, n1, n2)) {
      value = 0;
    }
    return value;
  }

  /** The `ONLY_WITHIN_GROUP` block of the model order comparison (`ModelOrderBarycenterHeuristic.java:87-94`). */
  private isInSeparateGroupsOnlyWithinGroup(lgraph: LGraph, n1: LNode, n2: LNode): boolean {
    return (
      lgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY) ===
        GroupOrderStrategy.ONLY_WITHIN_GROUP &&
      // Check list of enforced
      // If two nodes are in separate model order groups, do not enforce their ordering and just use barycenter.
      // C6: the Java `!=` compares two `Integer`s read from the nodes' property maps, boxes that each node got from
      // its own `Integer.valueOf` (the option is an `int`); the shared default box equals itself (cached for 0).
      !JavaInteger.sameValueOfBox(
        n1.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID),
        n2.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID),
      )
    );
  }

  /**
   * Don't use! Only public to be accessible by a test. Overrides the Java overload `minimizeCrossings(List<LNode>,
   * boolean, boolean, boolean)`.
   *
   * @see ModelOrderBarycenterHeuristic.java:113
   */
  override minimizeCrossingsInLayer(layer: LNode[], preOrdered: boolean, randomize: boolean, forward: boolean): void {
    if (randomize) {
      // Randomize barycenters (we don't need to update the edge count in this case;
      // there are no edges of interest since we're only concerned with one layer)
      this.randomizeBarycenters(layer);
    } else {
      // Calculate barycenters and assign barycenters to barycenterless node groups
      this.calculateBarycenters(layer, forward);
      this.fillInUnknownBarycenters(layer, preOrdered);
    }

    if (layer.length > 1) {
      // Sort the vertices according to their barycenters
      if (layer[0]!.getGraph()!.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER)) {
        ModelOrderBarycenterHeuristic.insertionSort(layer, this.barycenterStateComparator, this);
      } else {
        layer.sort(this.barycenterStateComparator);
      }

      // Resolve ordering constraints
      if (!layer[0]!.getGraph()!.getProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER)) {
        this.constraintResolver.processConstraints(layer);
      }
    }
  }

  /**
   * Compare two nodes based of the already collected transitive dependencies.
   *
   * @param n1 The first node
   * @param n2 The second node
   * @returns Returns -1 if n1 < n2, 0 if no ordering could be found, and 1 if n1 > n2
   * @see ModelOrderBarycenterHeuristic.java:149
   */
  private compareBasedOnTansitiveDependencies(n1: LNode, n2: LNode): number {
    if (!this.biggerThan.has(n1)) {
      this.biggerThan.set(n1, new Set<LNode>());
    } else if (this.biggerThan.get(n1)!.has(n2)) {
      return 1;
    }
    if (!this.biggerThan.has(n2)) {
      this.biggerThan.set(n2, new Set<LNode>());
    } else if (this.biggerThan.get(n2)!.has(n1)) {
      return -1;
    }
    if (!this.smallerThan.has(n1)) {
      this.smallerThan.set(n1, new Set<LNode>());
    } else if (this.smallerThan.get(n1)!.has(n2)) {
      return -1;
    }
    if (!this.smallerThan.has(n2)) {
      this.smallerThan.set(n2, new Set<LNode>());
    } else if (this.smallerThan.get(n2)!.has(n1)) {
      return 1;
    }
    return 0;
  }

  /**
   * Order nodes by their barycenter and update their transitive dependencies.
   *
   * @param n1 The first node
   * @param n2 The second node
   * @returns -1, 0, 1, see `Comparator` for details.
   * @see ModelOrderBarycenterHeuristic.java:179
   */
  private compareBasedOnBarycenter(n1: LNode, n2: LNode): number {
    const s1 = this.stateOf(n1);
    const s2 = this.stateOf(n2);
    if (s1.barycenter !== null && s2.barycenter !== null) {
      const value = doubleCompare(s1.barycenter, s2.barycenter);
      if (value < 0) {
        this.updateBiggerAndSmallerAssociations(n1, n2);
      } else if (value > 0) {
        this.updateBiggerAndSmallerAssociations(n2, n1);
      }
      return value;
    } else if (s1.barycenter !== null) {
      this.updateBiggerAndSmallerAssociations(n1, n2);
      return -1;
    } else if (s2.barycenter !== null) {
      this.updateBiggerAndSmallerAssociations(n2, n1);
      return 1;
    }
    return 0;
  }

  /**
   * Taken from `ModelOrderNodeComparator`. Safes transitive ordering dependencies of nodes for later use.
   *
   * @see ModelOrderBarycenterHeuristic.java:205
   */
  private updateBiggerAndSmallerAssociations(bigger: LNode, smaller: LNode): void {
    const biggerNodeBiggerThan = this.biggerThan.get(bigger)!;
    const smallerNodeBiggerThan = this.biggerThan.get(smaller)!;
    const biggerNodeSmallerThan = this.smallerThan.get(bigger)!;
    const smallerNodeSmallerThan = this.smallerThan.get(smaller)!;
    biggerNodeBiggerThan.add(smaller);
    smallerNodeSmallerThan.add(bigger);
    for (const verySmall of smallerNodeBiggerThan) {
      biggerNodeBiggerThan.add(verySmall);
      this.smallerThan.get(verySmall)!.add(bigger);
      for (const node of biggerNodeSmallerThan) {
        this.smallerThan.get(verySmall)!.add(node);
      }
    }

    for (const veryBig of biggerNodeSmallerThan) {
      smallerNodeSmallerThan.add(veryBig);
      this.biggerThan.get(veryBig)!.add(smaller);
      for (const node of smallerNodeBiggerThan) {
        this.biggerThan.get(veryBig)!.add(node);
      }
    }
  }

  /**
   * Sorts the layer by the given comparator with insertion sort to ensure that transitive ordering constraints are
   * respected (see the section file `ModelOrderBarycenterHeuristicInsertionSort`, which `BarycenterHeuristic` calls
   * without importing this class).
   *
   * @see ModelOrderBarycenterHeuristic.java:239
   */
  static insertionSort(
    layer: LNode[],
    comparator: LNodeComparator,
    barycenterHeuristic: ModelOrderBarycenterHeuristic,
  ): void {
    insertionSort(layer, comparator, barycenterHeuristic);
  }

  /**
   * Clears the transitive ordering.
   *
   * @see ModelOrderBarycenterHeuristic.java:257
   */
  clearTransitiveOrdering(): void {
    this.biggerThan = new Map<LNode, Set<LNode>>();
    this.smallerThan = new Map<LNode, Set<LNode>>();
  }
}
