// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Iterables from '../../../guava/Iterables.js';
import { l2i, roundToLong } from '../../../java/lang/JavaMath.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { TreeUtil } from '../TreeUtil.js';

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
   * @param cN the root level of the tree
   * @param level the index of the passed level
   */
  private firstWalk(cN: TNode, level: number): void {
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
      /** This Node is not a leaf, so call this procedure recursively for each of its offspring. */
      for (const child of cN.getChildren()) {
        this.firstWalk(child, level + 1);
      }

      /**
       * Set the prelim and modifer for this node by determine the midpoint of its offsprings and the middle node size
       * of the node and its left sibling
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
   * @param tNode the root of the tree
   * @param yCoor the y coordinate of previous level
   * @param modsum the modifiers of all the node's ancestors
   */
  private secondWalk(tNode: TNode | null, yCoor: number, modsum: number): void {
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
      // Apply the modifier value for this node to all its offspring.
      if (!tNode.isLeaf()) {
        // This node got offsprings so we will step a level down and take care of them.
        this.secondWalk(
          Iterables.getFirst(tNode.getChildren(), null),
          yCoor + tNode.getProperty(InternalProperties.LEVELHEIGHT) + this.spacing,
          modsum + tNode.getProperty(InternalProperties.MODIFIER),
        );
      }
      // Go ahead with the sibling to the right. This is a dfs so we just layout the current
      // subtree.
      if (tNode.getProperty(InternalProperties.RIGHTSIBLING) !== null) {
        this.secondWalk(tNode.getProperty(InternalProperties.RIGHTSIBLING), yCoor, modsum);
      }
    }
  }
}
