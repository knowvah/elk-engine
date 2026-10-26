// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { ChangeAwareArrayList } from './NNodeChangeAwareArrayList.js';

const listOf = (...items: number[]): ChangeAwareArrayList<number> => {
  const list = new ChangeAwareArrayList<number>();
  for (const i of items) list.add(i);
  return list;
};

describe('ChangeAwareArrayList', () => {
  it('counts one modification per mutating call that Java counts unconditionally', () => {
    const list = new ChangeAwareArrayList<number>();
    expect(list.getModCnt()).toBe(0);
    list.add(1);
    list.addAt(0, 0);
    list.addAll([2, 3]);
    list.addAllAt(4, [4]);
    list.set(0, 9);
    list.remove(42); // absent, still counted
    list.removeAt(0);
    list.clear();
    expect(list.getModCnt()).toBe(8);
  });

  it('removeAll and retainAll count only when the list changed', () => {
    const list = listOf(1, 2, 3);
    const before = list.getModCnt();
    expect(list.removeAll([7])).toBe(false);
    expect(list.retainAll([1, 2, 3])).toBe(false);
    expect(list.getModCnt()).toBe(before);
    expect(list.removeAll([2])).toBe(true);
    expect(list.toArray()).toEqual([1, 3]);
    expect(list.retainAll([3])).toBe(true);
    expect(list.toArray()).toEqual([3]);
    expect(list.getModCnt()).toBe(before + 2);
  });

  it('answers the read-only queries like ArrayList', () => {
    const list = listOf(5, 6, 5);
    expect(list.size()).toBe(3);
    expect(list.isEmpty()).toBe(false);
    expect(list.contains(6)).toBe(true);
    expect(list.containsAll([5, 6])).toBe(true);
    expect(list.containsAll([5, 7])).toBe(false);
    expect(list.indexOf(5)).toBe(0);
    expect(list.lastIndexOf(5)).toBe(2);
    expect(list.get(1)).toBe(6);
    expect(list.subList(1, 3)).toEqual([6, 5]);
    expect([...list]).toEqual([5, 6, 5]);
    expect(new ChangeAwareArrayList<number>().isEmpty()).toBe(true);
  });

  it('remove(o) removes the first match and reports whether one existed', () => {
    const list = listOf(5, 6, 5);
    expect(list.remove(5)).toBe(true);
    expect(list.toArray()).toEqual([6, 5]);
    expect(list.remove(8)).toBe(false);
  });

  it('indexed operations return the Java values and reject bad indices', () => {
    const list = listOf(1, 2);
    expect(list.set(1, 5)).toBe(2);
    expect(list.removeAt(0)).toBe(1);
    expect(list.toArray()).toEqual([5]);
    expect(list.addAllAt(0, [])).toBe(false);
    expect(list.addAll([8, 9])).toBe(true);
    list.addAt(1, 7);
    expect(list.toArray()).toEqual([5, 7, 8, 9]);
    expect(() => list.get(4)).toThrow(RangeError);
    expect(() => list.set(-1, 0)).toThrow(RangeError);
    expect(() => list.removeAt(4)).toThrow(RangeError);
    expect(() => list.addAt(5, 0)).toThrow('Index: 5, Size: 4');
    expect(() => list.addAllAt(-1, [])).toThrow(RangeError);
  });

  it('listIterator is unsupported', () => {
    expect(() => new ChangeAwareArrayList<number>().listIterator()).toThrow(UnsupportedOperationException);
  });
});
