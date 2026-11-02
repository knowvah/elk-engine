// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { ThresholdStrategy } from './ThresholdStrategy.js';

/**
 * `ThresholdStrategy` for the classic compaction phase of the original bk algorithm. It calculates a threshold value
 * such that it has no effect. Java's nested `ThresholdStrategy.NullThresholdStrategy` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/ThresholdStrategy.java:144
 */
export class ThresholdStrategyNullThresholdStrategy extends ThresholdStrategy {
  calculateThreshold(_oldThresh: number, _blockRoot: LNode, _currentNode: LNode): number {
    if (this.bal.vdir === VDirection.UP) {
      // new value calculated using min(a,thresh) --> thresh = +infty has no effect
      return Number.POSITIVE_INFINITY;
    } else {
      return Number.NEGATIVE_INFINITY;
    }
  }

  postProcess(): void {
    // intentionally empty, as in Java
  }
}
