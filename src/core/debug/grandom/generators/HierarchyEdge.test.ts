// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { HierarchyEdge } from './HierarchyEdge.js';

describe('HierarchyEdge', () => {
  it('stores head, tail and id and starts without a next edge', () => {
    const edge = new HierarchyEdge(3, 5, 7);
    expect([edge.getHead(), edge.getTail(), edge.getId(), edge.getNext()]).toEqual([3, 5, 7, null]);
  });

  it('links to the next edge', () => {
    const edge = new HierarchyEdge(1, 2, 3);
    const other = new HierarchyEdge(4, 5, 6);
    edge.setNext(other);
    expect(edge.getNext()).toBe(other);
  });
});
