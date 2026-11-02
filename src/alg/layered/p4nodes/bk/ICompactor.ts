// SPDX-License-Identifier: EPL-2.0
import type { BKAlignedLayout } from './BKAlignedLayout.js';

/**
 * For documentation see `BKNodePlacer`.
 *
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/ICompactor.java
 */
export interface ICompactor {
  /**
   * In this step, actual coordinates are calculated for blocks and its nodes.
   *
   * First, all blocks are placed, trying to avoid any crossing of the blocks. Then, the blocks are shifted towards
   * each other if there is any space for compaction.
   *
   * @param bal One of the four layouts which shall be used in this step
   */
  horizontalCompaction(bal: BKAlignedLayout): void;
}
