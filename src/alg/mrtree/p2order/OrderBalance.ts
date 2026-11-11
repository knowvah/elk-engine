// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { OrderWeighting } from '../options/OrderWeighting.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { TreeUtil } from '../TreeUtil.js';
import { OrderBalanceSortTEdgeTargetProperty } from './OrderBalanceSortTEdgeTargetProperty.js';

/**
 * This phase orders the nodes of each level by separating the children of nodes into leaves and inner nodes. It then
 * fill whitespaces in the levels with corresponding leaves.
 *
 * It starts two levels above the deepest level, because the deepest level contains only nodes and therefore no
 * reordering is necessary. And the level above the deepest level contains only children of the level above, which are
 * ordered by the their parents.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p2order/OrderBalance.java
 */
export class OrderBalance implements ILayoutPhase<TreeLayoutPhases, TGraph> {
  /** Java `OrderBalance.SortTEdgeTargetProperty`, the public static nested comparator class. */
  static readonly SortTEdgeTargetProperty: typeof OrderBalanceSortTEdgeTargetProperty =
    OrderBalanceSortTEdgeTargetProperty;

  static #INTERMEDIATE_PROCESSING_CONFIG: LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class initialisation
   * (see `DFSTreeifyer`).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIG(): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return (OrderBalance.#INTERMEDIATE_PROCESSING_CONFIG ??= LayoutProcessorConfiguration.create<
      TreeLayoutPhases,
      TGraph
    >()
      .before(TreeLayoutPhases.P2_NODE_ORDERING)
      .add(IntermediateProcessorStrategy.ROOT_PROC)
      .add(IntermediateProcessorStrategy.FAN_PROC)
      .add(IntermediateProcessorStrategy.NEIGHBORS_PROC));
  }

  /** Tells the node order which weighting it should use. */
  private weighting: IProperty<number> | null = null;

  getLayoutProcessorConfiguration(_graph: TGraph): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return OrderBalance.INTERMEDIATE_PROCESSING_CONFIG;
  }

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor arrange node', 1);

    if (tGraph.getProperty(MrTreeOptions.DEBUG_MODE)) {
      progressMonitor.log('OrderBalance!');
    }

    /** get the weighting from the userinterface */
    if (tGraph.getProperty(MrTreeOptions.WEIGHTING) !== OrderWeighting.FAN) {
      this.weighting = InternalProperties.DESCENDANTS;
    } else {
      this.weighting = InternalProperties.FAN;
    }

    /** find the root of the component expected only one root exists */
    const root = OrderBalance.findRoot(tGraph);

    /** check if a root is there */
    if (root !== null) {
      /** start two levels above the deepest level at the leftmost node */
      const lM = TreeUtil.getLeftMost(root.getChildren());

      /** if there are only the root and one level or less no reordering is necessary */
      if (lM !== null && lM.getParent() !== root) {
        const parent = lM.getParent()!.getParent();
        let leftMost = parent!;
        /** go to the leftmost node in this level */
        while (leftMost.getProperty(InternalProperties.LEFTNEIGHBOR) !== null) {
          leftMost = leftMost.getProperty(InternalProperties.LEFTNEIGHBOR)!;
        }
        /** start the order at the leftmost node */
        this.orderLevel(leftMost, false);

        /** reset the structure properties of each node to null, because the order of the graph has changed */
        for (const tNode of tGraph.getNodes()) {
          tNode.setProperty(InternalProperties.RIGHTNEIGHBOR, null);
          tNode.setProperty(InternalProperties.LEFTNEIGHBOR, null);
          tNode.setProperty(InternalProperties.RIGHTSIBLING, null);
          tNode.setProperty(InternalProperties.LEFTSIBLING, null);
        }
      }
    }
  }

  /** The first node of the graph that is a root, or null (the `while (root == null && it.hasNext())` loop of the Java). */
  private static findRoot(tGraph: TGraph): TNode | null {
    let root: TNode | null = null;
    const it = tGraph.getNodes().listIterator();
    while (root === null && it.hasNext()) {
      const tNode = it.next();
      if (tNode.getProperty(InternalProperties.ROOT)) {
        root = tNode;
      }
    }
    return root;
  }

  /**
   * Order each level by seperating the children of the nodes into leaves and inner nodes. And then fill gaps with
   * corresponding leaves.
   *
   * @param leftMost the leftmost node in a level
   */
  private orderLevel(leftMost: TNode | null, odd: boolean): void {
    if (leftMost !== null) {
      /** copy current to iterate over the copy */
      let currentNode: TNode | null = leftMost;

      while (currentNode !== null) {
        /** sort all children of this node by their fan out so the leaves are at the end of the list */
        const outgoing: LinkedList<TEdge> = currentNode.getOutgoingEdges();

        // `Collections.sort(list, comparator)`: copy to an array, stable sort, write back in order
        const comparator = new OrderBalanceSortTEdgeTargetProperty(this.weighting!);
        const sorted = outgoing.toArray().sort((a, b) => comparator.compare(a, b));
        outgoing.clear();
        outgoing.addAll(sorted);

        const balanced = OrderBalance.balance(outgoing, odd);

        /** reset the list of children with the new order */
        currentNode.getOutgoingEdges().addAll(balanced);

        /** go on with the next node to the right */
        currentNode = currentNode.getProperty(InternalProperties.RIGHTNEIGHBOR);
      }
      /** this level has been ordered, go on with the next level above */
      this.orderLevel(leftMost.getParent(), !odd);
    }
  }

  /**
   * Add each child to a balanced list where the fat child are in the middle and the thin child are at the borders.
   * Leaves fill the places between the inner child, also starting at fattest node in the middle. Consumes `outgoing`.
   *
   * eg. bigger number means fatter nodes, zero means leaf
   *
   * unbalanced: 0 1 0 0 4 0 0 9 0 7 2 0 3 0 0 2 3 6 0 0
   * balanced  : 2 3 4 6 0 0 0 0 0 9 0 0 0 0 0 7 0 3 2 1
   */
  private static balance(outgoing: LinkedList<TEdge>, odd: boolean): LinkedList<TEdge> {
    const balanced = new LinkedList<TEdge>();

    let innerOdd = odd;
    while (!outgoing.isEmpty()) {
      const gaps = outgoing.get(0).getTarget()!.getProperty(InternalProperties.FAN);
      let index: number;

      if (innerOdd) {
        index = balanced.size();
        balanced.add(outgoing.get(0));
      } else {
        index = 0;
        balanced.addAt(index, outgoing.get(0));
      }
      outgoing.removeAt(0);
      innerOdd = !innerOdd;

      OrderBalance.fillWithLeaves(outgoing, balanced, index, gaps, odd);
    }
    return balanced;
  }

  /** Leaves fill the places between the inner child: the `while (0 < gaps && 0 < indexEnd)` loop of `balance`. */
  private static fillWithLeaves(
    outgoing: LinkedList<TEdge>,
    balanced: LinkedList<TEdge>,
    index: number,
    startGaps: number,
    odd: boolean,
  ): void {
    let gaps = startGaps;
    let indexEnd = outgoing.size();
    let leavesOdd = odd;
    while (0 < gaps && 0 < indexEnd) {
      indexEnd--;
      if (outgoing.get(indexEnd).getTarget()!.isLeaf()) {
        gaps--;
        if (leavesOdd) {
          balanced.add(outgoing.get(indexEnd));
        } else {
          balanced.addAt(index, outgoing.get(indexEnd));
        }
        outgoing.removeAt(indexEnd);
        leavesOdd = !leavesOdd;
      } else {
        gaps = 0;
      }
    }
  }
}
