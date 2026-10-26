// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ProfileFill } from './ProfileFill.js';
import { Polyomino } from './structures/Polyomino.js';

/** Builds a polyomino from rows of `X` (blocked), `o` (weakly blocked) and `_` (empty). */
function fromPattern(rows: readonly string[]): Polyomino {
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

/** The pattern of the polyomino, `X` for blocked and `_` for every other cell. */
function rowsOf(poly: Polyomino): string[] {
  return Array.from({ length: poly.getHeight() }, (_, y) =>
    Array.from({ length: poly.getWidth() }, (__, x) => (poly.isBlocked(x, y) ? 'X' : '_')).join(''),
  );
}

describe('ProfileFill.fillPolyomino', () => {
  it('fills an enclosed hole of a concave shape', () => {
    const poly = fromPattern(['_XXX_', 'X___X', '_XXX_']);
    ProfileFill.fillPolyomino(poly);
    expect(rowsOf(poly)).toEqual(['_XXX_', 'XXXXX', '_XXX_']);
  });

  it('fills a larger hole inside a ring', () => {
    const poly = fromPattern(['XXXXX', 'X___X', 'X_X_X', 'X___X', 'XXXXX']);
    ProfileFill.fillPolyomino(poly);
    expect(rowsOf(poly)).toEqual(['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX']);
  });

  it('leaves open concavities alone', () => {
    const rows = ['X___X', 'X___X', 'XXXXX'];
    const poly = fromPattern(rows);
    ProfileFill.fillPolyomino(poly);
    expect(rowsOf(poly)).toEqual(rows);
  });

  it('fills the unintended cell of an unconnected shape (documented limit)', () => {
    const poly = fromPattern(['_XXX_X', 'X_X__X', '_XXX__']);
    ProfileFill.fillPolyomino(poly);
    // (1,1) is the hole; (3,1) has X above, below, west and east, so it is filled as well; (4,1) has none
    expect(rowsOf(poly)).toEqual(['_XXX_X', 'XXXX_X', '_XXX__']);
  });

  it('ignores weakly blocked cells when computing the profiles', () => {
    const poly = fromPattern(['_XXX_', 'XoooX', '_XXX_']);
    ProfileFill.fillPolyomino(poly);
    expect(rowsOf(poly)).toEqual(['_XXX_', 'XXXXX', '_XXX_']);
  });

  it('handles empty and cell-free polyominoes', () => {
    const empty = new Polyomino();
    ProfileFill.fillPolyomino(empty);
    expect(empty.getWidth()).toBe(0);
    const blank = fromPattern(['___', '___']);
    ProfileFill.fillPolyomino(blank);
    expect(rowsOf(blank)).toEqual(['___', '___']);
  });
});
