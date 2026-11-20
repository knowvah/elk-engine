// SPDX-License-Identifier: EPL-2.0
// Shared by ProfileFill.test.ts and structures/Polyomino.test.ts.
import { Polyomino } from '../../src/alg/common/polyomino/structures/Polyomino.js';

/** Builds a polyomino from rows of `X` (blocked), `o` (weakly blocked) and `_` (empty). */
export function fromPattern(rows: readonly string[]): Polyomino {
  const poly = new Polyomino(rows[0]!.length, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === 'X') {
        poly.setBlocked(x, y);
      } else if (cell === 'o') {
        poly.setWeaklyBlocked(x, y);
      }
    });
  });
  return poly;
}
