// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Enumerates points in increasing order of the cost function max(|x|, |y|) (Freivalds et al. 2002). Within one cost
 * level the positions form a spiral winding in the mathematical positive sense.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorMaxNormWindingInMathPosSense.java
 */
export class SuccessorMaxNormWindingInMathPosSense implements PolyominoSuccessor {
  apply(coords: Pair<number, number>, _poly: Polyomino): Pair<number, number> {
    const x = coords.getFirst() as number;
    const y = coords.getSecond() as number;
    const cost = Math.max(Math.abs(x), Math.abs(y));
    if (x < cost && y === Int32.neg(cost)) {
      return new Pair<number, number>(Int32.add(x, 1), y);
    }
    if (x === cost && y < cost) {
      return new Pair<number, number>(x, Int32.add(y, 1));
    }
    if (x >= Int32.neg(cost) && y === cost) {
      return new Pair<number, number>(Int32.sub(x, 1), y);
    }
    // if (x == -cost && y > -cost)
    return new Pair<number, number>(x, Int32.sub(y, 1));
  }
}
