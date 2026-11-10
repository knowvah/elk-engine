// SPDX-License-Identifier: EPL-2.0
import type { CNode } from '../CNode.js';

/**
 * A timestamp in the sense of the scanline algorithm to determine the constraints of the
 * compaction graph. Every timestamp (or point) the scanline encounters either represents the upper
 * (y) or lower (y+height) border of a rectangle. Java's private nested class
 * `ScanlineConstraintCalculator.Timestamp`, split into its own file.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/algs/ScanlineConstraintCalculator.java
 */
export class Timestamp {
  readonly low: boolean;
  readonly node: CNode;

  constructor(node: CNode, low: boolean) {
    this.node = node;
    this.low = low;
  }
}
