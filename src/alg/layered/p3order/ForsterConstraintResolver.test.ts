// SPDX-License-Identifier: EPL-2.0
// Unit cases of ForsterConstraintResolver and its ConstraintGroup (mission 7c, T6). The layers are built with the
// structural builders; every expected value is a Java formula or a property the Java documents (the constraint
// graph is satisfied, merged groups share one barycenter, layout units do not mix). The oracle orders of the
// constraint rows are proven by T7's replay of the sweep.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { init } from './counting/IInitializable.js';
import { ForsterConstraintResolver } from './ForsterConstraintResolver.js';
import { ForsterConstraintResolverConstraintGroup } from './ForsterConstraintResolverConstraintGroup.js';

interface Layer {
  readonly graph: LGraph;
  readonly nodes: LNode[];
  readonly resolver: ForsterConstraintResolver;
}

/** One layer of nodes of the given types, numbered the way the P3 initialisation does (`LayerSweepTypeDecider`). */
function layerOf(types: readonly NodeType[], betweenNonDummies = false): Layer {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES, betweenNonDummies);
  const layer = addLayer(graph);
  layer.id = 0;
  const nodes = types.map((type, i) => {
    const node = addNode(graph, type);
    node.setLayer(layer);
    addPort(node);
    node.id = i;
    // the list default needs `LayoutMetaDataService.initElkReflect()`; the nodes carry the empty list explicitly
    node.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, []);
    return node;
  });
  const resolver = new ForsterConstraintResolver([nodes]);
  init([resolver], [nodes]);
  return { graph, nodes, resolver };
}

const normals = (count: number): NodeType[] => Array.from({ length: count }, () => NodeType.NORMAL);

/** Sets the barycenters in layer order and answers a fresh array of the nodes, the list `processConstraints` sorts. */
function withBarycenters(layer: Layer, values: readonly number[]): LNode[] {
  layer.nodes.forEach((node, i) => {
    layer.resolver.stateOf(node).barycenter = values[i]!;
  });
  return [...layer.nodes];
}

const barycentersOf = (layer: Layer, nodes: readonly LNode[]): (number | null)[] =>
  nodes.map((node) => layer.resolver.stateOf(node).barycenter);

describe('ForsterConstraintResolver: initialisation', () => {
  it('creates a barycenter state per node, indexed by layer id and node id', () => {
    const { nodes, resolver } = layerOf(normals(3));
    const states = resolver.getBarycenterStates();
    expect(states.length).toBe(1);
    expect(states[0]!.map((state) => state.node)).toEqual(nodes);
    expect(states[0]!.map((state) => [state.degree, state.barycenter, state.visited])).toEqual([
      [0, null, false],
      [0, null, false],
      [0, null, false],
    ]);
  });

  it('reads the successor constraints flag of the first node graph, false for an empty order', () => {
    expect(new ForsterConstraintResolver([]).getBarycenterStates()).toEqual([]);
    expect(new ForsterConstraintResolver([[]]).getBarycenterStates().length).toBe(1);
  });
});

describe('ForsterConstraintResolver: processConstraints', () => {
  it('leaves an unconstrained layer and its barycenters alone', () => {
    const layer = layerOf(normals(3));
    const nodes = withBarycenters(layer, [3, 1, 2]);
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual(layer.nodes);
    expect(barycentersOf(layer, nodes)).toEqual([3, 1, 2]);
  });

  it('keeps a satisfied constraint', () => {
    const layer = layerOf(normals(2));
    const [a, b] = layer.nodes as [LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    const nodes = withBarycenters(layer, [1, 3]);
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b]);
    expect(barycentersOf(layer, nodes)).toEqual([1, 3]);
  });

  it('merges the two groups of a violated constraint into one group with the mean barycenter', () => {
    const layer = layerOf(normals(3));
    const [a, b, c] = layer.nodes as [LNode, LNode, LNode];
    // sorted by barycenter: b (1), a (3), c (10); a has to precede b
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    const nodes = [b, a, c];
    layer.resolver.stateOf(b).barycenter = 1;
    layer.resolver.stateOf(a).barycenter = 3;
    layer.resolver.stateOf(c).barycenter = 10;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b, c]);
    expect(barycentersOf(layer, nodes)).toEqual([(3 + 1) / 2, (3 + 1) / 2, 10]);
  });

  it('puts the merged group behind a group with a smaller barycenter and in front of a greater one', () => {
    const layer = layerOf(normals(4));
    const [low, a, b, high] = layer.nodes as [LNode, LNode, LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    const nodes = [low, b, a, high];
    layer.resolver.stateOf(low).barycenter = 0;
    layer.resolver.stateOf(b).barycenter = 1;
    layer.resolver.stateOf(a).barycenter = 3;
    layer.resolver.stateOf(high).barycenter = 10;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([low, a, b, high]);
  });

  it('compares barycenters as floats: a double difference below the float precision is a tie', () => {
    const layer = layerOf(normals(2));
    const [a, b] = layer.nodes as [LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    // a > b as doubles, but equal as floats; a has the lower index, so the constraint is not violated (Java `floatValue()`)
    const nodes = [a, b];
    layer.resolver.stateOf(a).barycenter = 1 + 1e-10;
    layer.resolver.stateOf(b).barycenter = 1;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b]);
    expect(barycentersOf(layer, nodes)).toEqual([1 + 1e-10, 1]);
  });

  it('violates a constraint between float-equal barycenters when the predecessor has the higher index', () => {
    const layer = layerOf(normals(2));
    const [a, b] = layer.nodes as [LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    const nodes = [b, a];
    layer.resolver.stateOf(a).barycenter = 1 + 1e-10;
    layer.resolver.stateOf(b).barycenter = 1;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b]);
  });

  it('keeps the order of a chain of constraints and merges its violating groups', () => {
    const layer = layerOf(normals(3));
    const [a, b, c] = layer.nodes as [LNode, LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b]);
    b.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [c]);
    const nodes = [c, b, a];
    layer.resolver.stateOf(c).barycenter = 1;
    layer.resolver.stateOf(b).barycenter = 2;
    layer.resolver.stateOf(a).barycenter = 3;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b, c]);
    expect(new Set(barycentersOf(layer, nodes)).size).toBe(1);
  });

  it('counts a common successor of both merged groups once', () => {
    const layer = layerOf(normals(3));
    const [a, b, c] = layer.nodes as [LNode, LNode, LNode];
    a.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [b, c]);
    b.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [c]);
    const nodes = [b, a, c];
    layer.resolver.stateOf(b).barycenter = 1;
    layer.resolver.stateOf(a).barycenter = 2;
    layer.resolver.stateOf(c).barycenter = 3;
    layer.resolver.processConstraints(nodes);
    expect(nodes).toEqual([a, b, c]);
  });

  it('processes constraints between normal nodes first and then keeps layout units together', () => {
    // unit 1: n1 with d1 and d2; unit 2: n2 with d3. Sorted by barycenter: d1, d3, n1, n2, d2.
    const layer = layerOf(
      [
        NodeType.NORTH_SOUTH_PORT,
        NodeType.NORTH_SOUTH_PORT,
        NodeType.NORMAL,
        NodeType.NORMAL,
        NodeType.NORTH_SOUTH_PORT,
      ],
      true,
    );
    const [d1, d3, n1, n2, d2] = layer.nodes as [LNode, LNode, LNode, LNode, LNode];
    for (const node of [n1, d1, d2]) {
      node.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, n1);
    }
    for (const node of [n2, d3]) {
      node.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, n2);
    }
    // a constraint towards a dummy is ignored in the first stage, one between normal nodes is kept
    n1.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [n2, d3]);
    const resolver = new ForsterConstraintResolver([layer.nodes]);
    init([resolver], [layer.nodes]);
    const nodes = [d1, d3, n1, n2, d2];
    [0, 1, 2, 3, 4].forEach((value, i) => {
      resolver.stateOf(nodes[i]!).barycenter = value;
    });
    resolver.processConstraints(nodes);
    const indexOf = (node: LNode): number => nodes.indexOf(node);
    expect(Math.max(indexOf(n1), indexOf(d1), indexOf(d2))).toBeLessThan(Math.min(indexOf(n2), indexOf(d3)));
    expect([...nodes].sort((x, y) => x.id - y.id)).toEqual(layer.nodes);
  });
});

describe('ForsterConstraintResolver: ConstraintGroup', () => {
  function groupsOf(count: number): { layer: Layer; groups: ForsterConstraintResolverConstraintGroup[] } {
    const layer = layerOf(normals(count));
    return {
      layer,
      groups: layer.nodes.map((node) => new ForsterConstraintResolverConstraintGroup(layer.resolver, node)),
    };
  }

  it('holds one node and shares the barycenter with the node state', () => {
    const { layer, groups } = groupsOf(1);
    const group = groups[0]!;
    expect(group.getNode()).toBe(layer.nodes[0]);
    expect(group.getNodes()).toEqual([layer.nodes[0]]);
    expect(group.getBarycenter()).toBeNull();
    group.setBarycenter(2.5);
    expect(layer.resolver.stateOf(layer.nodes[0]!).barycenter).toBe(2.5);
  });

  it('creates the constraint lists on demand and resets them to null', () => {
    const { groups } = groupsOf(2);
    const [a, b] = groups as [ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup];
    expect([a.hasOutgoingConstraints(), a.hasIncomingConstraints()]).toEqual([false, false]);
    a.getOutgoingConstraints().push(b);
    b.getIncomingConstraints().push(a);
    expect([a.hasOutgoingConstraints(), b.hasIncomingConstraints()]).toEqual([true, true]);
    a.resetOutgoingConstraints();
    b.resetIncomingConstraints();
    expect([a.hasOutgoingConstraints(), b.hasIncomingConstraints()]).toEqual([false, false]);
  });

  it('merges to the weighted barycenter when the groups carry a degree', () => {
    const { layer, groups } = groupsOf(2);
    const [a, b] = groups as [ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup];
    a.summedWeight = 6;
    a.degree = 2;
    b.summedWeight = 3;
    b.degree = 1;
    const merged = new ForsterConstraintResolverConstraintGroup(layer.resolver, a, b);
    expect(merged.getNodes()).toEqual(layer.nodes);
    expect([merged.summedWeight, merged.degree]).toEqual([9, 3]);
    expect(merged.getBarycenter()).toBe(9 / 3);
  });

  it.each([
    ['both barycenters known', 2, 4, (2 + 4) / 2, (2 + 4) / 2],
    ['only the first known', 2, null, 2, 2],
    ['only the second known', null, 4, 4, 4],
    ['neither known', null, null, null, null],
  ])('merges a degree-less pair with %s', (_name, first, second, firstAfter, secondAfter) => {
    const { layer, groups } = groupsOf(2);
    const [a, b] = groups as [ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup];
    a.setBarycenter(first);
    b.setBarycenter(second);
    const merged = new ForsterConstraintResolverConstraintGroup(layer.resolver, a, b);
    expect([merged.getBarycenter(), a.getBarycenter(), b.getBarycenter()]).toEqual([
      firstAfter,
      firstAfter,
      secondAfter,
    ]);
  });

  it('merges the outgoing constraints of both groups without the groups themselves', () => {
    const { layer, groups } = groupsOf(4);
    const [a, b, c, d] = groups as [
      ForsterConstraintResolverConstraintGroup,
      ForsterConstraintResolverConstraintGroup,
      ForsterConstraintResolverConstraintGroup,
      ForsterConstraintResolverConstraintGroup,
    ];
    a.getOutgoingConstraints().push(b, c);
    b.getOutgoingConstraints().push(a, c, d);
    c.incomingConstraintsCount = 2;
    const merged = new ForsterConstraintResolverConstraintGroup(layer.resolver, a, b);
    expect(merged.getOutgoingConstraints()).toEqual([c, d]);
    expect(c.incomingConstraintsCount).toBe(1);
    // only the second group has outgoing constraints
    const { layer: layer2, groups: groups2 } = groupsOf(3);
    groups2[1]!.getOutgoingConstraints().push(groups2[0]!, groups2[2]!);
    const mergedSecond = new ForsterConstraintResolverConstraintGroup(layer2.resolver, groups2[0]!, groups2[1]!);
    expect(mergedSecond.getOutgoingConstraints()).toEqual([groups2[2]]);
  });

  it('describes its nodes with their barycenters', () => {
    const { layer, groups } = groupsOf(2);
    const [a, b] = groups as [ForsterConstraintResolverConstraintGroup, ForsterConstraintResolverConstraintGroup];
    const merged = new ForsterConstraintResolverConstraintGroup(layer.resolver, a, b);
    expect(merged.toString()).toBe(`[${layer.nodes[0]!.toString()}, ${layer.nodes[1]!.toString()}]`);
    merged.setBarycenter(1.5);
    expect(merged.toString()).toBe(`[${layer.nodes[0]!.toString()}<1.5>, ${layer.nodes[1]!.toString()}<1.5>]`);
  });
});
