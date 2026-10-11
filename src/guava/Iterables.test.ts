// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../java/util/NoSuchElementException.js';
import * as Iterables from './Iterables.js';
import * as Lists from './Lists.js';

describe('Iterables.concat', () => {
  it('concatenates in order', () => {
    expect([...Iterables.concat([1, 2], [], [3])]).toEqual([1, 2, 3]);
  });

  it('is re-iterable and reflects source changes between passes', () => {
    const a = [1];
    const b = [2];
    const c = Iterables.concat(a, b);
    expect([...c]).toEqual([1, 2]);
    a.push(5);
    b.unshift(0);
    expect([...c]).toEqual([1, 5, 0, 2]);
  });
});

describe('Iterables.concatAll', () => {
  it('concatenates an iterable of iterables', () => {
    expect([...Iterables.concatAll([[1], [2, 3]])]).toEqual([1, 2, 3]);
  });

  it('reflects changes to inner and outer iterables between passes', () => {
    const inner = [1];
    const outer: number[][] = [inner];
    const c = Iterables.concatAll(outer);
    expect([...c]).toEqual([1]);
    inner.push(2);
    outer.push([3]);
    expect([...c]).toEqual([1, 2, 3]);
  });
});

describe('Iterables.size', () => {
  it('uses length for arrays, size for sets and maps, counts otherwise', () => {
    expect(Iterables.size([1, 2, 3])).toBe(3);
    expect(Iterables.size(new Set([1, 2]))).toBe(2);
    expect(Iterables.size(new Map([[1, 2]]))).toBe(1);
    expect(Iterables.size(Iterables.concat([1], [2, 3]))).toBe(3);
    expect(Iterables.size([])).toBe(0);
  });
});

describe('Iterables.isEmpty', () => {
  it('reports emptiness', () => {
    expect(Iterables.isEmpty([])).toBe(true);
    expect(Iterables.isEmpty(Iterables.concat([], []))).toBe(true);
    expect(Iterables.isEmpty(Iterables.concat([], [1]))).toBe(false);
  });
});

describe('Iterables.filter', () => {
  it('keeps matching elements', () => {
    expect([...Iterables.filter([1, 2, 3, 4], (n) => n > 2)]).toEqual([3, 4]);
  });

  it('reflects source mutation between passes', () => {
    const src = [1, 2, 3];
    const view = Iterables.filter(src, (n) => n % 2 === 1);
    expect([...view]).toEqual([1, 3]);
    src.push(5);
    src.shift();
    expect([...view]).toEqual([3, 5]);
  });
});

describe('Iterables.transform', () => {
  it('maps elements lazily and re-reads the source each pass', () => {
    const src = [1, 2];
    const view = Iterables.transform(src, (n) => n * 10);
    expect([...view]).toEqual([10, 20]);
    src.push(3);
    expect([...view]).toEqual([10, 20, 30]);
  });
});

describe('Iterables.getFirst', () => {
  it('returns the first element or the default', () => {
    expect(Iterables.getFirst([7, 8], null)).toBe(7);
    expect(Iterables.getFirst<number, null>([], null)).toBeNull();
  });
});

describe('Iterables.getLast', () => {
  it('returns the last element', () => {
    expect(Iterables.getLast([1, 2, 3])).toBe(3);
    expect(Iterables.getLast(new Set([4, 5]))).toBe(5);
  });

  it('throws NoSuchElementException on an empty iterable', () => {
    expect(() => Iterables.getLast([])).toThrow(NoSuchElementException);
  });

  it('returns the default on an empty iterable when one is given', () => {
    expect(Iterables.getLast<number, null>([], null)).toBeNull();
    expect(Iterables.getLast([1, 2], null)).toBe(2);
    expect(Iterables.getLast<number, undefined>([], undefined)).toBeUndefined();
  });
});

describe('Iterables.get', () => {
  it('returns the element at the position', () => {
    expect(Iterables.get(['a', 'b', 'c'], 0)).toBe('a');
    expect(Iterables.get(new Set(['a', 'b', 'c']), 2)).toBe('c');
  });

  it('throws IndexOutOfBoundsException when the position is too large', () => {
    expect(() => Iterables.get([1, 2, 3], 5)).toThrow(IndexOutOfBoundsException);
    expect(() => Iterables.get([1, 2, 3], 5)).toThrow(
      'position (5) must be less than the number of elements that remained (3)',
    );
    expect(() => Iterables.get(new Set([1]), 1)).toThrow(IndexOutOfBoundsException);
  });

  it('throws IndexOutOfBoundsException when the position is negative', () => {
    expect(() => Iterables.get([1], -1)).toThrow('position (-1) must not be negative');
  });
});

describe('Iterables.all / any', () => {
  it('all is true when every element matches, vacuously for empty', () => {
    expect(Iterables.all([2, 4], (n) => n % 2 === 0)).toBe(true);
    expect(Iterables.all([2, 3], (n) => n % 2 === 0)).toBe(false);
    expect(Iterables.all([], () => false)).toBe(true);
  });

  it('any is true when some element matches, false for empty', () => {
    expect(Iterables.any([1, 2], (n) => n === 2)).toBe(true);
    expect(Iterables.any([1, 2], (n) => n === 3)).toBe(false);
    expect(Iterables.any([], () => true)).toBe(false);
  });

  it('short-circuit', () => {
    const seen: number[] = [];
    Iterables.any([1, 2, 3], (n) => {
      seen.push(n);
      return n === 2;
    });
    expect(seen).toEqual([1, 2]);
  });
});

describe('Iterables.addAll', () => {
  it('appends and reports whether the target changed', () => {
    const target = [1];
    expect(Iterables.addAll(target, [2, 3])).toBe(true);
    expect(target).toEqual([1, 2, 3]);
    expect(Iterables.addAll(target, [])).toBe(false);
    expect(target).toEqual([1, 2, 3]);
  });

  it('accepts a Lists.reverse view as the source', () => {
    const target: number[] = [];
    Iterables.addAll(target, Lists.reverse([1, 2]));
    expect(target).toEqual([2, 1]);
  });
});
