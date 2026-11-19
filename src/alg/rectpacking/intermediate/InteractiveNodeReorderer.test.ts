// SPDX-License-Identifier: EPL-2.0
// InteractiveNodeReorderer.java:41-81, on small inputs whose result follows from the Java statements: nodes with a DESIRED_POSITION are
// removed, sorted by it (equal positions compare by model order, the later node first: eclipse-elk/elk#1237, PK7) and re-inserted at
// min(position, size); then CURRENT_POSITION is the index of every child. The tie order of the real sort is proven by
// RectPackingVectors.test.ts (PK7 sort rows).
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

describe('compareDesiredPositions (InteractiveNodeReorderer.java:63-71)', () => {
  const [low, high, alsoLow] = (() => {
    const parent = graphWith('xyz', { x: 1, y: 2, z: 1 });
    return [...parent.getChildren()];
  })() as [ElkNode, ElkNode, ElkNode];
  /** The model order the processor builds (`:50-56`): the index among the nodes with a desired position. */
  const modelOrder = new Map<ElkNode, number>([
    [low, 0],
    [high, 1],
    [alsoLow, 2],
  ]);

  it('compares unequal positions as Integer.compare', () => {
    expect(compareDesiredPositions(modelOrder)(low, high)).toBe(-1);
    expect(compareDesiredPositions(modelOrder)(high, low)).toBe(1);
  });

  // The comparator takes the model order since eclipse-elk/elk#1237 (issue #104, D5.6: the call sites change, the expected
  // values stay). Until e7eaea57 a tie gave -1 whichever node came first; now it gives -1 when the first argument is the
  // later node of the model order, so each of the two calls names its model order.
  it('returns -1 for equal positions when the first node is the later one in model order', () => {
    const lowIsLater = new Map<ElkNode, number>([
      [alsoLow, 0],
      [low, 1],
    ]);
    const alsoLowIsLater = new Map<ElkNode, number>([
      [low, 0],
      [alsoLow, 1],
    ]);
    expect(compareDesiredPositions(lowIsLater)(low, alsoLow)).toBe(-1);
    expect(compareDesiredPositions(alsoLowIsLater)(alsoLow, low)).toBe(-1);
  });

  it('is a total order on equal positions: the earlier node compares 1, a node with itself 0', () => {
    const compare = compareDesiredPositions(modelOrder);
    expect(compare(alsoLow, low)).toBe(-1);
    expect(compare(low, alsoLow)).toBe(1);
    expect(compare(low, low)).toBe(0);
  });

  it('throws the unboxing NullPointerException for a tie with a node that has no model order', () => {
    expect(() => compareDesiredPositions(new Map())(low, alsoLow)).toThrow(
      new TypeError(
        'Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null',
      ),
    );
  });

  it('reads the default -1 of an unset DESIRED_POSITION', () => {
    const bare = graphWith('q', {}).getChildren().get(0);
    expect(compareDesiredPositions(modelOrder)(bare, low)).toBe(-1);
    expect(compareDesiredPositions(modelOrder)(low, bare)).toBe(1);
  });
});
