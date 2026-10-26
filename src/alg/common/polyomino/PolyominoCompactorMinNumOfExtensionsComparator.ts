// SPDX-License-Identifier: EPL-2.0
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Java's private nested class `PolyominoCompactor.MinNumOfExtensionsComparator` (M15): sorts polyominoes by the
 * number of their extensions.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class MinNumOfExtensionsComparator {
  compare(o1: Polyomino, o2: Polyomino): number {
    const numExt1 = o1.getPolyominoExtensions().length;
    const numExt2 = o2.getPolyominoExtensions().length;

    if (numExt1 < numExt2) {
      return -1;
    }
    if (numExt1 === numExt2) {
      return 0;
    }
    return 1;
  }
}
