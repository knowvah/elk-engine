// SPDX-License-Identifier: EPL-2.0
// Structural tests of the placement dump (L4: expected values are the import dump's own geometry or values set here).
import { beforeAll, describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, type LGraphDump, type NodeDump } from './layered-framework-replay.js';
import { elementAt, importDumpOf } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, loadRows, type PhaseRow } from './layered-phase-replay-rows.js';
import { placementDump } from './layered-placement-replay-dump.js';

const GRAPH = {
  id: 'root',
  children: [
    {
      id: 'a',
      width: 10,
      height: 20,
      labels: [{ text: 'A', width: 4, height: 4 }],
      ports: [{ id: 'a0', labels: [{ text: 'p', width: 2, height: 2 }] }, { id: 'a1' }],
    },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const ROW: PhaseRow = {
  id: 'scenarios/placement-dump',
  group: 'scenarios',
  input: { elk: GRAPH },
  target: null,
  options: {},
  steps: [],
  prefix: null,
  expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [] },
};
const A = 'g0/n0';
const B = 'g0/n1';
const ORDER_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

function imported(): LGraph {
  return importRow(ROW).graph;
}

function dumped(graph: LGraph): ReturnType<typeof placementDump> {
  return placementDump(graph, importDumpOf(graph));
}

function nodesOf(dump: LGraphDump): NodeDump[] {
  return dump.graphs.flatMap((g) => g.layerlessNodes);
}

describe('placementDump after import and normalise', () => {
  it('equals the import geometry for every node, port and label of a 7c scenario row, with no change', () => {
    const row = loadRows(ORDER_FILE).find((r) => r.group === 'scenarios') as PhaseRow;
    const { graph, importDump } = importRow(row);
    normalise(graph);
    const dump = placementDump(graph, importDump);
    const nodes = nodesOf(importDump);
    expect(nodes.length).toBeGreaterThan(0);
    expect(dump.changed).toEqual([]);
    expect(dump.geometry.layers).toEqual([]);
    expect(Object.keys(dump.geometry.nodes).sort()).toEqual(nodes.map((n) => n.path).sort());
    for (const node of nodes) {
      expect(dump.geometry.nodes[node.path]).toEqual({ pos: node.pos, size: node.size, margin: node.margin });
      for (const port of node.ports) {
        expect(dump.geometry.ports?.[port.path]).toEqual({ pos: port.pos });
      }
    }
    const portPaths = nodes.flatMap((n) => n.ports.map((p) => p.path));
    expect(Object.keys(dump.geometry.ports ?? {}).sort()).toEqual(portPaths.sort());
  });

  it('computes ports and labels always, labels of nodes and ports by their positional paths', () => {
    const graph = imported();
    normalise(graph);
    const { geometry } = dumped(graph);
    expect(Object.keys(geometry.ports ?? {})).toEqual([`${A}/p0`, `${A}/p1`, `${B}/p0`]);
    expect(Object.keys(geometry.labels ?? {}).sort()).toEqual([`${A}/l0`, `${A}/p0/l0`]);
    expect(Object.keys(geometry.nodes)).toEqual([A, B]);
  });
});

describe('placementDump geometry', () => {
  it('reports position, size and margin as (top, right, bottom, left)', () => {
    const graph = imported();
    const a = elementAt(graph, A) as LNode;
    a.getPosition().x = 7.5;
    a.getPosition().y = -3;
    a.getMargin().top = 1;
    a.getMargin().right = 2;
    a.getMargin().bottom = 3;
    a.getMargin().left = 4;
    const node = dumped(graph).geometry.nodes[A];
    expect(node?.pos.map(decodeHex)).toEqual([7.5, -3]);
    expect(node?.size.map(decodeHex)).toEqual([10, 20]);
    expect(node?.margin.map(decodeHex)).toEqual([1, 2, 3, 4]);
  });

  it('reports port and label positions in raw double bits', () => {
    const graph = imported();
    const a = elementAt(graph, A) as LNode;
    a.getPorts()[0]!.getPosition().y = 0.1;
    a.getLabels()[0]!.getPosition().x = 2.5;
    const { geometry } = dumped(graph);
    expect(geometry.ports?.[`${A}/p0`]?.pos[1]).toBe(encodeHex(0.1));
    expect(geometry.labels?.[`${A}/l0`]?.pos[0]).toBe(encodeHex(2.5));
  });

  it('lists the size of every layer in layer order', () => {
    const graph = imported();
    const first = new Layer(graph);
    const second = new Layer(graph);
    first.getSize().x = 12;
    first.getSize().y = 30;
    second.getSize().x = 5;
    graph.getLayers().push(first, second);
    expect(dumped(graph).geometry.layers.map((size) => size.map(decodeHex))).toEqual([
      [12, 30],
      [5, 0],
    ]);
  });

  it('names a port created after import new/p<k> and includes it', () => {
    const graph = imported();
    const fresh = new LPort();
    fresh.setNode(elementAt(graph, B) as LNode);
    fresh.getPosition().x = 9;
    expect(dumped(graph).geometry.ports?.['new/p0']?.pos.map(decodeHex)).toEqual([9, 0]);
  });

  it('keeps the geometry of a node that left the graph', () => {
    const graph = imported();
    graph.getLayerlessNodes().splice(1, 1);
    const dump = dumped(graph);
    expect(dump.layerless).toEqual([A]);
    expect(Object.keys(dump.geometry.nodes)).toEqual([A, B]);
  });
});
