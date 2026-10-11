// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { STRING } from '../java/util/HashStrategy.js';
import { LinkedListMultimap } from './LinkedListMultimap.js';

const same = {
  hash: (k: number): number => k,
  equals: (a: number, b: number): boolean => a === b,
};

function javadocExample(): ReturnType<typeof LinkedListMultimap.create<string, string>> {
  const mm = LinkedListMultimap.create<string, string>(STRING, STRING);
  mm.put('key1', 'foo');
  mm.put('key2', 'bar');
  mm.put('key1', 'baz');
  return mm;
}

describe('LinkedListMultimap', () => {
  it('keys() and entries() follow insertion order across non-distinct keys (Javadoc example)', () => {
    const mm = javadocExample();
    expect(mm.keys()).toEqual(['key1', 'key2', 'key1']);
    expect(mm.entries()).toEqual([
      ['key1', 'foo'],
      ['key2', 'bar'],
      ['key1', 'baz'],
    ]);
    expect(mm.values()).toEqual(['foo', 'bar', 'baz']);
    expect(mm.keySet()).toEqual(['key1', 'key2']);
  });

  it('remove(key1, foo) moves key2 first in entries, keys and keySet (Javadoc example)', () => {
    const mm = javadocExample();
    expect(mm.remove('key1', 'foo')).toBe(true);
    expect(mm.entries()).toEqual([
      ['key2', 'bar'],
      ['key1', 'baz'],
    ]);
    expect(mm.keys()).toEqual(['key2', 'key1']);
    expect(mm.keySet()).toEqual(['key2', 'key1']);
  });

  it('keeps duplicate pairs and get(k) lists one key values in insertion order', () => {
    const mm = LinkedListMultimap.create<number, number>(same, same);
    expect([mm.put(1, 10), mm.put(1, 10), mm.put(2, 20), mm.put(1, 11)]).toEqual([true, true, true, true]);
    expect([...mm.get(1)]).toEqual([10, 10, 11]);
    expect(mm.remove(1, 10)).toBe(true);
    expect(mm.remove(1, 99)).toBe(false);
    expect(mm.entries()).toEqual([
      [1, 10],
      [2, 20],
      [1, 11],
    ]);
  });

  it('get(k) is a live list: writes append to the end, set replaces in place', () => {
    const mm = LinkedListMultimap.create<number, number>(same, same);
    const list = mm.get(1);
    mm.put(1, 10);
    mm.put(2, 20);
    list.add(11);
    expect(mm.entries()).toEqual([
      [1, 10],
      [2, 20],
      [1, 11],
    ]);
    expect(list.set(0, 12)).toBe(10);
    expect([list.get(0), list.size, list.contains(11)]).toEqual([12, 2, true]);
    expect(mm.removeAll(1)).toEqual([12, 11]);
    expect(mm.entries()).toEqual([[2, 20]]);
    mm.clear();
    expect([mm.size, mm.entries(), mm.keySet()]).toEqual([0, [], []]);
  });
});
