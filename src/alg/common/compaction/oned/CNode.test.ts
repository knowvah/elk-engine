// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { Direction } from '../../../../core/options/Direction.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { CGraph } from './CGraph.js';
import { CNode } from './CNode.js';

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));
const rect = new ElkRectangle(1, 2, 3, 4);

describe('CNode', () => {
  it('starts with the Java defaults', () => {
    const n = CNode.of().create(newGraph());
    expect(n.startPos).toBe(Number.NEGATIVE_INFINITY);
    expect(n.constraints).toEqual([]);
    expect([n.cGroupOffset.x, n.cGroupOffset.y]).toEqual([0, 0]);
    expect([n.cGroup, n.origin, n.type, n.toStringDelegate]).toEqual([null, null, null, null]);
  });

  it('builder sets id, origin, type and hitbox, and create registers the node', () => {
    const graph = newGraph();
    const origin = { name: 'o' };
    const n = CNode.of().id(7).origin(origin).type('segment').hitbox(rect).create(graph);
    expect([n.id, n.origin, n.type, n.hitbox]).toEqual([7, origin, 'segment', rect]);
    expect(graph.cNodes).toEqual([n]);
  });

  it('groupWith(null) applies no grouping', () => {
    const graph = newGraph();
    const n = CNode.of().groupWith(null).create(graph);
    expect(n.cGroup).toBeNull();
    expect(graph.cGroups).toEqual([]);
  });

  it('groupWith a parent without a group creates a group of both', () => {
    const graph = newGraph();
    const parent = CNode.of().create(graph);
    const child = CNode.of().groupWith(parent).create(graph);
    expect(graph.cGroups).toHaveLength(1);
    const group = graph.cGroups[0];
    expect(parent.cGroup).toBe(group);
    expect(child.cGroup).toBe(group);
    expect([...(group?.cNodes ?? [])]).toEqual([parent, child]);
  });

  it('groupWith a parent that has a group joins that group', () => {
    const graph = newGraph();
    const parent = CNode.of().create(graph);
    const first = CNode.of().groupWith(parent).create(graph);
    const second = CNode.of().groupWith(parent).create(graph);
    expect(graph.cGroups).toHaveLength(1);
    expect([...(graph.cGroups[0]?.cNodes ?? [])]).toEqual([parent, first, second]);
  });

  it('toString uses the delegate when set', () => {
    const n = CNode.of()
      .toStringDelegate((x) => `node ${x.id}`)
      .id(3)
      .create(newGraph());
    expect(n.toString()).toBe('node 3');
  });

  it('toString without a delegate is the Java Object.toString shape', () => {
    const n = CNode.of().create(newGraph());
    expect(n.toString()).toMatch(/^org\.eclipse\.elk\.alg\.common\.compaction\.oned\.CNode@[0-9a-f]+$/);
  });

  it('getDebugSVG renders the rect and the text with Java double formatting', () => {
    const n = CNode.of()
      .hitbox(rect)
      .toStringDelegate(() => 'N')
      .create(newGraph());
    expect(n.getDebugSVG()).toBe(
      '<rect x="1.0" y="2.0" width="3.0" height="4.0" fill="green" stroke="black" opacity="0.5"/>' +
        '<text x="3.0" y="13.0">(1, 2)\nN</text>',
    );
  });

  it('getDebugSVG gives empty boxes a size of at least 1', () => {
    const n = CNode.of()
      .hitbox(new ElkRectangle(0.5, 2.5, 0, 0))
      .toStringDelegate(() => 'E')
      .create(newGraph());
    expect(n.getDebugSVG()).toBe(
      '<rect x="0.5" y="2.5" width="1.0" height="1.0" fill="green" stroke="black" opacity="0.5"/>' +
        '<text x="2.5" y="13.5">(1, 3)\nE</text>',
    );
  });
});
