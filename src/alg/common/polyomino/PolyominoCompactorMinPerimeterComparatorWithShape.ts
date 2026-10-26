// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../java/lang/Int32.js';
import type { PlanarGrid } from './structures/PlanarGrid.js';

/**
 * Java's private nested class `PolyominoCompactor.MinPerimeterComparatorWithShape` (M15): like the perimeter
 * comparator, but preferring polyominoes with the shortest short sides.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export class MinPerimeterComparatorWithShape {
  compare(o1: PlanarGrid, o2: PlanarGrid): number {
    let width = o1.getWidth();
    let height = o1.getHeight();

    if (width < height) {
      width = Int32.mul(width, width);
    } else {
      height = Int32.mul(height, height);
    }

    const val1 = Int32.add(width, height);

    width = o2.getWidth();
    height = o2.getHeight();

    if (width < height) {
      width = Int32.mul(width, width);
    } else {
      height = Int32.mul(height, height);
    }

    const val2 = Int32.add(width, height);

    if (val1 < val2) {
      return -1;
    }
    if (val1 === val2) {
      return 0;
    }
    return 1;
  }
}
