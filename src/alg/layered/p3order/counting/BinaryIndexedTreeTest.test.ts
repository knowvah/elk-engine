// SPDX-License-Identifier: EPL-2.0
// Port of BinaryIndexedTreeTest (3 cases, graph-free); every value is the Java test's.
// @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p3order/counting/BinaryIndexedTreeTest.java
import { describe, expect, it } from 'vitest';
import { BinaryIndexedTree } from './BinaryIndexedTree.js';

const MAX_NUM = 5;

describe('BinaryIndexedTreeTest', () => {
  it('sumBefore', () => {
    const ft = new BinaryIndexedTree(MAX_NUM);
    ft.add(1);
    ft.add(2);
    ft.add(1);

    expect(ft.rank(1)).toBe(0);
    expect(ft.rank(2)).toBe(2);
  });

  it('size', () => {
    const ft = new BinaryIndexedTree(MAX_NUM);
    ft.add(2);
    ft.add(1);
    ft.add(1);

    expect(ft.size()).toBe(3);
  });

  it('removeAll', () => {
    const ft = new BinaryIndexedTree(MAX_NUM);
    ft.add(0);
    ft.add(2);
    ft.add(1);
    ft.add(1);

    ft.removeAll(1);

    expect(ft.size()).toBe(2);
    expect(ft.rank(2)).toBe(1);

    ft.removeAll(1);

    expect(ft.size()).toBe(2);
    expect(ft.rank(2)).toBe(1);
  });
});
