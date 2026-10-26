// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TreeSet } from './ScanlineConstraintCalculatorTreeSet.js';

const numbers = (...values: number[]): TreeSet<number> => {
  const set = new TreeSet<number>((a, b) => a - b);
  for (const v of values) set.add(v);
  return set;
};

describe('TreeSet (scanline stand-in)', () => {
  it('rejects a comparator-equal element and keeps the first', () => {
    const set = new TreeSet<{ k: number; tag: string }>((a, b) => a.k - b.k);
    const first = { k: 1, tag: 'first' };
    expect(set.add(first)).toBe(true);
    expect(set.add({ k: 1, tag: 'second' })).toBe(false);
    expect(set.ceiling({ k: 1, tag: 'probe' })).toBe(first);
  });

  it('navigates from a member', () => {
    const set = numbers(30, 10, 20);
    expect(set.lower(20)).toBe(10);
    expect(set.higher(20)).toBe(30);
    expect(set.floor(20)).toBe(20);
    expect(set.ceiling(20)).toBe(20);
    expect(set.lower(10)).toBeNull();
    expect(set.higher(30)).toBeNull();
  });

  it('navigates from a non-member', () => {
    const set = numbers(10, 20, 30);
    expect(set.lower(25)).toBe(20);
    expect(set.floor(25)).toBe(20);
    expect(set.higher(25)).toBe(30);
    expect(set.ceiling(25)).toBe(30);
    expect(set.floor(5)).toBeNull();
    expect(set.ceiling(35)).toBeNull();
    expect(set.lower(5)).toBeNull();
    expect(set.higher(35)).toBeNull();
  });

  it('removes by comparator equality and clears', () => {
    const set = numbers(10, 20, 30);
    expect(set.remove(20)).toBe(true);
    expect(set.remove(20)).toBe(false);
    expect(set.higher(10)).toBe(30);
    set.clear();
    expect(set.ceiling(0)).toBeNull();
  });
});
