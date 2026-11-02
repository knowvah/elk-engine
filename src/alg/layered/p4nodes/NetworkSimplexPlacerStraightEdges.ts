// SPDX-License-Identifier: EPL-2.0
import type { NEdge } from '../../common/networksimplex/NEdge.js';
import * as DoubleMath from '../../../guava/DoubleMath.js';
import type { LEdge } from '../graph/LEdge.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { EPSILON, LONG_EDGE_VS_PATH_FACTOR } from './NetworkSimplexPlacerConstants.js';
import type { EdgeRep } from './NetworkSimplexPlacerEdgeRep.js';
import type { NodeRep } from './NetworkSimplexPlacerNodeRep.js';
import { getNodeState, identifyPaths, markEdgeCrossings } from './NetworkSimplexPlacerPaths.js';
import type { Path } from './NetworkSimplexPlacerPath.js';
import type { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';
import { getEdgeWeight } from './NetworkSimplexPlacerWeights.js';

// ------------------------------------------------------------------------------------------------
//                                      Edge Straightening
// ------------------------------------------------------------------------------------------------

/**
 * Potentially alters the weights of paths in a similar fashion to long edges. Also collects 'two paths' for later post
 * processing.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function preferStraightEdges(s: NetworkSimplexPlacerState): void {
  // the nodes were counted and indexed during #prepare
  s.nodeState = new Array<number>(s.nodeCount).fill(0);
  s.twoPaths = [];

  // record node states
  s.lGraph!.getLayers()
    .flatMap((l) => l.getNodes())
    .forEach((n) => (s.nodeState![n.id] = getNodeState(n)));

  markEdgeCrossings(s);
  const identifiedPaths = identifyPaths(s);

  // essentially 'long paths' are treated like 'long edges':
  // the weights of the connecting edges are altered to straighten the path as much as possible
  for (const path of identifiedPaths) {
    if (path.size() <= 1) {
      continue;
    }

    // remember 'two paths' for processing after network simplex has been executed
    if (path.size() === 2) {
      path.orderTwoPath();
      if (!path.isTwoPathCenterNodeFlexible()) {
        s.twoPaths.push(path);
      }
      continue;
    }

    // ignore paths that contain long edge dummies, and paths that contain flexible nodes that allow resizing
    if (path.containsLongEdgeDummy() || path.containsFlexibleNode((nf) => nf.isFlexibleSizeWhereSpacePermits())) {
      continue;
    }

    alterPathWeights(s, path);
  }
}

/** The `Iterator<LEdge> pathIt` loop at the end of `preferStraightEdges`' path loop (Java `:1002-1026`). */
function alterPathWeights(s: NetworkSimplexPlacerState, path: Path): void {
  const edges = [...path];
  let last: LEdge | null = null;
  for (let i = 0; i < edges.length; i++) {
    const cur = edges[i]!;
    const hasNext = i + 1 < edges.length;
    const curRep = s.edgeReps![cur.id]!;

    let weight: number;
    if (last === null || !hasNext) {
      // first or last segment
      weight = getEdgeWeight(NodeType.NORMAL, NodeType.LONG_EDGE);
    } else {
      weight = getEdgeWeight(NodeType.LONG_EDGE, NodeType.LONG_EDGE);
    }

    // at this point one can decide whether long edges are more important than "paths"
    weight *= LONG_EDGE_VS_PATH_FACTOR;

    const oldLeftWeight = curRep.left.weight;
    curRep.left.weight = Math.max(oldLeftWeight, oldLeftWeight + (weight - oldLeftWeight));
    const oldRightWeight = curRep.right.weight;
    curRep.right.weight = Math.max(oldRightWeight, oldRightWeight + (weight - oldRightWeight));

    last = cur;
  }
}

/**
 * Iteratively post processes 'two paths' until no further bends can be removed.
 */
export function postProcessTwoPaths(s: NetworkSimplexPlacerState): void {
  const q: Path[] = [...s.twoPaths!];

  const stack: Path[] = [];
  while (q.length > 0) {
    const path = q.shift()!;
    const tryAgain = improveTwoPath(s, path, true);
    if (tryAgain) {
      stack.push(path);
    }
  }

  while (stack.length > 0) {
    const path = stack.pop()!;
    improveTwoPath(s, path, false);
  }
}

/**
 * The distance a node can move up before it hits the node above it, `Infinity` for the first node of its layer
 * (Java `:1118-1127`, split out of `improveTwoPath` to meet the complexity limit).
 */
function distanceToNodeAbove(s: NetworkSimplexPlacerState, centerNode: LNode, nNode: NodeRep): number {
  const nodeIndex = centerNode.getIndex();
  let aboveDist = Number.POSITIVE_INFINITY;
  if (nodeIndex > 0) {
    const above = centerNode.getLayer()!.getNodes()[nodeIndex - 1]!;
    const aboveRep = s.nodeReps![above.id]!;
    const spacing = Math.ceil(s.spacings!.getVerticalSpacing(above, centerNode));
    aboveDist =
      nNode.head.layer -
      centerNode.getMargin().top -
      (aboveRep.head.layer + above.getSize().y + above.getMargin().bottom) -
      spacing;
  }
  return aboveDist;
}

/** The distance a node can move down before it hits the node below it (see `distanceToNodeAbove`). */
function distanceToNodeBelow(s: NetworkSimplexPlacerState, centerNode: LNode, nNode: NodeRep): number {
  const nodeIndex = centerNode.getIndex();
  let belowDist = Number.POSITIVE_INFINITY;
  if (nodeIndex < centerNode.getLayer()!.getNodes().length - 1) {
    const below = centerNode.getLayer()!.getNodes()[nodeIndex + 1]!;
    const belowRep = s.nodeReps![below.id]!;
    const spacing = Math.ceil(s.spacings!.getVerticalSpacing(below, centerNode));
    belowDist =
      belowRep.head.layer -
      below.getMargin().top -
      (nNode.head.layer + centerNode.getSize().y + centerNode.getMargin().bottom) -
      spacing;
  }
  return belowDist;
}

/**
 * From the way the auxiliary graph is built, one can differentiate four cases (A-D) (see `improveTwoPath`); returns
 * how far the center node moves (`move`, `0` if it stays).
 */
function chooseMove(leftEdge: EdgeRep, rightEdge: EdgeRep, aboveDist: number, belowDist: number): number {
  // the following variables represent the length of each of the four edges,
  // i.e. if possible node c has to be moved by this distance (either up or down)
  // O--a--o--b--O--c--o--d--O
  const a = +length(leftEdge.left);
  const b = -length(leftEdge.right);
  const c = -length(rightEdge.left);
  const d = +length(rightEdge.right);

  const caseD = leftEdge.notStraightBy() > 0 && rightEdge.notStraightBy() < 0;
  const caseC = leftEdge.notStraightBy() < 0 && rightEdge.notStraightBy() > 0;
  const caseB =
    leftEdge.left.target!.layer + leftEdge.right.delta < rightEdge.right.target!.layer + rightEdge.left.delta;
  const caseA =
    leftEdge.left.target!.layer + leftEdge.right.delta > rightEdge.right.target!.layer + rightEdge.left.delta;

  let move = 0;
  if (!caseD && !caseC) {
    if (caseA) {
      move = moveWhereSpacePermits(aboveDist, belowDist, c, a);
    } else if (caseB) {
      move = moveWhereSpacePermits(aboveDist, belowDist, b, d);
    }
  }
  return move;
}

/**
 * The two-branch decision of cases A and B in `improveTwoPath` (Java `:1186-1200`): move by `upMove` if the space above
 * permits it, else by `downMove` if the space below does, else not at all. Split out to meet the complexity limit.
 */
function moveWhereSpacePermits(aboveDist: number, belowDist: number, upMove: number, downMove: number): number {
  if (aboveDist + upMove > 0) {
    return upMove;
  } else if (belowDist - downMove > 0) {
    return downMove;
  }
  return 0;
}

/**
 * A two path `(u, center, v)` has the following form:
 *
 *     u  <--leftEdge.left-- d1 --leftEdge.right--> center <--rightEdge.left-- d2 --rightEdge.right--> v
 *
 * The path is assumed to be ordered 'left to right', i.e. the center node is the target node of the first edge. See
 * `Path.orderTwoPath`. Additionally, the center node must not be flexible in any way.
 *
 * @return `true` if nothing was changed and the path should be checked again later. `false` if no further processing
 *         is required.
 */
export function improveTwoPath(s: NetworkSimplexPlacerState, path: Path, probe: boolean): boolean {
  const leftEdge = s.edgeReps![path.get(0).id]!;
  const rightEdge = s.edgeReps![path.get(1).id]!;

  // is the edge already straight?
  if (leftEdge.isStraight() && rightEdge.isStraight()) {
    return false;
  }

  // get center node
  const centerOrigin = leftEdge.right.target!.origin;
  if (!(centerOrigin instanceof LNode)) {
    return false;
  }
  // The Java `assert centerOrigin instanceof LNode` (NetworkSimplexPlacer.java:1131) is omitted (N5): the check
  // above returned for every other origin.
  // can be a node or a port
  const centerNode = centerOrigin;
  const nNode = s.nodeReps![centerNode.id]!;

  // identify on which side there is more space
  const aboveDist = distanceToNodeAbove(s, centerNode, nNode);
  const belowDist = distanceToNodeBelow(s, centerNode, nNode);

  // same space on both sides, check again later
  if (probe && DoubleMath.fuzzyEquals(aboveDist, belowDist, EPSILON)) {
    return true;
  }

  // Case A:          Case B:         Case C:         Case D:
  //          o-v        u-o
  //         /              \            u-o   o-v         o-c-o
  //      o-c                c-o            \ /           /     \
  //     /                      \            c           u       v
  //    u                        v
  // Note that case C and D only occur if node c is blocked either above or below, respectively.
  // Otherwise the edge would be straight.
  //
  // In every case there are two non-straight edges. When routing edges orthogonally later on,
  // one saves a bend point if only one of the four edges is non-straight. To straighten one of the
  // two candidate edges, node c has to be moved up or down. It depends on the adjacent nodes in c's layer
  // if this is possible.
  const move = chooseMove(leftEdge, rightEdge, aboveDist, belowDist);

  // move the center node
  nNode.head.layer += move;
  if (nNode.isFlexible) {
    nNode.tail.layer += move;
  }

  return false;
}

/**
 * @return the length of the passed edge.
 */
function length(edge: NEdge): number {
  return Math.abs(edge.source!.layer - edge.target!.layer) - edge.delta;
}
