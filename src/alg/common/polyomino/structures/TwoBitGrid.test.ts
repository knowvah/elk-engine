// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import { TwoBitGrid } from './TwoBitGrid.js';

const WIDTH = 35;
const HEIGHT = 3;
const SIGN_BIT = -(2n ** 63n);

type Setter = 'setEmpty' | 'setBlocked' | 'setWeaklyBlocked';
const VALUES: readonly (readonly [Setter, [boolean, boolean, boolean]])[] = [
  ['setEmpty', [true, false, false]],
  ['setBlocked', [false, true, false]],
  ['setWeaklyBlocked', [false, false, true]],
];

function state(grid: TwoBitGrid, x: number, y: number): [boolean, boolean, boolean] {
  return [grid.isEmpty(x, y), grid.isBlocked(x, y), grid.isWeaklyBlocked(x, y)];
}

/** The packed words of row `y` (Java `grid[y]`, 64-bit signed words). */
function words(grid: TwoBitGrid, y: number): bigint[] {
  return (grid as unknown as { grid: bigint[][] }).grid[y]!;
}

describe('TwoBitGrid', () => {
  it('reports its dimensions and allocates ceil(width / 32) words per row', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    expect(grid.getWidth()).toBe(35);
    expect(grid.getHeight()).toBe(3);
    expect(words(grid, 0)).toEqual([0n, 0n]);
    expect(words(new TwoBitGrid(64, 2), 1)).toEqual([0n, 0n]);
    expect(new TwoBitGrid().getWidth()).toBe(0);
  });

  it('starts empty everywhere', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    expect(state(grid, 0, 0)).toEqual([true, false, false]);
    expect(state(grid, 34, 2)).toEqual([true, false, false]);
  });

  it('tests the bounds', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    expect(grid.inBounds(0, 0)).toBe(true);
    expect(grid.inBounds(34, 2)).toBe(true);
    expect(grid.inBounds(-1, 0)).toBe(false);
    expect(grid.inBounds(0, -1)).toBe(false);
    expect(grid.inBounds(34, 3)).toBe(false);
    expect(grid.inBounds(35, 2)).toBe(false);
  });

  it.each([14, 15, 16, 17, 30, 31, 32, 33])('stores every value at cell %i and leaves its neighbours alone', (x) => {
    for (const [setter, expected] of VALUES) {
      const grid = new TwoBitGrid(WIDTH, HEIGHT);
      grid[setter](x, 1);
      expect(state(grid, x, 1)).toEqual(expected);
      for (const other of [x - 1, x + 1]) {
        expect(state(grid, other, 1)).toEqual([true, false, false]);
      }
      expect(state(grid, x, 0)).toEqual([true, false, false]);
    }
  });

  it('packs cell x into bits 2*(x%32) and 2*(x%32)+1 of word x>>5', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    grid.setBlocked(15, 0);
    grid.setWeaklyBlocked(16, 0);
    // cells 15 and 16 share word 0 (32 cells per word): bit 30 and bit 33
    expect(words(grid, 0)).toEqual([(1n << 30n) | (2n << 32n), 0n]);
    grid.setBlocked(32, 1);
    grid.setWeaklyBlocked(34, 1);
    expect(words(grid, 1)).toEqual([0n, 1n | (2n << 4n)]);
  });

  it('uses the sign bit of the 64-bit word for cell 31', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    grid.setWeaklyBlocked(31, 0);
    expect(words(grid, 0)[0]).toBe(SIGN_BIT);
    expect(grid.isWeaklyBlocked(31, 0)).toBe(true);
    expect(grid.isBlocked(31, 0)).toBe(false);
    grid.setBlocked(31, 0);
    expect(words(grid, 0)[0]).toBe(1n << 62n);
    expect(state(grid, 31, 0)).toEqual([false, true, false]);
    grid.setEmpty(31, 0);
    expect(words(grid, 0)[0]).toBe(0n);
  });

  it('overwrites the previous value completely', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    grid.setWeaklyBlocked(5, 2);
    grid.setBlocked(5, 2);
    expect(state(grid, 5, 2)).toEqual([false, true, false]);
    grid.setWeaklyBlocked(5, 2);
    expect(state(grid, 5, 2)).toEqual([false, false, true]);
    grid.setEmpty(5, 2);
    expect(state(grid, 5, 2)).toEqual([true, false, false]);
  });

  it('reinitialize replaces size and contents', () => {
    const grid = new TwoBitGrid(WIDTH, HEIGHT);
    grid.setBlocked(3, 1);
    grid.reinitialize(10, 2);
    expect(grid.getWidth()).toBe(10);
    expect(grid.getHeight()).toBe(2);
    expect(state(grid, 3, 1)).toEqual([true, false, false]);
    expect(words(grid, 0)).toEqual([0n]);
  });

  describe('out of range access', () => {
    const message = (x: number, y: number): string =>
      `Grid is only of size 35*3. Requested point (${x}, ${y}) is out of bounds.`;

    it('throws IndexOutOfBoundsException from the getters when the word or row does not exist', () => {
      const grid = new TwoBitGrid(WIDTH, HEIGHT);
      expect(() => grid.isEmpty(64, 0)).toThrow(new IndexOutOfBoundsException(message(64, 0)));
      expect(() => grid.isBlocked(0, 3)).toThrow(new IndexOutOfBoundsException(message(0, 3)));
      expect(() => grid.isWeaklyBlocked(-1, 0)).toThrow(new IndexOutOfBoundsException(message(-1, 0)));
      expect(() => grid.isEmpty(0, -1)).toThrow(IndexOutOfBoundsException);
    });

    it('answers for x beyond the width while it is inside the last word (Java reads the padding bits)', () => {
      const grid = new TwoBitGrid(WIDTH, HEIGHT);
      expect(grid.isEmpty(35, 0)).toBe(true);
      expect(grid.isBlocked(63, 2)).toBe(false);
    });

    it('rejects every x >= width in the setters, even inside the last word', () => {
      const grid = new TwoBitGrid(WIDTH, HEIGHT);
      expect(() => grid.setBlocked(35, 0)).toThrow(new IndexOutOfBoundsException(message(35, 0)));
      expect(() => grid.setWeaklyBlocked(100, 1)).toThrow(new IndexOutOfBoundsException(message(100, 1)));
      expect(() => grid.setEmpty(-1, 0)).toThrow(new IndexOutOfBoundsException(message(-1, 0)));
      expect(() => grid.setEmpty(0, 3)).toThrow(new IndexOutOfBoundsException(message(0, 3)));
      expect(() => grid.setBlocked(0, -1)).toThrow(new IndexOutOfBoundsException(message(0, -1)));
    });

    it('does not write when the row is out of range', () => {
      const grid = new TwoBitGrid(WIDTH, HEIGHT);
      expect(() => grid.setBlocked(1, 3)).toThrow(IndexOutOfBoundsException);
      expect(words(grid, 0)).toEqual([0n, 0n]);
    });

    it('treats a zero-width grid as having no cells', () => {
      const grid = new TwoBitGrid(0, 2);
      expect(() => grid.isEmpty(0, 0)).toThrow(IndexOutOfBoundsException);
    });
  });

  it('prints the grid with a coordinate system (digits wrap after 9)', () => {
    const grid = new TwoBitGrid(3, 2);
    grid.setBlocked(0, 0);
    grid.setWeaklyBlocked(1, 1);
    expect(grid.toString()).toBe(' 012\n0X__\n1_0_');
    expect(new TwoBitGrid(11, 1).toString()).toBe(' 01234567890\n0___________');
    expect(new TwoBitGrid(0, 0).toString()).toBe(' ');
  });
});
