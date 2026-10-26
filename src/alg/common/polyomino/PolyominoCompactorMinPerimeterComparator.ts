// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import type { PlanarGrid } from './structures/PlanarGrid.js';

/**
 * Java's private nested class `PolyominoCompactor.MinPerimeterComparator` (M15): sorts polyominoes by the length of
 * the perimeter of their bounding boxes.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class MinPerimeterComparator {
  compare(o1: PlanarGrid, o2: PlanarGrid): number {
    const halfPeri1 = Int32.add(o1.getWidth(), o1.getHeight());
    const halfPeri2 = Int32.add(o2.getWidth(), o2.getHeight());

    if (halfPeri1 < halfPeri2) {
      return -1;
    }
    if (halfPeri1 === halfPeri2) {
      return 0;
    }
    return 1;
  }
}
