// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { PropertyHolderComparator } from '../../../graph/properties/PropertyHolderComparator.js';
import * as Int32 from '../../../java/lang/Int32.js';
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

/**
 * `Collections.sort(list, comparator)`: Java copies the list into an array, merge-sorts it (stable, as is
 * `Array.prototype.sort`) and writes the elements back in order.
 */
function sortList<E>(list: LinkedList<E>, comparator: (a: E, b: E) => number): void {
  const sorted = list.toArray().sort(comparator);
  list.clear();
  list.addAll(sorted);
}

/** `Integer.compare(a, b)` of two `int` values. */
const compareInts = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * This phase orders the nodes of each level by separating the nodes into leaves and inner nodes. It then fills
 * whitespaces in the levels with corresponding leaves.
 *
 * @author sor
 * @author sgu
 * @author jnc
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p2order/NodeOrderer.java
 */
export class NodeOrderer implements ILayoutPhase<TreeLayoutPhases, TGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIG: LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class initialisation:
   * a module-level read of `TreeLayoutPhases` or `IntermediateProcessorStrategy` would run before those enums finish
   * evaluating whenever the module graph is entered through one of them (the `DFSTreeifyer` precedent).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIG(): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return (NodeOrderer.#INTERMEDIATE_PROCESSING_CONFIG ??= LayoutProcessorConfiguration.create<
      TreeLayoutPhases,
      TGraph
    >()
      .before(TreeLayoutPhases.P2_NODE_ORDERING)
      .add(IntermediateProcessorStrategy.ROOT_PROC)
      .add(IntermediateProcessorStrategy.FAN_PROC)
      .add(IntermediateProcessorStrategy.LEVEL_PROC));
  }

  private weighting: OrderWeighting | null = null;
  private debug = false;

  getLayoutProcessorConfiguration(_graph: TGraph): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return NodeOrderer.INTERMEDIATE_PROCESSING_CONFIG;
  }

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor arrange node', 1);

    this.debug = tGraph.getProperty(MrTreeOptions.DEBUG_MODE);

    if (this.debug) {
      progressMonitor.log('NodeOrderer!');
    }

    // find the root node and add it to the root list, assuming that: 1. There is a root, 2. There is only one root
    // (`stream().filter(ROOT).findFirst().get()`: `TreeUtil.getRoot` throws the same NoSuchElementException)
    const root = TreeUtil.getRoot(tGraph);

    // call the right orderLevel on the first level, which is the root
    this.weighting = tGraph.getProperty(MrTreeOptions.WEIGHTING);
    if (this.weighting === OrderWeighting.FAN || this.weighting === OrderWeighting.DESCENDANTS) {
      this.orderLevelFanDescendants(new LinkedList<TNode>([root]), progressMonitor.subTask(1.0)!);
    } else if (this.weighting === OrderWeighting.CONSTRAINT) {
      this.orderLevelConstraint(new LinkedList<TNode>([root]), progressMonitor.subTask(1.0)!);
    }

    progressMonitor.done();
  }

  /**
   * Order each level by separating the nodes into leaves and inner nodes. And then fill gaps with corresponding leaves.
   * This ordering will be applied when using orderWighting FAN / DESCENDANTS
   */
  private orderLevelFanDescendants(currentLevel: LinkedList<TNode>, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor arrange level', 1);

    let sortProperty = InternalProperties.FAN;
    if (this.weighting === OrderWeighting.DESCENDANTS) {
      sortProperty = InternalProperties.DESCENDANTS;
    }

    let pos = 0;

    // sort all nodes in this level by their fan out
    // so the leaves are at the end of the list
    sortList(currentLevel, PropertyHolderComparator.with(sortProperty));

    // find the first occurrence of a leave in the list
    const firstOcc = NodeOrderer.findFirstLeave(currentLevel, sortProperty);

    // Separate the level into leaves and inner nodes
    const inners = new LinkedList<TNode>(currentLevel.toArray().slice(0, firstOcc));
    const leaves = new LinkedList<TNode>(currentLevel.toArray().slice(firstOcc, currentLevel.size()));

    // check if their are inner nodes left
    if (inners.isEmpty()) {
      // leave the leaves in their order
      for (const tENode of leaves) {
        tENode.setProperty(InternalProperties.POSITION, pos++);
      }
    } else {
      // order each level of descendants of the inner nodes
      const size = inners.size();
      for (const tPNode of inners) {
        tPNode.setProperty(InternalProperties.POSITION, pos++);

        // set the position of the children and set them in order
        const children = tPNode.getChildrenCopy();
        this.orderLevelFanDescendants(children, progressMonitor.subTask(Int32.div(1, size))!);

        // order the children by their reverse position
        const byPosition = PropertyHolderComparator.with(InternalProperties.POSITION);
        sortList(children, (a, b) => byPosition(b, a));

        // reset the list of children with the new order
        NodeOrderer.resetOutgoingEdges(tPNode, children);

        // fill gaps with leafs
        pos = NodeOrderer.fillGapsWithLeaves(tPNode, leaves, sortProperty, pos);
      }
    }
    progressMonitor.done();
  }

  /** The index of the first leave of the sorted level, found by walking back from its end (`firstOcc` of the Java). */
  private static findFirstLeave(currentLevel: LinkedList<TNode>, sortProperty: IProperty<number>): number {
    let firstOcc = currentLevel.size();
    const it = currentLevel.listIterator(currentLevel.size());
    let notNull = true;
    while (notNull && it.hasPrevious()) {
      const tNode = it.previous();
      if (tNode.getProperty(sortProperty) === 0) {
        firstOcc--;
      } else {
        notNull = false;
      }
    }
    return firstOcc;
  }

  /** Reset the outgoing edges of a node to the order of its (sorted) children (the `sortedOutEdges` blocks of the Java). */
  private static resetOutgoingEdges(tPNode: TNode, children: LinkedList<TNode>): void {
    const sortedOutEdges = new LinkedList<TEdge>();

    for (const tNode of children) {
      for (const tEdge of tPNode.getOutgoingEdges()) {
        if (tEdge.getTarget() === tNode) {
          sortedOutEdges.add(tEdge);
        }
      }
    }
    tPNode.getOutgoingEdges().clear();
    tPNode.getOutgoingEdges().addAll(sortedOutEdges);
  }

  /** Fill gaps with leafs: positions the trailing leaves for a node that has outgoing edges; returns the next `pos`. */
  private static fillGapsWithLeaves(
    tPNode: TNode,
    leaves: LinkedList<TNode>,
    sortProperty: IProperty<number>,
    startPos: number,
  ): number {
    let pos = startPos;
    const it = leaves.listIterator(leaves.size());
    let fillGap = tPNode.getOutgoingEdges().size();
    let notNull = true;
    while (0 < fillGap && notNull && it.hasPrevious()) {
      const tNode = it.previous();
      if (tNode.getProperty(sortProperty) === 0) {
        tNode.setProperty(InternalProperties.POSITION, pos++);
        fillGap--;
        it.remove();
      } else {
        notNull = false;
      }
    }
    return pos;
  }

  /** Order each level by moving the nodes with a position constraint option to that position. */
  private orderLevelConstraint(currentLevel: LinkedList<TNode>, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor arrange level', 1);

    if (this.debug) {
      progressMonitor.log('OrderLevelConstraint!');
    }

    const level = currentLevel.toArray();
    const levelSize = currentLevel.size();
    const undefinedNodes = level.filter((x) => x.getProperty(MrTreeOptions.POSITION_CONSTRAINT) < 0);
    const inBoundNodes = level.filter(
      (x) =>
        x.getProperty(MrTreeOptions.POSITION_CONSTRAINT) < levelSize &&
        x.getProperty(MrTreeOptions.POSITION_CONSTRAINT) >= 0,
    );
    const outOfBoundNodes = level.filter((x) => x.getProperty(MrTreeOptions.POSITION_CONSTRAINT) >= levelSize);

    const sortedNodes: (TNode | null)[] = new Array<TNode | null>(levelSize).fill(null);
    NodeOrderer.placeNonDuplicateConstraints(sortedNodes, inBoundNodes);
    NodeOrderer.placeDuplicateConstraints(sortedNodes, inBoundNodes);
    NodeOrderer.placeOutOfBoundAndUndefined(sortedNodes, outOfBoundNodes, undefinedNodes);

    // Set final node positions
    for (let i = 0; i < sortedNodes.length; i++) {
      sortedNodes[i]!.setProperty(InternalProperties.POSITION, i);
    }

    // Recursive calls, apply node positions
    const inners = level.filter((x) => x.getProperty(InternalProperties.FAN) !== 0);
    for (const tPNode of inners) {
      // Recursive call
      const children = tPNode.getChildrenCopy();
      this.orderLevelConstraint(children, progressMonitor.subTask(Int32.div(1, inners.length))!);

      // Order the children by their position
      sortList(children, PropertyHolderComparator.with(InternalProperties.POSITION));

      // Reset the list of children with the new order
      NodeOrderer.resetOutgoingEdges(tPNode, children);
    }

    progressMonitor.done();
  }

  /** Whether `pos` is a free slot of `sortedNodes` (the repeated `pos < length && pos >= 0 && sortedNodes[pos] == null`). */
  private static isFreeSlot(sortedNodes: (TNode | null)[], pos: number): boolean {
    return pos < sortedNodes.length && pos >= 0 && sortedNodes[pos] === null;
  }

  /** Priority 1: set non duplicate constraints; consumes the placed nodes of `inBoundNodes`. */
  private static placeNonDuplicateConstraints(sortedNodes: (TNode | null)[], inBoundNodes: TNode[]): void {
    for (let i = 0; i < inBoundNodes.length; i++) {
      const curNode = inBoundNodes[i]!;
      const targetPos = curNode.getProperty(MrTreeOptions.POSITION_CONSTRAINT);
      if (targetPos >= 0 && targetPos < inBoundNodes.length && sortedNodes[targetPos] === null) {
        sortedNodes[targetPos] = curNode;
        inBoundNodes.splice(i, 1);
        i--;
      }
    }
  }

  /** Priority 2: set duplicate constraints; consumes `inBoundNodes`. */
  private static placeDuplicateConstraints(sortedNodes: (TNode | null)[], inBoundNodes: TNode[]): void {
    for (let i = 0; i < inBoundNodes.length; i++) {
      const curNode = inBoundNodes[i]!;
      const targetPos = curNode.getProperty(MrTreeOptions.POSITION_CONSTRAINT);
      for (let j = 0; ; j++) {
        let newTargetPos = targetPos + j;
        if (NodeOrderer.isFreeSlot(sortedNodes, newTargetPos)) {
          sortedNodes[newTargetPos] = curNode;
          inBoundNodes.splice(i, 1);
          i--;
          break;
        }
        newTargetPos = targetPos - j;
        if (NodeOrderer.isFreeSlot(sortedNodes, newTargetPos)) {
          sortedNodes[newTargetPos] = curNode;
          inBoundNodes.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  /** Priority 3 (out of bounds constraints) and priority 4 (no constraint nodes); consume both lists. */
  private static placeOutOfBoundAndUndefined(
    sortedNodes: (TNode | null)[],
    outOfBoundNodes: TNode[],
    undefinedNodes: TNode[],
  ): void {
    // Priority 3: Set out of bounds constraints
    outOfBoundNodes.sort(
      (x, y) =>
        -compareInts(
          x.getProperty(MrTreeOptions.POSITION_CONSTRAINT),
          y.getProperty(MrTreeOptions.POSITION_CONSTRAINT),
        ),
    );
    for (let i = sortedNodes.length - 1; i >= 0; i--) {
      if (sortedNodes[i] === null && outOfBoundNodes.length > 0) {
        sortedNodes[i] = outOfBoundNodes[0]!;
        outOfBoundNodes.splice(0, 1);
      }
    }
    // Priority 4: Set no constraint nodes
    for (let i = 0; i < sortedNodes.length; i++) {
      if (sortedNodes[i] === null && undefinedNodes.length > 0) {
        sortedNodes[i] = undefinedNodes[0]!;
        undefinedNodes.splice(0, 1);
      }
    }
  }
}
