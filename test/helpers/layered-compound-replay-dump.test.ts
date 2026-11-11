// SPDX-License-Identifier: EPL-2.0
// Structure tests of the compound whole-tree dump and its comparison, on hand-built nested LGraphs (no layout literal).
import { describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import {
  CROSS_HIERARCHY_FIELD,
  LAYER_NODES_FIELD,
  LEVEL_PATH_FIELD,
  compareTree,
  crossHierarchyDump,
  dumpTree,
  HAS_PORTED_COMPARATOR,
  levelPathOfGraph,
  treeIgnoredIds,
  withoutIgnoredProperties,
  type CrossHierarchySegment,
  type CrossHierarchySource,
  type SegmentComparator,
  type TreeDump,
} from './layered-compound-replay-dump.js';
import { addLayer, addNode, addPort, connect } from './lgraph-builders.js';

interface Tree {
  readonly root: LGraph;
  readonly nested: LGraph;
  readonly outer: LNode;
  readonly sibling: LNode;
  readonly inner: LNode;
  readonly rootEdge: LEdge;
  readonly nestedEdge: LEdge;
}

function elkNode(parent: ElkNode | null, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setIdentifier(id);
  return node;
}

/** root { outer { inner -> inner2 }, sibling }, outer -> sibling on the root; ELK origins root, root/outer. */
function twoLevelTree(): Tree {
  const root = new LGraph();
  const nested = new LGraph();
  const elkRoot = elkNode(null, 'root');
  root.setProperty(InternalProperties.ORIGIN, elkRoot);
  nested.setProperty(InternalProperties.ORIGIN, elkNode(elkRoot, 'outer'));
  const outer = addNode(root);
  const sibling = addNode(root);
  outer.setNestedGraph(nested);
  nested.setParentNode(outer);
  const inner = addNode(nested);
  const inner2 = addNode(nested);
  const rootEdge = connect(addPort(outer, PortSide.EAST), addPort(sibling, PortSide.WEST));
  const nestedEdge = connect(addPort(inner, PortSide.EAST), addPort(inner2, PortSide.WEST));
  return { root, nested, outer, sibling, inner, rootEdge, nestedEdge };
}

/** Moves a node from the layerless list into a layer (Java `setLayer` leaves the layerless list alone). */
function toLayer(graph: LGraph, node: LNode, layer: Layer): void {
  graph.getLayerlessNodes().splice(graph.getLayerlessNodes().indexOf(node), 1);
  node.setLayer(layer);
}

const segment = (edge: LEdge, graph: LGraph, type: string): CrossHierarchySegment => ({
  getEdge: () => edge,
  getGraph: () => graph,
  getType: () => ({ name: () => type }),
});

const sourceOf = (entries: [LEdge, CrossHierarchySegment[]][]): CrossHierarchySource => ({
  keySet: () => entries.map(([key]) => key),
  get: (key) => entries.find(([k]) => k === key)![1],
});

describe('dumpTree', () => {
  it('dumps every graph once, in pre-order, with its level path and the landed nested link of its node', () => {
    const dump = dumpTree(twoLevelTree().root);
    expect(dump.graphs.map((graph) => graph.path)).toEqual(['g0', 'g1']);
    expect(dump.graphs.map((graph) => graph[LEVEL_PATH_FIELD])).toEqual(['root', 'root/outer']);
    const byNode = new Map(dump.graphs[0]!.layerlessNodes.map((node) => [node.path, node]));
    expect(byNode.get('g0/n0')!.nested).toBe('g1');
    expect(byNode.get('g0/n1')!.nested).toBeNull();
    expect('nestedGraph' in byNode.get('g0/n0')!).toBe(false);
    expect(dump.graphs[1]!.layerlessNodes.map((node) => node.nested)).toEqual([null, null]);
  });

  it('lists the nodes and edges of each graph under that graph', () => {
    const dump = dumpTree(twoLevelTree().root);
    expect(dump.graphs[0]!.layerlessNodes.map((node) => node.path)).toEqual(['g0/n0', 'g0/n1']);
    expect(dump.graphs[0]!.edges.map((edge) => edge.path)).toEqual(['g0/e0']);
    expect(dump.graphs[1]!.layerlessNodes.map((node) => node.path)).toEqual(['g1/n0', 'g1/n1']);
    expect(dump.graphs[1]!.edges.map((edge) => edge.path)).toEqual(['g1/e0']);
  });

  it('numbers an edge that two graphs meet in the first graph that meets it', () => {
    const { root, outer, inner } = twoLevelTree();
    const across = connect(addPort(inner, PortSide.EAST), addPort(outer, PortSide.WEST));
    const dump = dumpTree(root);
    const owner = dump.graphs.find((graph) => graph.edges.some((edge) => edge.source === 'g1/n0/p1'));
    expect(owner!.path).toBe('g0');
    expect(dump.graphs[1]!.edges.map((edge) => edge.path)).toEqual(['g1/e0']);
    expect(across.getSource()).not.toBeNull();
  });

  it('dumps the nodes that only sit in a layer under layerNodes, in path order, with the node field set', () => {
    const { root, nested, inner } = twoLevelTree();
    const layer = addLayer(nested);
    const second = addNode(nested);
    for (const node of [second, inner]) {
      toLayer(nested, node, layer);
    }
    const before = nested.getLayerlessNodes().length;
    const dump = dumpTree(root);
    const keys = (node: object): string[] => Object.keys(node).sort();
    const layerNodes = dump.graphs[1]![LAYER_NODES_FIELD];
    expect(layerNodes.map((node) => node.path)).toEqual(['g1/n1', 'g1/n2']);
    expect(layerNodes.map((node) => node.path)).toEqual(dump.graphs[1]!.layers.flat());
    expect(keys(layerNodes[0]!)).toEqual(keys(dump.graphs[0]!.layerlessNodes[0]!));
    expect(dump.graphs[1]!.layerlessNodes.map((node) => node.path)).toEqual(['g1/n0']);
    expect(dump.graphs[0]![LAYER_NODES_FIELD]).toEqual([]);
    expect(nested.getLayerlessNodes()).toHaveLength(before);
  });

  it('has a null cross-hierarchy map when the root has none', () => {
    expect(dumpTree(twoLevelTree().root)[CROSS_HIERARCHY_FIELD]).toBeNull();
  });

  it('refuses a graph without an ElkNode origin', () => {
    const { root, nested } = twoLevelTree();
    nested.setProperty(InternalProperties.ORIGIN, null);
    expect(() => levelPathOfGraph(nested)).toThrow('a graph without an ElkNode origin');
    expect(() => dumpTree(root)).toThrow('a graph without an ElkNode origin');
  });

  it('leaves the ignored property ids out of every element and keeps the others', () => {
    const { root, outer, nested, rootEdge } = twoLevelTree();
    for (const element of [root, outer, rootEdge, nested]) {
      element.setProperty(InternalProperties.RANDOM, null);
      element.setProperty(InternalProperties.CYCLIC, true);
    }
    root.setProperty(InternalProperties.SPLINE_ROUTE_START, []);
    const dump = dumpTree(root);
    const ids = [
      ...Object.keys(dump.graphs[0]!.properties),
      ...Object.keys(dump.graphs[0]!.edges[0]!.properties),
      ...Object.keys(dump.graphs[0]!.layerlessNodes[0]!.properties),
    ];
    expect(ids.filter((id) => treeIgnoredIds().has(id))).toEqual([]);
    expect(Object.keys(dump.graphs[0]!.properties)).toContain(InternalProperties.CYCLIC.getId());
    expect(Object.keys(dump.graphs[1]!.properties)).toContain(InternalProperties.CYCLIC.getId());
  });

  it('names the seven ignored ids of the recorder header', () => {
    expect([...treeIgnoredIds()].sort()).toEqual(
      [
        'processors',
        'random',
        'spacings',
        'splines.route.start',
        InternalProperties.SELF_LOOP_HOLDER.getId(),
        'org.eclipse.elk.resolvedAlgorithm',
        'crossHierarchyMap',
      ].sort(),
    );
  });
});

describe('crossHierarchyDump', () => {
  const paths = (...pairs: [object, string][]): ReadonlyMap<object, string> => new Map(pairs);

  it('keeps the key order of the map and the value order without a comparator, as paths', () => {
    const { root, nested, rootEdge, nestedEdge } = twoLevelTree();
    const source = sourceOf([
      [nestedEdge, [segment(rootEdge, root, 'OUTPUT'), segment(nestedEdge, nested, 'INPUT')]],
      [rootEdge, [segment(nestedEdge, nested, 'UNDEFINED')]],
    ]);
    const known = paths([root, 'g0'], [nested, 'g1'], [rootEdge, 'g0/e0'], [nestedEdge, 'g1/e0']);
    expect(crossHierarchyDump(source, known, null)).toEqual([
      {
        origEdge: 'g1/e0',
        segments: [
          { edge: 'g0/e0', graph: 'g0', type: 'OUTPUT' },
          { edge: 'g1/e0', graph: 'g1', type: 'INPUT' },
        ],
      },
      { origEdge: 'g0/e0', segments: [{ edge: 'g1/e0', graph: 'g1', type: 'UNDEFINED' }] },
    ]);
  });

  it('sorts each key values stably with the injected comparator', () => {
    const { root, nested, rootEdge, nestedEdge } = twoLevelTree();
    const [a, b, c] = [
      segment(rootEdge, root, 'INPUT'),
      segment(nestedEdge, nested, 'OUTPUT'),
      segment(rootEdge, nested, 'OUTPUT'),
    ];
    const byType: SegmentComparator = (x, y) => x.getType().name().localeCompare(y.getType().name());
    const known = paths([root, 'g0'], [nested, 'g1'], [rootEdge, 'g0/e0'], [nestedEdge, 'g1/e0']);
    const [entry] = crossHierarchyDump(sourceOf([[rootEdge, [b, a, c]]]), known, byType)!;
    expect(entry!.segments.map((s) => s.type)).toEqual(['INPUT', 'OUTPUT', 'OUTPUT']);
    expect(entry!.segments.map((s) => s.edge)).toEqual(['g0/e0', 'g1/e0', 'g0/e0']);
    expect(entry!.segments.map((s) => s.graph)).toEqual(['g0', 'g1', 'g1']);
  });

  it('uses orig/<k> and seg/<k>/<i> for an edge that is not in the tree', () => {
    const { nested } = twoLevelTree();
    const stray = connect(addPort(addNode(new LGraph()), PortSide.EAST), addPort(addNode(new LGraph()), PortSide.WEST));
    const other = connect(addPort(addNode(new LGraph()), PortSide.EAST), addPort(addNode(new LGraph()), PortSide.WEST));
    const entries = crossHierarchyDump(
      sourceOf([
        [stray, []],
        [other, [segment(stray, nested, 'INPUT'), segment(stray, nested, 'OUTPUT')]],
      ]),
      paths([nested, 'g1']),
      null,
    );
    expect(entries![0]).toEqual({ origEdge: 'orig/0', segments: [] });
    expect(entries![1]).toEqual({
      origEdge: 'orig/1',
      segments: [
        { edge: 'seg/1/0', graph: 'g1', type: 'INPUT' },
        { edge: 'seg/1/1', graph: 'g1', type: 'OUTPUT' },
      ],
    });
  });

  it('refuses a segment whose graph is in no graph of the tree', () => {
    const { nested, rootEdge } = twoLevelTree();
    expect(() =>
      crossHierarchyDump(sourceOf([[rootEdge, [segment(rootEdge, nested, 'INPUT')]]]), paths(), null),
    ).toThrow('a cross-hierarchy segment whose graph is in no graph of the tree');
  });

  it('is dumped from the root property by dumpTree, with the injected comparator, and not repeated in the properties', () => {
    const { root, nested, rootEdge, nestedEdge } = twoLevelTree();
    const source = sourceOf([[rootEdge, [segment(nestedEdge, nested, 'OUTPUT'), segment(rootEdge, root, 'INPUT')]]]);
    root.setProperty(InternalProperties.CROSS_HIERARCHY_MAP, source as never);
    const byType: SegmentComparator = (x, y) => x.getType().name().localeCompare(y.getType().name());
    const dump = dumpTree(root, { comparatorFor: () => byType });
    expect(dump[CROSS_HIERARCHY_FIELD]!.map((entry) => entry.segments.map((s) => s.type))).toEqual([
      ['INPUT', 'OUTPUT'],
    ]);
    expect(Object.keys(dump.graphs[0]!.properties)).not.toContain('crossHierarchyMap');
    const unsorted = dumpTree(root, { comparatorFor: null });
    expect(unsorted[CROSS_HIERARCHY_FIELD]![0]!.segments.map((s) => s.type)).toEqual(['OUTPUT', 'INPUT']);
  });

  it('reports whether the default comparator is the ported class', () => {
    expect(typeof HAS_PORTED_COMPARATOR).toBe('boolean');
  });
});

describe('levelPathOfGraph', () => {
  it('joins the ids from the root down and uses the empty string for a missing id', () => {
    const { root, nested } = twoLevelTree();
    expect(levelPathOfGraph(root)).toBe('root');
    expect(levelPathOfGraph(nested)).toBe('root/outer');
    const unnamed = ElkGraphUtil.createNode(null);
    const child = ElkGraphUtil.createNode(unnamed);
    child.setIdentifier('o');
    root.setProperty(InternalProperties.ORIGIN, unnamed);
    nested.setProperty(InternalProperties.ORIGIN, child);
    expect(levelPathOfGraph(root)).toBe('');
    expect(levelPathOfGraph(nested)).toBe('/o');
  });
});

describe('withoutIgnoredProperties', () => {
  it('removes the ignored ids from ports, labels and edges of a graph dump and nothing else', () => {
    const { root, outer } = twoLevelTree();
    addPort(outer, PortSide.NORTH).setProperty(InternalProperties.SPACINGS, null);
    const dump = dumpTree(root).graphs[0]!;
    const noisy = {
      ...dump,
      layerlessNodes: dump.layerlessNodes.map((node) => ({
        ...node,
        ports: node.ports.map((port) => ({ ...port, properties: { ...port.properties, random: null } })),
      })),
    };
    const cleaned = withoutIgnoredProperties(noisy);
    expect(
      cleaned.layerlessNodes.flatMap((node) => node.ports.flatMap((port) => Object.keys(port.properties))),
    ).not.toContain('random');
    expect(cleaned.path).toBe('g0');
  });
});

describe('compareTree', () => {
  const clone = (tree: TreeDump): unknown => JSON.parse(JSON.stringify(tree));

  it('reports no difference for two dumps of the same tree', () => {
    const { root } = twoLevelTree();
    expect(compareTree(dumpTree(root), dumpTree(root))).toEqual([]);
  });

  it('reads a TS Map property value as the recorder java.util.HashMap and no other class as one', () => {
    const { root, sibling } = twoLevelTree();
    sibling.setProperty(InternalProperties.TARGET_NODE_MODEL_ORDER, new Map());
    const actual = dumpTree(root);
    const recorded = (className: string): TreeDump => {
      const copy = clone(actual) as { graphs: { layerlessNodes: { properties: Record<string, unknown> }[] }[] };
      copy.graphs[0]!.layerlessNodes[1]!.properties['targetNode.modelOrder'] = { class: className };
      return copy as unknown as TreeDump;
    };
    expect(compareTree(recorded('java.util.HashMap'), actual)).toEqual([]);
    const diffs = compareTree(recorded('java.util.TreeMap'), actual);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('targetNode.modelOrder');
  });

  it('accepts a position within 1e-6 and reports one beyond it', () => {
    const { root, sibling } = twoLevelTree();
    const expected = dumpTree(root);
    sibling.getPosition().x += 1e-9;
    expect(compareTree(expected, dumpTree(root))).toEqual([]);
    sibling.getPosition().x += 1e-3;
    const diffs = compareTree(expected, dumpTree(root));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('graphs[0].layerlessNodes[1].pos');
  });

  it('reports a changed layer node position, naming layerNodes', () => {
    const { root, nested, inner } = twoLevelTree();
    toLayer(nested, inner, addLayer(nested));
    const expected = dumpTree(root);
    inner.getPosition().x += 1e-9;
    expect(compareTree(expected, dumpTree(root))).toEqual([]);
    inner.getPosition().x += 1e-3;
    const diffs = compareTree(expected, dumpTree(root));
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('graphs[1].layerNodes[0].pos');
  });

  it('reports a different layer node count, naming layerNodes', () => {
    const { root, nested, inner } = twoLevelTree();
    const expected = dumpTree(root);
    toLayer(nested, inner, addLayer(nested));
    const diffs = compareTree(expected, dumpTree(root));
    expect(diffs.some((d) => d.includes('graphs[1].layerNodes'))).toBe(true);
  });

  it('reports a changed level path once, naming the graph', () => {
    const expected = dumpTree(twoLevelTree().root);
    const actual = clone(expected) as unknown as { graphs: { levelPath: string }[] };
    actual.graphs[1]!.levelPath = 'root/other';
    expect(compareTree(expected, actual)).toEqual(['graphs[1].levelPath: expected root/outer, got root/other']);
  });

  it('reports a changed nested link once, naming the node', () => {
    const expected = dumpTree(twoLevelTree().root);
    const actual = clone(expected) as unknown as { graphs: { layerlessNodes: { nested: string | null }[] }[] };
    actual.graphs[0]!.layerlessNodes[1]!.nested = 'g1';
    const diffs = compareTree(expected, actual);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('graphs[0].layerlessNodes[1].nested');
  });

  it('reports a changed map entry, a different entry count and a missing map', () => {
    const { root, nested, rootEdge, nestedEdge } = twoLevelTree();
    root.setProperty(
      InternalProperties.CROSS_HIERARCHY_MAP,
      sourceOf([[rootEdge, [segment(nestedEdge, nested, 'OUTPUT')]]]) as never,
    );
    const expected = dumpTree(root, { comparatorFor: null });
    const actual = clone(expected) as unknown as { crossHierarchyMap: { segments: { type: string }[] }[] | null };
    actual.crossHierarchyMap![0]!.segments[0]!.type = 'INPUT';
    const diffs = compareTree(expected, actual);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain('crossHierarchyMap[0]');
    actual.crossHierarchyMap!.push({ segments: [] } as never);
    expect(compareTree(expected, actual)).toEqual(['crossHierarchyMap: expected 1 entries, got 2']);
    actual.crossHierarchyMap = null;
    expect(compareTree(expected, actual)[0]).toContain('crossHierarchyMap: expected');
  });

  it('reports a missing graph', () => {
    const expected = dumpTree(twoLevelTree().root);
    const actual = clone(expected) as unknown as { graphs: unknown[] };
    actual.graphs.pop();
    expect(compareTree(expected, actual).some((diff) => diff.startsWith('graphs.length'))).toBe(true);
  });

  it('compares the same whether or not either side repeats the ignored properties', () => {
    const { root } = twoLevelTree();
    const expected = dumpTree(root);
    const actual = clone(expected) as unknown as { graphs: { properties: Record<string, unknown> }[] };
    actual.graphs[0]!.properties.crossHierarchyMap = { class: 'ArrayListMultimap' };
    actual.graphs[0]!.properties.random = { class: 'Random' };
    expect(compareTree(expected, actual)).toEqual([]);
  });
});
