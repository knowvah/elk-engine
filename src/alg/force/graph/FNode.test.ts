// SPDX-License-Identifier: EPL-2.0
// Java-traced proof of FNode (mission 8b, T6; expectations read from FNode.java, the line named in the test name).
import { describe, expect, it } from 'vitest';
import { FNode } from './FNode.js';

describe('FNode', () => {
  it('FNode.java:45-65: the constructors set label and parent, the default constructor sets neither', () => {
    const parent = new FNode('p');
    const child = new FNode('c', parent);
    const plain = new FNode();
    expect([child.getLabel(), child.getParent()]).toEqual(['c', parent]);
    expect([plain.getLabel(), plain.getParent(), plain.id]).toEqual([null, null, 0]);
    expect(new FNode('only').getParent()).toBeNull();
  });

  it('FNode.java:69-75: toString is n_ plus the label, or plus the id when the label is null or empty', () => {
    const a = new FNode('alpha');
    const b = new FNode('');
    b.id = 7;
    const c = new FNode();
    c.id = 3;
    expect([a.toString(), b.toString(), c.toString()]).toEqual(['n_alpha', 'n_7', 'n_3']);
  });

  it('FNode.java:82-84, 109-114: a node is compound once its children list, created on demand, is not empty', () => {
    const node = new FNode('x');
    expect(node.isCompound()).toBe(false);
    expect(node.getChildren()).toEqual([]);
    expect(node.isCompound()).toBe(false);
    node.getChildren().push(new FNode('y', node));
    expect(node.isCompound()).toBe(true);
    expect(node.getChildren()).toBe(node.getChildren());
  });

  it('FNode.java:121-129: the depth counts the parents up to the root', () => {
    const root = new FNode('r');
    const mid = new FNode('m', root);
    const leaf = new FNode('l', mid);
    expect([root.getDepth(), mid.getDepth(), leaf.getDepth()]).toEqual([0, 1, 2]);
  });
});
