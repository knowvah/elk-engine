// SPDX-License-Identifier: EPL-2.0
// Structural tests of the order dump: the import order of the ports, and the effects of port and node reordering.
import { describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { repoRoot } from '../corpus/corpus.js';
import { elementAt, importDumpOf } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, loadRows, type PhaseRow } from './layered-phase-replay-rows.js';
import { orderDump } from './layered-order-replay-dump.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }, { id: 'a1' }, { id: 'a2' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const ROW: PhaseRow = {
  id: 'scenarios/order-dump',
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
const E = 'g0/e0';

function imported(): LGraph {
  return importRow(ROW).graph;
}

describe('orderDump after import', () => {
  it('lists every layerless node with its ports in import order', () => {
    const graph = imported();
    const dump = orderDump(graph, importDumpOf(graph));
    expect(dump.ports).toEqual({ [A]: [`${A}/p0`, `${A}/p1`, `${A}/p2`], [B]: [`${B}/p0`] });
    expect(dump.layerless).toEqual([A, B]);
    expect(dump.changed).toEqual([]);
  });

  it('reports no change after normalise and keeps the port order', () => {
    const graph = imported();
    normalise(graph);
    const dump = orderDump(graph, importDumpOf(graph));
    expect(dump.changed).toEqual([]);
    expect(dump.ports[A]).toEqual([`${A}/p0`, `${A}/p1`, `${A}/p2`]);
  });

  it('imports a 7b scenario row with ports in import order and no change', () => {
    const row = loadRows(`${repoRoot()}/test/golden/refs/java/layered-phases.json`).find(
      (r) => r.group === 'scenarios',
    );
    expect(row).toBeDefined();
    const { graph, importDump } = importRow(row as PhaseRow);
    normalise(graph);
    const dump = orderDump(graph, importDump);
    expect(dump.changed).toEqual([]);
    expect(dump.layerless.length).toBeGreaterThan(0);
    for (const nodePath of dump.layerless) {
      const count = (elementAt(graph, nodePath) as LNode).getPorts().length;
      expect(dump.ports[nodePath]).toEqual(Array.from({ length: count }, (_, j) => `${nodePath}/p${String(j)}`));
    }
  });
});

describe('orderDump effects', () => {
  it('reports a swap of two ports, and keys layered nodes by their path', () => {
    const graph = imported();
    const layer = new Layer(graph);
    graph.getLayers().push(layer);
    const a = elementAt(graph, A) as LNode;
    a.setLayer(layer);
    graph.getLayerlessNodes().splice(0, 1);
    const ports = a.getPorts();
    [ports[0], ports[2]] = [ports[2] as LPort, ports[0] as LPort];
    const dump = orderDump(graph, importDumpOf(graph));
    expect(dump.layers).toEqual([[A]]);
    expect(dump.ports[A]).toEqual([`${A}/p2`, `${A}/p1`, `${A}/p0`]);
    expect(dump.ports[B]).toEqual([`${B}/p0`]);
  });

  it('names a port created after import new/p<k>', () => {
    const graph = imported();
    const b = elementAt(graph, B) as LNode;
    const fresh = new LPort();
    fresh.setNode(b);
    expect(orderDump(graph, importDumpOf(graph)).ports[B]).toEqual([`${B}/p0`, 'new/p0']);
  });

  it('lists a baseline edge a processor detached after the reachable ones, with null ends (recorder header)', () => {
    const graph = imported();
    const edge = elementAt(graph, E) as LEdge;
    expect(orderDump(graph, importDumpOf(graph)).edges).toEqual([
      { path: E, src: `${A}/p0`, tgt: `${B}/p0`, reversed: false },
    ]);
    edge.setSource(null);
    edge.setTarget(null);
    expect(orderDump(graph, importDumpOf(graph)).edges).toEqual([{ path: E, src: null, tgt: null, reversed: false }]);
  });

  it('keeps a node that left the graph, and lists a hidden node once', () => {
    const graph = imported();
    const b = elementAt(graph, B) as LNode;
    graph.getLayerlessNodes().splice(1, 1);
    const dump = orderDump(graph, importDumpOf(graph));
    expect(dump.layerless).toEqual([A]);
    expect(Object.keys(dump.ports)).toEqual([A, B]);
    expect(dump.ports[B]).toEqual(b.getPorts().map((_, j) => `${B}/p${String(j)}`));
  });
});
