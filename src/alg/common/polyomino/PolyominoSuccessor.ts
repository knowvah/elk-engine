// SPDX-License-Identifier: EPL-2.0
import type { Pair } from '../../../core/util/Pair.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Java's `BiFunction<Pair<Integer, Integer>, Polyomino, Pair<Integer, Integer>>` as used by the successor functions:
 * computes the next trial position from the current one. The successors are classes (not bare functions) because
 * `SuccessorQuadrantsGeneric` carries state between calls.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/PolyominoCompactor.java
 */
export interface PolyominoSuccessor {
  apply(coords: Pair<number, number>, poly: Polyomino): Pair<number, number>;
}
