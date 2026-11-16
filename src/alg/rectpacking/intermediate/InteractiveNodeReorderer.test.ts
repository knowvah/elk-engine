// SPDX-License-Identifier: EPL-2.0
// InteractiveNodeReorderer.java:41-74, on small inputs whose result follows from the Java statements: nodes with a DESIRED_POSITION are
// removed, sorted by it (equal positions compare -1 both ways, PK7) and re-inserted at min(position, size); then CURRENT_POSITION is
// the index of every child. The tie order of the real sort is proven by RectPackingVectors.test.ts (PK7 sort rows).
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { compareDesiredPositions, InteractiveNodeReorderer } from './InteractiveNodeReorderer.js';

/** Children `a`, `b`, `c`, ... in order, the entries of `desired` (by id) with a DESIRED_POSITION. */
function graphWith(ids: string, desired: Readonly<Record<string, number>>): ElkNode {
  const parent = ElkGraphUtil.createGraph();
  for (const id of ids) {
    const node = ElkGraphUtil.createNode(parent);
    node.setIdentifier(id);
    if (id in desired) {
      node.setProperty(RectPackingOptions.DESIRED_POSITION, desired[id]!);
    }
  }
  return parent;
}

const order = (parent: ElkNode): (string | null)[] => [...parent.getChildren()].map((child) => child.getIdentifier());

describe('InteractiveNodeReorderer', () => {
  it('moves a node to its desired position and numbers every child', () => {
    const parent = graphWith('abc', { c: 0 });
    new InteractiveNodeReorderer().process(parent, new BasicProgressMonitor());
    expect(order(parent)).toEqual(['c', 'a', 'b']);
    expect([...parent.getChildren()].map((child) => child.getProperty(RectPackingOptions.CURRENT_POSITION))).toEqual([
      0, 1, 2,
    ]);
  });

  it('clamps a desired position beyond the end to the end', () => {
    const parent = graphWith('abc', { a: 99 });
    new InteractiveNodeReorderer().process(parent, new BasicProgressMonitor());
    expect(order(parent)).toEqual(['b', 'c', 'a']);
  });

  it('inserts several desired nodes in ascending position order', () => {
    const parent = graphWith('abcd', { a: 3, b: 0 });
    new InteractiveNodeReorderer().process(parent, new BasicProgressMonitor());
    expect(order(parent)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('leaves children without a desired position in their order', () => {
    const parent = graphWith('abc', {});
    new InteractiveNodeReorderer().process(parent, new BasicProgressMonitor());
    expect(order(parent)).toEqual(['a', 'b', 'c']);
  });
});

describe('compareDesiredPositions (InteractiveNodeReorderer.java:56-63)', () => {
  const [low, high, alsoLow] = (() => {
    const parent = graphWith('xyz', { x: 1, y: 2, z: 1 });
    return [...parent.getChildren()];
  })() as [ElkNode, ElkNode, ElkNode];

  it('compares unequal positions as Integer.compare', () => {
    expect(compareDesiredPositions(low, high)).toBe(-1);
    expect(compareDesiredPositions(high, low)).toBe(1);
  });

  it('returns -1 for equal positions in both directions (the contract violation)', () => {
    expect(compareDesiredPositions(low, alsoLow)).toBe(-1);
    expect(compareDesiredPositions(alsoLow, low)).toBe(-1);
  });

  it('reads the default -1 of an unset DESIRED_POSITION', () => {
    const bare = graphWith('q', {}).getChildren().get(0);
    expect(compareDesiredPositions(bare, low)).toBe(-1);
    expect(compareDesiredPositions(low, bare)).toBe(1);
  });
});
