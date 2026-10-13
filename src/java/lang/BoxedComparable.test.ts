// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { asComparable, BoxedComparable } from './BoxedComparable.js';
import { ClassCastException } from './ClassCastException.js';

describe('BoxedComparable', () => {
  it('compares numbers by Double.compare', () => {
    expect(new BoxedComparable(1).compareTo(2)).toBe(-1);
    expect(new BoxedComparable(Number.NaN).compareTo(1)).toBe(1);
    expect(new BoxedComparable(0.5).compareTo(0.5)).toBe(0);
  });

  it('compares strings and booleans', () => {
    expect(new BoxedComparable('a').compareTo('c')).toBe(-2);
    expect(new BoxedComparable(true).compareTo(false)).toBe(1);
    expect(new BoxedComparable(false).compareTo(true)).toBe(-1);
  });

  it('rejects mixed types with a ClassCastException', () => {
    expect(() => new BoxedComparable(1).compareTo('x')).toThrow(ClassCastException);
    expect(() => new BoxedComparable(1).compareTo('x')).toThrow('Cannot compare number with string');
  });

  it('prints its value', () => {
    expect(new BoxedComparable(2.5).toString()).toBe('2.5');
    expect(new BoxedComparable(true).value).toBe(true);
  });
});

describe('asComparable', () => {
  it('wraps primitives, passes comparable objects and rejects the rest', () => {
    expect(asComparable(4)).toBeInstanceOf(BoxedComparable);
    expect(asComparable('s')).toBeInstanceOf(BoxedComparable);
    expect(asComparable(false)).toBeInstanceOf(BoxedComparable);
    const own = { compareTo: (): number => 0 };
    expect(asComparable(own)).toBe(own);
    expect(asComparable({})).toBeNull();
    expect(asComparable(null)).toBeNull();
    expect(asComparable(undefined)).toBeNull();
  });
});
