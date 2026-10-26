// SPDX-License-Identifier: EPL-2.0
import type { Direction } from './structures/Direction.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Java's private nested class `PolyominoCompactor.CornerCasesGreaterThanRestComparator` (M15): partitions polyominoes
 * into those whose extensions go two orthogonal directions (one horizontal, one vertical; greater) and all other
 * cases (less).
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class CornerCasesGreaterThanRestComparator {
  compare(o1: Polyomino, o2: Polyomino): number {
    const detectDirections = (polyExt: { getFirst(): Direction }): Direction => polyExt.getFirst();
    const countHorizontal = (dirs: Set<Direction>): number => [...dirs].filter((x) => x.isHorizontal()).length;

    let dirSet = new Set<Direction>(o1.getPolyominoExtensions().map(detectDirections));
    let numDir1 = dirSet.size;
    // more and less than 2 Extensions are considered more minimal
    numDir1 = numDir1 === 2 ? 1 : 0;
    if (numDir1 === 1) {
      if (countHorizontal(dirSet) % 2 === 0) {
        // Both extensions are horizontal or vertical and thus not a "corner" case
        numDir1 = 0;
      }
    }

    dirSet = new Set<Direction>(o2.getPolyominoExtensions().map(detectDirections));
    let numDir2 = dirSet.size;
    // more and less than 2 Extensions are considered more minimal
    numDir2 = numDir2 === 2 ? 1 : 0;
    if (numDir2 === 1) {
      if (countHorizontal(dirSet) % 2 === 0) {
        // Both extensions are horizontal or vertical and thus not a "corner" case
        numDir2 = 0;
      }
    }

    if (numDir1 < numDir2) {
      return -1;
    }
    if (numDir1 === numDir2) {
      return 0;
    }
    return 1;
  }
}
