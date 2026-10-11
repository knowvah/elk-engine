// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';
import { INTEGER, STRING } from '../java/util/HashStrategy.js';
import { ArrayListMultimap } from './ArrayListMultimap.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/guava.json', import.meta.url);

interface Thrown {
  readonly throws: string;
  readonly message: string;
}

const negative = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as {
  negativeExpectedSize: { arrayListKeys: Thrown; arrayListValuesPerKey: Thrown };
}).negativeExpectedSize;

function newMultimap(): ReturnType<typeof ArrayListMultimap.create<string, number>> {
  return ArrayListMultimap.create<string, number>(STRING, INTEGER);
}

describe('ArrayListMultimap', () => {
  it('keeps duplicate pairs: put always reports a change and get lists values in insertion order', () => {
    const mm = newMultimap();
    expect([mm.put('a', 1), mm.put('a', 1), mm.put('a', 0)]).toEqual([true, true, true]);
    expect([...mm.get('a')]).toEqual([1, 1, 0]);
    expect(mm.size).toBe(3);
  });

  it('remove(k, v) removes only the first occurrence', () => {
    const mm = newMultimap();
    mm.putAll('a', [5, 6, 5]);
    expect(mm.remove('a', 5)).toBe(true);
    expect([...mm.get('a')]).toEqual([6, 5]);
    expect(mm.remove('a', 9)).toBe(false);
  });

  it('get(k) is a live list: get and set write through, as Collections.reverse needs', () => {
    const mm = newMultimap();
    const list = mm.get('a');
    mm.putAll('a', [1, 2, 3]);
    expect([list.get(0), list.get(2), list.size]).toEqual([1, 3, 3]);
    expect(list.set(0, 30)).toBe(1);
    expect(list.set(2, 10)).toBe(3);
    expect(mm.entries()).toEqual([
      ['a', 30],
      ['a', 2],
      ['a', 10],
    ]);
    list.add(4);
    expect([...list]).toEqual([30, 2, 10, 4]);
    expect([list.contains(2), list.contains(3)]).toEqual([true, false]);
  });

  it('list indexes outside the current values throw IndexOutOfBoundsException', () => {
    const mm = newMultimap();
    const list = mm.get('a');
    expect(() => list.get(0)).toThrow(IndexOutOfBoundsException);
    mm.put('a', 1);
    expect(() => list.get(1)).toThrow('Index 1 out of bounds for length 1');
    expect(() => list.set(-1, 2)).toThrow('Index -1 out of bounds for length 1');
  });

  it('keys() repeats each key once per value, grouped in key order', () => {
    const mm = newMultimap();
    [
      ['b', 1],
      ['a', 1],
      ['b', 2],
    ].forEach(([k, v]) => mm.put(k as string, v as number));
    expect(mm.keys()).toEqual(['a', 'b', 'b']);
    expect(mm.values()).toEqual([1, 1, 2]);
    expect(mm.removeAll('b')).toEqual([1, 2]);
    expect(mm.containsKey('b')).toBe(false);
  });

  it('create(expectedKeys, expectedValuesPerKey) rejects negatives with the Guava messages', () => {
    expect(negative.arrayListKeys.throws).toBe('IllegalArgumentException');
    expect(() => ArrayListMultimap.create(STRING, INTEGER, -1, 3)).toThrow(IllegalArgumentException);
    expect(() => ArrayListMultimap.create(STRING, INTEGER, -1, 3)).toThrow(negative.arrayListKeys.message);
    expect(() => ArrayListMultimap.create(STRING, INTEGER, 3, -1)).toThrow(negative.arrayListValuesPerKey.message);
    expect(ArrayListMultimap.create(STRING, INTEGER, 4, 0).isEmpty()).toBe(true);
  });
});
