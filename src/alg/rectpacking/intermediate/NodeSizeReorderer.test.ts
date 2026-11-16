// SPDX-License-Identifier: EPL-2.0
// NodeSizeReorderer.java:40 sorts the children with ECollections.sort and NodeSizeComparator (Double.compare of the heights, descending);
// the sort is stable, so equal heights keep their order ("while preserving any existing ordering").
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { NodeSizeComparator } from './NodeSizeComparator.js';
import { NodeSizeReorderer } from './NodeSizeReorderer.js';

const nodeOfHeight = (parent: ReturnType<typeof ElkGraphUtil.createGraph>, id: string, height: number) => {
  const node = ElkGraphUtil.createNode(parent);
  node.setIdentifier(id);
  node.setDimensions(10, height);
  return node;
};

describe('NodeSizeComparator', () => {
  it('compares the second height with the first: taller nodes sort first, equal heights tie', () => {
    const parent = ElkGraphUtil.createGraph();
    const short = nodeOfHeight(parent, 'short', 10);
    const tall = nodeOfHeight(parent, 'tall', 20);
    const comparator = new NodeSizeComparator();
    expect(comparator.compare(short, tall)).toBe(1);
    expect(comparator.compare(tall, short)).toBe(-1);
    expect(comparator.compare(tall, tall)).toBe(0);
  });
});

describe('NodeSizeReorderer', () => {
  it('sorts the children by height descending and keeps the order of equal heights', () => {
    const parent = ElkGraphUtil.createGraph();
    nodeOfHeight(parent, 'a', 10);
    nodeOfHeight(parent, 'b', 30);
    nodeOfHeight(parent, 'c', 10);
    nodeOfHeight(parent, 'd', 30);
    new NodeSizeReorderer().process(parent, new BasicProgressMonitor());
    expect([...parent.getChildren()].map((child) => child.getIdentifier())).toEqual(['b', 'd', 'a', 'c']);
  });
});
