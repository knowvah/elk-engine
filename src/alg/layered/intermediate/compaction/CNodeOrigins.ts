// SPDX-License-Identifier: EPL-2.0
import type { CNode } from '../../../common/compaction/oned/CNode.js';
import { LNode } from '../../graph/LNode.js';
import { VerticalSegment } from './VerticalSegment.js';

// The static helpers of HorizontalGraphCompactor live here so that the other classes of this package can call them
// without importing HorizontalGraphCompactor back (a module cycle through its static compaction algorithm field).
// HorizontalGraphCompactor re-exposes them under their Java names.

/**
 * @returns true if both passed nodes originate from the same (set) of {@link LEdge}.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
 */
export function isVerticalSegmentsOfSameEdge(cNode1: CNode, cNode2: CNode): boolean {
  const v1 = getVerticalSegmentOrNull(cNode1);
  const v2 = getVerticalSegmentOrNull(cNode2);
  return (
    // if we only want north/south segments we could use the following
    v1 !== null &&
    v2 !== null &&
    // this might seem quite expensive but in most cases the sets
    // contain only one element; !Collections.disjoint(a, b): some element is in both lists
    v1.representedLEdges.some((e) => v2.representedLEdges.includes(e))
  );
}

/**
 * @returns the represented {@link LNode} (if set as {@link CNode.origin}), or `null`.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
 */
export function getLNodeOrNull(cNode: CNode): LNode | null {
  if (cNode.origin instanceof LNode) {
    return cNode.origin;
  }
  return null;
}

/**
 * @returns the represented {@link VerticalSegment} (if set as {@link CNode.origin}), or `null`.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/compaction/HorizontalGraphCompactor.java
 */
export function getVerticalSegmentOrNull(cNode: CNode): VerticalSegment | null {
  if (cNode.origin instanceof VerticalSegment) {
    return cNode.origin;
  }
  return null;
}
