// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import { compare as doubleCompare } from '../../../../java/lang/DoubleCompare.js';
import type { EventHandler } from '../ScanlineEventHandler.js';
import type { CNode } from './CNode.js';
import type { ScanlineConstraintCalculator } from './ScanlineConstraintCalculator.js';
import { TreeSet } from './ScanlineConstraintCalculatorTreeSet.js';
import type { Timestamp } from './ScanlineConstraintCalculatorTimestamp.js';

/**
 * Implements the scanline procedure as discussed by Lengauer. Java's private non-static inner class
 * `ScanlineConstraintCalculator.ConstraintsScanlineHandler`, split into its own file (M15); the
 * enclosing calculator is passed explicitly.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ScanlineConstraintCalculator.java
 */
export class ConstraintsScanlineHandler implements EventHandler<Timestamp> {
  private readonly outer: ScanlineConstraintCalculator;

  /**
   * Sorted set of intervals that allows to query for the left and right neighbor of an
   * interval. Sorted by the x coordinate of a {@link CNode}'s hitbox.
   *
   * Note: the methods to query for neighbor elements (e.g., `TreeSet.lower`)
   * are not constant time.
   *
   * Further note that it must not happen that two equal elements (equal in terms of the `compareTo` method)
   * are to be added to the set at the same time. For the given problem this would happen if two hitboxes
   * overlap vertically and share the same x coordinate. The implementation of `TreeSet` would
   * reject the adding of the second element. See the class's javadoc for further information.
   */
  private readonly intervals: TreeSet<CNode> = new TreeSet<CNode>((c1, c2) =>
    doubleCompare(c1.hitbox.x + c1.hitbox.width / 2, c2.hitbox.x + c2.hitbox.width / 2),
  );
  /** Candidate array with possible constraints. */
  private cand: (CNode | null)[] = [];

  constructor(outer: ScanlineConstraintCalculator) {
    this.outer = outer;
  }

  /**
   * Resets the internal data structures.
   */
  reset(): void {
    this.intervals.clear();
    const cNodes = this.outer.compactor.cGraph.cNodes;
    // new CNode[n]: filled with null
    this.cand = new Array<CNode | null>(cNodes.length).fill(null);
    let index = 0;
    for (const n of cNodes) {
      n.id = index++;
    }
  }

  handle(p: Timestamp): void {
    // System.out.println((p.low ? "insert " : "delete ") + " " + p.node);

    if (p.low) {
      this.insert(p);
    } else {
      this.delete(p);
    }
  }

  private insert(p: Timestamp): void {
    const success = this.intervals.add(p.node);
    if (!success) {
      throw new IllegalStateException('Invalid hitboxes for scanline constraint calculation.');
    }

    if (
      this.outer.overlap(p.node, this.intervals.floor(p.node)) ||
      this.outer.overlap(p.node, this.intervals.ceiling(p.node))
    ) {
      // System.err.println(p.node + " has overlap.") -- a diagnostic on the error stream only.
      console.error(`${p.node.toString()} has overlap.`);
    }

    this.cand[p.node.id] = this.intervals.lower(p.node);

    const right = this.intervals.higher(p.node);
    if (right !== null) {
      this.cand[right.id] = p.node;
    }
  }

  private delete(p: Timestamp): void {
    const left = this.intervals.lower(p.node);
    if (left !== null && left === this.cand[p.node.id]) {
      // different groups?
      if (left.cGroup !== null && left.cGroup !== p.node.cGroup) {
        left.constraints.push(p.node);
      }
    }

    const right = this.intervals.higher(p.node);
    if (right !== null && this.cand[right.id] === p.node) {
      // different groups?
      if (right.cGroup !== null && right.cGroup !== p.node.cGroup) {
        p.node.constraints.push(right);
      }
    }

    // we are done with you!
    this.intervals.remove(p.node);
  }
}
