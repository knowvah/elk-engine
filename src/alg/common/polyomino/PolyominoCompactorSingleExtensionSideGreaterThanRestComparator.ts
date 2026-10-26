// SPDX-License-Identifier: EPL-2.0
import type { Direction } from './structures/Direction.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Java's private nested class `PolyominoCompactor.SingleExtensionSideGreaterThanRestComparator` (M15): partitions
 * polyominoes into those whose extensions all go one direction (greater) and all other cases (less).
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class SingleExtensionSideGreaterThanRestComparator {
  compare(o1: Polyomino, o2: Polyomino): number {
    const detectDirections = (polyExt: { getFirst(): Direction }): Direction => polyExt.getFirst();

    let dirSet = new Set<Direction>(o1.getPolyominoExtensions().map(detectDirections));
    let numDir1 = dirSet.size;

    dirSet = new Set<Direction>(o2.getPolyominoExtensions().map(detectDirections));
    let numDir2 = dirSet.size;

    // more and less than 1 Extensions are considered more minimal
    numDir1 = numDir1 === 1 ? 1 : 0;
    numDir2 = numDir2 === 1 ? 1 : 0;

    if (numDir1 < numDir2) {
      return -1;
    }
    if (numDir1 === numDir2) {
      return 0;
    }
    return 1;
  }
}
