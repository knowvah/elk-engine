// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Enumerates points in increasing order of the cost function |x|+|y| (the taxicab metric). Within one cost level the
 * positions form a spiral winding in the mathematical positive sense.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorManhattan.java
 */
export class SuccessorManhattan implements PolyominoSuccessor {
  apply(coords: Pair<number, number>, _poly: Polyomino): Pair<number, number> {
    const x = coords.getFirst() as number;
    const y = coords.getSecond() as number;

    if (x === 0 && y === 0) {
      return new Pair<number, number>(x, Int32.sub(y, 1));
    }
    return SuccessorManhattan.nextAwayFromOrigin(x, y);
  }

  /** The outer `else` arm of {@link apply}: the successor of any point other than (0,0). */
  private static nextAwayFromOrigin(x: number, y: number): Pair<number, number> {
    let newX = x;
    let newY = y;

    if (x === -1 && y <= 0) {
      newX = 0;
      newY = Int32.sub(newY, 2);
    } else {
      if (x <= 0 && y > 0) {
        newX = Int32.sub(newX, 1);
        newY = Int32.sub(newY, 1);
      } else {
        if (x >= 0 && y < 0) {
          newX = Int32.add(newX, 1);
          newY = Int32.add(newY, 1);
        } else {
          if (x > 0 && y >= 0) {
            newX = Int32.sub(newX, 1);
            newY = Int32.add(newY, 1);
          } else {
            newX = Int32.add(newX, 1);
            newY = Int32.sub(newY, 1);
          }
        }
      }
    }

    return new Pair<number, number>(newX, newY);
  }
}
