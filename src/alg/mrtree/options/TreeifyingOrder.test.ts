// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { TreeifyingOrder } from './TreeifyingOrder.js';

const DECLARED = ['DFS', 'BFS'] as const;

describe('TreeifyingOrder', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(TreeifyingOrder.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(TreeifyingOrder.values()[1]).toBe(TreeifyingOrder.BFS);
  });

  it('compareTo orders by ordinal', () => {
    expect(TreeifyingOrder.BFS.compareTo(TreeifyingOrder.DFS)).toBe(1);
    expect(TreeifyingOrder.DFS.compareTo(TreeifyingOrder.BFS)).toBe(-1);
    expect(TreeifyingOrder.DFS.compareTo(TreeifyingOrder.DFS)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TreeifyingOrder.valueOf(name)).toBe(TreeifyingOrder[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TreeifyingOrder.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TreeifyingOrder.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.options.TreeifyingOrder.FOO',
    );
  });
});
