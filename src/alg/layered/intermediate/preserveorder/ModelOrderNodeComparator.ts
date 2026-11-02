// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { LongEdgeOrderingStrategy } from '../../options/LongEdgeOrderingStrategy.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { CMGroupModelOrderCalculator } from './CMGroupModelOrderCalculator.js';
import { updateBiggerAndSmallerAssociations } from './ModelOrderNodeComparatorAssociations.js';
import { compareByPreviousLayer } from './ModelOrderNodeComparatorPreviousLayer.js';
import { ModelOrderNodeComparatorState } from './ModelOrderNodeComparatorState.js';
import type { ModelOrderNodeComparatorOptions } from './ModelOrderNodeComparatorState.js';

/**
 * Orders {@link LNode}s in the same layer by `InternalProperties.MODEL_ORDER` or the order of the nodes they connect to
 * in the previous layer.
 *
 * Facade over the section files `ModelOrderNodeComparatorAssociations`, `ModelOrderNodeComparatorHelperDummies` and
 * `ModelOrderNodeComparatorPreviousLayer` (Java is 534 lines); the Java fields are the `ModelOrderNodeComparatorState`
 * they share. The Java constructors `(LGraph, Layer, ...)` and `(LGraph, LNode[], ...)` are one overloaded constructor
 * (translation-rules 6.5, distinguished at run time); the private five-argument constructor they delegate to is the
 * `ModelOrderNodeComparatorState` constructor.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/ModelOrderNodeComparator.java
 */
export class ModelOrderNodeComparator {
  private readonly state: ModelOrderNodeComparatorState;

  /**
   * Creates a comparator to compare {@link LNode}s in the same layer. Java overloads `(LGraph, Layer, ...)` (`:84`,
   * copies the layer's nodes into an array) and `(LGraph, LNode[], ...)` (`:99`, keeps the array).
   *
   * @param previousLayer The previous layer
   * @param orderingStrategy The ordering strategy
   * @param longEdgeOrderingStrategy The strategy to order dummy nodes and nodes with no connection the previous layer
   * @param options The Java arguments `groupOrderStrategy` and `beforePorts`, grouped to respect the five-parameter
   *   limit (the Java constructors have six parameters)
   */
  constructor(
    graph: LGraph,
    previousLayer: Layer | LNode[],
    orderingStrategy: OrderingStrategy,
    longEdgeOrderingStrategy: LongEdgeOrderingStrategy,
    options: ModelOrderNodeComparatorOptions,
  ) {
    this.state = new ModelOrderNodeComparatorState(
      graph,
      orderingStrategy,
      longEdgeOrderingStrategy,
      options.groupOrderStrategy,
      options.beforePorts,
    );
    this.state.previousLayer = previousLayer instanceof Layer ? [...previousLayer.getNodes()] : previousLayer;
    this.state.compare = (n1, n2) => this.compare(n1, n2);
  }

  /** @see ModelOrderNodeComparator.java:117 */
  compare(n1: LNode, n2: LNode): number {
    const known = this.compareByKnownAssociations(n1, n2);
    if (known !== null) {
      return known;
    }

    // If no model order is set, the one node is a dummy node and the nodes should be ordered
    // by the connected edges.
    // This kind of ordering should be preferred, if the order of the edges has priority.
    if (
      this.state.orderingStrategy === OrderingStrategy.PREFER_EDGES ||
      !n1.hasProperty(InternalProperties.MODEL_ORDER) ||
      !n2.hasProperty(InternalProperties.MODEL_ORDER)
    ) {
      const byPreviousLayer = compareByPreviousLayer(this.state, n1, n2);
      if (byPreviousLayer !== null) {
        return byPreviousLayer;
      }
    }
    return this.compareByModelOrder(n1, n2);
  }

  /**
   * The four lookups opening `compare` (`:118-137`): each creates the missing set, else answers from the transitive
   * associations; `null` where the Java falls through. The last lookup reads `biggerThan` for `n2`, as the Java does.
   *
   * @see ModelOrderNodeComparator.java:118
   */
  private compareByKnownAssociations(n1: LNode, n2: LNode): number | null {
    const { biggerThan, smallerThan } = this.state;
    if (!biggerThan.has(n1)) {
      biggerThan.set(n1, new Set());
    } else if (biggerThan.get(n1)!.has(n2)) {
      return 1;
    }
    if (!biggerThan.has(n2)) {
      biggerThan.set(n2, new Set());
    } else if (biggerThan.get(n2)!.has(n1)) {
      return -1;
    }
    if (!smallerThan.has(n1)) {
      smallerThan.set(n1, new Set());
    } else if (smallerThan.get(n1)!.has(n2)) {
      return -1;
    }
    if (!smallerThan.has(n2)) {
      smallerThan.set(n2, new Set());
    } else if (biggerThan.get(n2)!.has(n1)) {
      return 1;
    }
    return null;
  }

  /**
   * Order nodes by their order in the model. This is also the fallback case if one of the nodes is not connected to the
   * previous layer.
   *
   * @see ModelOrderNodeComparator.java:264
   */
  private compareByModelOrder(n1: LNode, n2: LNode): number {
    const graph = this.state.graph;
    if (n1.hasProperty(InternalProperties.MODEL_ORDER) && n2.hasProperty(InternalProperties.MODEL_ORDER)) {
      // Make a decision on group order if possible
      const n1ModelOrder = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
        n1,
        n2,
        graph,
        graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
      );
      const n2ModelOrder = CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(
        n2,
        n1,
        graph,
        graph.getProperty(InternalProperties.MAX_MODEL_ORDER_NODES),
      );
      if (n1ModelOrder > n2ModelOrder) {
        updateBiggerAndSmallerAssociations(this.state, n1, n2);
        return 1;
      } else {
        updateBiggerAndSmallerAssociations(this.state, n2, n1);
        return -1;
      }
    } else {
      // If they have no model order, I should still make an ordering decision that I save somehow.
      // This decision is somehow random I just sort the first one before the second one.
      updateBiggerAndSmallerAssociations(this.state, n2, n1);
      return -1;
    }
  }

  /**
   * Clears the transitive ordering.
   *
   * @see ModelOrderNodeComparator.java:530
   */
  clearTransitiveOrdering(): void {
    this.state.biggerThan = new Map();
    this.state.smallerThan = new Map();
  }
}
