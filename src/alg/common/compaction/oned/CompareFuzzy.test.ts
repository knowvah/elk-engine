// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { CompareFuzzy } from './CompareFuzzy.js';

const T = CompareFuzzy.TOLERANCE;

describe('CompareFuzzy', () => {
  it('uses the Java tolerance 0.0001', () => {
    expect(T).toBe(0.0001);
  });

  it('treats values within the tolerance as equal', () => {
    expect(CompareFuzzy.eq(1, 1 + T / 2)).toBe(true);
    expect(CompareFuzzy.eq(1, 1 + 2 * T)).toBe(false);
    expect(CompareFuzzy.gt(1 + T / 2, 1)).toBe(false);
    expect(CompareFuzzy.lt(1, 1 + T / 2)).toBe(false);
    expect(CompareFuzzy.ge(1, 1 + T / 2)).toBe(true);
    expect(CompareFuzzy.le(1 + T / 2, 1)).toBe(true);
  });

  it('orders values further apart than the tolerance', () => {
    expect(CompareFuzzy.gt(2, 1)).toBe(true);
    expect(CompareFuzzy.gt(1, 2)).toBe(false);
    expect(CompareFuzzy.lt(1, 2)).toBe(true);
    expect(CompareFuzzy.lt(2, 1)).toBe(false);
    expect(CompareFuzzy.ge(2, 1)).toBe(true);
    expect(CompareFuzzy.ge(1, 2)).toBe(false);
    expect(CompareFuzzy.le(1, 2)).toBe(true);
    expect(CompareFuzzy.le(2, 1)).toBe(false);
  });
});
