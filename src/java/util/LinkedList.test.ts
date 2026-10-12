// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LinkedList } from './LinkedList.js';
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from './NoSuchElementException.js';

const abc = (): LinkedList<string> => new LinkedList(['a', 'b', 'c']);

describe('LinkedList construction and queries', () => {
  it('starts empty', () => {
    const l = new LinkedList<string>();
    expect(l.size()).toBe(0);
    expect(l.isEmpty()).toBe(true);
    expect(l.toArray()).toEqual([]);
  });

  it('copies the constructor elements', () => {
    const src = ['a', 'b'];
    const l = new LinkedList(src);
    src.push('c');
    expect(l.toArray()).toEqual(['a', 'b']);
    expect(l.size()).toBe(2);
    expect(l.isEmpty()).toBe(false);
  });

  it('contains and indexOf use identity and report -1 when absent', () => {
    const o1 = {};
    const o2 = {};
    const l = new LinkedList([o1, o2, o1]);
    expect(l.contains(o2)).toBe(true);
    expect(l.contains({})).toBe(false);
    expect(l.indexOf(o1)).toBe(0);
    expect(l.indexOf({})).toBe(-1);
  });

  it('toArray returns a detached copy', () => {
    const l = abc();
    l.toArray().push('z');
    expect(l.toArray()).toEqual(['a', 'b', 'c']);
  });

  it('iterates via iterator() and Symbol.iterator', () => {
    const l = abc();
    expect([...l]).toEqual(['a', 'b', 'c']);
    const it = l.iterator();
    expect(it.next()).toEqual({ value: 'a', done: false });
    expect(Array.from({ [Symbol.iterator]: () => l.iterator() })).toEqual(['a', 'b', 'c']);
  });
});

describe('LinkedList deque-end methods', () => {
  it('throws NoSuchElementException on an empty list', () => {
    const l = new LinkedList<string>();
    expect(() => l.getFirst()).toThrow(NoSuchElementException);
    expect(() => l.getLast()).toThrow(NoSuchElementException);
    expect(() => l.removeFirst()).toThrow(NoSuchElementException);
    expect(() => l.removeLast()).toThrow(NoSuchElementException);
  });

  it('reads and removes at both ends', () => {
    const l = abc();
    expect(l.getFirst()).toBe('a');
    expect(l.getLast()).toBe('c');
    expect(l.removeFirst()).toBe('a');
    expect(l.removeLast()).toBe('c');
    expect(l.toArray()).toEqual(['b']);
  });

  it('adds at both ends', () => {
    const l = new LinkedList(['b']);
    l.addFirst('a');
    l.addLast('c');
    expect(l.toArray()).toEqual(['a', 'b', 'c']);
  });
});

describe('LinkedList positional access', () => {
  it('gets and sets by index, set returning the old value', () => {
    const l = abc();
    expect(l.get(1)).toBe('b');
    expect(l.set(1, 'x')).toBe('b');
    expect(l.toArray()).toEqual(['a', 'x', 'c']);
  });

  it('rejects out-of-range get/set/removeAt with Java messages', () => {
    const l = abc();
    expect(() => l.get(3)).toThrow(new IndexOutOfBoundsException('Index: 3, Size: 3'));
    expect(() => l.get(-1)).toThrow(new IndexOutOfBoundsException('Index: -1, Size: 3'));
    expect(() => l.set(3, 'x')).toThrow(IndexOutOfBoundsException);
    expect(() => l.removeAt(3)).toThrow(IndexOutOfBoundsException);
  });

  it('adds at an index, allowing index == size', () => {
    const l = new LinkedList(['a', 'c']);
    l.addAt(1, 'b');
    l.addAt(3, 'd');
    l.addAt(0, 'z');
    expect(l.toArray()).toEqual(['z', 'a', 'b', 'c', 'd']);
    expect(() => l.addAt(6, 'q')).toThrow(new IndexOutOfBoundsException('Index: 6, Size: 5'));
    expect(() => l.addAt(-1, 'q')).toThrow(IndexOutOfBoundsException);
  });

  it('add appends and returns true', () => {
    const l = new LinkedList<string>();
    expect(l.add('a')).toBe(true);
    expect(l.toArray()).toEqual(['a']);
  });

  it('removeAt returns the removed element', () => {
    const l = abc();
    expect(l.removeAt(1)).toBe('b');
    expect(l.toArray()).toEqual(['a', 'c']);
  });

  it('remove(e) removes the first identical element', () => {
    const l = new LinkedList(['a', 'b', 'a']);
    expect(l.remove('a')).toBe(true);
    expect(l.toArray()).toEqual(['b', 'a']);
    expect(l.remove('q')).toBe(false);
    expect(l.toArray()).toEqual(['b', 'a']);
  });

  it('clear empties the list', () => {
    const l = abc();
    l.clear();
    expect(l.size()).toBe(0);
    expect(l.toArray()).toEqual([]);
  });
});

describe('LinkedList bulk adds', () => {
  it('addAll appends and reports whether it changed', () => {
    const l = new LinkedList(['a']);
    expect(l.addAll(['b', 'c'])).toBe(true);
    expect(l.addAll([])).toBe(false);
    expect(l.toArray()).toEqual(['a', 'b', 'c']);
  });

  it('addAll of itself doubles the content', () => {
    const l = new LinkedList(['a', 'b']);
    expect(l.addAll(l)).toBe(true);
    expect(l.toArray()).toEqual(['a', 'b', 'a', 'b']);
  });

  it('addAllAt inserts in order at the index', () => {
    const l = new LinkedList(['a', 'b']);
    expect(l.addAllAt(1, ['x', 'y'])).toBe(true);
    expect(l.toArray()).toEqual(['a', 'x', 'y', 'b']);
    expect(() => l.removeAt(5)).toThrow(new IndexOutOfBoundsException('Index: 5, Size: 4'));
  });

  it('addAllAt of nothing returns false but still checks the index', () => {
    const l = new LinkedList(['a']);
    expect(l.addAllAt(1, [])).toBe(false);
    expect(() => l.addAllAt(2, [])).toThrow(new IndexOutOfBoundsException('Index: 2, Size: 1'));
    expect(() => l.addAllAt(-1, ['x'])).toThrow(IndexOutOfBoundsException);
  });
});

describe('LinkedList.listIterator', () => {
  it('walks backward from the end', () => {
    const it = abc().listIterator(3);
    expect(it.previous()).toBe('c');
    expect(it.previous()).toBe('b');
    expect(it.nextIndex()).toBe(1);
  });

  it('set then add through the iterator mutates the list', () => {
    const l = new LinkedList(['a', 'b']);
    const it = l.listIterator();
    expect(it.next()).toBe('a');
    it.set('x');
    it.add('y');
    expect(l.toArray()).toEqual(['x', 'y', 'b']);
    expect(it.previous()).toBe('y');
  });

  it('remove through the iterator mutates the list', () => {
    const l = abc();
    const it = l.listIterator();
    it.next();
    it.remove();
    expect(l.toArray()).toEqual(['b', 'c']);
  });

  it('rejects out-of-range start indices', () => {
    const l = abc();
    expect(() => l.listIterator(4)).toThrow(new IndexOutOfBoundsException('Index: 4, Size: 3'));
    expect(() => l.listIterator(-1)).toThrow(new IndexOutOfBoundsException('Index: -1, Size: 3'));
    expect(l.listIterator(3).hasNext()).toBe(false);
  });
});

describe('LinkedList.clone', () => {
  it('returns a shallow copy: same elements, independent list', () => {
    const o1 = { n: 1 };
    const o2 = { n: 2 };
    const l = new LinkedList([o1, o2]);
    const copy = l.clone();
    expect(copy).not.toBe(l);
    expect(copy).toBeInstanceOf(LinkedList);
    expect(copy.toArray()).toEqual([o1, o2]);
    expect(copy.get(0)).toBe(o1);
    copy.add({ n: 3 });
    copy.removeFirst();
    expect(copy.toArray()).toEqual([o2, { n: 3 }]);
    expect(l.toArray()).toEqual([o1, o2]);
    l.clear();
    expect(copy.size()).toBe(2);
  });

  it('clones an empty list to an empty list', () => {
    const copy = new LinkedList<string>().clone();
    expect(copy.size()).toBe(0);
    expect(copy.isEmpty()).toBe(true);
  });
});
