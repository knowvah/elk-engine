// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { AbstractNormalizedMatcher } from './AbstractNormalizedMatcher.js';
import { AbstractNormalizedMatcherNormalizationFunction as NormalizationFunction } from './AbstractNormalizedMatcherNormalizationFunction.js';

/** The raw value is the comment itself. */
class RawIsComment extends AbstractNormalizedMatcher<number, string> {
  override raw(comment: number): number {
    return comment;
  }
  configure(worst: number, best: number, fn: NormalizationFunction): this {
    return this.withBounds(worst, best).withNormalizationFunction(fn);
  }
}

const norm = (worst: number, best: number, fn: NormalizationFunction, raw: number): number =>
  new RawIsComment().configure(worst, best, fn).normalized(raw, 'x');

// Expected values from the formulas in AbstractNormalizedMatcher.java.
describe('AbstractNormalizedMatcher LINEAR', () => {
  it.each([
    // worst < best
    [0, 10, -5, 0],
    [0, 10, 0, 0],
    [0, 10, 2.5, 0.25],
    [0, 10, 10, 1],
    [0, 10, 15, 1],
    // best < worst
    [10, 0, -5, 1],
    [10, 0, 0, 1],
    [10, 0, 2.5, 0.75],
    [10, 0, 10, 0],
    [10, 0, 15, 0],
    // worst == best
    [3, 3, 3, 1],
    [3, 3, 4, 0],
  ])('worst %f best %f raw %f -> %f', (worst, best, raw, expected) => {
    expect(norm(worst, best, NormalizationFunction.LINEAR, raw)).toBe(expected);
  });

  it('is the default function with bounds 0 and 1', () => {
    const m = new RawIsComment();
    expect(m.getWorstRawValue()).toBe(0);
    expect(m.getBestRawValue()).toBe(1);
    expect(m.normalized(0.25, 'x')).toBe(0.25);
  });
});

describe('AbstractNormalizedMatcher BINARY', () => {
  it.each([
    // worst < best
    [0, 10, 0, 0],
    [0, 10, -1, 0],
    [0, 10, 0.5, 1],
    [0, 10, 10, 1],
    [0, 10, 15, 1],
    // best < worst
    [10, 0, 10, 0],
    [10, 0, 12, 0],
    [10, 0, 9.5, 1],
    [10, 0, -3, 1],
    // worst == best
    [3, 3, 3, 1],
    [3, 3, 2, 0],
  ])('worst %f best %f raw %f -> %f', (worst, best, raw, expected) => {
    expect(norm(worst, best, NormalizationFunction.BINARY, raw)).toBe(expected);
  });
});

describe('AbstractNormalizedMatcher configuration', () => {
  it('rejects a null normalization function', () => {
    expect(() => new RawIsComment().configure(0, 1, null as never)).toThrow(
      new TypeError('Normalization function cannot be null.'),
    );
  });
});

describe('NormalizationFunction enum', () => {
  it('lists the constants in declaration order', () => {
    expect(NormalizationFunction.values().map((f) => f.name())).toEqual(['LINEAR', 'BINARY']);
    expect(NormalizationFunction.BINARY.ordinal()).toBe(1);
    expect(NormalizationFunction.LINEAR.compareTo(NormalizationFunction.BINARY)).toBe(-1);
    expect(String(NormalizationFunction.LINEAR)).toBe('LINEAR');
  });

  it('resolves names', () => {
    expect(NormalizationFunction.valueOf('BINARY')).toBe(NormalizationFunction.BINARY);
    expect(() => NormalizationFunction.valueOf('CUBIC')).toThrow(IllegalArgumentException);
  });
});
