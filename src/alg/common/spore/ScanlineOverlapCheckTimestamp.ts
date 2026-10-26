// SPDX-License-Identifier: EPL-2.0
import type { Node } from './Node.js';

/**
 * A timestamp in the sense of the scanline algorithm captures where a node begins and ends to determine overlaps.
 * The scanline traverses the plane from top (negative infinity) to bottom
 * (positive infinity). Every timestamp (or point) it encounters either represents the upper (y)
 * or lower (y+height) border of a rectangle. Note that y is also denoted as "low" and y+height
 * as "high".
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/ScanlineOverlapCheck.java
 */
export class ScanlineOverlapCheckTimestamp {
  readonly low: boolean;
  readonly node: Node;

  constructor(node: Node, low: boolean) {
    this.node = node;
    this.low = low;
  }
}
