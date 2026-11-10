// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../../../java/lang/DoubleCompare.js';
import type { EventHandler } from '../../recthull/ScanlineEventHandler.js';
import type { CNode } from '../CNode.js';
import type { ScanlineConstraintCalculator } from './ScanlineConstraintCalculator.js';
import { TreeSet } from './ScanlineConstraintCalculatorTreeSet.js';
import type { Timestamp } from './ScanlineConstraintCalculatorTimestamp.js';

/**
 * Implements the scanline procedure. Java's private non-static inner class
 * `ScanlineConstraintCalculator.ConstraintsScanlineHandler`, split into its own file; the
 * enclosing calculator is passed explicitly.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/algs/ScanlineConstraintCalculator.java
 */
export class ConstraintsScanlineHandler implements EventHandler<Timestamp> {
  private readonly outer: ScanlineConstraintCalculator;

  private readonly intervals: TreeSet<CNode> = new TreeSet<CNode>((c1, c2) =>
    doubleCompare(c1.hitbox.x + c1.hitbox.width / 2, c2.hitbox.x + c2.hitbox.width / 2),
  );
  private cand: (CNode | null)[] = [];

  constructor(outer: ScanlineConstraintCalculator) {
    this.outer = outer;
  }

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
    // System.out.println((p.low ? "insert " : "delete ") + " " + p.node.hitbox);

    if (p.low) {
      this.insert(p);
    } else {
      this.delete(p);
    }
  }

  private insert(p: Timestamp): void {
    this.intervals.add(p.node);

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
