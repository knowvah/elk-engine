// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import { l2i, roundToLong } from '../../../java/lang/JavaMath.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { TreeUtil } from '../TreeUtil.js';

/** One suspended `firstWalk` activation of an internal node (NodePlacer.java:137-184). */
interface FirstWalkFrame {
  readonly cN: TNode;
  readonly level: number;
  readonly lS: TNode | null;
  readonly children: Iterator<TNode>;
}

/** The call a suspended `secondWalk` activation makes next (NodePlacer.java:328-342). */
const SecondWalkStep = {
  /** the first-child call (`:334`) */
  CHILD: 0,
  /** the right-sibling call (`:341`) */
  SIBLING: 1,
  /** none: the activation returns */
  DONE: 2,
} as const;
type SecondWalkStep = (typeof SecondWalkStep)[keyof typeof SecondWalkStep];

/** One suspended `secondWalk` activation (NodePlacer.java:319-342). */
interface SecondWalkFrame {
  readonly tNode: TNode;
  readonly yCoor: number;
  readonly modsum: number;
  step: SecondWalkStep;
}

/**
 * The algorithm comes from
 * - John Q.Walker II, A Node-Positioning Algorithm for General Trees, Software: Practice and Experience 20(7), pp.
 *   685-705, July 1990.
 * with some small fixes in the actual code.
 *
 * This algorithm utilizes two concepts developed in previous positioning algorithms. First is the concept of building
 * subtrees as rigid units. When a node is moved, all of its descendants (if it has any) are also moved--the entire
 * subtree being thus treated as a rigid unit. A general tree is positioned by building it up recursively from its
 * leaves toward its root.
 *
 * Second is the concept of using two fields for the positioning of each node. These two fields are:
 * - a preliminary x-coordinate
 * - a modifier field.
 *
 * Two tree traversals are used to produce the final x-coordinate of a node. The first traversal assigns the
 * preliminary x-coordinate and modifier fields for each node; the second traversal computes the final x-coordinate of
 * each node by summing the node's preliminary x-coordinate with the modifier fields of all of its ancestors. The final
 * y-coordinate of the node is the height of the node's ancestors levels and the height nodes's level and the adjust of
 * the root location.
 *
 * @author sor
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p3place/NodePlacer.java
 */
export class NodePlacer implements ILayoutPhase<TreeLayoutPhases, TGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIG: LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class initialisation
   * (see `DFSTreeifyer`).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIG(): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return (NodePlacer.#INTERMEDIATE_PROCESSING_CONFIG ??= LayoutProcessorConfiguration.create<
      TreeLayoutPhases,
      TGraph
    >()
      .addBefore(TreeLayoutPhases.P2_NODE_ORDERING, IntermediateProcessorStrategy.ROOT_PROC)
      .before(TreeLayoutPhases.P3_NODE_PLACEMENT)
      .add(IntermediateProcessorStrategy.LEVEL_HEIGHT)
      .add(IntermediateProcessorStrategy.NEIGHBORS_PROC)
      .before(TreeLayoutPhases.P4_EDGE_ROUTING)
      .add(IntermediateProcessorStrategy.DIRECTION_PROC)
      .add(IntermediateProcessorStrategy.NODE_POSITION_PROC));
  }

  private spacing = 0;

  /** Determine how to adjust all the nodes with respect to the location of the root. */
  private xTopAdjustment = 0;
  private yTopAdjustment = 0;

  private direction: Direction | null = null;

  getLayoutProcessorConfiguration(_graph: TGraph): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return NodePlacer.INTERMEDIATE_PROCESSING_CONFIG;
  }

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Processor order nodes', 2);

    /** set the settings according to the user inputs */
    this.spacing = tGraph.getProperty(MrTreeOptions.SPACING_NODE_NODE);
    this.direction = tGraph.getProperty(MrTreeOptions.DIRECTION);

    // Set Direction to DOWN if its UNDEFINED
    if (this.direction === Direction.UNDEFINED) {
      this.direction = Direction.DOWN;
      tGraph.setProperty(MrTreeOptions.DIRECTION, this.direction);
    }

    /** find the root node of this component */
    const roots = new LinkedList<TNode>();
    for (const tNode of tGraph.getNodes()) {
      if (tNode.getProperty(InternalProperties.ROOT)) {
        roots.add(tNode);
      }
    }
    const root = roots.getFirst();

    /** Do the preliminary positioning with a postorder walk. */
    this.firstWalk(root, 0);
    progressMonitor.worked(1);

    /** Do the final positioning with a preorder walk. */
    this.secondWalk(
      root,
      this.yTopAdjustment - root.getProperty(InternalProperties.LEVELHEIGHT) / 2,
      this.xTopAdjustment,
    );
    progressMonitor.worked(1);

    progressMonitor.done();
  }

  /**
   * In this first postorder walk, every node of the tree is assigned a preliminary x-coordinate (held in property
   * PRELIM). In addition, internal nodes are given modifiers, which will be used to move their offspring to the right
   * (held in property MODIFIER).
   *
   * The recursive call of NodePlacer.java:160 is a frame push. AC6 (#67): explicit stack, same visit, side-effect and
   * accumulation order. A frame is one suspended Java activation of an internal node: the node, its level, `lS` (read
   * at entry, as the Java local is) and the live iterator over its children; the work after the loop runs when the
   * iterator is exhausted. A leaf's activation completes at entry without a frame.
   *
   * @param cN the root level of the tree
   * @param level the index of the passed level
   */
  private firstWalk(cN: TNode, level: number): void {
    const stack: FirstWalkFrame[] = [];
    this.enterFirstWalk(cN, level, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      /** This Node is not a leaf, so call this procedure recursively for each of its offspring. */
      const next = frame.children.next();
      if (next.done !== true) {
        this.enterFirstWalk(next.value, frame.level + 1, stack);
      } else {
        stack.pop();
        this.finishFirstWalk(frame.cN, frame.level, frame.lS);
      }
    }
  }

  /**
   * Entry of one `firstWalk` activation (NodePlacer.java:138-158): resets the modifier and reads the left sibling; a
   * leaf gets its preliminary x-coordinate at once, an internal node a frame for its child loop.
   */
  private enterFirstWalk(cN: TNode, level: number, stack: FirstWalkFrame[]): void {
    cN.setProperty(InternalProperties.MODIFIER, 0);
    const lS = cN.getProperty(InternalProperties.LEFTSIBLING);

    if (cN.isLeaf()) {
      if (lS !== null) {
        /**
         * Determine the preliminary x-coordinate based on: the preliminary x-coordinate of the left sibling, the
         * separation between sibling nodes, and tHe mean size of left sibling and current node.
         */
        const p = lS.getProperty(InternalProperties.PRELIM) + this.spacing + this.meanNodeWidth(lS, cN);
        cN.setProperty(InternalProperties.PRELIM, p);
      } else {
        /** No sibling on the left to worry about. */
        cN.setProperty(InternalProperties.PRELIM, 0);
      }
    } else {
      // the edge lists do not change during the walk; the iterator stays live as the Java's does
      stack.push({ cN, level, lS, children: cN.getChildren()[Symbol.iterator]() });
      // Java's StackOverflowError of an endless recursion, raised from this class
      checkStackDepth(stack.length);
    }
  }

  /** The work of a `firstWalk` activation after its child loop (NodePlacer.java:163-182). */
  private finishFirstWalk(cN: TNode, level: number, lS: TNode | null): void {
    /**
     * Set the prelim and modifer for this node by determine the midpoint of its offsprings and the middle node size of
     * the node and its left sibling
     */
    const lM = Iterables.getFirst(cN.getChildren(), null);
    const rM = Iterables.getLast(cN.getChildren(), null);
    const midPoint = (rM!.getProperty(InternalProperties.PRELIM) + lM!.getProperty(InternalProperties.PRELIM)) / 2;

    if (lS !== null) {
      /** This Node has a left sibling so its offsprings must be shifted to the right */
      const p = lS.getProperty(InternalProperties.PRELIM) + this.spacing + this.meanNodeWidth(lS, cN);
      cN.setProperty(InternalProperties.PRELIM, p);
      cN.setProperty(InternalProperties.MODIFIER, cN.getProperty(InternalProperties.PRELIM) - midPoint);
      /** shift the offsprings of this node to the right */
      this.apportion(cN, level);
    } else {
      /** No sibling on the left to worry about. */
      cN.setProperty(InternalProperties.PRELIM, midPoint);
    }
  }

  /**
   * This method cleans up the positioning of small sibling subtrees, thus fixing the "left-to-right gluing" problem
   * evident in earlier algorithms. When moving a new subtree farther and farther to the right, gaps may open up among
   * smaller subtrees that were previously sandwiched between larger subtrees. Thus, when moving the new, larger
   * subtree to the right, the distance it is moved is also apportioned to smaller, interior subtrees, creating a
   * pleasing aesthetic placement.
   *
   * @param cN the root of the subtree
   * @param level the level of the root in the global tree
   */
  private apportion(cN: TNode, _level: number): void {
    /** Initialize the leftmost and neighbor corresponding to the root of the subtree */
    let leftmost: TNode | null = Iterables.getFirst(cN.getChildren(), null);
    let neighbor: TNode | null = leftmost !== null ? leftmost.getProperty(InternalProperties.LEFTNEIGHBOR) : null;
    let compareDepth = 1;
    /** until this node and the neighbor to the left have nodes in the current level we have to shift the current subtree */
    while (leftmost !== null && neighbor !== null) {
      /** Compute the location of Leftmost and where it should be with respect to Neighbor. */
      let leftModSum = 0;
      let rightModSum = 0;
      let ancestorLeftmost: TNode = leftmost;
      let ancestorNeighbor: TNode = neighbor;
      /** sum the modifiers of all ancestors according to the current level */
      for (let i = 0; i < compareDepth; i++) {
        ancestorLeftmost = ancestorLeftmost.getParent()!;
        ancestorNeighbor = ancestorNeighbor.getParent()!;
        rightModSum += ancestorLeftmost.getProperty(InternalProperties.MODIFIER);
        leftModSum += ancestorNeighbor.getProperty(InternalProperties.MODIFIER);
      }
      /**
       * Find the MoveDistance, and apply it to Node's subtree. Add appropriate portions to smaller interior subtrees.
       */
      const prN = neighbor.getProperty(InternalProperties.PRELIM);
      const prL = leftmost.getProperty(InternalProperties.PRELIM);
      const mean = this.meanNodeWidth(leftmost, neighbor);
      const moveDistance = prN + leftModSum + this.spacing + mean - prL - rightModSum;

      if (0 < moveDistance && !this.moveSubtree(cN, ancestorNeighbor, moveDistance)) {
        return;
      }
      /**
       * Determine the leftmost descendant of Node at the next lower level to compare its positioning against that of
       * its Neighbor.
       */
      compareDepth++;
      leftmost = NodePlacer.nextLowerLeftmost(cN, leftmost, compareDepth);
      neighbor = leftmost !== null ? leftmost.getProperty(InternalProperties.LEFTNEIGHBOR) : null;
    }
  }

  /** The leftmost descendant at the next lower level: the `if (leftmost.isLeaf()) ... else ...` of `apportion`. */
  private static nextLowerLeftmost(cN: TNode, leftmost: TNode, compareDepth: number): TNode | null {
    if (leftmost.isLeaf()) {
      return TreeUtil.getLeftMost(cN.getChildren(), compareDepth);
    }
    return Iterables.getFirst(leftmost.getChildren(), null);
  }

  /**
   * The `if (0 < moveDistance)` block of `apportion`: apply the move distance to the left siblings of `cN` up to
   * `ancestorNeighbor`. Returns false where the Java returns from `apportion`.
   */
  private moveSubtree(cN: TNode, ancestorNeighbor: TNode, startDistance: number): boolean {
    let moveDistance = startDistance;
    /** Count interior sibling subtrees in LeftSiblings */
    let leftSibling: TNode | null = cN;
    let leftSiblings = 0;
    while (leftSibling !== null && leftSibling !== ancestorNeighbor) {
      leftSiblings++;
      leftSibling = leftSibling.getProperty(InternalProperties.LEFTSIBLING);
    }
    /** Apply portions to appropriate left sibling subtrees. */
    if (leftSibling !== null) {
      const portion = moveDistance / leftSiblings;
      leftSibling = cN;
      while (leftSibling !== ancestorNeighbor) {
        const newPr = leftSibling!.getProperty(InternalProperties.PRELIM) + moveDistance;
        leftSibling!.setProperty(InternalProperties.PRELIM, newPr);
        const newMod = leftSibling!.getProperty(InternalProperties.MODIFIER) + moveDistance;
        leftSibling!.setProperty(InternalProperties.MODIFIER, newMod);
        moveDistance -= portion;
        leftSibling = leftSibling!.getProperty(InternalProperties.LEFTSIBLING);
      }
      return true;
    }
    /**
     * Don't need to move anything--it needs to be done by an ancestor because AncestorNeighbor and AncestorLeftmost
     * are not siblings of each other.
     */
    return false;
  }

  /**
   * This function returns the mean width of the two passed nodes. It adds the width of the right half of left hand node
   * to the left half of right hand node. If all nodes are the same width, this is a trivial calculation.
   *
   * @param leftNode the left hand node
   * @param rightNode the right hand node
   * @return the sum of the width
   */
  private meanNodeWidth(leftNode: TNode | null, rightNode: TNode | null): number {
    let nodeWidth = 0;
    if (leftNode !== null) {
      if (this.direction!.isVertical()) {
        nodeWidth += leftNode.getSize().x / 2;
      } else {
        nodeWidth += leftNode.getSize().y / 2;
      }
    }
    if (rightNode !== null) {
      if (this.direction!.isVertical()) {
        nodeWidth += rightNode.getSize().x / 2;
      } else {
        nodeWidth += rightNode.getSize().y / 2;
      }
    }
    return nodeWidth;
  }

  /**
   * During a second preorder walk, each node is given a final x-coordinate by summing its preliminary x-coordinate and
   * the modifiers of all the node's ancestors. The y-coordinate depends on the height of the node's ancestors levels.
   * If the actual position of an interior node is right of its preliminary place, the subtree rooted at the node must
   * be moved right to center the sons around the father. Rather than immediately readjust all the nodes in the
   * subtree, each node remembers the distance to the provisional place in a modifier field (property MODIFIER). In
   * this second pass down the tree, modifiers are accumulated and applied to every node.
   *
   * The recursive calls of NodePlacer.java:334 (first child) and :341 (right sibling) are separate frame pushes in that
   * order. AC6 (#67): explicit stack, same visit, side-effect and accumulation order. A frame is one suspended Java
   * activation: the node, its `yCoor` and `modsum`, and the call it makes next; the right-sibling call is a tail call
   * in Java but still holds the caller's frame there, so the caller's frame stays until it returns and the stack length
   * is the Java depth.
   *
   * @param tNode the root of the tree
   * @param yCoor the y coordinate of previous level
   * @param modsum the modifiers of all the node's ancestors
   */
  private secondWalk(tNode: TNode | null, yCoor: number, modsum: number): void {
    const stack: SecondWalkFrame[] = [];
    this.enterSecondWalk(tNode, yCoor, modsum, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const t = frame.tNode;
      if (frame.step === SecondWalkStep.CHILD) {
        frame.step = SecondWalkStep.SIBLING;
        // Apply the modifier value for this node to all its offspring.
        if (!t.isLeaf()) {
          // This node got offsprings so we will step a level down and take care of them.
          this.enterSecondWalk(
            Iterables.getFirst(t.getChildren(), null),
            frame.yCoor + t.getProperty(InternalProperties.LEVELHEIGHT) + this.spacing,
            frame.modsum + t.getProperty(InternalProperties.MODIFIER),
            stack,
          );
        }
      } else if (frame.step === SecondWalkStep.SIBLING) {
        frame.step = SecondWalkStep.DONE;
        // Go ahead with the sibling to the right. This is a dfs so we just layout the current
        // subtree.
        if (t.getProperty(InternalProperties.RIGHTSIBLING) !== null) {
          this.enterSecondWalk(t.getProperty(InternalProperties.RIGHTSIBLING), frame.yCoor, frame.modsum, stack);
        }
      } else {
        stack.pop();
      }
    }
  }

  /**
   * Entry of one `secondWalk` activation (NodePlacer.java:320-330): a node gets its final coordinates and a frame for
   * its two calls; `null` returns at once.
   */
  private enterSecondWalk(tNode: TNode | null, yCoor: number, modsum: number, stack: SecondWalkFrame[]): void {
    if (tNode !== null) {
      // The x-position of the node is the sum of its prev x-coordinate and the modifiers of
      // all the node's ancestors and the adjust of the root location.
      const xTemp = tNode.getProperty(InternalProperties.PRELIM) + modsum;
      // The y-position of the node is the height of the node's ancestors levels and the
      // height nodes's level and the adjust of the root location.
      const yTemp = yCoor + tNode.getProperty(InternalProperties.LEVELHEIGHT) / 2;
      // We do not check to see that xTemp and yTemp are of the proper size, because the
      // framework will take care of this.
      tNode.setProperty(InternalProperties.XCOOR, l2i(roundToLong(xTemp)));
      tNode.setProperty(InternalProperties.YCOOR, l2i(roundToLong(yTemp)));
      stack.push({ tNode, yCoor, modsum, step: SecondWalkStep.CHILD });
      // Java's StackOverflowError of an endless recursion (a node that is its own right sibling), raised from this
      // class
      checkStackDepth(stack.length);
    }
  }
}
