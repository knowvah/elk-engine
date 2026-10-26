// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Enumerates points in increasing order of the cost function max(|x|, |y|) (Freivalds et al. 2002). The order within
 * one cost level only looks random ("jittery"): it starts in the middle of each side clockwise and after each rotation
 * steps a step further to the corners where the sides meet. It is fully deterministic; no randomness is involved.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorJitter.java
 */
export class SuccessorJitter implements PolyominoSuccessor {
  apply(coords: Pair<number, number>, _poly: Polyomino): Pair<number, number> {
    const x = coords.getFirst() as number;
    const y = coords.getSecond() as number;

    let newX = x;
    let newY = y;

    const cost = Math.max(Math.abs(x), Math.abs(y));

    if (x <= 0 && x === y) {
      newX = 0;
      newY = Int32.sub(y, 1);
    } else {
      if (x === Int32.neg(cost) && y !== cost) {
        newX = y;
        newY = x;
        if (y >= 0) {
          newX = Int32.add(newX, 1);
        }
      } else {
        newX = Int32.neg(y);
        newY = x;
      }
    }
    return new Pair<number, number>(newX, newY);
  }
}
