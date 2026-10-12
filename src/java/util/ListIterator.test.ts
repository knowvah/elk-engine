// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayListIterator } from './ListIterator.js';
import { IllegalStateException } from '../lang/IllegalStateException.js';
import { NoSuchElementException } from './NoSuchElementException.js';

describe('ArrayListIterator', () => {
  it('walks forward and reports indices', () => {
    const it0 = new ArrayListIterator(['a', 'b']);
    expect(it0.hasNext()).toBe(true);
    expect(it0.hasPrevious()).toBe(false);
    expect(it0.nextIndex()).toBe(0);
    expect(it0.previousIndex()).toBe(-1);
    expect(it0.next()).toBe('a');
    expect(it0.nextIndex()).toBe(1);
    expect(it0.previousIndex()).toBe(0);
    expect(it0.next()).toBe('b');
    expect(it0.hasNext()).toBe(false);
    expect(it0.nextIndex()).toBe(2);
    expect(() => it0.next()).toThrow(NoSuchElementException);
  });

  it('walks backward from a start index', () => {
    const it0 = new ArrayListIterator(['a', 'b', 'c'], 3);
    expect(it0.hasNext()).toBe(false);
    expect(it0.hasPrevious()).toBe(true);
    expect(it0.previous()).toBe('c');
    expect(it0.previous()).toBe('b');
    expect(it0.nextIndex()).toBe(1);
    expect(it0.previous()).toBe('a');
    expect(it0.hasPrevious()).toBe(false);
    expect(() => it0.previous()).toThrow(NoSuchElementException);
  });

  it('returns the same element when alternating next and previous', () => {
    const it0 = new ArrayListIterator(['a', 'b']);
    expect(it0.next()).toBe('a');
    expect(it0.previous()).toBe('a');
    expect(it0.next()).toBe('a');
  });

  it('set replaces the last returned element, then add inserts before next', () => {
    const arr = ['a', 'b'];
    const it0 = new ArrayListIterator(arr);
    expect(it0.next()).toBe('a');
    it0.set('x');
    expect(arr).toEqual(['x', 'b']);
    it0.add('y');
    expect(arr).toEqual(['x', 'y', 'b']);
    expect(it0.previous()).toBe('y');
    expect(it0.nextIndex()).toBe(1);
  });

  it('set after previous replaces the element previous returned', () => {
    const arr = ['a', 'b'];
    const it0 = new ArrayListIterator(arr, 2);
    expect(it0.previous()).toBe('b');
    it0.set('z');
    expect(arr).toEqual(['a', 'z']);
  });

  it('add inserts at the cursor, after a previous-returned element', () => {
    const arr = ['a', 'b'];
    const it0 = new ArrayListIterator(arr, 2);
    expect(it0.previous()).toBe('b');
    it0.add('n');
    expect(arr).toEqual(['a', 'n', 'b']);
    expect(it0.next()).toBe('b');
  });

  it('remove after next drops that element and keeps the cursor aligned', () => {
    const arr = ['a', 'b', 'c'];
    const it0 = new ArrayListIterator(arr);
    expect(it0.next()).toBe('a');
    expect(it0.next()).toBe('b');
    it0.remove();
    expect(arr).toEqual(['a', 'c']);
    expect(it0.nextIndex()).toBe(1);
    expect(it0.next()).toBe('c');
  });

  it('remove after previous drops that element without moving the cursor', () => {
    const arr = ['a', 'b', 'c'];
    const it0 = new ArrayListIterator(arr, 3);
    expect(it0.previous()).toBe('c');
    it0.remove();
    expect(arr).toEqual(['a', 'b']);
    expect(it0.nextIndex()).toBe(2);
    expect(it0.previous()).toBe('b');
  });

  it('remove and set throw before any traversal', () => {
    const it0 = new ArrayListIterator(['a']);
    expect(() => it0.remove()).toThrow(IllegalStateException);
    expect(() => it0.set('x')).toThrow(IllegalStateException);
  });

  it('remove twice and set after remove throw IllegalStateException', () => {
    const arr = ['a', 'b'];
    const it0 = new ArrayListIterator(arr);
    it0.next();
    it0.remove();
    expect(() => it0.remove()).toThrow(IllegalStateException);
    expect(() => it0.set('x')).toThrow(IllegalStateException);
    expect(arr).toEqual(['b']);
  });

  it('set and remove after add throw IllegalStateException', () => {
    const arr = ['a'];
    const it0 = new ArrayListIterator(arr);
    it0.add('n');
    expect(() => it0.set('x')).toThrow(IllegalStateException);
    expect(() => it0.remove()).toThrow(IllegalStateException);
    expect(arr).toEqual(['n', 'a']);
  });
});
