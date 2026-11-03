// SPDX-License-Identifier: EPL-2.0
// Structural tests of the routing dump (L4: expected values are the import dump's own geometry or values set here).
import { beforeAll, describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex } from './layered-framework-replay.js';
import { elementAt, importDumpOf } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, loadRows, type PhaseRow } from './layered-phase-replay-rows.js';
import { routingDump } from './layered-routing-replay-dump.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 20, ports: [{ id: 'a0' }, { id: 'a1' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
    { id: 'c', width: 10, height: 10, ports: [{ id: 'c0' }] },
  ],
  edges: [
    { id: 'e0', sources: ['a0'], targets: ['b0'] },
    { id: 'e1', sources: ['a1'], targets: ['c0'] },
  ],
};
const ROW: PhaseRow = {
  id: 'scenarios/routing-dump',
  group: 'scenarios',
  input: { elk: GRAPH },
  target: null,
  options: {},
  steps: [],
  prefix: null,
  expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [] },
};
const PLACEMENT_FILE = `${repoRoot()}/test/golden/refs/java/layered-placement.json`;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

function imported(): LGraph {
  return importRow(ROW).graph;
}

function dumped(graph: LGraph): ReturnType<typeof routingDump> {
  return routingDump(graph, importDumpOf(graph));
}

const edgesOf = (graph: LGraph): string[] => Object.keys(dumped(graph).geometry.edges);
const edgeAt = (graph: LGraph, path: string): LEdge => elementAt(graph, path) as LEdge;

/** A stand-in for a ported `SplineSegment`: only the fields the dump reads. */
function segment(rank: number, overrides: object = {}): object {
  return {
    boundingBox: { x: 1.5, y: -2, width: 3, height: 4.25 },
    rank,
    isStraight: false,
    xDelta: 0.5,
    isWestOfInitialLayer: true,
    centerControlPointY: -7.75,
    ...overrides,
  };
}

function setSpline(start: LEdge, chain: LEdge[], route: object[]): void {
  start.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, chain);
  start.setProperty(InternalProperties.SPLINE_ROUTE_START, route as never);
}

describe('routingDump after import and normalise', () => {
  it('has empty bend points, no junction points, the import size and offset and no change on a 7d scenario row', () => {
    const rows = loadRows(PLACEMENT_FILE).filter((r) => r.group === 'scenarios');
    const row = rows.find((r) => importRow(r).importDump.graphs[0]!.edges.length > 0) as PhaseRow;
    const { graph, importDump } = importRow(row);
    normalise(graph);
    const dump = routingDump(graph, importDump);
    const base = importDump.graphs[0]!;
    expect(dump.changed).toEqual([]);
    expect(dump.geometry.graph).toEqual({ size: base.size, offset: base.offset });
    expect(Object.keys(dump.geometry.edges).sort()).toEqual(base.edges.map((e) => e.path).sort());
    for (const edge of base.edges) {
      expect(dump.geometry.edges[edge.path]).toEqual({ bendPoints: edge.bendPoints });
      expect(dump.geometry.edges[edge.path]?.bendPoints).toEqual([]);
    }
    expect(dump.geometry.splines).toBeUndefined();
  });

  it('lists the edges of the placement dump, in its order and under its paths', () => {
    const graph = imported();
    normalise(graph);
    const dump = dumped(graph);
    expect(Object.keys(dump.geometry.edges)).toEqual(dump.edges.map((e) => e.path));
    expect(dump.edges).toHaveLength(2);
  });
});

describe('routingDump edges', () => {
  it('reports bend points in list order as raw double bits', () => {
    const graph = imported();
    const [first] = edgesOf(graph);
    edgeAt(graph, first!).getBendPoints().add(new KVector(1.5, -2));
    edgeAt(graph, first!).getBendPoints().add(new KVector(0.1, 8));
    const { bendPoints } = dumped(graph).geometry.edges[first!]!;
    expect(bendPoints.map((p) => p.map(decodeHex))).toEqual([
      [1.5, -2],
      [0.1, 8],
    ]);
    expect(bendPoints[1]?.[0]).toBe(encodeHex(0.1));
  });

  it('writes junctionPoints only for an edge that has the property, even when it is empty', () => {
    const graph = imported();
    const [first, second] = edgesOf(graph);
    edgeAt(graph, first!).setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(4, 5.5)));
    edgeAt(graph, second!).setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain());
    const { edges } = dumped(graph).geometry;
    expect(edges[first!]?.junctionPoints?.map((p) => p.map(decodeHex))).toEqual([[4, 5.5]]);
    expect(edges[second!]?.junctionPoints).toEqual([]);
    expect(Object.keys(dumped(imported()).geometry.edges[first!]!)).toEqual(['bendPoints']);
  });

  it('reports the graph size and offset', () => {
    const graph = imported();
    graph.getSize().x = 12.5;
    graph.getSize().y = 3;
    graph.getOffset().x = -4;
    const { size, offset } = dumped(graph).geometry.graph;
    expect(size.map(decodeHex)).toEqual([12.5, 3]);
    expect(offset.map(decodeHex)).toEqual([-4, 0]);
  });
});

describe('routingDump splines', () => {
  it('is computed from the edge chain and the route start, keyed by the start edge path', () => {
    const graph = imported();
    const [first, second] = edgesOf(graph);
    setSpline(edgeAt(graph, first!), [edgeAt(graph, first!), edgeAt(graph, second!)], [segment(2), segment(0)]);
    const { splines } = dumped(graph).geometry;
    expect(Object.keys(splines ?? {})).toEqual([first]);
    const spline = splines?.[first!];
    expect(spline?.chain).toEqual([first, second]);
    expect(spline?.route.map((s) => s.rank)).toEqual([2, 0]);
    expect(spline?.route[0]).toEqual({
      box: [encodeHex(1.5), encodeHex(-2), encodeHex(3), encodeHex(4.25)],
      rank: 2,
      isStraight: false,
      xDelta: encodeHex(0.5),
      westOfInitialLayer: true,
      centerControlPointY: encodeHex(-7.75),
    });
  });

  it('keeps the edge chain in changed, leaves the route start out of it and still summarises the route', () => {
    const graph = imported();
    const [first, second] = edgesOf(graph);
    setSpline(edgeAt(graph, first!), [edgeAt(graph, first!), edgeAt(graph, second!)], [segment(2)]);
    const dump = dumped(graph);
    const props = dump.changed.find((entry) => entry.path === first)?.props;
    expect(Object.keys(props ?? {})).toEqual([InternalProperties.SPLINE_EDGE_CHAIN.getId()]);
    expect(props?.['splines.edgeChain']).toEqual([{ ref: first }, { ref: second }]);
    expect(JSON.stringify(dump.changed)).not.toContain('splines.route.start');
    expect(dump.geometry.splines?.[first!]?.route).toHaveLength(1);
  });

  it('has no splines member when no edge carries a route', () => {
    expect('splines' in dumped(imported()).geometry).toBe(false);
  });

  it('names the edge and the field of a segment that lacks one', () => {
    const graph = imported();
    const [first] = edgesOf(graph);
    const { xDelta: _xDelta, ...broken } = segment(1) as Record<string, unknown>;
    setSpline(edgeAt(graph, first!), [], [broken]);
    expect(() => dumped(graph)).toThrow(`spline segment of edge ${first}: field xDelta is not a number`);
  });
});

describe('routingDump removed elements', () => {
  const LNODE_CLASS = { class: 'org.eclipse.elk.alg.layered.graph.LNode' };

  /** A dummy that a port and a node point at, as the N/S port dummies are before the postprocessor removes them. */
  function withDummy(graph: LGraph, inGraph: boolean): LNode {
    const dummy = new LNode(graph);
    graph.getLayerlessNodes().push(dummy);
    const port = (elementAt(graph, 'g0/n0') as LNode).getPorts()[0] as LPort;
    port.setProperty(InternalProperties.PORT_DUMMY, dummy);
    (elementAt(graph, 'g0/n0') as LNode).setProperty(InternalProperties.BARYCENTER_ASSOCIATES, [dummy, dummy]);
    if (!inGraph) {
      graph.getLayerlessNodes().splice(graph.getLayerlessNodes().indexOf(dummy), 1);
    }
    return dummy;
  }

  const changedAt = (dump: ReturnType<typeof routingDump>, path: string): Record<string, unknown> | undefined =>
    dump.changed.find((entry) => entry.path === path)?.props;

  it('writes {class} for a value that points at a node no longer in the graph, at any depth, with no x/ entry', () => {
    const graph = imported();
    withDummy(graph, false);
    const dump = dumped(graph);
    expect(changedAt(dump, 'g0/n0/p0')?.portDummy).toEqual(LNODE_CLASS);
    expect(changedAt(dump, 'g0/n0')?.barycenterAssociates).toEqual([LNODE_CLASS, LNODE_CLASS]);
    expect(JSON.stringify(dump)).not.toContain('"x/');
    expect(dump.changed.map((entry) => entry.path)).toEqual(['g0/n0', 'g0/n0/p0']);
    expect(Object.keys(dump.ports)).toEqual(['g0/n0', 'g0/n1', 'g0/n2']);
    expect(Object.keys(dump.geometry.nodes)).toEqual(['g0/n0', 'g0/n1', 'g0/n2']);
  });

  it('keeps the {ref} to a node that is still in the graph, named new/n<k>, with its entries', () => {
    const graph = imported();
    withDummy(graph, true);
    const dump = dumped(graph);
    expect(changedAt(dump, 'g0/n0/p0')?.portDummy).toEqual({ ref: 'new/n0' });
    expect(Object.keys(dump.ports)).toContain('new/n0');
    expect(Object.keys(dump.geometry.nodes)).toContain('new/n0');
  });

  it('keeps the {ref} to a node of the import that has left the graph', () => {
    const graph = imported();
    const other = elementAt(graph, 'g0/n1') as LNode;
    (elementAt(graph, 'g0/n0') as LNode).getPorts()[0]!.setProperty(InternalProperties.PORT_DUMMY, other);
    graph.getLayerlessNodes().splice(graph.getLayerlessNodes().indexOf(other), 1);
    const dump = dumped(graph);
    expect(changedAt(dump, 'g0/n0/p0')?.portDummy).toEqual({ ref: 'g0/n1' });
    expect(Object.keys(dump.ports)).toContain('g0/n1');
  });
});
