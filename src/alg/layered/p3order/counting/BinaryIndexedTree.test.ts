// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { BinaryIndexedTree } from './BinaryIndexedTree.js';

const MAX_NUM = 5;

describe('BinaryIndexedTree', () => {
  it('starts empty with size 0 and rank 0', () => {
    const tree = new BinaryIndexedTree(MAX_NUM);
    expect(tree.isEmpty()).toBe(true);
    expect(tree.size()).toBe(0);
    expect(tree.rank(MAX_NUM)).toBe(0);
  });

  it('is not empty after an add and ranks the entries before the index', () => {
    const tree = new BinaryIndexedTree(MAX_NUM);
    tree.add(0);
    tree.add(4);
    expect(tree.isEmpty()).toBe(false);
    expect(tree.rank(0)).toBe(0);
    expect(tree.rank(1)).toBe(1);
    expect(tree.rank(4)).toBe(1);
    expect(tree.rank(5)).toBe(2);
  });

  it('clear resets size, emptiness and ranks', () => {
    const tree = new BinaryIndexedTree(MAX_NUM);
    tree.add(1);
    tree.add(1);
    tree.clear();
    expect(tree.size()).toBe(0);
    expect(tree.isEmpty()).toBe(true);
    expect(tree.rank(MAX_NUM)).toBe(0);
  });

  it('removeAll of an index without entries changes nothing', () => {
    const tree = new BinaryIndexedTree(MAX_NUM);
    tree.add(2);
    tree.removeAll(3);
    expect(tree.size()).toBe(1);
    expect(tree.rank(MAX_NUM)).toBe(1);
  });

  it('throws ArrayIndexOutOfBoundsException for an index beyond maxNum, as the Java array access does', () => {
    const tree = new BinaryIndexedTree(MAX_NUM);
    expect(() => tree.add(MAX_NUM)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => tree.add(MAX_NUM)).toThrow('Index 5 out of bounds for length 5');
    expect(() => tree.removeAll(MAX_NUM)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => tree.rank(MAX_NUM + 1)).toThrow(ArrayIndexOutOfBoundsException);
  });
});
