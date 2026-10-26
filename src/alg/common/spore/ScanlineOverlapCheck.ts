// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { fuzzyCompare } from '../../../guava/DoubleMath.js';
import * as Lists from '../../../guava/Lists.js';
import { Scanline } from '../compaction/Scanline.js';
import type { SVGImage } from '../utils/SVGImage.js';
import { InternalProperties } from './InternalProperties.js';
import type { IOverlapHandler } from './IOverlapHandler.js';
import type { Node } from './Node.js';
import { ScanlineOverlapCheckHandler } from './ScanlineOverlapCheckHandler.js';
import { ScanlineOverlapCheckTimestamp } from './ScanlineOverlapCheckTimestamp.js';

/**
 * Compares timestamps by the coordinate they stand for; at equal coordinates high precedes low.
 */
function overlapsScanlineComparator(p1: ScanlineOverlapCheckTimestamp, p2: ScanlineOverlapCheckTimestamp): number {
  // chose the corresponding coordinate
  let y1 = p1.node.rect.y;
  if (!p1.low) {
    y1 += p1.node.rect.height;
  }
  let y2 = p2.node.rect.y;
  if (!p2.low) {
    y2 += p2.node.rect.height;
  }

  // compare them ...
  const cmp = doubleCompare(y1, y2);

  // ... and if they are equal, sort low->high
  if (cmp === 0) {
    if (!p1.low && p2.low) {
      return -1;
    } else if (!p2.low && p1.low) {
      return 1;
    }
  }
  return cmp;
}

/**
 * Scanline-procedure to find overlapping nodes.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/ScanlineOverlapCheck.java
 */
export class ScanlineOverlapCheck {
  /** The function to apply to overlapping nodes. */
  private readonly overlapHandler: IOverlapHandler;

  /** SVG output for debugging. */
  private readonly svg: SVGImage;

  /**
   * Constructor.
   *
   * @param oh the function to apply to overlapping nodes
   * @param dbg an {@link SVGImage} to write debug output to. null to disable output
   */
  constructor(oh: IOverlapHandler, dbg: SVGImage) {
    this.svg = dbg;
    this.svg.addGroups('n', 'o', 'e');

    this.overlapHandler = oh;
  }

  /**
   * Executes a single sweep of the scanline.
   *
   * @param nodes the nodes to check
   */
  sweep(nodes: readonly Node[]): void {
    this.svg.clearGroup('n');
    this.svg.clearGroup('o');
    this.svg.clearGroup('e');

    // add all nodes twice (once for the lower, once for the upper border)
    const points: ScanlineOverlapCheckTimestamp[] = Lists.newArrayList();
    for (const n of nodes) {
      points.push(new ScanlineOverlapCheckTimestamp(n, true));
      points.push(new ScanlineOverlapCheckTimestamp(n, false));

      this.svg.g('n').addRect(n.rect, 'stroke="black" stroke-width="1" fill="none"');
    }

    this.svg.isave();

    const overlapsScanlineHandler = new ScanlineOverlapCheckHandler(this.overlapHandler, this.svg, (n1, n2) =>
      this.overlap(n1, n2),
    );
    overlapsScanlineHandler.init();
    Scanline.execute(points, overlapsScanlineComparator, overlapsScanlineHandler);

    this.svg.isave();
  }

  private overlap(n1: Node | null, n2: Node | null): boolean {
    if (n1 === null || n2 === null || n1 === n2) {
      return false;
    }
    return (
      fuzzyCompare(n1.rect.x, n2.rect.x + n2.rect.width, InternalProperties.FUZZINESS) < 0 &&
      fuzzyCompare(n2.rect.x, n1.rect.x + n1.rect.width, InternalProperties.FUZZINESS) < 0
    );
  }
}
