// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Tree } from './Tree.js';

describe('Tree', () => {
  it('holds a node and starts with no children', () => {
    const t = new Tree<string>('root');
    expect(t.node).toBe('root');
    expect(t.children).toEqual([]);
  });

  it('keeps children in insertion order and gives each tree its own list', () => {
    const t = new Tree<number>(1);
    const a = new Tree<number>(2);
    const b = new Tree<number>(3);
    t.children.push(a, b);
    expect(t.children.map((c) => c.node)).toEqual([2, 3]);
    expect(a.children).toEqual([]);
  });
});
