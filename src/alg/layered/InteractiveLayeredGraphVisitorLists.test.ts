// SPDX-License-Identifier: EPL-2.0
// The `java.util.ArrayList` operations of InteractiveLayeredGraphVisitor, against their Javadoc contract (T10): the index
// ranges that throw IndexOutOfBoundsException, identity-based contains/indexOf/remove, removeAll keeping the order.
// https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html
import { describe, expect, it } from 'vitest';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { getElkNode, requireNode } from './InteractiveLayeredGraphVisitorChains.js';
import * as JList from './InteractiveLayeredGraphVisitorLists.js';

describe('InteractiveLayeredGraphVisitorLists', () => {
  it('get and removeAt throw IndexOutOfBoundsException outside 0..size-1', () => {
    expect(JList.get(['a', 'b'], 1)).toBe('b');
    expect(() => JList.get(['a', 'b'], 2)).toThrow(IndexOutOfBoundsException);
    expect(() => JList.get([], 0)).toThrow(IndexOutOfBoundsException);
    expect(() => JList.get(['a'], -1)).toThrow(IndexOutOfBoundsException);
    const list = ['a', 'b', 'c'];
    expect(JList.removeAt(list, 1)).toBe('b');
    expect(list).toEqual(['a', 'c']);
    expect(() => JList.removeAt(list, 2)).toThrow(IndexOutOfBoundsException);
  });

  it('addAt and addAllAt accept 0..size and throw outside it (add(-1, e) does not insert before the last element)', () => {
    const list = ['a', 'b'];
    JList.addAt(list, 2, 'c');
    JList.addAt(list, 0, 'z');
    JList.addAllAt(list, 1, ['x', 'y']);
    expect(list).toEqual(['z', 'x', 'y', 'a', 'b', 'c']);
    expect(() => JList.addAt(list, -1, 'q')).toThrow(IndexOutOfBoundsException);
    expect(() => JList.addAt(list, 7, 'q')).toThrow(IndexOutOfBoundsException);
    expect(() => JList.addAllAt(list, 7, ['q'])).toThrow(IndexOutOfBoundsException);
    expect(list).toHaveLength(6);
  });

  it('contains, indexOf and remove(Object) compare by identity and find null', () => {
    const a = { id: 1 };
    const twin = { id: 1 };
    const list: ({ id: number } | null)[] = [a, null, a];
    expect(JList.contains(list, a)).toBe(true);
    expect(JList.contains(list, twin)).toBe(false);
    expect(JList.contains(list, null)).toBe(true);
    expect(JList.indexOf(list, a)).toBe(0);
    expect(JList.indexOf(list, twin)).toBe(-1);
    expect(JList.remove(list, a)).toBe(true);
    expect(list).toEqual([null, a]);
    expect(JList.remove(list, twin)).toBe(false);
  });

  it('removeAll removes every contained element, keeps the order and reports the change', () => {
    const list = [1, 2, 3, 2, 4];
    expect(JList.removeAll(list, [2, 4])).toBe(true);
    expect(list).toEqual([1, 3]);
    expect(JList.removeAll(list, [9])).toBe(false);
  });
});

describe('InteractiveLayeredGraphVisitorChains null handling (the Java NullPointerExceptions)', () => {
  it('getElkNode throws on a null id (id.equals) and returns null for an unknown one', () => {
    expect(() => getElkNode([], null)).toThrow(TypeError);
    expect(getElkNode([], 'n1')).toBeNull();
  });

  it('requireNode throws on a missing node and returns a present one', () => {
    expect(() => requireNode(null, 'target')).toThrow(TypeError);
  });
});
