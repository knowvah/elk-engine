// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../../java/lang/DoubleCompare.js';
import { Scanline } from '../Scanline.js';
import type { CNode } from './CNode.js';
import { CompareFuzzy } from './CompareFuzzy.js';
import type { IConstraintCalculationAlgorithm } from './IConstraintCalculationAlgorithm.js';
import type { OneDimensionalCompactor } from './OneDimensionalCompactor.js';
import { ConstraintsScanlineHandler } from './ScanlineConstraintCalculatorConstraintsScanlineHandler.js';
import { Timestamp } from './ScanlineConstraintCalculatorTimestamp.js';

/**
 * Scanline-procedure to calculate the constraint graph in O(nlogn) time, n being the number of
 * rectangles.
 *
 * The implementation is based on the Section 10.2.2.1.1.1 of the following book:
 * - Lengauer, T. (1990). Combinatorial algorithms for integrated circuit layout. John Wiley & Sons.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ScanlineConstraintCalculator.java
 */
export class ScanlineConstraintCalculator implements IConstraintCalculationAlgorithm {
  /**
   * The surrounding compactor object. (`protected` in Java, also read by the package-local handler;
   * TypeScript has no package access.)
   */
  compactor: OneDimensionalCompactor = null as never;

  /**
   * Can be used to sort the passed {@link Timestamp}s either based on their
   * {@link CNode}'s y-coordinate (low) or y-coordinate plus height (high).
   * If two positions are equal, the "high" value is sorted before the "low" value.
   * This implicates that **no** constraint is generated
   * for element that barely share a common y-value.
   */
  private readonly constraintsScanlineComparator = (p1: Timestamp, p2: Timestamp): number => {
    // chose the right coordinate
    let y1 = p1.node.hitbox.y;
    if (!p1.low) {
      y1 += p1.node.hitbox.height;
    }
    let y2 = p2.node.hitbox.y;
    if (!p2.low) {
      y2 += p2.node.hitbox.height;
    }

    // compare them ...
    const cmp = doubleCompare(y1, y2);

    // ... and if they are equal, sort low->high
    if (cmp === 0) {
      if (!p1.low && p2.low) {
        return -1;
      } else if (!p2.low && p1.low) {
        return 1;
      }
    }
    return cmp;
  };

  /** This compactor's instance of the scanline handler. */
  private readonly constraintsScanlineHandler: ConstraintsScanlineHandler = new ConstraintsScanlineHandler(this);

  calculateConstraints(theCompactor: OneDimensionalCompactor): void {
    this.compactor = theCompactor;

    // consider all nodes
    this.sweep(() => true);
  }

  /**
   * Executes a single sweep of the scanline, using {@link CNode}s that fulfill
   * `filterFun`.
   *
   * @param filterFun a predicate determining for a node n whether it should be included
   */
  protected sweep(filterFun: (node: CNode) => boolean): void {
    // add all nodes twice (once for the lower, once for the upper border)
    const points: Timestamp[] = [];
    for (const n of this.compactor.cGraph.cNodes) {
      if (filterFun(n)) {
        points.push(new Timestamp(n, true));
        points.push(new Timestamp(n, false));
      }
    }

    // reset internal state
    this.constraintsScanlineHandler.reset();

    // execute the scanline
    Scanline.execute(points, this.constraintsScanlineComparator, this.constraintsScanlineHandler);
  }

  /**
   * Private in Java, called by the handler (an inner class there).
   */
  overlap(n1: CNode | null, n2: CNode | null): boolean {
    if (n1 === null || n2 === null || n1 === n2) {
      return false;
    }
    return (
      CompareFuzzy.le(n1.hitbox.x, n2.hitbox.x + n2.hitbox.width) &&
      CompareFuzzy.le(n2.hitbox.x, n1.hitbox.x + n1.hitbox.width)
    );
  }
}
