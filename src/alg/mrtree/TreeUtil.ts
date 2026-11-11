// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { Direction } from '../../core/options/Direction.js';
import * as Iterables from '../../guava/Iterables.js';
import { compare as compareDoubles } from '../../java/lang/DoubleCompare.js';
import * as Int64 from '../../java/lang/Int64.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import type { TEdge } from './graph/TEdge.js';
import type { TGraph } from './graph/TGraph.js';
import type { TNode } from './graph/TNode.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

/** The label the dummy super root node carries (`TreeUtil.getAllOutgoingEdges` skips its edges). */
const SUPER_ROOT_LABEL = 'SUPER_ROOT';

/** `Optional.get()` on an empty `Optional`. */
const NO_VALUE_PRESENT = 'No value present';

/** The bounds of the `Integer` cache that `Integer.valueOf` (autoboxing) shares: JLS 5.1.7 guarantees -128..127. */
const INTEGER_CACHE_MIN = -128;
const INTEGER_CACHE_MAX = 127;

/** Bits of the lower half of a unique long. */
const INT_BITS = 32;
const LOWER_HALF_MASK = 0xffffffffn;

/**
 * Java's `==`/`!=` on two `Integer` objects compares references. Equal values inside the autoboxing cache are the same
 * object; equal values outside it come from separate `Integer.valueOf` calls and are distinct objects (HotSpot's
 * default `AutoBoxCacheMax` is 127). The `TREE_LEVEL` values compared in `getAllIncomingEdges` and
 * `getAllOutgoingEdges` are each boxed by their own `setProperty` call, so they are never the same object beyond the
 * cache. This answers `a != b` for two such boxes.
 */
function boxedIntegersDiffer(a: number, b: number): boolean {
  return a !== b || a < INTEGER_CACHE_MIN || a > INTEGER_CACHE_MAX;
}

/** `Collection.stream().anyMatch(x -> x.toString().equals(text))` over edges. */
function anyEdgeText(edges: readonly TEdge[], text: string): boolean {
  return edges.some((x) => x.toString() === text);
}

/**
 * Utility class for Mr Tree.
 *
 * @author sgu
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/TreeUtil.java
 */
export class TreeUtil {
  /** Hidden constructor to avoid instantiation. */
  private constructor() {}

  /**
   * Gets the root of the graph.
   *
   * @param tGraph the graph
   * @return the root
   * @throws NoSuchElementException when no node is a root (`Optional.get()` of an empty result)
   */
  static getRoot(tGraph: TGraph): TNode {
    for (const x of tGraph.getNodes()) {
      if (x.getProperty(InternalProperties.ROOT)) {
        return x;
      }
    }
    throw new NoSuchElementException(NO_VALUE_PRESENT);
  }

  /**
   * Gets the depth of the tree.
   *
   * @param root the root
   * @return the depth of the elk tree
   */
  static depth(root: TNode): number {
    const childs = TreeUtil.getChildren(root);
    if (childs.length === 0) {
      return 1;
    } else {
      // stream().map(depth).max(Integer::compare).get(): the stream is non-empty here
      return childs.map((x) => TreeUtil.depth(x)).reduce((a, b) => Math.max(a, b)) + 1;
    }
  }

  /**
   * Gets the child nodes of n within a tree.
   *
   * @param n the n
   * @return the child nodes of n within a tree
   */
  static getChildren(n: TNode): TNode[] {
    const re: TNode[] = [];
    for (const out of n.getOutgoingEdges()) {
      re.push(out.getTarget()!);
    }
    // stream().distinct(): TNode has identity equality, the first occurrence of each stays, in encounter order
    return [...new Set(re)];
  }

  /**
   * Gets the distance from n to the root in a tree.
   *
   * @param n the n
   * @param root the root
   * @return the distance from n to the root in an elk tree
   */
  static rootDistance(n: TNode, root: TNode): number {
    if (n === root) {
      return 0;
    }
    // We should be in a tree so we assume that there is only one parent
    const p = n.getIncomingEdges().get(0).getSource()!;
    return TreeUtil.rootDistance(p, root) + 1;
  }

  /**
   * Gets all edges from a graph with n as their target. The difference between this method and n.getIncomingEdges()
   * is that the latter may in some cases be outdated and not contain certain edges.
   *
   * @param n the node we want the incoming edges from
   * @param graph the graph the edges are in
   * @return all the edges that go into n
   */
  static getAllIncomingEdges(n: TNode, graph: TGraph): TEdge[] {
    const re: TEdge[] = [];

    for (const e of graph.getEdges()) {
      if (
        e.getTarget()!.id === n.id &&
        boxedIntegersDiffer(
          e.getSource()!.getProperty(MrTreeOptions.TREE_LEVEL),
          e.getTarget()!.getProperty(MrTreeOptions.TREE_LEVEL),
        ) &&
        !anyEdgeText(re, e.toString())
      ) {
        re.push(e);
      }
    }

    re.sort((x, y) => compareDoubles(x.getSource()!.getPosition().x, y.getSource()!.getPosition().x));
    return re;
  }

  /**
   * Returns all nodes including n of the subtree which has n as its root.
   *
   * @param n The root node of the subtree
   * @return All nodes of the subtree
   */
  static getSubtree(n: TNode): TNode[] {
    if (TreeUtil.getChildren(n).length === 0) {
      const re: TNode[] = [];
      re.push(n);
      return re;
    }

    // reduce((x, y) -> x followed by y) over the children's subtrees; the stream is non-empty here
    const re = TreeUtil.getChildren(n)
      .map((x) => TreeUtil.getSubtree(x))
      .reduce((x, y) => {
        const ree: TNode[] = [];
        Iterables.addAll(ree, x);
        Iterables.addAll(ree, y);
        return ree;
      });
    re.push(n);
    return re;
  }

  /**
   * Gets all edges from a graph with n as their source. The difference between this method and n.getOutgoingEdges()
   * is that the latter may in some cases be outdated and not contain certain edges.
   *
   * @param n the node we want the outgoing edges of
   * @param graph the graph the edges are in
   * @return all the edges that come out of n
   */
  static getAllOutgoingEdges(n: TNode, graph: TGraph): TEdge[] {
    const re: TEdge[] = [];

    for (const e of graph.getEdges()) {
      if (
        e.getSource()!.id === n.id &&
        // Java: e.getSource().getLabel().equals("SUPER_ROOT"); a null label is a NullPointerException (D10: TypeError)
        TreeUtil.labelOf(e.getSource()!) !== SUPER_ROOT_LABEL &&
        boxedIntegersDiffer(
          e.getSource()!.getProperty(MrTreeOptions.TREE_LEVEL),
          e.getTarget()!.getProperty(MrTreeOptions.TREE_LEVEL),
        ) &&
        !anyEdgeText(re, e.toString())
      ) {
        re.push(e);
      }
    }

    re.sort((x, y) => compareDoubles(x.getTarget()!.getPosition().x, y.getTarget()!.getPosition().x));
    return re;
  }

  /** The node's label where Java dereferences it: `null` is a `NullPointerException` there (D10: `TypeError`). */
  private static labelOf(node: TNode): string {
    const label = node.getLabel();
    if (label === null) {
      throw new TypeError(`Cannot invoke "String.equals(Object)" because the label of ${node.toString()} is null`);
    }
    return label;
  }

  /**
   * Gets the first point the edge will currently be routed towards.
   *
   * @param e the edge
   * @return the first point the edge will currently be routed towards
   */
  static getFirstPoint(e: TEdge): KVector {
    if (e.getBendPoints().size() === 0) {
      return new KVector(e.getTarget()!.getPosition().x, e.getTarget()!.getPosition().y);
    } else {
      return e.getBendPoints().getFirst();
    }
  }

  /**
   * Gets the last point the edge will currently be routed towards.
   *
   * @param e the edge
   * @return the last point the edge will currently be routed towards
   */
  static getLastPoint(e: TEdge): KVector {
    if (e.getBendPoints().size() === 0) {
      return new KVector(e.getSource()!.getPosition().x, e.getSource()!.getPosition().y);
    } else {
      return e.getBendPoints().getLast();
    }
  }

  /**
   * Gets the layout direction of the graph.
   *
   * @param g the graph
   * @return the first point the edge will currently be routed towards
   */
  static getDirection(g: TGraph): Direction {
    return g.getProperty(MrTreeOptions.DIRECTION);
  }

  /**
   * Gets the unit vector facing the specified direction.
   *
   * @param d the direction
   * @return the unit vector facing the specified direction
   */
  static getDirectionVector(d: Direction): KVector {
    switch (d) {
      case Direction.UP:
        return new KVector(0, -1);
      case Direction.RIGHT:
        return new KVector(1, 0);
      case Direction.LEFT:
        return new KVector(-1, 0);
      default:
        return new KVector(0, 1);
    }
  }

  /**
   * Returns the node size from the middle of the node in the specified Direction.
   *
   * @param n the node
   * @param d the direction
   * @return the node size in the specified Direction
   */
  static getNodeSizeInDirection(n: TNode, d: Direction): number {
    if (d === Direction.LEFT) {
      return -n.getSize().x / 2;
    } else if (d === Direction.UP) {
      return -n.getSize().y / 2;
    } else if (d === Direction.RIGHT) {
      return n.getSize().x / 2;
    } else {
      return n.getSize().y / 2;
    }
  }

  /**
   * Returns the node size vector from the middle of the node in the specified Direction.
   *
   * @param n the node
   * @param d the direction
   * @return the node size vector in the specified Direction
   */
  static getNodeSizeVectorInDirection(n: TNode, d: Direction): KVector {
    if (d === Direction.LEFT) {
      return new KVector(-n.getSize().x / 2, 0);
    } else if (d === Direction.UP) {
      return new KVector(0, -n.getSize().y / 2);
    } else if (d === Direction.RIGHT) {
      return new KVector(n.getSize().x / 2, 0);
    } else {
      return new KVector(0, n.getSize().y / 2);
    }
  }

  /**
   * Returns the Direction which is 90 degrees right of d.
   *
   * @param d the input direction
   * @return the Direction which is 90 degrees right of d
   */
  static turnRight(d: Direction): Direction {
    if (d === Direction.LEFT) {
      return Direction.UP;
    } else if (d === Direction.UP) {
      return Direction.RIGHT;
    } else if (d === Direction.RIGHT) {
      return Direction.DOWN;
    } else {
      return Direction.LEFT;
    }
  }

  /**
   * Returns the Direction which is 90 degrees left of d.
   *
   * @param d the input direction
   * @return the Direction which is 90 degrees left of d
   */
  static turnLeft(d: Direction): Direction {
    if (d === Direction.RIGHT) {
      return Direction.UP;
    } else if (d === Direction.UP) {
      return Direction.LEFT;
    } else if (d === Direction.LEFT) {
      return Direction.DOWN;
    } else {
      return Direction.RIGHT;
    }
  }

  /**
   * Sets center outside of the Node.
   *
   * @param center The Vector to mutate
   * @param next The next bendpoint after center
   * @param size The size of the node
   */
  static toNodeBorder(center: KVector, next: KVector, size: KVector): void {
    const wh = size.x / 2;
    const hh = size.y / 2;
    const absx = Math.abs(next.x - center.x);
    const absy = Math.abs(next.y - center.y);
    let xscale = 1;
    let yscale = 1;
    if (absx > wh) {
      xscale = wh / absx;
    }
    if (absy > hh) {
      yscale = hh / absy;
    }
    const scale = Math.min(xscale, yscale);
    center.x += scale * (next.x - center.x);
    center.y += scale * (next.y - center.y);
  }

  /**
   * Checks whether the edge induces a cycle into the graph.
   *
   * @param g the graph
   * @param e the edge
   * @return true if the edge goes against the layout direction
   */
  static isCycleInducing(e: TEdge, g: TGraph): boolean {
    return (
      TreeUtil.getDirectionVector(TreeUtil.getDirection(g)).dotProduct(
        new KVector(
          e.getTarget()!.getPosition().x - e.getSource()!.getPosition().x,
          e.getTarget()!.getPosition().y - e.getSource()!.getPosition().y,
        ),
      ) <= 0
    );
  }

  /**
   * Returns a unique long for two integers by placing their bits after each other into the long. The result uses all
   * 64 bits, so it is a `bigint` (translation rules 1.4: `long` beyond 2^53), the key type of the `JavaHashMap` that
   * `EdgeRouter` keeps.
   *
   * @param a the first 32 bit number
   * @param b the second 32 bit number
   * @return the unique key
   */
  static getUniqueLong(a: number, b: number): bigint {
    // Java: (long) a << 32 | b & 0xFFFFFFFFL, that is ((long) a << 32) | (b & 0xFFFFFFFFL)
    return Int64.shl(BigInt(a), INT_BITS) | (BigInt(b) & LOWER_HALF_MASK);
  }

  /**
   * Gets the lowest parent of the graph. Low is in this context defined as a coordinate with a high dot product with
   * the direction vector of the graph.
   *
   * @param n the node to get the parent of
   * @param g the graph the parent is in
   * @return the parent
   */
  static getLowestParent(n: TNode, g: TGraph): TNode | null {
    const dirVec = TreeUtil.getDirectionVector(TreeUtil.getDirection(g));
    if (n.getIncomingEdges().size() === 0) {
      return null;
    }
    const sources = n
      .getIncomingEdges()
      .toArray()
      .map((x) => x.getSource()!);
    const parents = g
      .getNodes()
      .toArray()
      .filter((x) => sources.includes(x));
    const centerDots = parents.map((x) =>
      new KVector(x.getPosition().x + x.getSize().x / 2, x.getPosition().y + x.getSize().y / 2).dotProduct(dirVec),
    );
    // stream().max(Comparator.naturalOrder()).get(): Double.compareTo order, the later element wins only when greater
    if (centerDots.length === 0) {
      throw new NoSuchElementException(NO_VALUE_PRESENT);
    }
    const lowestParentPos = centerDots.reduce((a, b) => (compareDoubles(a, b) >= 0 ? a : b));
    // `double == Double` unboxes: numeric equality
    const lowestParent = parents.find((_x, index) => centerDots[index] === lowestParentPos);
    if (lowestParent === undefined) {
      throw new NoSuchElementException(NO_VALUE_PRESENT);
    }

    return lowestParent;
  }

  /**
   * This method returns the leftmost node at the given level. This is implemented using a postorder walk of the
   * subtree under given level, depth levels down. Depth here refers to the level below where the leftmost descendant
   * is being found. The Java overload `getLeftMost(Iterable)` is `depth` omitted (-1).
   *
   * If given level is negative it returns the leftmost node at the deepest level.
   *
   * @param currentlevel a list of nodes at level one
   * @param depth the depth to search for
   * @return the leftmost descendant at depth levels down
   */
  static getLeftMost(currentlevel: Iterable<TNode>, depth: number = -1): TNode | null {
    if (0 < Iterables.size(currentlevel)) {
      let d = depth;

      // the leftmost descendant at depth levels down
      if (1 < d) {
        d--;
        // build empty iterator
        let nextLevel: Iterable<TNode> = [];

        for (const cN of currentlevel) {
          // append the children of the current node to the next level
          nextLevel = Iterables.concat(nextLevel, cN.getChildren());
        }
        return TreeUtil.getLeftMost(nextLevel, d);
      }

      // the leftmost node at the deepest level
      if (d < 0) {
        // build empty iterator
        let nextLevel: Iterable<TNode> = [];

        for (const cN of currentlevel) {
          // append the children of the current node to the next level
          nextLevel = Iterables.concat(nextLevel, cN.getChildren());
        }

        //
        if (0 < Iterables.size(nextLevel)) {
          return TreeUtil.getLeftMost(nextLevel, d);
        }
      }
    }
    // return the leftmost node at the current level
    return Iterables.getFirst(currentlevel, null);
  }
}
