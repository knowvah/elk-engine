// SPDX-License-Identifier: EPL-2.0
import { compare as doubleCompare } from '../../../../../java/lang/DoubleCompare.js';
import { Scanline } from '../../recthull/Scanline.js';
import type { CNode } from '../CNode.js';
import type { OneDimensionalCompactor } from '../OneDimensionalCompactor.js';
import type { IConstraintCalculationAlgorithm } from './IConstraintCalculationAlgorithm.js';
import { ConstraintsScanlineHandler } from './ScanlineConstraintCalculatorConstraintsScanlineHandler.js';
import { Timestamp } from './ScanlineConstraintCalculatorTimestamp.js';

/** Hitbox adjustment per side (Java `private static final double EPSILON`). */
const EPSILON = 0.5;

/**
 * Scanline-procedure to calculate the constraint graph in O(nlogn) time, n being the number of
 * rectangles.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/algs/ScanlineConstraintCalculator.java
 */
export class ScanlineConstraintCalculator implements IConstraintCalculationAlgorithm {
  /**
   * The surrounding compactor object. (`protected` in Java, also read by the package-local handler;
   * TypeScript has no package access.)
   */
  compactor: OneDimensionalCompactor = null as never;

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

    // consider all nodes, do not add spacing
    this.sweep(
      () => true,
      () => 0.0,
    );
  }

  /**
   * Executes a single sweep of the scanline, using {@link CNode}s that fulfill `filterFun`; hitboxes
   * are blown up by `spacingFun` for the sweep.
   *
   * @param filterFun a predicate determining for a node n whether it should be included
   * @param spacingFun the spacing to add to a node
   */
  protected sweep(filterFun: (node: CNode) => boolean, spacingFun: (node: CNode) => number): void {
    this.blowUpHitboxes(filterFun, spacingFun);

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

    this.normalizeHitboxes(filterFun, spacingFun);
  }

  private blowUpHitboxes(filter: (node: CNode) => boolean, spacingFun: (node: CNode) => number): void {
    for (const n of this.compactor.cGraph.cNodes) {
      if (!filter(n)) {
        continue;
      }

      const spacing = spacingFun(n);

      if (spacing > 0) {
        if (this.spacesFirstSide(n)) {
          n.hitbox.y -= Math.max(0, spacing / 2 - EPSILON);
        }
        if (this.spacesSecondSide(n)) {
          n.hitbox.height += Math.max(0, spacing - 2 * EPSILON);
        }
      }
    }
  }

  private normalizeHitboxes(filter: (node: CNode) => boolean, spacingFun: (node: CNode) => number): void {
    for (const n of this.compactor.cGraph.cNodes) {
      if (!filter(n)) {
        continue;
      }

      const spacing = spacingFun(n);

      if (spacing > 0) {
        if (this.spacesFirstSide(n)) {
          n.hitbox.y += Math.max(0, spacing / 2 - EPSILON);
        }
        if (this.spacesSecondSide(n)) {
          n.hitbox.height -= spacing - 2 * EPSILON;
        }
      }
    }
  }

  /**
   * The condition of the first Java `if` in `blowUpHitboxes` and `normalizeHitboxes` (verbatim, the
   * same text in both), split off for the complexity limits.
   */
  private spacesFirstSide(n: CNode): boolean {
    return (
      !(this.compactor.direction.isHorizontal() && n.spacingIgnore.up) &&
      !(this.compactor.direction.isVertical() && n.spacingIgnore.left)
    );
  }

  /** The condition of the second Java `if` of both methods, split off like {@link spacesFirstSide}. */
  private spacesSecondSide(n: CNode): boolean {
    return (
      !(this.compactor.direction.isHorizontal() && n.spacingIgnore.down) &&
      !(this.compactor.direction.isVertical() && n.spacingIgnore.right)
    );
  }
}
