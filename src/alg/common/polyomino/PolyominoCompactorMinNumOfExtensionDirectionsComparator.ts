// SPDX-License-Identifier: EPL-2.0
import type { Direction } from './structures/Direction.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Java's private nested class `PolyominoCompactor.MinNumOfExtensionDirectionsComparator` (M15): sorts polyominoes by
 * the number of their extension directions.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class MinNumOfExtensionDirectionsComparator {
  compare(o1: Polyomino, o2: Polyomino): number {
    const detectDirections = (polyExt: { getFirst(): Direction }): Direction => polyExt.getFirst();

    let dirSet = new Set<Direction>(o1.getPolyominoExtensions().map(detectDirections));
    const numDir1 = dirSet.size;

    dirSet = new Set<Direction>(o2.getPolyominoExtensions().map(detectDirections));
    const numDir2 = dirSet.size;

    if (numDir1 < numDir2) {
      return -1;
    }
    if (numDir1 === numDir2) {
      return 0;
    }
    return 1;
  }
}
