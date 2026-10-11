// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { INTEGER, STRING } from '../java/util/HashStrategy.js';
import { LinkedHashMultimap } from './LinkedHashMultimap.js';

function newMultimap(): ReturnType<typeof LinkedHashMultimap.create<string, number>> {
  return LinkedHashMultimap.create<string, number>(STRING, INTEGER);
}

describe('LinkedHashMultimap', () => {
  it('stores each pair once; a repeated put does not move it', () => {
    const mm = newMultimap();
    mm.put('a', 1);
    mm.put('b', 2);
    expect([mm.put('a', 1), mm.put('a', 3)]).toEqual([false, true]);
    expect(mm.entries()).toEqual([
      ['a', 1],
      ['b', 2],
      ['a', 3],
    ]);
    expect([mm.size, mm.keys(), mm.values()]).toEqual([3, ['a', 'b', 'a'], [1, 2, 3]]);
  });

  it('keySet keeps first-added order while a key has values and moves it last after all are removed', () => {
    const mm = newMultimap();
    mm.put('a', 1);
    mm.put('b', 2);
    mm.put('a', 3);
    mm.remove('a', 1);
    expect(mm.keySet()).toEqual(['a', 'b']);
    expect(mm.removeAll('a')).toEqual([3]);
    mm.put('a', 4);
    expect(mm.keySet()).toEqual(['b', 'a']);
    expect(mm.entries()).toEqual([
      ['b', 2],
      ['a', 4],
    ]);
  });

  it('get(k) is a live view in insertion order that writes through', () => {
    const mm = newMultimap();
    const view = mm.get('a');
    mm.put('a', 5);
    view.add(6);
    view.add(5);
    expect([...view]).toEqual([5, 6]);
    expect(view.remove(5)).toBe(true);
    mm.clear();
    expect([[...view], mm.size, mm.entries()]).toEqual([[], 0, []]);
  });
});
