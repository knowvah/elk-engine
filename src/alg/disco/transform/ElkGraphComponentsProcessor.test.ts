// SPDX-License-Identifier: EPL-2.0
// Branches of ElkGraphComponentsProcessor the rows of disco.json do not reach; each expectation is derived from reading
// ElkGraphComponentsProcessor.java (the line is in the test name).
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { ElkGraphComponentsProcessor } from './ElkGraphComponentsProcessor.js';

const idsOf = (nodes: readonly ElkNode[]): (string | null)[] => nodes.map((n) => n.getIdentifier());

function named(parent: ElkNode, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setIdentifier(id);
  return node;
}

describe('ElkGraphComponentsProcessor', () => {
  it('split puts two unconnected children into two components in node order (split)', () => {
    const root = ElkGraphUtil.createGraph();
    const a = named(root, 'a');
    const b = named(root, 'b');
    expect(ElkGraphComponentsProcessor.split(root).map(idsOf)).toEqual([['a'], ['b']]);
    expect(a.getIdentifier()).toBe('a');
    expect(b.getIdentifier()).toBe('b');
  });

  it('an edge from the node-level parent (no port) to a child adds no neighbor (java:125, port == null)', () => {
    const root = ElkGraphUtil.createGraph();
    const g = named(root, 'g');
    const c = named(g, 'c');
    const d = named(g, 'd');
    ElkGraphUtil.createSimpleEdge(g, c);
    ElkGraphUtil.createSimpleEdge(c, g);
    expect(ElkGraphComponentsProcessor.split(g).map(idsOf)).toEqual([['c'], ['d']]);
    expect(d.getIdentifier()).toBe('d');
  });

  it('an edge from a parent port joins every child attached to that port through one cached set (java:125-134)', () => {
    const root = ElkGraphUtil.createGraph();
    const g = named(root, 'g');
    const c = named(g, 'c');
    const d = named(g, 'd');
    named(g, 'e');
    const port = ElkGraphUtil.createPort(g);
    ElkGraphUtil.createSimpleEdge(port, c);
    ElkGraphUtil.createSimpleEdge(port, d);
    expect(ElkGraphComponentsProcessor.split(g).map(idsOf)).toEqual([['c', 'd'], ['e']]);
  });

  it('dfs on a node without an incidence entry adds only that node (java:211, adjacentNodes == null)', () => {
    const root = ElkGraphUtil.createGraph();
    const a = named(root, 'a');
    ElkGraphComponentsProcessor.split(ElkGraphUtil.createGraph());
    const component: ElkNode[] = [];
    ElkGraphComponentsProcessor['dfs'](a, component);
    expect(idsOf(component)).toEqual(['a']);
    expect(ElkGraphComponentsProcessor['visited']).toEqual([a]);
  });

  it('an edge at a port of a parentless layout node throws the mapped NullPointerException (java:108)', () => {
    const root = ElkGraphUtil.createGraph();
    const a = named(root, 'a');
    const port = ElkGraphUtil.createPort(root);
    ElkGraphUtil.createSimpleEdge(port, a);
    expect(() => ElkGraphComponentsProcessor.split(root)).toThrow(TypeError);
  });

  it('the private no-argument constructor builds an empty utility object (java:58-60)', () => {
    const Constructor = ElkGraphComponentsProcessor as unknown as new () => object;
    expect(Object.keys(new Constructor())).toEqual([]);
  });
});
