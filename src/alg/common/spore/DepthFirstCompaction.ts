// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import { fuzzyCompare } from '../../../guava/DoubleMath.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import type { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import { InternalProperties } from './InternalProperties.js';
import type { Node } from './Node.js';

/**
 * One level of the explicit stack of {@link DepthFirstCompaction.compactTree}, `translateSubtree` and `drawTree`: the
 * tree and its next child to enter.
 */
interface CompactFrame {
  readonly tree: Tree<Node>;
  next: number;
}

/**
 * One suspended activation of `getMinUnderlap` or `minUnderlapWithSubtree`: the tree, the activation's running
 * `minUnderlap` and its next child to enter.
 */
interface UnderlapFrame {
  readonly tree: Tree<Node>;
  minUnderlap: number;
  next: number;
}

/**
 * This class implements a compaction method that expects a spanning tree of a graph.
 * While traversing the spanning tree in an depth-first manner the nodes of each subtree are shifted as one unit
 * towards the parent node of that subtree.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/DepthFirstCompaction.java
 */
export class DepthFirstCompaction {
  /** The root of the spanning tree. */
  private static root: Tree<Node>;
  /** Restricts the translation of nodes to orthogonal directions. */
  private static orthogonalCompaction = false;

  private static svg: SVGImage;

  /** Hidden constructor. */
  private constructor() {}

  /**
   * Executes the compaction of the graph represented by the spanning tree.
   *
   * @param tree the spanning tree of a graph
   * @param orthogonal whether to restrict the movement to orthogonal translations
   * @param debugOutputFile file name for debug SVG. Debug output will be deactivated if this is null.
   */
  static compact(tree: Tree<Node>, orthogonal: boolean): void;
  static compact(tree: Tree<Node>, orthogonal: boolean, debugOutputFile: string | null): void;
  static compact(tree: Tree<Node>, orthogonal: boolean, debugOutputFile: string | null = null): void {
    DepthFirstCompaction.svg = new SVGImage(debugOutputFile);
    DepthFirstCompaction.orthogonalCompaction = orthogonal;
    DepthFirstCompaction.root = tree;
    DepthFirstCompaction.debugOut(tree, null);
    DepthFirstCompaction.compactTree(DepthFirstCompaction.root);
  }

  /**
   * Compacts a tree depth-first. The Java is recursive (children first, then the root's own underlap removal); an
   * explicit stack visits the same nodes in the same order, so a path tree as deep as the 2,000-node chain no longer
   * exhausts V8's call stack (mission 8c, PK6). The verbatim recursive form is the reference of
   * `DepthFirstCompaction.explicit-stack.test.ts`.
   *
   * @param tree root of a tree
   */
  private static compactTree(tree: Tree<Node>): void {
    const stack: CompactFrame[] = [{ tree, next: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        // first compact the children of the current node
        stack.push({ tree: frame.tree.children[frame.next++]!, next: 0 });
      } else {
        DepthFirstCompaction.removeUnderlap(frame.tree);
        stack.pop();
      }
    }
  }

  /** The loop of {@link compactTree} that runs after its children are compacted: split out at the Java statement group. */
  private static removeUnderlap(tree: Tree<Node>): void {
    // remove underlap between root and its children
    for (const child of tree.children) {
      // find the direction and distance the subtree has to be moved to close the gap to the root node
      const compactionVector = tree.node.vertex.clone().sub(child.node.vertex);

      if (DepthFirstCompaction.orthogonalCompaction) {
        DepthFirstCompaction.restrictToOrthogonal(compactionVector, tree.node.rect, child.node.rect);
      } else {
        compactionVector.scaleToLength(tree.node.underlap(child.node));
      }

      // determine the maximum distance the subtree can be moved without collision, i.e. the minimum underlap
      let minUnderlap = compactionVector.length();

      // find minimum underlap between any node in the child and any other node in the rest of the
      // tree in compaction direction
      minUnderlap = DepthFirstCompaction.getMinUnderlap(
        DepthFirstCompaction.root,
        child,
        minUnderlap,
        compactionVector,
      );

      // use the minimum underlap to move whole subtree
      compactionVector.scaleToLength(minUnderlap);
      DepthFirstCompaction.translateSubtree(child, compactionVector);

      DepthFirstCompaction.debugOut(tree, child);
    }
  }

  /** The orthogonal branch of {@link compactTree}: split out at the Java `if (orthogonalCompaction)` boundary. */
  private static restrictToOrthogonal(compactionVector: KVector, rt: ElkRectangle, rc: ElkRectangle): void {
    // restrict the compaction vector to its larger coordinate
    if (Math.abs(compactionVector.x) >= Math.abs(compactionVector.y)) {
      compactionVector.y = 0;
      // scale compaction vector to orthogonal distance between tree and child
      if (rc.y + rc.height > rt.y && rc.y < rt.y + rt.height) {
        // overlap in vertical dimension
        compactionVector.scaleToLength(Math.max(rt.x - (rc.x + rc.width), rc.x - (rt.x + rt.width)));
      }
    } else {
      compactionVector.x = 0;
      // scale compaction vector to orthogonal distance between tree and child
      if (rc.x + rc.width > rt.x && rc.x < rt.x + rt.width) {
        // overlap in horizontal dimension
        compactionVector.scaleToLength(Math.max(rt.y - (rc.y + rc.height), rc.y - (rt.y + rt.height)));
      }
    }
  }

  /**
   * Computes the minimum distance between nodes in a tree and nodes in a subtree of the tree.
   *
   * @param tree the entire tree
   * @param child a subtree
   * @param currentMinUnderlap an initial value
   * @param compactionVector a KVector that determines the direction to calculate distances in
   * @returns the minimum distance or underlap
   *
   * The recursive call of DepthFirstCompaction.java:131 is a frame push. AC6 (#76): explicit stack, same visit and
   * side-effect order, same `Math.min` argument order. A frame is one suspended Java activation: its tree, its running
   * `minUnderlap` and the next child to enter. A frame opens with the Java's first statement, the
   * `minUnderlapWithSubtree` call; a child other than `child` opens with the parent's running value as
   * `currentMinUnderlap`, and when it returns the parent applies `Math.min(minUnderlap, result)`. The trees are not
   * modified during the walk, so the children are read by index.
   */
  private static getMinUnderlap(
    tree: Tree<Node>,
    child: Tree<Node>,
    currentMinUnderlap: number,
    compactionVector: KVector,
  ): number {
    const stack: UnderlapFrame[] = [];
    DepthFirstCompaction.enterGetMinUnderlap(tree, child, currentMinUnderlap, compactionVector, stack);
    for (;;) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const c = frame.tree.children[frame.next++]!;
        if (c !== child) {
          DepthFirstCompaction.enterGetMinUnderlap(c, child, frame.minUnderlap, compactionVector, stack);
        }
      } else {
        stack.pop();
        if (stack.length === 0) {
          return frame.minUnderlap;
        }
        const parent = stack[stack.length - 1]!;
        parent.minUnderlap = Math.min(parent.minUnderlap, frame.minUnderlap);
      }
    }
  }

  /** The first statement of one {@link getMinUnderlap} activation (DepthFirstCompaction.java:126-127), then its frame. */
  private static enterGetMinUnderlap(
    tree: Tree<Node>,
    child: Tree<Node>,
    currentMinUnderlap: number,
    compactionVector: KVector,
    stack: UnderlapFrame[],
  ): void {
    const minUnderlap = Math.min(
      currentMinUnderlap,
      DepthFirstCompaction.minUnderlapWithSubtree(tree.node, child, currentMinUnderlap, compactionVector),
    );
    stack.push({ tree, minUnderlap, next: 0 });
    // Java's StackOverflowError, checked as by every AC6 loop (D7); the acyclic spore trees bound the walk
    checkStackDepth(stack.length);
  }

  /**
   * The minimum underlap between `r` and the nodes below `tree`. The recursive call of DepthFirstCompaction.java:166 is a
   * frame push. AC6 (#76): explicit stack, same visit and side-effect order, same `Math.min` argument order. A frame is
   * one suspended Java activation: its tree, its running `minUnderlap` and the next child to enter. A child's frame starts
   * from the parent's running value (the Java's `currentMinUnderlap` argument); when it returns, the parent applies
   * `Math.min(minUnderlap, result)`. The `break` of a touching child that would move into `r` ends the frame's loop and
   * skips that child's call. The trees are not modified during the walk, so the children are read by index.
   */
  private static minUnderlapWithSubtree(
    r: Node,
    tree: Tree<Node>,
    currentMinUnderlap: number,
    compactionVector: KVector,
  ): number {
    const stack: UnderlapFrame[] = [{ tree, minUnderlap: currentMinUnderlap, next: 0 }];
    checkStackDepth(stack.length);
    for (;;) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const child = frame.tree.children[frame.next++]!;
        if (DepthFirstCompaction.underlapWithChild(r, child.node, frame, compactionVector)) {
          stack.push({ tree: child, minUnderlap: frame.minUnderlap, next: 0 });
          // Java's StackOverflowError, checked as by every AC6 loop (D7); the acyclic spore trees bound the walk
          checkStackDepth(stack.length);
        }
      } else {
        stack.pop();
        if (stack.length === 0) {
          return frame.minUnderlap;
        }
        const parent = stack[stack.length - 1]!;
        parent.minUnderlap = Math.min(parent.minUnderlap, frame.minUnderlap);
      }
    }
  }

  /**
   * The statements of {@link minUnderlapWithSubtree}'s loop before its recursive call (DepthFirstCompaction.java:143-164),
   * on the frame of the suspended activation. Returns false at the `break`: the frame's loop ends there.
   */
  private static underlapWithChild(r: Node, c: Node, frame: UnderlapFrame, compactionVector: KVector): boolean {
    if (r.touches(c)) {
      // if they already touch, find out if they would be moved into each other
      if (DepthFirstCompaction.wouldMoveIntoEachOther(r, c, compactionVector)) {
        frame.minUnderlap = 0;
        // break
        frame.next = frame.tree.children.length;
        return false;
      }
    } else {
      // update minUnderlap
      frame.minUnderlap = Math.min(frame.minUnderlap, r.distance(c, compactionVector));
    }
    return true;
  }

  /** The touching test of {@link minUnderlapWithSubtree}: split out at the Java `if` condition. */
  private static wouldMoveIntoEachOther(r: Node, c: Node, compactionVector: KVector): boolean {
    const f = InternalProperties.FUZZINESS;
    return (
      (fuzzyCompare(c.rect.x, r.rect.x + r.rect.width, f) === 0 && compactionVector.x < 0) ||
      (fuzzyCompare(c.rect.x + c.rect.width, r.rect.x, f) === 0 && compactionVector.x > 0) ||
      (fuzzyCompare(c.rect.y, r.rect.y + r.rect.height, f) === 0 && compactionVector.y < 0) ||
      (fuzzyCompare(c.rect.y + c.rect.height, r.rect.y, f) === 0 && compactionVector.y > 0)
    );
  }

  /**
   * Translates every node of a subtree, pre-order. The recursive call of DepthFirstCompaction.java:175 is a frame push.
   * AC6 (#76): explicit stack, same visit and side-effect order. A frame is one suspended Java activation: its tree and
   * the next child to enter; a child's node is translated when its parent advances to it, then its frame opens. The
   * trees are not modified during the walk (only nodes move), so the children are read by index.
   */
  private static translateSubtree(tree: Tree<Node>, compactionVector: KVector): void {
    tree.node.translate(compactionVector);
    const stack: CompactFrame[] = [{ tree, next: 0 }];
    checkStackDepth(stack.length);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const c = frame.tree.children[frame.next++]!;
        c.node.translate(compactionVector);
        stack.push({ tree: c, next: 0 });
        // Java's StackOverflowError, checked as by every AC6 loop (D7); the acyclic spore trees bound the walk
        checkStackDepth(stack.length);
      } else {
        stack.pop();
      }
    }
  }

  //--- debug utils --------------------------------------

  /**
   * Draws a subtree, pre-order. The recursive call of DepthFirstCompaction.java:193 is a frame push. AC6 (#76): explicit
   * stack, same visit and side-effect order. A frame is one suspended Java activation: its tree and the next child to
   * enter. The rectangle and centre of a tree are drawn when its frame opens; the edge to a child is drawn when the parent
   * advances to it, then the child's frame opens. The trees are not modified during the walk, so the children are read by
   * index.
   */
  private static drawTree(t: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void {
    const stack: CompactFrame[] = [];
    DepthFirstCompaction.enterDrawTree(t, svgImage, stack);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.tree.children.length) {
        const c = frame.tree.children[frame.next++]!;
        DepthFirstCompaction.drawEdge(frame.tree, c, svgImage, mark);
        DepthFirstCompaction.enterDrawTree(c, svgImage, stack);
      } else {
        stack.pop();
      }
    }
  }

  /** The entry of one {@link drawTree} activation (DepthFirstCompaction.java:182-184), then its frame opens. */
  private static enterDrawTree(t: Tree<Node>, svgImage: SVGImage, stack: CompactFrame[]): void {
    svgImage.g('rects').addRect(t.node.rect, 'fill="none" stroke="black"');
    svgImage.g('centers').addCircle(t.node.vertex.x, t.node.vertex.y, 6, 'fill="black"');
    stack.push({ tree: t, next: 0 });
    // Java's StackOverflowError, checked as by every AC6 loop (D7); the acyclic spore trees bound the walk
    checkStackDepth(stack.length);
  }

  /** The edge of {@link drawTree}'s child lambda (DepthFirstCompaction.java:186-192): red and dashed to `mark`. */
  private static drawEdge(t: Tree<Node>, c: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void {
    if (c === mark) {
      svgImage
        .g('edges')
        .addLine(
          t.node.vertex.x,
          t.node.vertex.y,
          c.node.vertex.x,
          c.node.vertex.y,
          'stroke="red" stroke-width="5" stroke-dasharray="8,8"',
        );
    } else {
      svgImage
        .g('edges')
        .addLine(t.node.vertex.x, t.node.vertex.y, c.node.vertex.x, c.node.vertex.y, 'stroke="blue" stroke-width="2"');
    }
  }

  private static debugOut(_tree: Tree<Node>, mark: Tree<Node> | null): void {
    const svg = DepthFirstCompaction.svg;
    const root = DepthFirstCompaction.root;
    svg.clear();
    svg.addGroups('rects', 'root', 'edges', 'centers', 'marks');
    svg.g('root').addRect(root.node.rect, 'fill="#C4E3F3" stroke="black"');
    DepthFirstCompaction.drawTree(root, svg, mark);
    svg.isave();
  }
}
