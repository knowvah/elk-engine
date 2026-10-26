// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UniqueTriple } from '../../utils/UniqueTriple.js';
import { Direction } from './Direction.js';
import { Polyomino } from './Polyomino.js';

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

describe('Polyomino', () => {
  it('is built from a cell pattern', () => {
    const poly = fromPattern(['X_o', '_X_']);
    expect(poly.getWidth()).toBe(3);
    expect(poly.getHeight()).toBe(2);
    expect(poly.toString()).toBe(' 012\n0X_0\n1_X_');
    expect(poly.isBlocked(0, 0)).toBe(true);
    expect(poly.isWeaklyBlocked(2, 0)).toBe(true);
    expect(poly.getCenterX()).toBe(1);
    expect(poly.getCenterY()).toBe(0);
  });

  it('starts at position (0, 0) and stores a new one', () => {
    const poly = new Polyomino(2, 2);
    expect([poly.getX(), poly.getY()]).toEqual([0, 0]);
    poly.setX(5);
    poly.setY(-3);
    expect([poly.getX(), poly.getY()]).toEqual([5, -3]);
  });

  it('is empty and has no extensions without arguments', () => {
    const poly = new Polyomino();
    expect([poly.getWidth(), poly.getHeight()]).toEqual([0, 0]);
    expect(poly.getPolyominoExtensions()).toEqual([]);
  });

  it('keeps the given extension list and appends to it', () => {
    const initial = new UniqueTriple(Direction.WEST, 1, 2);
    const extensions = [initial];
    const poly = new Polyomino(3, 3, extensions);
    expect(poly.getPolyominoExtensions()).toBe(extensions);
    poly.addExtension(Direction.NORTH, 0, 3);
    const added = poly.getPolyominoExtensions()[1]!;
    expect(poly.getPolyominoExtensions()).toHaveLength(2);
    expect([added.getFirst(), added.getSecond(), added.getThird()]).toEqual([Direction.NORTH, 0, 3]);
    expect(poly.getPolyominoExtensions()[0]).toBe(initial);
  });

  it('gives every polyomino its own default extension list', () => {
    const a = new Polyomino(1, 1);
    const b = new Polyomino(1, 1);
    a.addExtension(Direction.EAST, 0, 1);
    expect(a.getPolyominoExtensions()).toHaveLength(1);
    expect(b.getPolyominoExtensions()).toHaveLength(0);
  });
});
