// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { SVGImage } from '../utils/SVGImage.js';
import type { EventHandler } from '../compaction/ScanlineEventHandler.js';
import type { IOverlapHandler } from './IOverlapHandler.js';
import type { Node } from './Node.js';
import type { ScanlineOverlapCheckTimestamp } from './ScanlineOverlapCheckTimestamp.js';

/** Sorts left to right regarding left sides; ties by the (unique) original center point. */
function compareLeft(n1: Node, n2: Node): number {
  // sort left to right regarding left sides
  let cmp = doubleCompare(n1.rect.x, n2.rect.x);
  if (cmp !== 0) {
    return cmp;
  }
  // if they have the same x-coordinate, sort by center point, which is unique
  cmp = doubleCompare(n1.originalVertex.x, n2.originalVertex.x);
  if (cmp !== 0) {
    return cmp;
  }
  return doubleCompare(n1.originalVertex.y, n2.originalVertex.y);
}

/**
 * The part of Java's `TreeSet<Node>` the handler uses: a comparator-ordered set with `add` (false if a
 * comparator-equal element exists), `remove`, `clear` and ordered iteration.
 */
class SortedNodeSet implements Iterable<Node> {
  private elements: Node[] = [];

  /** Index of the first element not less than `n`. */
  private lowerBound(n: Node): number {
    let lo = 0;
    let hi = this.elements.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compareLeft(this.elements[mid] as Node, n) < 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  add(n: Node): boolean {
    const i = this.lowerBound(n);
    const existing = this.elements[i];
    if (existing !== undefined && compareLeft(existing, n) === 0) {
      return false;
    }
    this.elements.splice(i, 0, n);
    return true;
  }

  remove(n: Node): void {
    const i = this.lowerBound(n);
    const existing = this.elements[i];
    if (existing !== undefined && compareLeft(existing, n) === 0) {
      this.elements.splice(i, 1);
    }
  }

  clear(): void {
    this.elements = [];
  }

  [Symbol.iterator](): Iterator<Node> {
    return this.elements[Symbol.iterator]();
  }
}

/**
 * Implements the scanline procedure.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/ScanlineOverlapCheck.java
 */
export class ScanlineOverlapCheckHandler implements EventHandler<ScanlineOverlapCheckTimestamp> {
  /** This data structure tracks which nodes are currently on the scanline. */
  private readonly intervalsSortLeft = new SortedNodeSet();
  private readonly overlapHandler: IOverlapHandler;
  private readonly svg: SVGImage;
  /** The enclosing check's `overlap(n1, n2)`. */
  private readonly overlap: (n1: Node | null, n2: Node | null) => boolean;

  constructor(overlapHandler: IOverlapHandler, svg: SVGImage, overlap: (n1: Node | null, n2: Node | null) => boolean) {
    this.overlapHandler = overlapHandler;
    this.svg = svg;
    this.overlap = overlap;
  }

  /** Initialize internal data structures. */
  init(): void {
    this.intervalsSortLeft.clear();
  }

  handle(p: ScanlineOverlapCheckTimestamp): void {
    if (p.low) {
      this.insert(p);
    } else {
      this.delete(p);
    }
  }

  private insert(p: ScanlineOverlapCheckTimestamp): void {
    const success = this.intervalsSortLeft.add(p.node);
    if (!success) {
      throw new IllegalStateException('Invalid hitboxes for scanline overlap calculation.');
    }

    // find overlaps with rectangles on current scanline and apply the overlapHandler
    let overlapsFound = false;
    // have to start with first(left side) node because the last(right side) that does not overlap is not
    // necessarily the first candidate to overlap (there could be a wide node).
    for (const other of this.intervalsSortLeft) {
      if (this.overlap(p.node, other)) {
        this.overlapHandler.handle(p.node, other);
        this.svg.g('o').addRect(p.node.rect, 'stroke="none" fill="red" opacity="0.18"');
        this.svg.g('o').addRect(other.rect, 'stroke="none" fill="red" opacity="0.18"');
        this.svg.g('e').addLine(p.node.vertex.x, p.node.vertex.y, other.vertex.x, other.vertex.y, 'stroke="blue"');
        overlapsFound = true;
      } else if (overlapsFound) {
        break; // there cannot be any more overlaps because the set is sorted
      }
    }
  }

  private delete(p: ScanlineOverlapCheckTimestamp): void {
    this.intervalsSortLeft.remove(p.node);
  }
}
