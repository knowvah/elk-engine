// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TreeMultimap } from './TreeMultimap.js';

const numeric = (a: number, b: number): number => a - b;
const byLength = (a: string, b: string): number => a.length - b.length;

describe('TreeMultimap', () => {
  it('orders keys and each key values by their comparators', () => {
    const mm = TreeMultimap.create<number, number>(numeric, (a, b) => b - a);
    [
      [3, 1],
      [1, 5],
      [3, 4],
      [1, 2],
      [2, 9],
    ].forEach(([k, v]) => mm.put(k as number, v as number));
    expect(mm.keySet()).toEqual([1, 2, 3]);
    expect(mm.entries()).toEqual([
      [1, 5],
      [1, 2],
      [2, 9],
      [3, 4],
      [3, 1],
    ]);
    expect([mm.keys(), mm.values(), mm.size]).toEqual([[1, 1, 2, 3, 3], [5, 2, 9, 4, 1], 5]);
  });

  it('a comparator result of 0 means duplicate: the later value is rejected, the first is kept', () => {
    const mm = TreeMultimap.create<string, string>((a, b) => a.localeCompare(b), byLength);
    expect([mm.put('k', 'bb'), mm.put('k', 'cc'), mm.put('k', 'a')]).toEqual([true, false, true]);
    expect([...mm.get('k')]).toEqual(['a', 'bb']);
    expect(mm.remove('k', 'zz')).toBe(true);
    expect([...mm.get('k')]).toEqual(['a']);
  });

  it('comparator-equal keys share one entry and the first key instance is kept', () => {
    const mm = TreeMultimap.create<string, number>(byLength, numeric);
    mm.put('bb', 1);
    mm.put('cc', 2);
    mm.put('a', 3);
    expect(mm.keySet()).toEqual(['a', 'bb']);
    expect(mm.entries()).toEqual([
      ['a', 3],
      ['bb', 1],
      ['bb', 2],
    ]);
    expect([mm.containsKey('zz'), mm.containsKey('zzz')]).toEqual([true, false]);
  });

  it('get(k) is a live sorted view', () => {
    const mm = TreeMultimap.create<number, number>(numeric, numeric);
    const view = mm.get(1);
    view.add(5);
    mm.put(1, 2);
    view.add(9);
    expect([...view]).toEqual([2, 5, 9]);
    expect([view.contains(5), view.remove(5), view.remove(5), view.size]).toEqual([true, true, false, 2]);
    expect(mm.removeAll(1)).toEqual([2, 9]);
    expect([mm.keySet(), mm.isEmpty()]).toEqual([[], true]);
    mm.put(7, 7);
    mm.clear();
    expect(mm.size).toBe(0);
  });
});
