// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import * as DoubleMath from './DoubleMath.js';

describe('DoubleMath.fuzzyEquals', () => {
  it('accepts values within tolerance, inclusive', () => {
    expect(DoubleMath.fuzzyEquals(1, 1.05, 0.1)).toBe(true);
    expect(DoubleMath.fuzzyEquals(1, 1.5, 0.5)).toBe(true);
    expect(DoubleMath.fuzzyEquals(1, 1.2, 0.1)).toBe(false);
  });

  it('treats all NaNs as equal but NaN as unequal to numbers', () => {
    expect(DoubleMath.fuzzyEquals(Number.NaN, Number.NaN, 0)).toBe(true);
    expect(DoubleMath.fuzzyEquals(Number.NaN, 1, 1e9)).toBe(false);
    expect(DoubleMath.fuzzyEquals(1, Number.NaN, 1e9)).toBe(false);
  });

  it('treats positive and negative zero as equal', () => {
    expect(DoubleMath.fuzzyEquals(0, -0, 0)).toBe(true);
  });

  it('is exact equality for zero tolerance', () => {
    expect(DoubleMath.fuzzyEquals(1, 1, 0)).toBe(true);
    expect(DoubleMath.fuzzyEquals(1, 1 + Number.EPSILON, 0)).toBe(false);
  });

  it('handles infinities', () => {
    const inf = Number.POSITIVE_INFINITY;
    expect(DoubleMath.fuzzyEquals(inf, inf, 0.1)).toBe(true);
    expect(DoubleMath.fuzzyEquals(-inf, -inf, 0.1)).toBe(true);
    expect(DoubleMath.fuzzyEquals(inf, -inf, 0.1)).toBe(false);
    expect(DoubleMath.fuzzyEquals(inf, 1, 0.1)).toBe(false);
    expect(DoubleMath.fuzzyEquals(inf, 1, inf)).toBe(true);
  });

  it('rejects negative and NaN tolerance', () => {
    expect(() => DoubleMath.fuzzyEquals(1, 1, -1)).toThrow(IllegalArgumentException);
    expect(() => DoubleMath.fuzzyEquals(1, 1, Number.NaN)).toThrow(IllegalArgumentException);
  });
});

describe('DoubleMath.fuzzyCompare', () => {
  it('is zero when fuzzily equal', () => {
    expect(DoubleMath.fuzzyCompare(1, 1.05, 0.1)).toBe(0);
    expect(DoubleMath.fuzzyCompare(Number.NaN, Number.NaN, 0)).toBe(0);
  });

  it('otherwise follows Double.compare', () => {
    expect(DoubleMath.fuzzyCompare(1, 2, 0.1)).toBe(-1);
    expect(DoubleMath.fuzzyCompare(2, 1, 0.1)).toBe(1);
    expect(DoubleMath.fuzzyCompare(Number.NaN, Number.POSITIVE_INFINITY, 0.1)).toBe(1);
  });

  it('rejects negative and NaN tolerance', () => {
    expect(() => DoubleMath.fuzzyCompare(1, 1, -0.5)).toThrow(IllegalArgumentException);
    expect(() => DoubleMath.fuzzyCompare(1, 1, Number.NaN)).toThrow(IllegalArgumentException);
  });
});
