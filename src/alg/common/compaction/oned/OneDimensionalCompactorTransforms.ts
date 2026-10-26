// SPDX-License-Identifier: EPL-2.0
import type { CGraph } from './CGraph.js';

/**
 * Section of {@link OneDimensionalCompactor} (P1): the hitbox transformations and the group offsets
 * (`calculateGroupOffsets`, `mirrorHitboxes`, `transposeHitboxes`). Sections never import the facade.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/OneDimensionalCompactor.java
 */

/**
 * For each CGroup g of the CGroup to be compacted, calculates the offsets of
 * g's nodes. It shouldn't be necessary to call this method in the common case since it's either
 * called by the constructor or for certain direction changes in `changeDirection`.
 *
 * The method assures that a group's `reference` is always the left-most
 * element (i.e. the one with the lowest x-coordinate). As a consequence, all offsets
 * (in x) are positive.
 *
 * @param cGraph the graph
 */
export function calculateGroupOffsets(cGraph: CGraph): void {
  // for any pre-specified groups, deduce the offset of the elements
  for (const group of cGraph.cGroups) {
    group.reference = null as never;

    // find left-most element
    for (const n of group.cNodes) {
      n.cGroupOffset.reset();
      if ((group.reference as typeof n | null) === null || n.hitbox.x < group.reference.hitbox.x) {
        group.reference = n;
      }
    }

    // calculate offsets
    for (const n of group.cNodes) {
      n.cGroupOffset.x = n.hitbox.x - group.reference.hitbox.x;
      n.cGroupOffset.y = n.hitbox.y - group.reference.hitbox.y;
    }
  }
}

/**
 * Mirrors hitboxes horizontally.
 *
 * @param cGraph the graph
 */
export function mirrorHitboxes(cGraph: CGraph): void {
  for (const cNode of cGraph.cNodes) {
    cNode.hitbox.x = -cNode.hitbox.x - cNode.hitbox.width;
  }

  calculateGroupOffsets(cGraph);
}

/**
 * Transposes hitboxes.
 *
 * @param cGraph the graph
 */
export function transposeHitboxes(cGraph: CGraph): void {
  let tmp: number;
  for (const cNode of cGraph.cNodes) {
    tmp = cNode.hitbox.x;
    cNode.hitbox.x = cNode.hitbox.y;
    cNode.hitbox.y = tmp;

    tmp = cNode.hitbox.width;
    cNode.hitbox.width = cNode.hitbox.height;
    cNode.hitbox.height = tmp;

    tmp = cNode.cGroupOffset.x;
    cNode.cGroupOffset.x = cNode.cGroupOffset.y;
    cNode.cGroupOffset.y = tmp;
  }

  calculateGroupOffsets(cGraph);
}
