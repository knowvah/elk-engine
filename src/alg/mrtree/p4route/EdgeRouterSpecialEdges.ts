// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import { Pair } from '../../../core/util/Pair.js';
import { Triple } from '../../../core/util/Triple.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeUtil } from '../TreeUtil.js';
import { doubleStreamAverage } from './DoubleStreamAverage.js';
import { middleToMiddleEdgeRoute } from './EdgeRouterShared.js';
import { MultiLevelEdgeNodeNodeGap } from './MultiLevelEdgeNodeNodeGap.js';

/** `Optional.get()` on an empty `Optional` / `OptionalDouble.getAsDouble()` on an empty one. */
const NO_VALUE_PRESENT = 'No value present';

/** The coordinate axis the horizontal (`y`) and vertical (`x`) variants of a block of Java code work on. */
type Axis = 'x' | 'y';

/** The state `avoidOverlapSpecialEdges` threads through its helpers: the Java locals of that method. */
interface SpecialEdgesContext {
  readonly tGraph: TGraph;
  readonly d: Direction;
  readonly nodeGaps: Map<bigint, MultiLevelEdgeNodeNodeGap>;
  readonly nodeBendpointPadding: number;
  readonly edgeEndTexturePadding: number;
  readonly outsPerLevel: number[];
  readonly insPerLevel: number[];
  /** How many edges are routed along the sides of the tree */
  sideOneEdges: number;
  sideTwoEdges: number;
}

/**
 * The seven parameters of `avoidOverlapHandleCycleInducingEdges` (`EdgeRouter.java:303`), bundled because the port limits a
 * function to five parameters.
 */
interface CycleInducingArguments {
  readonly e: TEdge;
  readonly d: Direction;
  readonly tGraph: TGraph;
  readonly sideEdges: Pair<number, number>;
  readonly nodeBendpointPadding: number;
  readonly edgeEndTexturePadding: number;
  readonly inOuts: Pair<number, number>;
}

/**
 * Handles special edges such as multi level edges and cycle inducing edges for the AvoidOverlap router.
 * Multi level edges are edges that don't just go from one level to the next but through multiple levels.
 * Cycle inducing edges start lower in the tree than where they end.
 *
 * `nodeGaps` (`HashMap<Long, MultiLevelEdgeNodeNodeGap>`, lookup only: `containsKey`, `put`, `get`) is a `Map` keyed by the
 * `bigint` of `TreeUtil.getUniqueLong`; a `Map` compares `bigint` keys by value, and the order of a lookup-only map is
 * unobservable. The key is `curLevel * 2^32 + i`, below 2^63 for any int `curLevel` and above 2^53 from level 2^21 on,
 * hence `bigint` (translation rules 1.4).
 *
 * @param tGraph the Graph to work on
 * @param root the Graph's root node
 * @param d the current layout direction
 * @param nodeBendpointPadding the Node BendPoint Padding
 * @param edgeEndTexturePadding the length of the texture at the end of edges set in the MrTreeOptions
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:164
 */
export function avoidOverlapSpecialEdges(
  tGraph: TGraph,
  // Java parameter, never read by the Java method
  _root: TNode,
  d: Direction,
  nodeBendpointPadding: number,
  edgeEndTexturePadding: number,
): void {
  const ctx = createContext(tGraph, d, nodeBendpointPadding, edgeEndTexturePadding);

  // stream().distinct(): TEdge has identity equality, the first occurrence of each stays, in encounter order
  const distictEdges: TEdge[] = [...new Set(tGraph.getEdges())];
  for (const e of distictEdges) {
    const sourceLevel = e.getSource()!.getProperty(MrTreeOptions.TREE_LEVEL);
    const targetLevel = e.getTarget()!.getProperty(MrTreeOptions.TREE_LEVEL);
    const levelDiff = targetLevel - sourceLevel;
    if (levelDiff > 1) {
      // Multi level edges
      for (let curLevel = sourceLevel + 1; curLevel < targetLevel; curLevel++) {
        routeThroughLevel(ctx, e, sourceLevel, targetLevel, curLevel);
      }
    } else if (levelDiff === 0) {
      // Fallback for edges that come from and go to the same level
      middleToMiddleEdgeRoute(e);
    } else if (levelDiff < 0) {
      routeCycleInducingEdge(ctx, e, sourceLevel, targetLevel);
    }
  }
}

/** The locals `avoidOverlapSpecialEdges` declares before its loop (`:166-177`; the level counters start at zero). */
function createContext(
  tGraph: TGraph,
  d: Direction,
  nodeBendpointPadding: number,
  edgeEndTexturePadding: number,
): SpecialEdgesContext {
  const maxLevel = maxTreeLevel(tGraph) + 1;
  return {
    tGraph,
    d,
    nodeGaps: new Map<bigint, MultiLevelEdgeNodeNodeGap>(),
    nodeBendpointPadding,
    edgeEndTexturePadding,
    outsPerLevel: new Array<number>(maxLevel).fill(0),
    insPerLevel: new Array<number>(maxLevel).fill(0),
    sideOneEdges: 0,
    sideTwoEdges: 0,
  };
}

/**
 * The `levelDiff < 0` arm: counts the edge against its levels and routes it along the end of the graph.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:290
 */
function routeCycleInducingEdge(ctx: SpecialEdgesContext, e: TEdge, sourceLevel: number, targetLevel: number): void {
  ctx.outsPerLevel[sourceLevel]!++;
  ctx.insPerLevel[targetLevel]!++;
  const sides = avoidOverlapHandleCycleInducingEdges({
    e,
    d: ctx.d,
    tGraph: ctx.tGraph,
    sideEdges: new Pair<number, number>(ctx.sideOneEdges, ctx.sideTwoEdges),
    nodeBendpointPadding: ctx.nodeBendpointPadding,
    edgeEndTexturePadding: ctx.edgeEndTexturePadding,
    inOuts: new Pair<number, number>(ctx.insPerLevel[targetLevel]!, ctx.outsPerLevel[sourceLevel]!),
  });
  ctx.sideOneEdges = sides.getFirst()!;
  ctx.sideTwoEdges = sides.getSecond()!;
}

/**
 * `tGraph.getNodes().stream().map(x -> x.getProperty(TREE_LEVEL)).max(Integer::compare).get()`.
 *
 * @throws NoSuchElementException on a graph without nodes
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:169
 */
function maxTreeLevel(tGraph: TGraph): number {
  let max: number | undefined;
  for (const x of tGraph.getNodes()) {
    const level = x.getProperty(MrTreeOptions.TREE_LEVEL);
    // BinaryOperator.maxBy: keeps the first operand on a tie (equal ints are indistinguishable)
    max = max === undefined || level > max ? level : max;
  }
  if (max === undefined) {
    throw new NoSuchElementException(NO_VALUE_PRESENT);
  }
  return max;
}

/**
 * The body of the `for (curLevel ...)` loop of the multi level edge arm: routes `e` through the gap of the level
 * `curLevel`. A `continue` of the Java loop is a `return` here.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:187
 */
function routeThroughLevel(
  ctx: SpecialEdgesContext,
  e: TEdge,
  sourceLevel: number,
  targetLevel: number,
  curLevel: number,
): void {
  const nextLevelNodes = nodesOfLevel(ctx.tGraph, curLevel);
  // Find the node gap in the next level through which we can route our multi level edge
  const horizontal = ctx.d.isHorizontal();
  const i = findGapIndex(nextLevelNodes, horizontal ? 'y' : 'x', e, [sourceLevel, targetLevel, curLevel]);

  // Skip unnecessary level side bendPoints
  if (horizontal ? skipsLevelSideHorizontal(e, nextLevelNodes, i) : skipsLevelSideVertical(e, nextLevelNodes, i)) {
    return;
  }

  addMultiLevelEdgeGap(ctx, e, curLevel, i, nextLevelNodes);
}

/**
 * `tGraph.getNodes().stream().filter(x -> x.getProperty(TREE_LEVEL) == finalCurlevel).collect(toList())`.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:188
 */
function nodesOfLevel(tGraph: TGraph, curLevel: number): TNode[] {
  const nextLevelNodes: TNode[] = [];
  for (const x of tGraph.getNodes()) {
    // x.getProperty(TREE_LEVEL) == finalCurlevel: an Integer unboxed against an int, a numeric comparison
    if (x.getProperty(MrTreeOptions.TREE_LEVEL) === curLevel) {
      nextLevelNodes.push(x);
    }
  }
  return nextLevelNodes;
}

/**
 * Sorts the nodes of the next level along `axis` and finds the index of the gap the edge passes through (the two copies of
 * the Java, `:193-202` along y and `:221-228` along x). `levels` is `[sourceLevel, targetLevel, curLevel]`.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:192
 */
function findGapIndex(
  nextLevelNodes: TNode[],
  axis: Axis,
  e: TEdge,
  levels: readonly [number, number, number],
): number {
  const [sourceLevel, targetLevel, curLevel] = levels;
  nextLevelNodes.sort((x, y) => compareDoubles(x.getPosition()[axis], y.getPosition()[axis]));
  let i: number;
  for (i = 0; i < nextLevelNodes.length; i++) {
    const interpolation = (curLevel - sourceLevel) / (targetLevel - sourceLevel);
    if (
      nextLevelNodes[i]!.getPosition()[axis] >
      e.getSource()!.getPosition()[axis] * (1 - interpolation) + e.getTarget()!.getPosition()[axis] * interpolation
    ) {
      break;
    }
  }
  return i;
}

/**
 * The "skip unnecessary level side bendPoints" block of the horizontal branch. Keeps the Java comparison
 * `start.y < first.x` (`:215`) that mixes the axes.
 *
 * @return whether the Java `continue`s
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:203
 */
function skipsLevelSideHorizontal(e: TEdge, nextLevelNodes: readonly TNode[], i: number): boolean {
  if (nextLevelNodes.length > 0) {
    const start = e.getBendPoints().size() === 0 ? e.getSource()!.getPosition().clone() : e.getBendPoints().getLast();
    const lastNode = nextLevelNodes[nextLevelNodes.length - 1]!;
    const last = lastNode.getPosition().clone().add(lastNode.getSize());
    const first = nextLevelNodes[0]!.getPosition().clone().add(nextLevelNodes[0]!.getSize());
    if (i >= nextLevelNodes.length - 1 && start.y > last.y && e.getTarget()!.getPosition().y > last.y) {
      return true;
    }
    if (i <= 0 && start.y < first.x && e.getTarget()!.getPosition().y < first.y) {
      return true;
    }
  }
  return false;
}

/**
 * The "skip unnecessary level side bendPoints" block of the vertical branch.
 *
 * @return whether the Java `continue`s
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:230
 */
function skipsLevelSideVertical(e: TEdge, nextLevelNodes: readonly TNode[], i: number): boolean {
  if (nextLevelNodes.length > 0) {
    const start = e.getBendPoints().size() === 0 ? e.getSource()!.getPosition().clone() : e.getBendPoints().getLast();
    const lastNode = nextLevelNodes[nextLevelNodes.length - 1]!;
    const last = lastNode.getPosition().clone().add(lastNode.getSize());
    const first = nextLevelNodes[0]!.getPosition().clone().add(nextLevelNodes[0]!.getSize());
    if (i >= nextLevelNodes.length - 1 && start.x > last.x && e.getTarget()!.getPosition().x > last.x) {
      return true;
    }
    if (i <= 0 && start.x < first.x && e.getTarget()!.getPosition().x < first.x) {
      return true;
    }
  }
  return false;
}

/**
 * "Add multi level edge gap to nodeGaps" and "Increment end of level edge counters".
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:249
 */
function addMultiLevelEdgeGap(
  ctx: SpecialEdgesContext,
  e: TEdge,
  curLevel: number,
  i: number,
  nextLevelNodes: readonly TNode[],
): void {
  const bend1 = new KVector();
  const bend2 = new KVector();
  e.getBendPoints().add(bend1);
  e.getBendPoints().add(bend2);
  let gap: MultiLevelEdgeNodeNodeGap;
  const bendTriple = new Triple<KVector, KVector, TEdge>(bend1, bend2, e);
  const key = TreeUtil.getUniqueLong(curLevel, i);
  if (!ctx.nodeGaps.has(key)) {
    gap = new MultiLevelEdgeNodeNodeGap(
      i === 0 ? null : nextLevelNodes[i - 1]!,
      i === nextLevelNodes.length ? null : nextLevelNodes[i]!,
      bendTriple,
      ctx.tGraph,
    );
    ctx.nodeGaps.set(key, gap);
  } else {
    gap = ctx.nodeGaps.get(key)!;
    gap.addBendPoints(bendTriple);
  }

  incrementSideCounters(ctx, gap);
}

/**
 * "Increment end of level edge counters". `gap.getNeighborTwo()` is non-null when `isOnFirstNodeSide()` holds and
 * `gap.getNeighborOne()` is non-null when `isOnLastNodeSide()` holds (`MultiLevelEdgeNodeNodeGap.java:124,181`).
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:264
 */
function incrementSideCounters(ctx: SpecialEdgesContext, gap: MultiLevelEdgeNodeNodeGap): void {
  const { tGraph } = ctx;
  // the two Java copies differ by the axis (and the graph bound properties) only
  const horizontal = ctx.d.isHorizontal();
  const axis: Axis = horizontal ? 'y' : 'x';
  const min = tGraph.getProperty(horizontal ? InternalProperties.GRAPH_YMIN : InternalProperties.GRAPH_XMIN);
  const max = tGraph.getProperty(horizontal ? InternalProperties.GRAPH_YMAX : InternalProperties.GRAPH_XMAX);
  if (gap.isOnFirstNodeSide() && gap.getNeighborTwo()!.getPosition()[axis] <= min) {
    ctx.sideOneEdges++;
  }
  if (
    gap.isOnLastNodeSide() &&
    gap.getNeighborOne()!.getPosition()[axis] + gap.getNeighborOne()!.getSize()[axis] >= max
  ) {
    ctx.sideTwoEdges++;
  }
}

/**
 * Routes a cycle inducing edge along the end of the graph.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:303
 */
function avoidOverlapHandleCycleInducingEdges(args: CycleInducingArguments): Pair<number, number> {
  const sides = { sideOneEdges: args.sideEdges.getFirst()!, sideTwoEdges: args.sideEdges.getSecond()! };

  // Compute bendTmp which is the coordinate at the end of the graph the edge will be routed along
  const bendTmp = cycleBendTmp(args, sides);
  // Set bendPoints
  addCycleBendPoints(args, bendTmp);

  return new Pair<number, number>(sides.sideOneEdges, sides.sideTwoEdges);
}

/**
 * The `bendTmp` / `middleTree` computation of both orientations (`:311-342`; one body over the axis the two copies
 * differ by). Increments the side counters, as the Java pre-increments do.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:311
 */
function cycleBendTmp(args: CycleInducingArguments, sides: { sideOneEdges: number; sideTwoEdges: number }): number {
  const { tGraph, nodeBendpointPadding } = args;
  const axis: Axis = args.d.isHorizontal() ? 'y' : 'x';
  const s = args.e.getSource()!;
  const nodes = [...tGraph.getNodes()];
  const middleTree = doubleStreamAverage(nodes.map((x) => x.getPosition()[axis] + x.getSize()[axis] / 2));
  if (s.getPosition()[axis] + s.getSize()[axis] / 2 > middleTree) {
    const finalSideTwoEdges = ++sides.sideTwoEdges;
    return maxOf(
      nodes.map((x) => x.getPosition()[axis] + x.getSize()[axis] + nodeBendpointPadding * finalSideTwoEdges),
    );
  } else {
    const finalSideOneEdges = ++sides.sideOneEdges;
    return minOf(nodes.map((x) => x.getPosition()[axis] - nodeBendpointPadding * finalSideOneEdges));
  }
}

/** `Stream<Double>.max(Double::compare).get()`: `BinaryOperator.maxBy` keeps the first operand on a tie. */
function maxOf(values: readonly number[]): number {
  return values.reduce((a, b) => (compareDoubles(a, b) >= 0 ? a : b));
}

/** `Stream<Double>.min(Double::compare).get()`: `BinaryOperator.minBy` keeps the first operand on a tie. */
function minOf(values: readonly number[]): number {
  return values.reduce((a, b) => (compareDoubles(a, b) <= 0 ? a : b));
}

/**
 * "Set bendPoints" of `avoidOverlapHandleCycleInducingEdges`.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:343
 */
function addCycleBendPoints(args: CycleInducingArguments, bendTmp: number): void {
  if (args.d === Direction.LEFT) {
    addCycleBendPointsLeft(args, bendTmp);
  } else if (args.d === Direction.RIGHT) {
    addCycleBendPointsRight(args, bendTmp);
  } else if (args.d === Direction.UP) {
    addCycleBendPointsUp(args, bendTmp);
  } else {
    addCycleBendPointsDown(args, bendTmp);
  }
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:344 */
function addCycleBendPointsLeft(args: CycleInducingArguments, bendTmp: number): void {
  const { e, nodeBendpointPadding, edgeEndTexturePadding } = args;
  const s = e.getSource()!;
  const t = e.getTarget()!;
  e.getBendPoints().add(s.getProperty(InternalProperties.LEVELMIN) - nodeBendpointPadding, bendTmp);
  e.getBendPoints().add(t.getPosition().x + t.getSize().x + nodeBendpointPadding + edgeEndTexturePadding, bendTmp);
  e.getBendPoints().add(
    t.getPosition().x + t.getSize().x + nodeBendpointPadding + edgeEndTexturePadding,
    t.getPosition().y + t.getSize().y / 2,
  );
  e.getBendPoints().add(t.getPosition().x + t.getSize().x, t.getPosition().y + t.getSize().y / 2);
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:351 */
function addCycleBendPointsRight(args: CycleInducingArguments, bendTmp: number): void {
  const { e, nodeBendpointPadding, edgeEndTexturePadding } = args;
  const s = e.getSource()!;
  const t = e.getTarget()!;
  e.getBendPoints().add(
    s.getProperty(InternalProperties.LEVELMAX) + nodeBendpointPadding,
    s.getPosition().y + s.getSize().y / 2,
  );
  e.getBendPoints().add(s.getPosition().x + s.getSize().x + nodeBendpointPadding, bendTmp);
  e.getBendPoints().add(t.getPosition().x - nodeBendpointPadding - edgeEndTexturePadding, bendTmp);
  e.getBendPoints().add(
    t.getPosition().x - nodeBendpointPadding - edgeEndTexturePadding,
    t.getPosition().y + t.getSize().y / 2,
  );
  e.getBendPoints().add(t.getPosition().x, t.getPosition().y + t.getSize().y / 2);
}

/** @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:359 */
function addCycleBendPointsUp(args: CycleInducingArguments, bendTmp: number): void {
  const { e, nodeBendpointPadding, edgeEndTexturePadding } = args;
  const s = e.getSource()!;
  const t = e.getTarget()!;
  e.getBendPoints().add(bendTmp, s.getProperty(InternalProperties.LEVELMIN) - nodeBendpointPadding);
  e.getBendPoints().add(bendTmp, t.getPosition().y + t.getSize().y + nodeBendpointPadding + edgeEndTexturePadding);
  e.getBendPoints().add(
    t.getPosition().x + t.getSize().x / 2,
    t.getPosition().y + t.getSize().y + nodeBendpointPadding + edgeEndTexturePadding,
  );
  e.getBendPoints().add(
    t.getPosition().x + t.getSize().x / 2,
    t.getPosition().y + t.getSize().y + nodeBendpointPadding,
  );
}

/** The final `else` (DOWN, and UNDEFINED) of the direction chain. @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:367 */
function addCycleBendPointsDown(args: CycleInducingArguments, bendTmp: number): void {
  const { e, nodeBendpointPadding, edgeEndTexturePadding, inOuts } = args;
  const s = e.getSource()!;
  const t = e.getTarget()!;
  if (!e.getBendPoints().isEmpty()) {
    e.getBendPoints().getLast().y =
      s.getProperty(InternalProperties.LEVELMAX) + nodeBendpointPadding * inOuts.getSecond()!;
  }
  e.getBendPoints().add(
    bendTmp,
    s.getProperty(InternalProperties.LEVELMAX) + nodeBendpointPadding * inOuts.getSecond()!,
  );
  e.getBendPoints().add(bendTmp, t.getPosition().y - nodeBendpointPadding * inOuts.getFirst()! - edgeEndTexturePadding);
}
