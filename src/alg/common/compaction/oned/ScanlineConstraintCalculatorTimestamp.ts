// SPDX-License-Identifier: EPL-2.0
import type { CNode } from './CNode.js';

/**
 * A timestamp in the sense of the scanline algorithm to determine the constraints of the
 * compaction graph. The scanline traverses the plane from top (negative infinity) to bottom
 * (positive infinity). Every timestamp (or point) it encounters either represents the upper (y)
 * or lower (y+height) border of a rectangle. Note that y is also denoted as "low" and y+height
 * as "high". Java's private nested class `ScanlineConstraintCalculator.Timestamp`, split into its
 * own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ScanlineConstraintCalculator.java
 */
export class Timestamp {
  readonly low: boolean;
  readonly node: CNode;

  constructor(node: CNode, low: boolean) {
    this.node = node;
    this.low = low;
  }
}
