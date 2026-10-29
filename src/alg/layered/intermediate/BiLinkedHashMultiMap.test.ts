// SPDX-License-Identifier: EPL-2.0
// Structural tests of the behaviour the Javadoc and the code of BiLinkedHashMultiMap state (no algorithmic outcomes).
import { describe, expect, it } from 'vitest';
import { BiLinkedHashMultiMap } from './BiLinkedHashMultiMap.js';

/** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/BiLinkedHashMultiMap.java */
describe('BiLinkedHashMultiMap', () => {
  it('moves a value between keys and keeps the insertion order of each key', () => {
    const map = new BiLinkedHashMultiMap<number, string>();
    map.putAll(0, ['a', 'b']);
    map.put(1, 'c');
    map.put(1, 'a');
    expect([...map.getValues(0)]).toEqual(['b']);
    expect([...map.getValues(1)]).toEqual(['c', 'a']);
    expect(map.getKey('a')).toBe(1);
    expect(map.getKey('zzz')).toBeUndefined();
    expect([...map.keySet()]).toEqual([0, 1]);
  });

  it('answers an empty list, not stored, for an unknown key', () => {
    const map = new BiLinkedHashMultiMap<number, string>();
    expect(map.getValues(3).size()).toBe(0);
    expect(map.keySet().size).toBe(0);
  });

  it('finds the extreme keys, with equal keys counting as extreme', () => {
    const map = new BiLinkedHashMultiMap<number, string>();
    map.put(2, 'x');
    map.put(5, 'y');
    map.put(3, 'z');
    expect([2, 3, 5].map((k) => map.isMaximalKey(k))).toEqual([false, false, true]);
    expect([2, 3, 5].map((k) => map.isMinimalKey(k))).toEqual([true, false, false]);
  });
});
