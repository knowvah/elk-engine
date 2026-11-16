// SPDX-License-Identifier: EPL-2.0
// Tests of the mrtree TGraph dump, rebuild and comparison. Expectations are the recorded rows (test/golden/refs/java/mrtree.json) or the
// recorder's documented format (tools/vectors/MrTreeVectors.java header: ref rules, property order, encodings). The mutation checks perturb
// a recorded graph one field at a time and require the comparison to name that field: a comparison that cannot fail proves nothing.
import { describe, expect, it } from 'vitest';
import { TEdge } from '../../src/alg/mrtree/graph/TEdge.js';
import { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { TNode } from '../../src/alg/mrtree/graph/TNode.js';
import { InternalProperties } from '../../src/alg/mrtree/options/InternalProperties.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import { KVector } from '../../src/core/math/KVector.js';
import { LinkedList } from '../../src/java/util/LinkedList.js';
import { Random } from '../../src/java/util/Random.js';
import {
  DUMPED_PROPERTY_NAMES,
  INTERNAL_PROPERTY_NAMES,
  NUMERIC_TOLERANCE,
  ReplayOrigin,
  ReplayRebuildError,
  buildTGraph,
  compareElk,
  compareGraph,
  compareStop,
  dumpProps,
  dumpStop,
  dumpTGraph,
  edgeRef,
  formatDifferences,
  nodeRef,
} from './mrtree-replay-dump.js';
import {
  STEP_APPLY,
  STEP_IMPORT,
  STEP_PACK,
  decodeHex,
  encodeHex,
  loadStopsRows,
  type ElkResult,
  type Stop,
  type StopGraph,
  type StopsRow,
} from './mrtree-replay-rows.js';

type Mutable<T> = T extends readonly [string, string]
  ? [string, string]
  : T extends string | number | boolean | null | undefined
    ? T
    : T extends readonly (infer U)[]
      ? Mutable<U>[]
      : { -readonly [K in keyof T]: Mutable<T[K]> };
const copy = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>;

const rows = loadStopsRows();
const rowById = (id: string): StopsRow => rows.find((r) => r.id === id)!;
const stopOf = (row: StopsRow, step: string, comp = -1): Stop =>
  row.expected.stops.find((s) => s.step === step && s.comp === comp)!;
const graphOf = (id: string, step: string, comp = -1): StopGraph => stopOf(rowById(id), step, comp).graphs[0]!;
const roundTrip = (g: StopGraph): StopGraph => dumpTGraph(buildTGraph(g));

/** The graphs whose in-edge list order the dump cannot restore: all are after `Untreeifyer` re-added edges (T6 report). */
const UNRESTORABLE_STEPS = ['Untreeifyer', 'EdgeRouter', STEP_PACK];
const UNRESTORABLE_GRAPHS = 27;
const IN_ORDER_MESSAGE = 'the in-edge list order is not dumped';

describe('the property table', () => {
  it('lists every InternalProperties field exactly once', () => {
    const fields = Object.getOwnPropertyNames(InternalProperties).filter((name) => {
      const value = (InternalProperties as unknown as Record<string, unknown>)[name];
      return typeof value === 'object' && value !== null && 'getId' in value;
    });
    expect([...INTERNAL_PROPERTY_NAMES].sort()).toEqual([...fields].sort());
  });

  it('dumps in the recorder order: InternalProperties by name, then the three MrTreeOptions properties', () => {
    const internal = DUMPED_PROPERTY_NAMES.slice(0, -3);
    expect(internal).toEqual([...internal].sort());
    expect(DUMPED_PROPERTY_NAMES.slice(-3)).toEqual(['POSITION_CONSTRAINT', 'PRIORITY', 'TREE_LEVEL']);
  });

  it('covers every property key that occurs in the ref', () => {
    const keys = new Set<string>();
    for (const row of rows) {
      for (const stop of row.expected.stops) {
        for (const g of stop.graphs) {
          Object.keys(g.props).forEach((k) => keys.add(k));
          g.nodes.forEach((n) => Object.keys(n.props).forEach((k) => keys.add(k)));
          g.edges.forEach((e) => Object.keys(e.props).forEach((k) => keys.add(k)));
        }
      }
    }
    expect([...keys].filter((k) => !DUMPED_PROPERTY_NAMES.includes(k))).toEqual([]);
    expect(keys.size).toBeGreaterThan(20);
  });
});

describe('dumpTGraph on a hand-built graph (the recorder format)', () => {
  const build = (): { graph: TGraph; root: TNode; leaf: TNode } => {
    const graph = new TGraph();
    const root = new TNode(0, graph, 'DUMMY_ROOT');
    const leaf = new TNode(1, graph, '');
    leaf.setProperty(InternalProperties.ORIGIN, new ReplayOrigin('node', 'n0'));
    leaf.getPosition().x = 20;
    leaf.getPosition().y = -0;
    leaf.getSize().x = 65;
    leaf.getSize().y = 25;
    graph.getNodes().add(root);
    graph.getNodes().add(leaf);
    root.addChild(leaf);
    return { graph, root, leaf };
  };

  it('refs: the ORIGIN identifier, else the label; a dummy edge is d:<source>><target>', () => {
    const { graph, root, leaf } = build();
    expect(nodeRef(leaf)).toBe('n0');
    expect(nodeRef(root)).toBe('DUMMY_ROOT');
    expect(edgeRef(graph.getEdges().get(0))).toBe('d:DUMMY_ROOT>n0');
  });

  it('an edge with an ORIGIN dumps that identifier as its ref', () => {
    const { graph, root, leaf } = build();
    const edge = new TEdge(root, leaf);
    edge.setProperty(InternalProperties.ORIGIN, new ReplayOrigin('edge', 'e0'));
    graph.getEdges().add(edge);
    expect(edgeRef(edge)).toBe('e0');
  });

  it('dumps nodes, children, parent, hex numbers and the set properties only', () => {
    const { graph } = build();
    const dump = dumpTGraph(graph);
    expect(dump.props).toEqual({});
    expect(dump.nodes[0]).toEqual({
      ref: 'DUMMY_ROOT',
      id: 0,
      label: 'DUMMY_ROOT',
      x: '0000000000000000',
      y: '0000000000000000',
      w: '0000000000000000',
      h: '0000000000000000',
      parent: null,
      children: ['n0'],
      props: {},
    });
    expect(dump.nodes[1]).toEqual({
      ref: 'n0',
      id: 1,
      label: '',
      x: '4034000000000000',
      y: '8000000000000000',
      w: '4050400000000000',
      h: '4039000000000000',
      parent: 'DUMMY_ROOT',
      children: [],
      props: { ORIGIN: 'n0' },
    });
    expect(dump.edges).toEqual([
      { ref: 'd:DUMMY_ROOT>n0', source: 'DUMMY_ROOT', target: 'n0', bends: [], props: { DUMMY: true } },
    ]);
  });

  it('encodes each property kind: Integer, Boolean, String, Double as hex, KVector, node and edge refs and lists', () => {
    const { graph, root, leaf } = build();
    const edge = graph.getEdges().get(0);
    leaf.setProperty(InternalProperties.FAN, 3);
    leaf.setProperty(InternalProperties.ROOT, true);
    leaf.setProperty(InternalProperties.ID, 'ab');
    leaf.setProperty(InternalProperties.PRELIM, 1.5);
    leaf.setProperty(InternalProperties.LEFTSIBLING, root);
    leaf.setProperty(InternalProperties.COMPACT_CONSTRAINTS, [root, leaf]);
    leaf.setProperty(MrTreeOptions.TREE_LEVEL, 2);
    graph.setProperty(InternalProperties.BB_UPLEFT, new KVector(1, 2));
    graph.setProperty(InternalProperties.REMOVABLE_EDGES, new LinkedList<TEdge>([edge]));
    expect(dumpProps(leaf)).toEqual({
      COMPACT_CONSTRAINTS: ['DUMMY_ROOT', 'n0'],
      FAN: 3,
      ID: 'ab',
      LEFTSIBLING: 'DUMMY_ROOT',
      ORIGIN: 'n0',
      PRELIM: '3ff8000000000000',
      ROOT: true,
      TREE_LEVEL: 2,
    });
    expect(Object.keys(dumpProps(leaf))).toEqual([
      'COMPACT_CONSTRAINTS',
      'FAN',
      'ID',
      'LEFTSIBLING',
      'ORIGIN',
      'PRELIM',
      'ROOT',
      'TREE_LEVEL',
    ]);
    expect(dumpProps(graph)).toEqual({
      BB_UPLEFT: ['3ff0000000000000', '4000000000000000'],
      REMOVABLE_EDGES: ['d:DUMMY_ROOT>n0'],
    });
  });

  it('refuses a set RANDOM, as the recorder fails the recording', () => {
    const { graph } = build();
    graph.setProperty(InternalProperties.RANDOM, new Random(1n));
    expect(() => dumpProps(graph)).toThrow('unencodable property RANDOM');
  });

  it('refuses a node with neither an ORIGIN identifier nor a label, and a duplicate ref', () => {
    const { graph } = build();
    const bare = new TNode(2, graph);
    expect(() => nodeRef(bare)).toThrow('neither an ORIGIN identifier nor a label');
    const twin = new TNode(3, graph, 'n0');
    graph.getNodes().add(twin);
    expect(() => dumpTGraph(graph)).toThrow('duplicate node ref n0');
  });

  it('dumpStop wraps graphs in the stop shape', () => {
    const { graph } = build();
    expect(dumpStop('X', 4, [graph])).toEqual({ step: 'X', comp: 4, graphs: [dumpTGraph(graph)] });
  });
});

describe('rebuilding a recorded stop', () => {
  it('rebuilds every import stop so that dumpTGraph equals the recorded row exactly (acceptance)', () => {
    expect(rows).toHaveLength(54);
    for (const row of rows) {
      const recorded = stopOf(row, STEP_IMPORT).graphs[0]!;
      expect(JSON.stringify(roundTrip(recorded)), row.id).toBe(JSON.stringify(recorded));
    }
  });

  it('rebuilds every recorded graph of every stop, text-exact, except the graphs whose in-edge order is not dumped', () => {
    let rebuilt = 0;
    const refused: string[] = [];
    for (const row of rows) {
      for (const stop of row.expected.stops) {
        for (const graph of stop.graphs) {
          try {
            expect(JSON.stringify(roundTrip(graph)), `${row.id} ${stop.step}`).toBe(JSON.stringify(graph));
            rebuilt++;
          } catch (error) {
            if (!(error instanceof ReplayRebuildError)) {
              throw error;
            }
            expect(error.message).toContain(IN_ORDER_MESSAGE);
            refused.push(stop.step);
          }
        }
      }
    }
    expect(rebuilt).toBe(1491);
    expect(refused).toHaveLength(UNRESTORABLE_GRAPHS);
    expect(refused.every((step) => UNRESTORABLE_STEPS.includes(step))).toBe(true);
  });

  it('gives the TNode accessors of the import stop: ids by index, children, parent, parents, leaf', () => {
    const recorded = graphOf('stops/default/path6', STEP_IMPORT);
    const graph = buildTGraph(recorded);
    const nodes = [...graph.getNodes()];
    expect(nodes.map((n) => n.id)).toEqual(recorded.nodes.map((_, i) => i));
    recorded.nodes.forEach((data, i) => {
      const node = nodes[i]!;
      expect([...node.getChildren()].map((c) => c.id)).toEqual(
        data.children.map((ref) => recorded.nodes.findIndex((n) => n.ref === ref)),
      );
      expect(node.getChildrenCopy().size()).toBe(data.children.length);
      expect(node.isLeaf()).toBe(data.children.length === 0);
      expect(node.getParent()?.id ?? null).toBe(
        data.parent === null ? null : recorded.nodes.findIndex((n) => n.ref === data.parent),
      );
      expect([...node.getParents()].length).toBe(data.parent === null ? 0 : 1);
      expect(node.getLabel()).toBe(data.label);
    });
  });

  it('puts the graph-level, node and edge properties back and stores a ReplayOrigin for ORIGIN', () => {
    const graph = buildTGraph(graphOf('stops/default/path6', 'NodePlacer', 0));
    expect(graph.getProperty(InternalProperties.ORIGIN)).toBeInstanceOf(ReplayOrigin);
    const root = [...graph.getNodes()].find((n) => n.getProperty(InternalProperties.ROOT))!;
    expect(root.getProperty(InternalProperties.DESCENDANTS)).toBeGreaterThan(1);
    expect((root.getProperty(InternalProperties.ORIGIN) as ReplayOrigin).getIdentifier()).toBe(nodeRef(root));
    const edge = graph.getEdges().get(0);
    expect((edge.getProperty(InternalProperties.ORIGIN) as ReplayOrigin).kind).toBe('edge');
  });

  it('gives an origin resolver the kind and identifier of every ORIGIN (graph, node, edge)', () => {
    const asked: string[] = [];
    buildTGraph(graphOf('stops/default/pair', STEP_IMPORT), {
      origin: (kind, identifier) => {
        asked.push(`${kind}:${identifier}`);
        return new ReplayOrigin(kind, identifier);
      },
    });
    expect(asked).toEqual(['graph:root', 'node:n0', 'node:n1', 'edge:e0']);
  });

  it('copies the properties a template holds that the dump does not carry, and the dumped values win', () => {
    const recorded = graphOf('stops/default/pair', 'RootProcessor', 0);
    expect(recorded.nodes[0]!.props).toEqual({ ORIGIN: 'n0', ROOT: true });
    const graphTemplate = new TGraph();
    graphTemplate.setProperty(MrTreeOptions.SPACING_NODE_NODE, 77);
    graphTemplate.setProperty(InternalProperties.GRAPH_XMAX, 123);
    graphTemplate.setProperty(InternalProperties.REMOVABLE_EDGES, new LinkedList<TEdge>([new TEdge(null, null)]));
    const nodeTemplate = new TNode(0, graphTemplate, 'x');
    nodeTemplate.setProperty(MrTreeOptions.PRIORITY, 9);
    nodeTemplate.setProperty(InternalProperties.FAN, 41);
    nodeTemplate.setProperty(InternalProperties.ROOT, false);
    const edgeTemplate = new TEdge(null, null);
    edgeTemplate.setProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH, 4);
    const rebuilt = buildTGraph(recorded, {
      templates: { graph: graphTemplate, node: () => nodeTemplate, edge: () => edgeTemplate },
    });
    expect(rebuilt.getProperty(MrTreeOptions.SPACING_NODE_NODE)).toBe(77);
    expect(rebuilt.getProperty(InternalProperties.GRAPH_XMAX)).toBe(123);
    // REMOVABLE_EDGES is dumped (empty) and replaces the template's list
    expect(rebuilt.getProperty(InternalProperties.REMOVABLE_EDGES).size()).toBe(0);
    const node = rebuilt.getNodes().get(0);
    expect(node.getProperty(MrTreeOptions.PRIORITY)).toBe(9);
    expect(node.getProperty(InternalProperties.FAN)).toBe(41);
    // ROOT is dumped (true) and overwrites the template's false
    expect(node.getProperty(InternalProperties.ROOT)).toBe(true);
    expect(rebuilt.getEdges().get(0).getProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH)).toBe(4);
    // an option outside the table (SPACING_NODE_NODE) never shows in a dump; a table property the template set (GRAPH_XMAX) does
    expect(Object.keys(dumpTGraph(rebuilt).props)).toEqual(['GRAPH_XMAX', 'ORIGIN', 'REMOVABLE_EDGES']);
  });

  it('keeps an edge that the dump lists twice as one TEdge listed twice', () => {
    const split = stopOf(rowById('stops/default/forest'), 'ComponentsProcessor.split');
    const multi = split.graphs.find((g) => new Set(g.edges.map((e) => e.ref)).size < g.edges.length)!;
    const listed = [...buildTGraph(multi).getEdges()];
    expect(listed).toHaveLength(multi.edges.length);
    expect(new Set(listed).size).toBe(new Set(multi.edges.map((e) => e.ref)).size);
  });
});

describe('what a rebuild refuses', () => {
  const base = (): Mutable<StopGraph> => copy(graphOf('stops/default/path6', STEP_IMPORT));

  it('a child the dump lacks', () => {
    const g = base();
    g.nodes[0]!.children = ['zzz'];
    expect(() => buildTGraph(g)).toThrow(new ReplayRebuildError('node ref "zzz" is not in the dump'));
  });

  it('a child that no graph edge leads to', () => {
    const g = base();
    g.nodes[0]!.children = ['n3'];
    expect(() => buildTGraph(g)).toThrow('node n0 lists child n3 but no graph edge leads there');
  });

  it('a recorded parent that contradicts the rebuilt in-edge list', () => {
    const g = base();
    g.nodes[1]!.parent = 'n4';
    expect(() => buildTGraph(g)).toThrow(
      `node n1: the rebuilt first incoming edge comes from n0, the dump records parent n4 (${IN_ORDER_MESSAGE})`,
    );
  });

  it('a duplicate node ref, an edge listed twice with other endpoints and an unknown property', () => {
    const dup = base();
    dup.nodes[1]!.ref = 'n0';
    expect(() => buildTGraph(dup)).toThrow('duplicate node ref n0');
    const twice = base();
    twice.edges.push({ ...twice.edges[0]!, target: 'n5' });
    expect(() => buildTGraph(twice)).toThrow('edge ref e0 is listed twice with different endpoints');
    const unknown = base();
    (unknown.props as Record<string, unknown>).NOT_A_PROPERTY = 1;
    expect(() => buildTGraph(unknown)).toThrow('property "NOT_A_PROPERTY" is not in the dump');
  });

  it('a property that names an unknown node or edge', () => {
    const g = copy(graphOf('stops/default/fan6', 'NeighborsProcessor', 0));
    const holder = g.nodes.find((n) => 'LEFTSIBLING' in (n.props as Record<string, unknown>))!;
    (holder.props as Record<string, unknown>).LEFTSIBLING = 'nope';
    expect(() => buildTGraph(g)).toThrow('node ref "nope" is not in the dump');
  });
});

describe('compareGraph: unperturbed and within tolerance', () => {
  const recorded = graphOf('stops/default/path6', 'NodePlacer', 0);

  it('finds no difference between a recorded graph and its own rebuild', () => {
    expect(compareGraph(recorded, roundTrip(recorded))).toEqual([]);
  });

  it('accepts a coordinate that differs by less than 1e-6 and reports one that differs by more', () => {
    const near = copy(recorded);
    const x = decodeHex(near.nodes[2]!.x);
    near.nodes[2]!.x = encodeHex(x + NUMERIC_TOLERANCE / 10);
    expect(compareGraph(recorded, near)).toEqual([]);
    near.nodes[2]!.x = encodeHex(x + NUMERIC_TOLERANCE * 10);
    expect(compareGraph(recorded, near)).toEqual([
      { path: 'graph.nodes[2:n2].x', expected: x, actual: x + NUMERIC_TOLERANCE * 10 },
    ]);
  });
});

describe('compareGraph mutations: every perturbed field is named', () => {
  const recorded = graphOf('stops/default/path6', 'NodePlacer', 0);
  const fan = graphOf('stops/default/fan6', 'NodePlacer', 0);
  const diffs = (mutated: StopGraph, from: StopGraph = recorded): string[] =>
    compareGraph(from, mutated).map((d) => d.path);

  it('a perturbed coordinate, size and id', () => {
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      const m = copy(recorded);
      m.nodes[1]![field] = encodeHex(decodeHex(m.nodes[1]![field]) + 1);
      expect(diffs(m)).toEqual([`graph.nodes[1:n1].${field}`]);
    }
    const m = copy(recorded);
    m.nodes[3]!.id += 1;
    expect(diffs(m)).toEqual(['graph.nodes[3:n3].id']);
  });

  it('a different child order, parent and label', () => {
    const m = copy(fan);
    const root = m.nodes.find((n) => n.children.length > 1)!;
    root.children = [...root.children].reverse();
    expect(diffs(m, fan)).toEqual([`graph.nodes[${String(m.nodes.indexOf(root))}:${root.ref}].children`]);
    const p = copy(recorded);
    p.nodes[2]!.parent = 'n5';
    expect(diffs(p)).toEqual(['graph.nodes[2:n2].parent']);
    const l = copy(recorded);
    l.nodes[0]!.label = 'other';
    expect(diffs(l)).toEqual(['graph.nodes[0:n0].label']);
  });

  it('a different property value: Integer, Boolean, Double (beyond tolerance), node ref', () => {
    const siblings = graphOf('stops/default/fan6', 'NodePlacer', 0);
    const props = (n: Mutable<StopGraph>['nodes'][number]): Record<string, unknown> =>
      n.props as Record<string, unknown>;
    const pathOf = (m: Mutable<StopGraph>, node: Mutable<StopGraph>['nodes'][number]): string =>
      `graph.nodes[${String(m.nodes.indexOf(node))}:${node.ref}].props`;
    const found = (mutate: (m: Mutable<StopGraph>) => Mutable<StopGraph>['nodes'][number]): string[] => {
      const m = copy(siblings);
      const node = mutate(m);
      return compareGraph(siblings, m).map((d) => d.path.replace(pathOf(m, node), 'props'));
    };
    const leaf = (m: Mutable<StopGraph>): Mutable<StopGraph>['nodes'][number] =>
      m.nodes.find((n) => 'LEFTSIBLING' in props(n))!;
    expect(
      found((m) => {
        props(leaf(m)).XCOOR = (props(leaf(m)).XCOOR as number) + 1;
        return leaf(m);
      }),
    ).toEqual(['props.XCOOR']);
    expect(
      found((m) => {
        const root = m.nodes.find((n) => props(n).ROOT === true)!;
        props(root).ROOT = false;
        return root;
      }),
    ).toEqual(['props.ROOT']);
    expect(
      found((m) => {
        props(leaf(m)).PRELIM = encodeHex(decodeHex(props(leaf(m)).PRELIM as string) + 0.5);
        return leaf(m);
      }),
    ).toEqual(['props.PRELIM']);
    expect(
      found((m) => {
        props(leaf(m)).LEFTSIBLING = 'n99';
        return leaf(m);
      }),
    ).toEqual(['props.LEFTSIBLING']);
  });

  it('a property that is absent or extra', () => {
    const m = copy(recorded);
    const node = m.nodes[1]!;
    delete (node.props as Record<string, unknown>).XCOOR;
    (node.props as Record<string, unknown>).DEPTH = 4;
    const found = compareGraph(recorded, m).filter((d) => d.path.startsWith('graph.nodes[1:n1].props'));
    expect(found).toEqual([
      { path: 'graph.nodes[1:n1].props.XCOOR', expected: recorded.nodes[1]!.props.XCOOR, actual: '<absent>' },
      { path: 'graph.nodes[1:n1].props.DEPTH', expected: '<absent>', actual: 4 },
    ]);
  });

  it('a graph-level property', () => {
    const g = graphOf('stops/default/path6', 'GraphBoundsProcessor', 0);
    const m = copy(g);
    m.props.GRAPH_XMAX = encodeHex(decodeHex(m.props.GRAPH_XMAX as string) + 3);
    expect(compareGraph(g, m).map((d) => d.path)).toEqual(['graph.props.GRAPH_XMAX']);
  });

  it('a perturbed bend point, a missing bend point and a perturbed edge endpoint', () => {
    const withBends = rows
      .flatMap((r) => r.expected.stops.flatMap((s) => s.graphs))
      .find((g) => g.edges.some((e) => e.bends.length > 0))!;
    const index = withBends.edges.findIndex((e) => e.bends.length > 0);
    const ref = withBends.edges[index]!.ref;
    const m = copy(withBends);
    m.edges[index]!.bends[0]![1] = encodeHex(decodeHex(m.edges[index]!.bends[0]![1]) + 1);
    expect(compareGraph(withBends, m).map((d) => d.path)).toEqual([`graph.edges[${String(index)}:${ref}].bends[0].y`]);
    const n = copy(withBends);
    n.edges[index]!.bends.pop();
    expect(compareGraph(withBends, n).map((d) => d.path)).toContain(
      `graph.edges[${String(index)}:${ref}].bends.length`,
    );
    const o = copy(withBends);
    o.edges[index]!.target = 'elsewhere';
    expect(compareGraph(withBends, o).map((d) => d.path)).toEqual([`graph.edges[${String(index)}:${ref}].target`]);
  });

  it('a different node order, edge order and length', () => {
    const m = copy(recorded);
    [m.nodes[0], m.nodes[1]] = [m.nodes[1]!, m.nodes[0]!];
    expect(diffs(m)).toContain('graph.nodes[0:n0].ref');
    const e = copy(recorded);
    [e.edges[0], e.edges[1]] = [e.edges[1]!, e.edges[0]!];
    expect(diffs(e)).toContain('graph.edges[0:e0].ref');
    const short = copy(recorded);
    short.nodes.pop();
    expect(diffs(short)).toEqual(['graph.nodes.length']);
    const fewer = copy(recorded);
    fewer.edges.pop();
    expect(diffs(fewer)).toEqual(['graph.edges.length']);
  });

  it('a property with an unknown key is a failure of the comparison itself', () => {
    const m = copy(recorded);
    (m.props as Record<string, unknown>).BOGUS = 1;
    expect(() => compareGraph(recorded, m)).toThrow('property "BOGUS" is not in the dump');
  });
});

describe('compareStop and compareElk', () => {
  const row = rowById('stops/default/path6');
  const placer = stopOf(row, 'NodePlacer', 0);
  const applied = stopOf(row, STEP_APPLY);

  it('reports nothing for equal stops and names a differing step, comp and graph count', () => {
    expect(compareStop(placer, copy(placer))).toEqual([]);
    expect(compareStop(placer, { ...placer, step: 'NodeOrderer', comp: 1 }).map((d) => d.path)).toEqual([
      'step',
      'comp',
    ]);
    expect(compareStop(placer, { ...placer, graphs: [] }).map((d) => d.path)).toEqual(['graphs.length']);
  });

  it('prefixes a graph difference with its index', () => {
    const m = copy(placer);
    m.graphs[0]!.nodes[0]!.id += 1;
    expect(compareStop(placer, m)).toEqual([{ path: 'graphs[0].nodes[0:n0].id', expected: 0, actual: 1 }]);
  });

  it('compares the ELK result of applyLayout: graph size, node geometry, edge sections', () => {
    const elk = applied.elk!;
    expect(compareStop(applied, copy(applied))).toEqual([]);
    const m = copy(elk);
    m.graph.w = encodeHex(decodeHex(m.graph.w) + 1);
    m.nodes[1]!.x = encodeHex(decodeHex(m.nodes[1]!.x) + 1);
    m.nodes[2]!.id = 'zz';
    expect(compareElk(elk, m).map((d) => d.path)).toEqual(
      ['elk.graph.w', 'elk.nodes[1:n0].x'].concat(['elk.nodes[2:n1].id']),
    );
  });

  it('compares edge sections: start, end, bends and the section count', () => {
    const withSections = rows
      .map((r) => r.expected.stops.find((s) => s.step === STEP_APPLY)?.elk)
      .find(
        (e): e is ElkResult =>
          e !== undefined && e.edges.some((x) => x.sections.length > 0 && x.sections[0]!.bends.length > 0),
      )!;
    const index = withSections.edges.findIndex((x) => x.sections.length > 0 && x.sections[0]!.bends.length > 0);
    const m = copy(withSections);
    const section = m.edges[index]!.sections[0]!;
    section.start[0] = encodeHex(decodeHex(section.start[0]) + 1);
    section.end[1] = encodeHex(decodeHex(section.end[1]) + 1);
    section.bends[0]![0] = encodeHex(decodeHex(section.bends[0]![0]) + 1);
    const id = withSections.edges[index]!.id;
    const base = `elk.edges[${String(index)}:${id}].sections[0]`;
    expect(compareElk(withSections, m).map((d) => d.path)).toEqual([
      `${base}.start.x`,
      `${base}.end.y`,
      `${base}.bends[0].x`,
    ]);
    m.edges[index]!.sections = [];
    expect(compareElk(withSections, m).map((d) => d.path)).toEqual([
      `elk.edges[${String(index)}:${id}].sections.length`,
    ]);
  });

  it('treats a missing ELK result on one side as a difference', () => {
    expect(compareStop(applied, { ...applied, elk: undefined }).map((d) => d.path)).toEqual(['elk']);
    expect(compareStop(placer, { ...placer, elk: applied.elk }).map((d) => d.path)).toEqual(['elk']);
  });

  it('accepts a null childArea on both sides and reports null against a number', () => {
    const empty = rows
      .map((r) => r.expected.stops.find((s) => s.step === STEP_APPLY)?.elk)
      .find((e) => e?.graph.childAreaWidth === null);
    if (empty !== undefined) {
      expect(compareElk(empty, copy(empty))).toEqual([]);
    }
    const m = copy(applied.elk!);
    m.graph.childAreaWidth = null;
    expect(compareElk(applied.elk!, m).map((d) => d.path)).toEqual(['elk.graph.childAreaWidth']);
  });

  it('formats differences one per line as path, expected, actual', () => {
    expect(
      formatDifferences([
        { path: 'a.b', expected: 1, actual: 2 },
        { path: 'c', expected: 'x', actual: null },
      ]),
    ).toBe('a.b: expected 1, actual 2\nc: expected "x", actual null');
  });

  it('compares doubles by value: -0 equals 0, equal infinities match, NaN matches NaN only', () => {
    const g = copy(graphOf('stops/default/path6', 'NodePlacer', 0));
    const m = copy(g);
    g.nodes[0]!.x = '8000000000000000';
    m.nodes[0]!.x = '0000000000000000';
    expect(compareGraph(g, m)).toEqual([]);
    g.nodes[0]!.x = '7ff0000000000000';
    m.nodes[0]!.x = '7ff0000000000000';
    expect(compareGraph(g, m)).toEqual([]);
    m.nodes[0]!.x = 'fff0000000000000';
    expect(compareGraph(g, m).map((d) => d.path)).toEqual(['graph.nodes[0:n0].x']);
    g.nodes[0]!.x = '7ff8000000000000';
    m.nodes[0]!.x = '7ff8000000000000';
    expect(compareGraph(g, m)).toEqual([]);
    m.nodes[0]!.x = '0000000000000000';
    expect(compareGraph(g, m).map((d) => d.path)).toEqual(['graph.nodes[0:n0].x']);
  });
});
