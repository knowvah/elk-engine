// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Direction } from '../../../../core/options/Direction.js';
import { Quadruplet } from './Quadruplet.js';

describe('Quadruplet', () => {
  it('defaults to all false', () => {
    const q = new Quadruplet();
    expect([q.left, q.right, q.up, q.down]).toEqual([false, false, false, false]);
  });

  it('takes the four flags in left, right, up, down order', () => {
    const q = new Quadruplet(true, false, true, false);
    expect([q.left, q.right, q.up, q.down]).toEqual([true, false, true, false]);
  });

  it('set(l, r, u, d) overwrites all four flags', () => {
    const q = new Quadruplet(true, true, true, true);
    q.set(false, true, false, true);
    expect([q.left, q.right, q.up, q.down]).toEqual([false, true, false, true]);
  });

  it('set(value, direction) changes only that direction', () => {
    const cases: [Direction, [boolean, boolean, boolean, boolean]][] = [
      [Direction.LEFT, [true, false, false, false]],
      [Direction.RIGHT, [false, true, false, false]],
      [Direction.UP, [false, false, true, false]],
      [Direction.DOWN, [false, false, false, true]],
    ];
    for (const [direction, expected] of cases) {
      const q = new Quadruplet();
      q.set(true, direction);
      expect([q.left, q.right, q.up, q.down], direction.toString()).toEqual(expected);
    }
  });

  it('set(value, UNDEFINED) changes nothing', () => {
    const q = new Quadruplet(true, false, true, false);
    q.set(false, Direction.UNDEFINED);
    expect([q.left, q.right, q.up, q.down]).toEqual([true, false, true, false]);
  });

  it('get returns the flag of the direction and false for UNDEFINED', () => {
    const q = new Quadruplet(true, false, true, false);
    expect(q.get(Direction.LEFT)).toBe(true);
    expect(q.get(Direction.RIGHT)).toBe(false);
    expect(q.get(Direction.UP)).toBe(true);
    expect(q.get(Direction.DOWN)).toBe(false);
    expect(q.get(Direction.UNDEFINED)).toBe(false);
  });

  it('applyOr ors element-wise and leaves the argument alone', () => {
    const q = new Quadruplet(true, false, false, false);
    const other = new Quadruplet(false, false, true, false);
    q.applyOr(other);
    expect([q.left, q.right, q.up, q.down]).toEqual([true, false, true, false]);
    expect([other.left, other.right, other.up, other.down]).toEqual([false, false, true, false]);
  });
});
