// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';

/**
 * Represents a unit to be post-processed. Java's private nested `ThresholdStrategy.Postprocessable` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/ThresholdStrategy.java:415
 */
export class ThresholdStrategyPostprocessable {
  /** the node whose block can potentially be moved. */
  free: LNode;
  /** whether `free` is the root node of its block. */
  isRoot: boolean;
  /** whether `free` has edges. */
  hasEdges = false;
  /** the edge that was selected to be straightened. */
  edge: LEdge | null = null;

  constructor(free: LNode, isRoot: boolean) {
    this.free = free;
    this.isRoot = isRoot;
  }
}
