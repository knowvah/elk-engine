// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import * as Lists from '../../../../guava/Lists.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import type { BKAlignedLayout } from './BKAlignedLayout.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';
import type { ThresholdStrategyPostprocessable as Postprocessable } from './ThresholdStrategyPostprocessable.js';

/**
 * The strategies that decide which threshold a block is placed against. Subclasses are `NullThresholdStrategy` and
 * `SimpleThresholdStrategy` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/ThresholdStrategy.java
 */
export abstract class ThresholdStrategy {
  // Java's private constants `THRESHOLD` and `EPSILON` live with their only user, `SimpleThresholdStrategy`.

  /** The currently processed layout with its iteration directions. */
  protected bal!: BKAlignedLayout;

  /** The precalculated neighborhood information. */
  protected ni!: NeighborhoodInformation;

  /** We keep track of which blocks have been completely finished (membership only, N7). */
  protected blockFinished: Set<LNode> = new Set<LNode>();

  /** A queue with blocks that are postponed during compaction. */
  protected postProcessablesQueue: Postprocessable[] = Lists.newLinkedList<Postprocessable>();

  /** A stack that is used to treat postponed nodes in reversed order. */
  protected postProcessablesStack: Postprocessable[] = [];

  /**
   * Resets the internal state.
   *
   * @param theBal The currently processed layout with its iteration directions.
   * @param theNi The precalculated neighborhood information of the graph.
   */
  init(theBal: BKAlignedLayout, theNi: NeighborhoodInformation): void {
    this.bal = theBal;
    this.ni = theNi;
    this.blockFinished.clear();
    this.postProcessablesQueue.length = 0;
    this.postProcessablesStack.length = 0;
  }

  /**
   * Marks the block of which `n` is the root to be completely placed.
   *
   * @param n the root of a block.
   */
  finishBlock(n: LNode): void {
    this.blockFinished.add(n);
  }

  /*
   * ------------------------------------------------
   *  Methods to be implemented by deriving classes.
   * ------------------------------------------------
   */

  /**
   * @param oldThresh an old, previously calculated threshold value
   * @param blockRoot the root node of the current block being placed
   * @param currentNode the currently processed node of a block. This can be equal to `blockRoot`.
   * @return a threshold value representing a bound that would allow an additional edge to be drawn straight.
   */
  abstract calculateThreshold(oldThresh: number, blockRoot: LNode, currentNode: LNode): number;

  /**
   * Handle nodes that have been marked as having potential to lead to further straight edges after all blocks were
   * initially placed.
   */
  abstract postProcess(): void;

  /**
   * @param edge the edge for which the node is requested.
   * @param n a node edge is connected to.
   * @return for an edge `(o,n)`, return `o`.
   */
  protected getOther(edge: LEdge, n: LNode): LNode {
    if (edge.getSource()!.getNode() === n) {
      return edge.getTarget()!.getNode()!;
    } else if (edge.getTarget()!.getNode() === n) {
      return edge.getSource()!.getNode()!;
    } else {
      throw new IllegalArgumentException(`Node ${String(n)} is neither source nor target of edge ${String(edge)}`);
    }
  }
}
