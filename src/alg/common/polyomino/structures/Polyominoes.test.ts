// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Polyomino } from './Polyomino.js';
import { Polyominoes } from './Polyominoes.js';

/** A 3 x 3 ring of blocked cells with an empty center. */
function ring(): Polyomino {
  const poly = new Polyomino(3, 3);
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      if (x !== 1 || y !== 1) {
        poly.setBlocked(x, y);
      }
    }
  }
  return poly;
}

function size(holder: Polyominoes<Polyomino>): [number, number] {
  return [holder.getGrid().getWidth(), holder.getGrid().getHeight()];
}

describe('Polyominoes', () => {
  const polys = (): Polyomino[] => [new Polyomino(2, 3), new Polyomino(4, 1)];

  it('sizes the grid as 2 * (sum of sizes + first size) for aspect ratio 1', () => {
    // width (2 + 4 + 2) * 2 = 16, height (3 + 1 + 3) * 2 = 14
    expect(size(new Polyominoes(polys(), 1.0))).toEqual([16, 14]);
  });

  it('stretches the width for aspect ratios above 1', () => {
    expect(size(new Polyominoes(polys(), 2.0))).toEqual([32, 14]);
    expect(size(new Polyominoes(polys(), 1.1))).toEqual([18, 14]);
  });

  it('stretches the height for aspect ratios of at most 1', () => {
    expect(size(new Polyominoes(polys(), 0.5))).toEqual([16, 28]);
    expect(size(new Polyominoes(polys(), 0.75))).toEqual([16, 19]);
  });

  it('keeps the polyominoes in order and centers the grid', () => {
    const input = polys();
    const holder = new Polyominoes(input, 1.0);
    expect(holder.getPolyominoes()).toEqual(input);
    expect(holder.getPolyominoes()[1]).toBe(input[1]);
    expect(holder.getGrid().getCenterX()).toBe(7);
    expect(holder.getGrid().getCenterY()).toBe(6);
  });

  it('accepts any iterable and creates a 0 x 0 grid for none', () => {
    const holder = new Polyominoes(new Set<Polyomino>(), 1.0);
    expect(holder.getPolyominoes()).toEqual([]);
    expect(size(holder)).toEqual([0, 0]);
    expect(size(new Polyominoes(new Set([new Polyomino(1, 1)]), 1.0))).toEqual([4, 4]);
  });

  it('keeps holes by default and with fill = false', () => {
    const holder = new Polyominoes([ring()], 1.0);
    expect(holder.getPolyominoes()[0]!.isEmpty(1, 1)).toBe(true);
    const explicit = new Polyominoes([ring()], 1.0, false);
    expect(explicit.getPolyominoes()[0]!.isEmpty(1, 1)).toBe(true);
  });

  it('fills the holes with fill = true', () => {
    const holder = new Polyominoes([ring()], 1.0, true);
    expect(holder.getPolyominoes()[0]!.isBlocked(1, 1)).toBe(true);
  });
});
