// SPDX-License-Identifier: EPL-2.0
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import { Pair } from '../../../../core/util/Pair.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { SplineSegment } from '../../p5edges/splines/SplineSegment.js';
import { VerticalSegment } from './VerticalSegment.js';

// The spline sections of Java's `LGraphToCGraphTransformer`: `collectVerticalSegmentsSplines` and the control point
// adjustment of `applyLayout` (`adjustSplineControlPoints` and its two helpers), moved out of the class (file size
// limit). `nodesMap` is the transformer's map.

/** @returns the vertical segments of all splines of the graph. */
export function collectVerticalSegmentsSplines(layeredGraph: LGraph): VerticalSegment[] {
  const verticalSegments: VerticalSegment[] = [];

  for (const l of layeredGraph.getLayers()) {
    for (const n of l.getNodes()) {
      for (const out of n.getOutgoingEdges()) {
        const spline = out.getProperty(InternalProperties.SPLINE_ROUTE_START) as SplineSegment[] | null;
        if (spline === null) {
          continue;
        }
        let lastVs: VerticalSegment | null = null;
        for (const s of spline) {
          if (s.isStraight) {
            continue;
          }
          const leftTop = s.boundingBox.getTopLeft();
          const rightBottom = s.boundingBox.getBottomRight();

          const vs: VerticalSegment = new VerticalSegment(leftTop, rightBottom, null, s.edges.values().next().value!);
          vs.affectedBoundingBoxes.push(s.boundingBox);

          verticalSegments.push(vs);

          // remember that there has to be a constraint between the two (non-straight) segments
          if (lastVs !== null) {
            lastVs.constraints.push(vs);
          }
          lastVs = vs;
        }
      }
    }
  }

  return verticalSegments;
}

/**
 * Adjust the control points of the straight segments of the passed spline. The control points of non-straight
 * segments are directly represented by {@link CNode}s during compaction and thus adjusted during the compaction
 * process.
 */
export function adjustSplineControlPoints(spline: SplineSegment[], nodesMap: ReadonlyMap<LNode, CNode>): void {
  if (spline.length === 0) {
    return;
  }

  let lastSeg = spline[0]!;

  // first case: a signle segment
  if (spline.length === 1) {
    // the two indexes are selected such that the method's loop runs exactly once
    adjustControlPointBetweenSegments(lastSeg, lastSeg, 1, 0, { spline, nodesMap });
    return;
  }

  // ... more than one segment
  let i = 1;
  while (i < spline.length) {
    if (lastSeg.initialSegment || !lastSeg.isStraight) {
      // find the next non-straight segment (or the very last segment of this spline)
      const needle = firstNonStraightSegment(spline, i);
      if (needle !== null) {
        const j = needle.getFirst() as number;
        const nextSeg = needle.getSecond() as SplineSegment;

        adjustControlPointBetweenSegments(lastSeg, nextSeg, i, j, { spline, nodesMap });

        i = j + 1;
        lastSeg = nextSeg;
      }
    }
  }
}

/**
 * Finds the next non-straight segment of `spline`, starting at `index` (inclusive), or the very last segment of the
 * spline.
 *
 * @returns a {@link Pair} of the found segment's index and the segment. `null` if `index < 0 || index >= spline.size()`.
 */
function firstNonStraightSegment(spline: SplineSegment[], index: number): Pair<number, SplineSegment> | null {
  if (index < 0 || index >= spline.length) {
    return null;
  }
  for (let i = index; i < spline.length; ++i) {
    const seg = spline[i]!;
    if (i === spline.length - 1 || !seg.isStraight) {
      return Pair.of(i, seg);
    }
  }
  return null;
}

/** `n.hitbox.x + n.hitbox.width` of the CNode of `node`: the start of a straight initial segment. */
function rightEdgeOf(nodesMap: ReadonlyMap<LNode, CNode>, node: LNode | null): number {
  const n = nodesMap.get(node as LNode) as CNode;
  return n.hitbox.x + n.hitbox.width;
}

/** The spline and the transformer's node map, the two inputs Java's `adjustControlPointBetweenSegments` reads. */
interface SplineContext {
  readonly spline: SplineSegment[];
  readonly nodesMap: ReadonlyMap<LNode, CNode>;
}

/**
 * Adjust the control points of the sequence of spline segments `left, ..., right`. The `left` and `right` segments do
 * not have to be straight in which case they are dropped from the sequence and their positions remain unaltered. For
 * the remaining sequence of length `n`, the left-most and right-most coordinate of the straight path are determined.
 * The center control points of the sequence's segments are then distributed equidistantly on this path.
 */
function adjustControlPointBetweenSegments(
  left: SplineSegment,
  right: SplineSegment,
  leftIdx: number,
  rightIdx: number,
  context: SplineContext,
): void {
  const { spline, nodesMap } = context;

  // check if the initial segment of the spline is a straight one
  let startX: number;
  let idx1 = leftIdx;
  if (left.initialSegment && left.isStraight) {
    startX = rightEdgeOf(nodesMap, left.sourceNode);
    idx1--;
  } else {
    startX = left.boundingBox.x + left.boundingBox.width;
  }

  // ... the same for the last segment
  let endX: number;
  let idx2 = rightIdx;
  if (right.lastSegment && right.isStraight) {
    endX = (nodesMap.get(right.targetNode as LNode) as CNode).hitbox.x;
    idx2++;
  } else {
    endX = right.boundingBox.x;
  }

  // divide the available space into equidistant chunks
  const strip = endX - startX;
  const chunks = Math.max(2, idx2 - idx1);
  const chunk = strip / chunks;

  // apply new positions to the control points
  distributeControlPoints(spline, { idx1, idx2 }, startX, chunk);
}

/** The "apply new positions to the control points" loop of Java's `adjustControlPointBetweenSegments`. */
function distributeControlPoints(
  spline: SplineSegment[],
  range: { readonly idx1: number; readonly idx2: number },
  startX: number,
  chunk: number,
): void {
  let newPos = startX + chunk;
  for (let k = range.idx1; k < range.idx2; ++k) {
    const adjust = spline[k]!;
    const width = adjust.boundingBox.width;
    adjust.boundingBox.x = newPos - width / 2;

    newPos += chunk;
  }
}
