// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { DefaultSelectionIterator } from './DefaultSelectionIterator.js';

interface Chain {
  e1: ElkEdge;
  e2: ElkEdge;
  e3: ElkEdge;
  p1: ElkPort;
  p2: ElkPort;
}

/** e1 -> p1, e2: p1 -> p2, e3: p2 -> node (a non-port target); e1 starts at a node. */
function chain(): Chain {
  const graph = ElkGraphUtil.createGraph();
  const a = ElkGraphUtil.createNode(graph);
  const b = ElkGraphUtil.createNode(graph);
  const p1 = ElkGraphUtil.createPort(a);
  const p2 = ElkGraphUtil.createPort(b);
  return {
    e1: ElkGraphUtil.createSimpleEdge(a, p1),
    e2: ElkGraphUtil.createSimpleEdge(p1, p2),
    e3: ElkGraphUtil.createSimpleEdge(p2, b),
    p1,
    p2,
  };
}

function toList(it: Iterable<unknown>): unknown[] {
  return [...it];
}

describe('DefaultSelectionIterator', () => {
  beforeAll(() => {
    // graph factory registration happens on import of ElkGraphUtil
  });

  it('follows the edge direction and includes ports', () => {
    const c = chain();
    expect(toList(new DefaultSelectionIterator(c.e1, true, true))).toEqual([c.p1, c.e2, c.p2, c.e3]);
  });

  it('follows the edge direction without ports', () => {
    const c = chain();
    expect(toList(new DefaultSelectionIterator(c.e1, false, true))).toEqual([c.e2, c.e3]);
  });

  it('follows against the edge direction and includes ports', () => {
    const c = chain();
    expect(toList(new DefaultSelectionIterator(c.e3, true, false))).toEqual([c.p2, c.e2, c.p1, c.e1]);
  });

  it('follows against the edge direction without ports', () => {
    const c = chain();
    expect(toList(new DefaultSelectionIterator(c.e3, false, false))).toEqual([c.e2, c.e1]);
  });

  it('yields nothing when the edge ends at a non-port shape', () => {
    const c = chain();
    expect(toList(new DefaultSelectionIterator(c.e3, true, true))).toEqual([]);
  });

  it('breaks a port cycle by visiting each port once', () => {
    const c = chain();
    const back = ElkGraphUtil.createSimpleEdge(c.p2, c.p1);
    const it = new DefaultSelectionIterator(c.e1, true, true);
    const result = toList(it);
    expect(result).toEqual([c.p1, c.e2, c.p2, c.e3, back]);
    expect(result.filter((x) => x === c.p1)).toHaveLength(1);
    expect(result.filter((x) => x === c.p2)).toHaveLength(1);
  });

  it('shares a visited set across iterators via attachVisitedSet', () => {
    const c = chain();
    const visited = new Set<ElkPort>();
    const first = new DefaultSelectionIterator(c.e1, true, true);
    first.attachVisitedSet(visited);
    expect(toList(first)).toEqual([c.p1, c.e2, c.p2, c.e3]);
    expect([...visited]).toEqual([c.p1, c.p2]);
    const second = new DefaultSelectionIterator(c.e1, true, true);
    second.attachVisitedSet(visited);
    expect(toList(second)).toEqual([]);
  });

  it('skips the children of a pruned edge', () => {
    const c = chain();
    const it = new DefaultSelectionIterator(c.e1, false, true);
    expect(it.nextElement()).toBe(c.e2);
    it.prune();
    expect(it.hasNext()).toBe(false);
  });

  it('keeps the start edge out of the result', () => {
    const c = chain();
    const result: unknown[] = toList(new DefaultSelectionIterator(c.e1, true, true));
    expect(result).not.toContain(c.e1);
    const node: ElkNode = ElkGraphUtil.createNode(null);
    expect(result).not.toContain(node);
  });
});
