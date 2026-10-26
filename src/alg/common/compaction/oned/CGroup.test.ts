// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { CGraph } from './CGraph.js';
import { CGroup } from './CGroup.js';
import { CNode } from './CNode.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { Direction } from '../../../../core/options/Direction.js';

const newGraph = (): CGraph => new CGraph(EnumSet.allOf(Direction));
const node = (graph: CGraph): CNode =>
  CNode.of()
    .hitbox(new ElkRectangle(0, 0, 1, 1))
    .create(graph);

describe('CGroup', () => {
  it('starts with the Java defaults', () => {
    const graph = newGraph();
    const group = CGroup.of().create(graph);
    expect(group.startPos).toBe(Number.NEGATIVE_INFINITY);
    expect([group.outDegree, group.outDegreeReal, group.delta, group.deltaNormalized, group.id]).toEqual([
      0, 0, 0, 0, 0,
    ]);
    expect(group.master).toBeNull();
    expect(group.cNodes.size).toBe(0);
    expect(group.incomingConstraints.size).toBe(0);
  });

  it('create registers the group in the graph', () => {
    const graph = newGraph();
    const group = CGroup.of().create(graph);
    expect(graph.cGroups).toEqual([group]);
  });

  it('adds nodes in insertion order, sets their group and takes the first as reference', () => {
    const graph = newGraph();
    const [a, b, c] = [node(graph), node(graph), node(graph)] as [CNode, CNode, CNode];
    const group = CGroup.of().nodes(c, a, b).create(graph);
    expect([...group.cNodes]).toEqual([c, a, b]);
    expect([a.cGroup, b.cGroup, c.cGroup]).toEqual([group, group, group]);
    expect(group.reference).toBe(c);
  });

  it('refuses a node that belongs to another group', () => {
    const graph = newGraph();
    const a = node(graph);
    CGroup.of().nodes(a).create(graph);
    const other = CGroup.of().create(graph);
    expect(() => other.addCNode(a)).toThrow(RuntimeException);
    expect(() => other.addCNode(a)).toThrow('CNode belongs to another CGroup.');
    expect(other.cNodes.size).toBe(0);
  });

  it('builder sets reference and master explicitly', () => {
    const graph = newGraph();
    const [a, b] = [node(graph), node(graph)] as [CNode, CNode];
    const group = CGroup.of().nodes(a, b).reference(b).master(a).create(graph);
    expect(group.reference).toBe(b);
    expect(group.master).toBe(a);
  });

  it('removeCNode removes a member and clears its group, and reports non-members', () => {
    const graph = newGraph();
    const [a, b] = [node(graph), node(graph)] as [CNode, CNode];
    const group = CGroup.of().nodes(a).create(graph);
    expect(group.removeCNode(a)).toBe(true);
    expect(a.cGroup).toBeNull();
    expect(group.cNodes.size).toBe(0);
    expect(group.removeCNode(b)).toBe(false);
  });
});
