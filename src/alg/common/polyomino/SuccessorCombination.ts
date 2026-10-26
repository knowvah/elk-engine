// SPDX-License-Identifier: EPL-2.0
import type { Pair } from '../../../core/util/Pair.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Computes the successor of a point (x, y) by combining two other traversal functions. `normalFun` is used on
 * polyominoes without external extensions, `externalFun` on polyominoes with external extensions.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorCombination.java
 */
export class SuccessorCombination implements PolyominoSuccessor {
  private normalFun: PolyominoSuccessor;
  private externalFun: PolyominoSuccessor;

  /**
   * @param normalFun traversal function used on polyominoes without external extensions
   * @param externalFun traversal function used on polyominoes with external extensions
   */
  constructor(normalFun: PolyominoSuccessor, externalFun: PolyominoSuccessor) {
    this.normalFun = normalFun;
    this.externalFun = externalFun;
  }

  apply(coords: Pair<number, number>, poly: Polyomino): Pair<number, number> {
    if (poly.getPolyominoExtensions().length > 0) {
      return this.externalFun.apply(coords, poly);
    } else {
      return this.normalFun.apply(coords, poly);
    }
  }
}
