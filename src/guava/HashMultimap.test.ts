// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { INTEGER, STRING } from '../java/util/HashStrategy.js';
import { HashMultimap } from './HashMultimap.js';

function newMultimap(): ReturnType<typeof HashMultimap.create<string, number>> {
  return HashMultimap.create<string, number>(STRING, INTEGER);
}

describe('HashMultimap', () => {
  it('get(k) captured before put(k, v) is a live view that contains v afterwards', () => {
    const mm = newMultimap();
    const view = mm.get('a');
    expect([view.size, view.isEmpty(), [...view]]).toEqual([0, true, []]);
    mm.put('a', 7);
    expect([view.size, view.isEmpty(), view.contains(7), [...view]]).toEqual([1, false, true, [7]]);
    mm.removeAll('a');
    expect([...view]).toEqual([]);
  });

  it('get(k) never returns null for an absent key and writes through add, remove and clear', () => {
    const mm = newMultimap();
    const view = mm.get('k');
    expect(view.add(1)).toBe(true);
    expect(view.add(1)).toBe(false);
    expect([mm.size, mm.containsKey('k'), mm.keySet()]).toEqual([1, true, ['k']]);
    expect(view.remove(2)).toBe(false);
    expect(view.remove(1)).toBe(true);
    expect([mm.size, mm.containsKey('k'), mm.isEmpty()]).toEqual([0, false, true]);
    view.add(2);
    view.add(3);
    view.clear();
    expect([mm.size, mm.containsKey('k'), view.contains(2)]).toEqual([0, false, false]);
  });

  it('stores each key-value pair once: put reports whether the multimap changed', () => {
    const mm = newMultimap();
    expect([mm.put('a', 1), mm.put('a', 1), mm.put('a', 2), mm.put('b', 1)]).toEqual([true, false, true, true]);
    expect(mm.size).toBe(3);
    expect(mm.putAll('a', [2, 3, 3])).toBe(true);
    expect(mm.putAll('a', [2, 3])).toBe(false);
    expect(mm.size).toBe(4);
  });

  it('removes single pairs and whole keys, returning what was removed', () => {
    const mm = newMultimap();
    mm.putAll('a', [1, 2]);
    mm.put('b', 3);
    expect([mm.remove('a', 9), mm.remove('z', 1), mm.remove('b', 3)]).toEqual([false, false, true]);
    expect(mm.containsKey('b')).toBe(false);
    expect(mm.removeAll('z')).toEqual([]);
    expect(mm.removeAll('a')).toEqual([1, 2]);
    expect([mm.size, mm.keySet()]).toEqual([0, []]);
  });

  it('iterates keys and values in JVM hash order and groups entries by key', () => {
    const mm = newMultimap();
    [
      ['b', 2],
      ['a', 1],
      ['b', 1],
      ['a', 3],
    ].forEach(([k, v]) => mm.put(k as string, v as number));
    expect(mm.keySet()).toEqual(['a', 'b']);
    expect(mm.entries()).toEqual([
      ['a', 1],
      ['a', 3],
      ['b', 1],
      ['b', 2],
    ]);
    expect(mm.keys()).toEqual(['a', 'a', 'b', 'b']);
    expect(mm.values()).toEqual([1, 3, 1, 2]);
  });

  it('clear removes every key and value', () => {
    const mm = newMultimap();
    mm.putAll('a', [1, 2]);
    mm.clear();
    expect([mm.size, mm.entries(), [...mm.get('a')]]).toEqual([0, [], []]);
  });
});
