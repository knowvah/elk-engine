// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { ThresholdStrategy } from './ThresholdStrategy.js';
import { ThresholdStrategyPostprocessable as Postprocessable } from './ThresholdStrategyPostprocessable.js';

/** Java `Double.isInfinite` (`NaN` is not infinite). */
function isInfinite(v: number): boolean {
  return v === Number.POSITIVE_INFINITY || v === Number.NEGATIVE_INFINITY;
}

/** Java `ThresholdStrategy.THRESHOLD` (`Double.MAX_VALUE`, "TODO make this an option?!"). */
const THRESHOLD = Number.MAX_VALUE;
// Java `ThresholdStrategy.EPSILON` (0.0001) is only read by the two `assert` lines of `process`, which are omitted (N5).

/**
 * - Only calculates threshold for the first and last node of a block.
 * - Picks the first edge it encounters that is valid.
 *
 * Java's nested `ThresholdStrategy.SimpleThresholdStrategy` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/ThresholdStrategy.java:167
 */
export class ThresholdStrategySimpleThresholdStrategy extends ThresholdStrategy {
  calculateThreshold(oldThresh: number, blockRoot: LNode, currentNode: LNode): number {
    // just the root or last node of a block

    // Remember that for blocks with a single node both flags can be true
    const isRoot = blockRoot === currentNode;
    const isLast = this.bal.align[currentNode.id] === blockRoot;

    if (!(isRoot || isLast)) {
      return oldThresh;
    }

    // Remember two things:
    //  1) it is not guaranteed that adjacent nodes are already placed
    //  2) blocks can consist of a single node implying that the current
    //     node is both the root and the last node

    let t = oldThresh;
    if (this.bal.hdir === HDirection.RIGHT) {
      if (isRoot) {
        t = this.getBound(blockRoot, true);
      }
      if (isInfinite(t) && isLast) {
        t = this.getBound(currentNode, false);
      }
    } else {
      // LEFT
      if (isRoot) {
        t = this.getBound(blockRoot, true);
      }
      if (isInfinite(t) && isLast) {
        t = this.getBound(currentNode, false);
      }
    }

    return t;
  }

  /**
   * Only regards for root and last nodes of a block.
   *
   * @param pp the node, whether it is considered the root node of the current block (for a block that consists of a
   *        single node it is important to be able to regard it as root as well as as last node of a block)
   * @return `pp`, updated: if no valid edge was picked, its `edge` is `null` and its `hasEdges` indicates if there
   *         are possible candidate edges that might become valid at a later stage.
   */
  private pickEdge(pp: Postprocessable): Postprocessable {
    let edges: Iterable<LEdge>;
    if (pp.isRoot) {
      edges = this.bal.hdir === HDirection.RIGHT ? pp.free.getIncomingEdges() : pp.free.getOutgoingEdges();
    } else {
      edges = this.bal.hdir === HDirection.LEFT ? pp.free.getIncomingEdges() : pp.free.getOutgoingEdges();
    }

    let hasEdges = false;
    for (const e of edges) {
      // ignore in-layer edges unless the block is solely connected by in-layer edges
      //  rationale: With self-loops and feedback edges it can happen that blocks contain only dummy nodes,
      //  thus are not connected to other blocks by non-inlayer edges. To avoid unnecessarily long edges
      //  in these cases, such blocks are allowed to be handled here as well (to shorten the edges)
      const onlyDummies = this.bal.od[this.bal.root[pp.free.id]!.id]!;
      if (!onlyDummies && e.isInLayerEdge()) {
        continue;
      }

      // in order to straighten 'e' the block represented by 'pp.free'
      // would have to be moved. However, since that block is already
      // part of a straightened edge, it cannot be moved again
      if (this.bal.su[this.bal.root[pp.free.id]!.id]! || this.bal.su[this.bal.root[pp.free.id]!.id]!) {
        continue;
      }

      hasEdges = true;

      // if the other node does not have a position yet, ignore this edge
      if (this.blockFinished.has(this.bal.root[this.getOther(e, pp.free).id]!)) {
        pp.hasEdges = true;
        pp.edge = e;
        return pp;
      }
    }

    // no edge picked
    pp.hasEdges = hasEdges;
    pp.edge = null;
    return pp;
  }

  private getBound(blockNode: LNode, isRoot: boolean): number {
    const invalid = this.bal.vdir === VDirection.UP ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    const pick = this.pickEdge(new Postprocessable(blockNode, isRoot));

    // if edges exist but we couldn't find a good one
    if (pick.edge === null && pick.hasEdges) {
      this.postProcessablesQueue.push(pick);
      return invalid;
    } else if (pick.edge !== null) {
      const left = pick.edge.getSource()!;
      const right = pick.edge.getTarget()!;

      const threshold = isRoot ? this.rootThreshold(left, right) : this.lastThreshold(left, right);

      // we are not allowed to move this block anymore
      // in order to straighten another edge
      this.bal.su[this.bal.root[left.getNode()!.id]!.id] = true;
      this.bal.su[this.bal.root[right.getNode()!.id]!.id] = true;

      return threshold;
    }
    return invalid;
  }

  /** The `isRoot` branch of `getBound` (split from it for the complexity limits; Java `ThresholdStrategy.java:263`). */
  private rootThreshold(left: LPort, right: LPort): number {
    // We handle the root (first) node of a block here
    const rootPort = this.bal.hdir === HDirection.RIGHT ? right : left;
    const otherPort = this.bal.hdir === HDirection.RIGHT ? left : right;

    const otherRoot = this.bal.root[otherPort.getNode()!.id]!;
    return (
      this.bal.y[otherRoot.id]! +
      this.bal.innerShift[otherPort.getNode()!.id]! +
      otherPort.getPosition().y +
      otherPort.getAnchor().y -
      // root node
      this.bal.innerShift[rootPort.getNode()!.id]! -
      rootPort.getPosition().y -
      rootPort.getAnchor().y
    );
  }

  /** The `!isRoot` branch of `getBound` (split from it for the complexity limits; Java `ThresholdStrategy.java:279`). */
  private lastThreshold(left: LPort, right: LPort): number {
    // ... and the last node of a block here
    const rootPort = this.bal.hdir === HDirection.LEFT ? right : left;
    const otherPort = this.bal.hdir === HDirection.LEFT ? left : right;

    return (
      this.bal.y[this.bal.root[otherPort.getNode()!.id]!.id]! +
      this.bal.innerShift[otherPort.getNode()!.id]! +
      otherPort.getPosition().y +
      otherPort.getAnchor().y -
      // root node
      this.bal.innerShift[rootPort.getNode()!.id]! -
      rootPort.getPosition().y -
      rootPort.getAnchor().y
    );
  }

  postProcess(): void {
    // try original iteration order
    while (this.postProcessablesQueue.length > 0) {
      // first is the node, second whether it is regarded as root
      const pp = this.postProcessablesQueue.shift()!;
      const pick = this.pickEdge(pp);

      if (pick.edge === null) {
        continue;
      }

      const edge = pick.edge;

      // ignore in-layer edges
      const onlyDummies = this.bal.od[this.bal.root[pp.free.id]!.id]!;
      if (!onlyDummies && edge.isInLayerEdge()) {
        continue;
      }

      // try to straighten the edge ...
      const moved = this.process(pp);
      // if it wasn't possible try again later in the opposite iteration direction
      if (!moved) {
        this.postProcessablesStack.push(pp);
      }
    }

    // reversed iteration order
    while (this.postProcessablesStack.length > 0) {
      this.process(this.postProcessablesStack.pop()!);
    }
  }

  private process(pp: Postprocessable): boolean {
    // Java `assert pp.edge != null` (ThresholdStrategy.java:373) is omitted (N5).
    const edge = pp.edge!;
    let fix: LPort;
    if (edge.getSource()!.getNode() === pp.free) {
      fix = edge.getTarget()!;
    } else {
      fix = edge.getSource()!;
    }
    let block: LPort;
    if (edge.getSource()!.getNode() === pp.free) {
      block = edge.getSource()!;
    } else {
      block = edge.getTarget()!;
    }

    // t has to be the root node of a different block
    const delta = this.bal.calculateDelta(fix, block);

    if (delta > 0 && delta < THRESHOLD) {
      // target y larger than source y --> shift upwards?
      const availableSpace = this.bal.checkSpaceAbove(block.getNode()!, delta, this.ni);
      // Java `assert DoubleMath.fuzzyEquals(availableSpace, 0, EPSILON) || availableSpace >= 0` (ThresholdStrategy.java:395)
      // is omitted (N5).
      this.bal.shiftBlock(block.getNode()!, -availableSpace);
      return availableSpace > 0;
    } else if (delta < 0 && -delta < THRESHOLD) {
      // direction is up, we possibly shifted some blocks too far upward
      // for an edge to be straight, so check if we can shift down again
      const availableSpace = this.bal.checkSpaceBelow(block.getNode()!, -delta, this.ni);
      // Java `assert DoubleMath.fuzzyEquals(availableSpace, 0, EPSILON) || availableSpace >= 0` (ThresholdStrategy.java:403)
      // is omitted (N5).
      this.bal.shiftBlock(block.getNode()!, availableSpace);
      return availableSpace > 0;
    }

    return false;
  }
}
