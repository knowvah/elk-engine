// SPDX-License-Identifier: EPL-2.0
import type { CNode } from './CNode.js';
import { CompareFuzzy } from './CompareFuzzy.js';
import type { IConstraintCalculationAlgorithm } from './IConstraintCalculationAlgorithm.js';
import type { OneDimensionalCompactor } from './OneDimensionalCompactor.js';

/**
 * Creates a constraint between CNodes A and B if B collides with the right shadow of A considering
 * vertical spacing.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/QuadraticConstraintCalculation.java
 */
export class QuadraticConstraintCalculation implements IConstraintCalculationAlgorithm {
  calculateConstraints(compactor: OneDimensionalCompactor): void {
    // resetting constraints
    for (const cNode of compactor.cGraph.cNodes) {
      cNode.constraints.length = 0;
    }

    // inferring constraints from hitbox intersections
    for (const cNode1 of compactor.cGraph.cNodes) {
      for (const cNode2 of compactor.cGraph.cNodes) {
        // no self constraints
        if (cNode1 === cNode2) {
          continue;
        }
        // no constraints between nodes of the same group
        if (cNode1.cGroup !== null && cNode1.cGroup === cNode2.cGroup) {
          continue;
        }

        let spacing: number;
        if (compactor.direction.isHorizontal()) {
          // don't be confused: when compacting horizontally, the vertical spacing must
          // be considered when computing constraints
          spacing = compactor.spacingsHandler.getVerticalSpacing(cNode1, cNode2);
        } else {
          spacing = compactor.spacingsHandler.getHorizontalSpacing(cNode1, cNode2);
        }

        // add constraint if cNode2 is to the right of cNode1 and could collide if moved
        // horizontally
        if (QuadraticConstraintCalculation.collides(cNode1, cNode2, spacing)) {
          cNode1.constraints.push(cNode2);
        }
      }
    }
  }

  /** The condition of the Java `if` that adds the constraint, split off for the complexity limits. */
  private static collides(cNode1: CNode, cNode2: CNode, spacing: number): boolean {
    return (
      // '>' avoids simultaneous constraints A->B and B->A
      (cNode2.hitbox.x > cNode1.hitbox.x ||
        (cNode1.hitbox.x === cNode2.hitbox.x && cNode1.hitbox.width < cNode2.hitbox.width)) &&
      CompareFuzzy.gt(cNode2.hitbox.y + cNode2.hitbox.height + spacing, cNode1.hitbox.y) &&
      CompareFuzzy.lt(cNode2.hitbox.y, cNode1.hitbox.y + cNode1.hitbox.height + spacing)
    );
  }
}
