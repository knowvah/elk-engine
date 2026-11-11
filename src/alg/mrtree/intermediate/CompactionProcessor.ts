// SPDX-License-Identifier: EPL-2.0
import { TreeSet } from '../../common/compaction/oned/ScanlineConstraintCalculatorTreeSet.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../core/util/Pair.js';
import { Triple } from '../../../core/util/Triple.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { EdgeRoutingMode } from '../options/EdgeRoutingMode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeUtil } from '../TreeUtil.js';

/** The `(newPos, newPosSize)` pair `CompactionProcessor.process` computes per node. */
type NewPosition = readonly [newPos: number, newPosSize: number];

/** The `java.util.stream.Stream.min` reduction (`BinaryOperator.minBy`): the first element wins a tie. */
function minOf(nodes: readonly TNode[], comparator: (x: TNode, y: TNode) => number): TNode {
  return nodes.reduce((a, b) => (comparator(a, b) <= 0 ? a : b));
}

/** The `java.util.stream.Stream.max` reduction (`BinaryOperator.maxBy`): the first element wins a tie. */
function maxOf(nodes: readonly TNode[], comparator: (x: TNode, y: TNode) => number): TNode {
  return nodes.reduce((a, b) => (comparator(a, b) >= 0 ? a : b));
}

/**
 * Applies one dimensional compaction to the graph.
 *
 * The Java `TreeSet` is the local stand-in of mission 6a (`ScanlineConstraintCalculatorTreeSet`; no shared
 * `java.util.TreeSet` shim exists). `s.headSet(r).size() > 0` is `lower(r) !== null`, `s.headSet(r).last()` is
 * `lower(r)`, `s.tailSet(r).size() > 1` is "`ceiling(r)` and its `higher` exist" and the second element of
 * `s.tailSet(r)` is `higher(ceiling(r))`: a comparator-based set holds no two elements that compare 0.
 *
 * @author jnc, sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/CompactionProcessor.java
 */
export class CompactionProcessor implements ILayoutProcessor<TGraph> {
  private levels: Pair<number, number>[] = [];

  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Process compaction', 1);

    if (!tGraph.getProperty(MrTreeOptions.COMPACTION)) {
      return; // leave if option is not set
    }

    const dir = tGraph.getProperty(MrTreeOptions.DIRECTION);
    const nodeNodeSpacing = tGraph.getProperty(MrTreeOptions.SPACING_NODE_NODE);

    this.setUpLevels(tGraph, dir);

    this.computeNodeConstraints(tGraph, nodeNodeSpacing / 2 / 2);

    // Simple one dimensional compaction \w level preservation
    const nodes = tGraph.getNodes();
    // `List.sort`: copy to an array, stable merge sort, write back in order
    const sorted = nodes
      .toArray()
      .sort((x, y) =>
        compareDoubles(
          TreeUtil.getDirectionVector(dir).dotProduct(new KVector(x.getPosition().x, x.getPosition().y)),
          TreeUtil.getDirectionVector(dir).dotProduct(new KVector(y.getPosition().x, y.getPosition().y)),
        ),
      );
    sorted.forEach((node, i) => nodes.set(i, node));
    for (const n of nodes) {
      // Root nodes aren't compactable
      if (!n.getProperty(InternalProperties.ROOT)) {
        this.compact(n, tGraph, dir, nodeNodeSpacing);
      }
    }
    progressMonitor.done();
  }

  /** The body of the loop of {@link process} for a node that is not a root (`CompactionProcessor.java:72-178`). */
  private compact(n: TNode, tGraph: TGraph, dir: Direction, nodeNodeSpacing: number): void {
    const d = this.getLowestDependentNode(n, dir);
    const p = TreeUtil.getLowestParent(n, tGraph);
    let newPos = 0;
    let newPosSize = 0;
    if (d !== null) {
      // n has a dependent node
      [newPos, newPosSize] = this.positionBesideDependent(n, d, p!, dir, nodeNodeSpacing);
    } else if (p !== null) {
      // n does not have a dependent node but a parent
      [newPos, newPosSize] = this.positionBesideParent(n, p, dir, nodeNodeSpacing);
    }

    if (tGraph.getProperty(MrTreeOptions.EDGE_ROUTING_MODE) === EdgeRoutingMode.AVOID_OVERLAP) {
      this.placeWithinLevels(n, dir, newPos, newPosSize);
    } else {
      // In case of Aggressive Compaction just set the parameters
      if (dir.isHorizontal()) {
        n.getPosition().x = newPos;
      } else {
        n.getPosition().y = newPos;
      }
    }
  }

  /** The `d != null` arm (`CompactionProcessor.java:75-107`); `newPos` and `newPosSize` stay 0 for UNDEFINED (no case). */
  private positionBesideDependent(n: TNode, d: TNode, p: TNode, dir: Direction, nodeNodeSpacing: number): NewPosition {
    switch (dir) {
      case Direction.LEFT:
        return this.dependentLeft(n, d, p, nodeNodeSpacing);
      case Direction.RIGHT:
        return this.dependentRight(n, d, p, nodeNodeSpacing);
      case Direction.UP:
        return this.dependentUp(n, d, p, nodeNodeSpacing);
      case Direction.DOWN:
        return this.dependentDown(n, d, p, nodeNodeSpacing);
    }
    return [0, 0];
  }

  /** `case LEFT` of the `d != null` switch (`CompactionProcessor.java:79-85`). */
  private dependentLeft(n: TNode, d: TNode, p: TNode, nodeNodeSpacing: number): NewPosition {
    let newPos = d.getPosition().x - nodeNodeSpacing - n.getSize().x;
    if (p.getPosition().x - nodeNodeSpacing - n.getSize().x < newPos) {
      newPos = p.getPosition().x - nodeNodeSpacing - n.getSize().x;
    }
    return [newPos, newPos + n.getSize().x];
  }

  /** `case RIGHT` of the `d != null` switch (`CompactionProcessor.java:86-92`). */
  private dependentRight(n: TNode, d: TNode, p: TNode, nodeNodeSpacing: number): NewPosition {
    let newPos = d.getPosition().x + d.getSize().x + nodeNodeSpacing;
    if (p.getPosition().x + nodeNodeSpacing > newPos) {
      newPos = p.getPosition().x + p.getSize().x + nodeNodeSpacing;
    }
    return [newPos, newPos + n.getSize().x];
  }

  /** `case UP` of the `d != null` switch (`CompactionProcessor.java:93-99`). */
  private dependentUp(n: TNode, d: TNode, p: TNode, nodeNodeSpacing: number): NewPosition {
    let newPos = d.getPosition().y - nodeNodeSpacing - n.getSize().y;
    if (p.getPosition().y - nodeNodeSpacing - n.getSize().y < newPos) {
      newPos = p.getPosition().y - nodeNodeSpacing - n.getSize().y;
    }
    return [newPos, newPos + n.getSize().y];
  }

  /** `case DOWN` of the `d != null` switch (`CompactionProcessor.java:100-106`). */
  private dependentDown(n: TNode, d: TNode, p: TNode, nodeNodeSpacing: number): NewPosition {
    let newPos = d.getPosition().y + d.getSize().y + nodeNodeSpacing;
    if (p.getPosition().y + nodeNodeSpacing > newPos) {
      newPos = p.getPosition().y + p.getSize().y + nodeNodeSpacing;
    }
    return [newPos, newPos + n.getSize().y];
  }

  /** The `p != null` arm (`CompactionProcessor.java:108-127`). */
  private positionBesideParent(n: TNode, p: TNode, dir: Direction, nodeNodeSpacing: number): NewPosition {
    let newPos = 0;
    let newPosSize = 0;
    switch (dir) {
      case Direction.LEFT:
        newPos = p.getPosition().x - nodeNodeSpacing - n.getSize().x;
        newPosSize = newPos + n.getSize().x;
        break;
      case Direction.RIGHT:
        newPos = p.getPosition().x + p.getSize().x + nodeNodeSpacing;
        newPosSize = newPos + n.getSize().x;
        break;
      case Direction.UP:
        newPos = p.getPosition().y - nodeNodeSpacing - n.getSize().y;
        newPosSize = newPos + n.getSize().y;
        break;
      case Direction.DOWN:
        newPos = p.getPosition().y + p.getSize().y + nodeNodeSpacing;
        newPosSize = newPos + n.getSize().y;
        break;
    }
    return [newPos, newPosSize];
  }

  /** The `AVOID_OVERLAP` arm (`CompactionProcessor.java:131-170`). */
  private placeWithinLevels(n: TNode, dir: Direction, newPos: number, newPosSize: number): void {
    let level: Pair<number, number> | undefined = this.levels.find(
      (x) => x.getFirst()! <= newPos && x.getSecond()! >= newPosSize,
    );
    if (level !== undefined) {
      // The Node ended up within a level
      if (dir.isHorizontal()) {
        n.getPosition().x = newPos;
      } else {
        n.getPosition().y = newPos;
      }
    } else {
      level = this.forceIntoLevel(n, dir, newPos);
    }

    // Update Tree Level of node
    if (level !== undefined) {
      // `List.indexOf` uses `Pair.equals`: the first level with equal bounds, not necessarily this one
      const found = level;
      const newIndex = this.levels.findIndex((x) => x.equals(found));
      // `int != Integer` unboxes: numeric
      if (newIndex > 0 && newIndex !== n.getProperty(MrTreeOptions.TREE_LEVEL)) {
        n.setProperty(InternalProperties.COMPACT_LEVEL_ASCENSION, true);
        n.setProperty(MrTreeOptions.TREE_LEVEL, newIndex);
      }
    }
  }

  /** The `else` of the within-a-level test (`CompactionProcessor.java:142-161`): returns the level `n` was forced into. */
  private forceIntoLevel(n: TNode, dir: Direction, newPos: number): Pair<number, number> | undefined {
    let level: Pair<number, number> | undefined;
    if (dir === Direction.LEFT || dir === Direction.UP) {
      // Skip the first level as it only contains the SUPER_ROOT here
      level = this.levels.slice(1).find((x) => x.getFirst()! <= newPos);
    } else {
      // Skip the first level as it only contains the SUPER_ROOT here
      level = this.levels.slice(1).find((x) => x.getFirst()! >= newPos);
    }

    // Force n into the found level
    if (level !== undefined) {
      if (dir.isHorizontal()) {
        n.getPosition().x = level.getFirst()!;
      } else {
        n.getPosition().y = level.getFirst()!;
      }
    }
    return level;
  }

  /**
   * Sets up the bounds for each level.
   *
   * @param tGraph the Graph the levels are in
   * @param dir the graphs layout direction
   */
  setUpLevels(tGraph: TGraph, dir: Direction): void {
    this.levels = [];

    for (const n of tGraph.getNodes()) {
      // Adapt levels size to the current level
      while (n.getProperty(MrTreeOptions.TREE_LEVEL) > this.levels.length - 1) {
        this.levels.push(new Pair<number, number>(Number.MAX_VALUE, -Number.MAX_VALUE));
      }

      // Update level bounds
      const curLevel = n.getProperty(MrTreeOptions.TREE_LEVEL);
      const bounds = this.levels[curLevel]!;
      if (dir.isHorizontal()) {
        if (n.getPosition().x < bounds.getFirst()!) {
          bounds.setFirst(n.getPosition().x);
        }
        if (n.getPosition().x + n.getSize().x > bounds.getSecond()!) {
          bounds.setSecond(n.getPosition().x + n.getSize().x);
        }
      } else {
        if (n.getPosition().y < bounds.getFirst()!) {
          bounds.setFirst(n.getPosition().y);
        }
        if (n.getPosition().y + n.getSize().y > bounds.getSecond()!) {
          bounds.setSecond(n.getPosition().y + n.getSize().y);
        }
      }
    }
  }

  /**
   * Compute constrains using scanline algorithm.
   *
   * @param tGraph the Graph to work on
   */
  computeNodeConstraints(tGraph: TGraph, nodeNodeSpacing: number): void {
    const d = tGraph.getProperty(MrTreeOptions.DIRECTION);
    const right = d.isHorizontal() ? Direction.DOWN : Direction.RIGHT;

    // Get a filtered list of all relevant nodes
    const actualNodes = tGraph
      .getNodes()
      .toArray()
      .filter((x) => !x.getLabel()!.includes('SUPER_ROOT'));
    const points = this.buildPoints(actualNodes, nodeNodeSpacing, right);

    // Set up set sorted by the node positions projections onto a 1D space given by the direction vector
    const s = new TreeSet<TNode>((x, y) =>
      compareDoubles(
        TreeUtil.getDirectionVector(d).dotProduct(x.getPosition().clone()),
        TreeUtil.getDirectionVector(d).dotProduct(y.getPosition().clone()),
      ),
    );

    // identity-hashed in Java, lookup only (TR3)
    const cand = new Map<TNode, TNode>();

    // Scanline
    for (const p of points) {
      const r = p.getFirst();
      if (p.getThird()) {
        this.scanStart(s, cand, r);
      } else {
        this.scanEnd(s, cand, r);
      }
    }
  }

  /**
   * The point list of `computeNodeConstraints` (`CompactionProcessor.java:231-243`): the upper left node corners, then the
   * lower right ones, sorted by their projection onto the `right` direction vector.
   */
  private buildPoints(
    actualNodes: TNode[],
    nodeNodeSpacing: number,
    right: Direction,
  ): Triple<TNode, KVector, boolean>[] {
    // Build the point list by adding the upper left node edges, then the lower left ones and sorting all of them
    const points: Triple<TNode, KVector, boolean>[] = actualNodes.map(
      (x) =>
        new Triple<TNode, KVector, boolean>(x, x.getPosition().clone().sub(nodeNodeSpacing, nodeNodeSpacing), true),
    );
    points.push(
      ...actualNodes.map(
        (x) =>
          new Triple<TNode, KVector, boolean>(
            x,
            x
              .getPosition()
              .clone()
              .add(x.getSize().x + nodeNodeSpacing, x.getSize().y + nodeNodeSpacing),
            false,
          ),
      ),
    );
    // `List.sort`: stable
    points.sort((x, y) =>
      compareDoubles(
        TreeUtil.getDirectionVector(right).dotProduct(x.getSecond().clone()),
        TreeUtil.getDirectionVector(right).dotProduct(y.getSecond().clone()),
      ),
    );
    return points;
  }

  /** The `p.getThird()` arm of the scanline (`CompactionProcessor.java:256-262`). */
  private scanStart(s: TreeSet<TNode>, cand: Map<TNode, TNode>, r: TNode): void {
    s.add(r);
    const left = s.lower(r);
    if (left !== null) {
      cand.set(r, left);
    }
    if (this.hasRightElement(s, r)) {
      cand.set(this.getRightElement(s, r), r);
    }
  }

  /** The other arm of the scanline (`CompactionProcessor.java:263-277`). */
  private scanEnd(s: TreeSet<TNode>, cand: Map<TNode, TNode>, r: TNode): void {
    // This deviates a bit from the proposed pseudo code but we need to check if right and left even exist
    const leftNode = s.lower(r);
    if (leftNode !== null) {
      if (leftNode === cand.get(r)) {
        r.getProperty(InternalProperties.COMPACT_CONSTRAINTS).push(leftNode);
      }
    }
    if (this.hasRightElement(s, r)) {
      const rightNode = this.getRightElement(s, r);
      if (cand.get(rightNode) === r) {
        rightNode.getProperty(InternalProperties.COMPACT_CONSTRAINTS).push(r);
      }
    }
    s.remove(r);
  }

  /** `s.tailSet(r).size() > 1` */
  private hasRightElement(s: TreeSet<TNode>, r: TNode): boolean {
    const first = s.ceiling(r);
    return first !== null && s.higher(first) !== null;
  }

  /**
   * Gets the right element of n in the sorted set s.
   *
   * @param s the sorted set
   * @param n the current node
   * @return the right element of n
   */
  getRightElement(s: TreeSet<TNode>, n: TNode): TNode {
    // tailSet = the elements not less than n; its size is at most 1 unless it has a second element
    const first = s.ceiling(n);
    const second = first === null ? null : s.higher(first);
    if (second === null) {
      // `throw new NullPointerException()` (D10: NPE is a TypeError)
      throw new TypeError('NullPointerException');
    }
    // Get the second element of the set using the iterator
    return second;
  }

  /**
   * Returns the lowest Node in the graph in the given layout direction that is dependent on n.
   *
   * @param n the current node
   * @return the lowest Node in the graph in the given layout direction that is dependent on n
   */
  getLowestDependentNode(n: TNode, d: Direction): TNode | null {
    const cons: TNode[] | null = n.getProperty(InternalProperties.COMPACT_CONSTRAINTS);
    if (cons === null || cons.length < 1) {
      return null;
    } else if (cons.length === 1) {
      return cons[0]!;
    }

    let lowestCons: TNode | null = null;
    switch (d) {
      case Direction.LEFT:
        lowestCons = minOf(cons, (x, y) => compareDoubles(x.getPosition().x, y.getPosition().x));
        break;
      case Direction.RIGHT:
        lowestCons = maxOf(cons, (x, y) =>
          compareDoubles(x.getPosition().x + x.getSize().x, y.getPosition().x + y.getSize().x),
        );
        break;
      case Direction.UP:
        lowestCons = minOf(cons, (x, y) => compareDoubles(x.getPosition().y, y.getPosition().y));
        break;
      case Direction.DOWN:
        lowestCons = maxOf(cons, (x, y) =>
          compareDoubles(x.getPosition().y + x.getSize().y, y.getPosition().y + y.getSize().y),
        );
        break;
    }

    return lowestCons;
  }
}
