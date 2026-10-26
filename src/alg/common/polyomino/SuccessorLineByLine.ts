// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Enumerates points in increasing order of the cost function max(|x|, |y|) (Freivalds et al. 2002). If more than one
 * point shares the current minimum cost, they are traversed left to right, top to bottom.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorLineByLine.java
 */
export class SuccessorLineByLine implements PolyominoSuccessor {
  apply(coords: Pair<number, number>, _poly: Polyomino): Pair<number, number> {
    const x = coords.getFirst() as number;
    const y = coords.getSecond() as number;
    if (x >= 0) {
      if (x === y) {
        return new Pair<number, number>(Int32.sub(Int32.neg(x), 1), Int32.sub(Int32.neg(x), 1));
      }
      if (x === Int32.neg(y)) {
        return new Pair<number, number>(Int32.neg(x), Int32.add(y, 1));
      }
    }
    if (Math.abs(x) > Math.abs(y)) {
      if (x < 0) {
        return new Pair<number, number>(Int32.neg(x), y);
      }
      return new Pair<number, number>(Int32.neg(x), Int32.add(y, 1));
    }
    return new Pair<number, number>(Int32.add(x, 1), y);
  }
}
