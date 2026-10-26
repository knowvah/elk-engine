// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import { fuzzyCompare } from '../../../guava/DoubleMath.js';
import type { Tree } from '../Tree.js';
import { SVGImage } from '../utils/SVGImage.js';
import { InternalProperties } from './InternalProperties.js';
import type { Node } from './Node.js';

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
   * Recursive function to compact a tree depth-first.
   *
   * @param tree root of a tree
   */
  private static compactTree(tree: Tree<Node>): void {
    // first compact the children of the current node
    tree.children.forEach((c) => DepthFirstCompaction.compactTree(c));

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
   */
  private static getMinUnderlap(
    tree: Tree<Node>,
    child: Tree<Node>,
    currentMinUnderlap: number,
    compactionVector: KVector,
  ): number {
    let minUnderlap = Math.min(
      currentMinUnderlap,
      DepthFirstCompaction.minUnderlapWithSubtree(tree.node, child, currentMinUnderlap, compactionVector),
    );

    for (const c of tree.children) {
      if (c !== child) {
        minUnderlap = Math.min(
          minUnderlap,
          DepthFirstCompaction.getMinUnderlap(c, child, minUnderlap, compactionVector),
        );
      }
    }

    return minUnderlap;
  }

  private static minUnderlapWithSubtree(
    r: Node,
    tree: Tree<Node>,
    currentMinUnderlap: number,
    compactionVector: KVector,
  ): number {
    let minUnderlap = currentMinUnderlap;
    for (const child of tree.children) {
      const c = child.node;
      if (r.touches(c)) {
        // if they already touch, find out if they would be moved into each other
        if (DepthFirstCompaction.wouldMoveIntoEachOther(r, c, compactionVector)) {
          minUnderlap = 0;
          break;
        }
      } else {
        // update minUnderlap
        minUnderlap = Math.min(minUnderlap, r.distance(c, compactionVector));
      }

      minUnderlap = Math.min(
        minUnderlap,
        DepthFirstCompaction.minUnderlapWithSubtree(r, child, minUnderlap, compactionVector),
      );
    }

    return minUnderlap;
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

  private static translateSubtree(tree: Tree<Node>, compactionVector: KVector): void {
    tree.node.translate(compactionVector);
    tree.children.forEach((c) => DepthFirstCompaction.translateSubtree(c, compactionVector));
  }

  //--- debug utils --------------------------------------

  private static drawTree(t: Tree<Node>, svgImage: SVGImage, mark: Tree<Node> | null): void {
    svgImage.g('rects').addRect(t.node.rect, 'fill="none" stroke="black"');
    svgImage.g('centers').addCircle(t.node.vertex.x, t.node.vertex.y, 6, 'fill="black"');
    t.children.forEach((c) => {
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
          .addLine(
            t.node.vertex.x,
            t.node.vertex.y,
            c.node.vertex.x,
            c.node.vertex.y,
            'stroke="blue" stroke-width="2"',
          );
      }
      DepthFirstCompaction.drawTree(c, svgImage, mark);
    });
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
