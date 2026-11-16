// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { Triple } from '../../../core/util/Triple.js';
import { compare as compareDoubles } from '../../../java/lang/DoubleCompare.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import type { TNode } from '../graph/TNode.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeUtil } from '../TreeUtil.js';
import { labelEquals, labelOf, middleToMiddleEdgeRoute } from './EdgeRouterShared.js';

/** The `i += 2 * 2 * 2 * 2 * 2` jump after a clipped segment (`EdgeRouter.java:698`). */
const SEGMENT_JUMP = 2 * 2 * 2 * 2 * 2;

/** Labels of the debugging probe at `EdgeRouter.java:643` (its body is a no-op `getClass()`). */
const PROBE_SOURCE_LABEL = 'n8';
const PROBE_NODE_LABEL = 'n6';

/** `list.get(index)` of a Java list: out of range is an `IndexOutOfBoundsException`. */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index]!;
}

/**
 * Handles CyrusBeck Edge Routing. Private and called by nothing in the Java (`process` never selects it); ported whole.
 *
 * @param tGraph the graph to work on
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:603
 */
export function cyrusBeck(tGraph: TGraph): void {
  // Both locals are unused by the Java; the root lookup can throw, so it stays.
  TreeUtil.getRoot(tGraph);
  tGraph.getProperty(MrTreeOptions.SPACING_EDGE_NODE);

  for (const edge of tGraph.getEdges()) {
    middleToMiddleEdgeRoute(edge);
  }

  for (const edge of tGraph.getEdges()) {
    const bends = edge.getBendPoints();
    for (let i = 0; i < bends.size() - 1; i++) {
      const start = bends.get(i);
      const end = bends.get(i + 1);
      const delta = start.clone().sub(end.clone());

      if (delta.x === 0 && delta.y === 0) {
        continue;
      }

      if (clipSegmentAgainstNodes(tGraph, edge, start, end, delta)) {
        i += SEGMENT_JUMP;
      }
    }
  }
}

/**
 * The inner `for (TNode node ...)` loop: clips the segment against the first node it overlaps and inserts the clip points at
 * the start of the bend points, then leaves the loop (the Java `break`).
 *
 * @return whether the Java reached its `break`
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:622
 */
function clipSegmentAgainstNodes(tGraph: TGraph, edge: TEdge, start: KVector, end: KVector, delta: KVector): boolean {
  for (const node of tGraph.getNodes()) {
    if (sameLabel(node, edge.getSource()!) || sameLabel(node, edge.getTarget()!)) {
      continue;
    }

    // The Java compares the labels with "n8" and "n6" and calls getClass() (a debugging leftover): only the
    // dereference of the labels (a null label throws) is observable.
    if (labelEquals(edge.getSource()!, PROBE_SOURCE_LABEL)) {
      labelEquals(node, PROBE_NODE_LABEL);
    }

    const clip = clipAgainstNode(node, start, end, delta);
    if (clip !== null) {
      clip.sort((x, y) => compareDoubles(delta.clone().dotProduct(x.clone()), delta.clone().dotProduct(y.clone())));

      // `middle` is never read; `1 / 2` is an int division, 0, in Java
      listGet(clip, 0).clone().add(listGet(clip, 1).clone()).scale(0);

      edge.getBendPoints().addAllAt(0, clip);
      return true;
    }
  }
  return false;
}

/**
 * `node.getLabel().equals(other.getLabel())`: a `null` label of `node` throws (D10: `TypeError`), a `null` label of `other`
 * is `equals(null)`, false.
 */
function sameLabel(node: TNode, other: TNode): boolean {
  return labelOf(node) === other.getLabel();
}

/**
 * The Cohen-Sutherland test and the clip of one segment against one node.
 *
 * @return the clip points, or `null` when the test rules the node out (the Java does not enter its block)
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:629
 */
function clipAgainstNode(node: TNode, start: KVector, end: KVector, delta: KVector): KVector[] | null {
  const clip: KVector[] = [];
  const xmin = node.getPosition().x;
  const xmax = node.getPosition().x + node.getSize().x;
  const ymin = node.getPosition().y;
  const ymax = node.getPosition().y + node.getSize().y;

  // Cohen-Sutherland Test
  const codes = outCodes({ xmin, xmax, ymin, ymax }, start, end);

  // None of the points are inside the node but they may still overlap according to the test (the Java uses the
  // non-short-circuit `&` on side-effect-free booleans)
  if (!mayOverlap(codes)) {
    return null;
  }

  if (delta.x === 0) {
    // Special case: vert
    clip.push(new KVector(start.x, ymin));
    clip.push(new KVector(start.x, ymax));
  } else if (delta.y === 0) {
    // Special case: horz
    clip.push(new KVector(xmin, start.y));
    clip.push(new KVector(xmax, start.y));
  } else {
    clipDiagonal(clip, { start, end, delta }, { xmin, xmax, ymin, ymax }, codes);
  }
  return clip;
}

/** `!(so & eo) & !(su & eu) & !(sr & er) & !(sl & el)` (`EdgeRouter.java:648`). */
function mayOverlap(codes: OutCodes): boolean {
  return !(codes.so && codes.eo) && !(codes.su && codes.eu) && !(codes.sr && codes.er) && !(codes.sl && codes.el);
}

/** The eight outcodes of the Cohen-Sutherland test (`EdgeRouter.java:634-641`). */
function outCodes(bounds: NodeBounds, start: KVector, end: KVector): OutCodes {
  return {
    so: start.y < bounds.ymin,
    su: start.y > bounds.ymax,
    sr: start.x > bounds.xmax,
    sl: start.x < bounds.xmin,
    eo: end.y < bounds.ymin,
    eu: end.y > bounds.ymax,
    er: end.x > bounds.xmax,
    el: end.x < bounds.xmin,
  };
}

/** The bounds of the node a segment is clipped against. */
interface NodeBounds {
  readonly xmin: number;
  readonly xmax: number;
  readonly ymin: number;
  readonly ymax: number;
}

/** The segment being clipped. */
interface Segment {
  readonly start: KVector;
  readonly end: KVector;
  readonly delta: KVector;
}

/** The eight Cohen-Sutherland outcodes: start and end point over (o), under (u), left (l), right (r) of the node. */
interface OutCodes {
  readonly so: boolean;
  readonly su: boolean;
  readonly sl: boolean;
  readonly sr: boolean;
  readonly eo: boolean;
  readonly eu: boolean;
  readonly el: boolean;
  readonly er: boolean;
}

/**
 * The general (neither vertical nor horizontal) clip: `pclips` of the up to four border crossings, sorted by their third
 * component; the first positive one and its predecessor are the clip points.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:657
 */
function clipDiagonal(clip: KVector[], segment: Segment, bounds: NodeBounds, codes: OutCodes): void {
  const pclips = borderCrossings(segment, bounds, codes);
  pclips.sort((x, y) => compareDoubles(x.getThird(), y.getThird()));
  for (let j = 0; j < pclips.length; j++) {
    if (pclips[j]!.getThird() > 0) {
      clip.push(pclips[j]!.getSecond());
      clip.push(listGet(pclips, j - 1).getSecond());
      break;
    }
  }
}

/** One `pclips` entry: the parameter `t` of the crossing, the crossing point and the sign term of the border. */
function crossing(t: number, segment: Segment, third: number): Triple<number, KVector, number> {
  const s = segment.start.clone().add(segment.delta.clone().scale(t));
  return new Triple<number, KVector, number>(t, s, third);
}

/**
 * The up to four border crossings (over, under, left, right) the Java collects in `pclips`.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:657
 */
function borderCrossings(
  segment: Segment,
  bounds: NodeBounds,
  codes: OutCodes,
): Array<Triple<number, KVector, number>> {
  const { start, end, delta } = segment;
  const pclips: Array<Triple<number, KVector, number>> = [];
  if (codes.so || codes.eo) {
    // over
    pclips.push(crossing((bounds.ymin - start.y) / (end.y - start.y), segment, -delta.y));
  }
  if (codes.su || codes.eu) {
    // under
    pclips.push(crossing((bounds.ymax - start.y) / (end.y - start.y), segment, delta.y));
  }
  if (codes.sl || codes.el) {
    // left
    pclips.push(crossing((bounds.xmin - start.x) / (end.x - start.x), segment, -delta.x));
  }
  if (codes.sr || codes.er) {
    // right
    pclips.push(crossing((bounds.xmax - start.x) / (end.x - start.x), segment, delta.x));
  }
  return pclips;
}
