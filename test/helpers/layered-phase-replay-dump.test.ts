// SPDX-License-Identifier: EPL-2.0
// Structural tests of the phase dump (B2): the state right after import and normalise reports no change, and every
// kind of effect a processor can have shows up where the contract says.
import { describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import manifest from '../golden/inputs/manifest.json' with { type: 'json' };
import { contextOf, elementAt, importDumpOf, phaseDump } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, type PhaseRow } from './layered-phase-replay-rows.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const ROW: PhaseRow = {
  id: 'scenarios/dump',
  group: 'scenarios',
  input: { elk: GRAPH },
  target: null,
  options: {},
  steps: [],
  prefix: null,
  expected: { layers: [], layerless: [], hidden: [], edges: [], changed: [] },
};
const EDGE = 'g0/e0';
const SOURCE_NODE = 'g0/n0';
const TARGET_NODE = 'g0/n1';

function imported(): LGraph {
  return importRow(ROW).graph;
}

describe('phaseDump after import', () => {
  it('lists the layerless nodes, no layers, no hidden nodes and the unreversed edge', () => {
    const graph = imported();
    const dump = phaseDump(graph, importDumpOf(graph));
    expect(dump.layerless).toEqual([SOURCE_NODE, TARGET_NODE]);
    expect(dump.layers).toEqual([]);
    expect(dump.hidden).toEqual([]);
    expect(dump.edges).toEqual([{ path: EDGE, src: `${SOURCE_NODE}/p0`, tgt: `${TARGET_NODE}/p0`, reversed: false }]);
    expect(dump.changed).toEqual([]);
  });

  it('reports no change after normalise either, because normalise re-baselines', () => {
    const graph = imported();
    normalise(graph);
    expect(phaseDump(graph, importDumpOf(graph)).changed).toEqual([]);
  });
});

describe('phaseDump effects', () => {
  it('reports a layer assignment in layers and removes the nodes from layerless', () => {
    const graph = imported();
    const layer = new Layer(graph);
    graph.getLayers().push(layer);
    (elementAt(graph, TARGET_NODE) as LNode).setLayer(layer);
    graph.getLayerlessNodes().splice(1, 1);
    const dump = phaseDump(graph, importDumpOf(graph));
    expect(dump.layers).toEqual([[TARGET_NODE]]);
    expect(dump.layerless).toEqual([SOURCE_NODE]);
  });

  it('keeps import paths stable after a node left the layerless list', () => {
    const graph = imported();
    const layer = new Layer(graph);
    graph.getLayers().push(layer);
    (elementAt(graph, SOURCE_NODE) as LNode).setLayer(layer);
    expect(phaseDump(graph, importDumpOf(graph)).edges[0]?.src).toBe(`${SOURCE_NODE}/p0`);
  });

  it('reports hidden nodes by path', () => {
    const graph = imported();
    const hidden = elementAt(graph, SOURCE_NODE) as LNode;
    graph.getLayerlessNodes().splice(0, 1);
    graph.setProperty(InternalProperties.HIDDEN_NODES, [hidden]);
    const dump = phaseDump(graph, importDumpOf(graph));
    expect(dump.hidden).toEqual([SOURCE_NODE]);
    expect(dump.layerless).toEqual([TARGET_NODE]);
  });

  it('reports a reversed edge with its changed REVERSED property', () => {
    const graph = imported();
    (elementAt(graph, EDGE) as LEdge).reverse(graph, true);
    const dump = phaseDump(graph, importDumpOf(graph));
    expect(dump.edges.map((e) => e.reversed)).toEqual([true]);
    const entry = dump.changed.find((c) => c.path === EDGE);
    expect(entry?.props.reversed).toEqual({ t: 'bool', v: true });
  });

  it('reports a set property as changed and a removed one as null', () => {
    const graph = imported();
    const node = elementAt(graph, SOURCE_NODE) as LNode;
    node.setProperty(LayeredOptions.PRIORITY, 5);
    const first = phaseDump(graph, importDumpOf(graph)).changed.find((c) => c.path === SOURCE_NODE);
    expect(first?.props[LayeredOptions.PRIORITY.getId()]).toEqual({ t: 'number', v: 5 });
    const imports = [...node.getAllProperties()].map(([p]) => (p as { getId(): string }).getId());
    node.setProperty(InternalProperties.ORIGIN, null);
    const second = phaseDump(graph, importDumpOf(graph)).changed.find((c) => c.path === SOURCE_NODE);
    expect(imports).toContain(InternalProperties.ORIGIN.getId());
    expect(second?.props[InternalProperties.ORIGIN.getId()]).toBeNull();
  });

  it('ignores processors, random and spacings', () => {
    const graph = imported();
    graph.setProperty(InternalProperties.PROCESSORS, []);
    expect(phaseDump(graph, importDumpOf(graph)).changed).toEqual([]);
  });

  it('names created elements new/n<k>, new/p<k>, new/e<k> in the order first met', () => {
    const graph = imported();
    const created = new LNode(graph);
    graph.getLayerlessNodes().push(created);
    const port = new LPort();
    port.setNode(created);
    const edge = elementAt(graph, EDGE) as LEdge;
    const extra = new (edge.constructor as new () => LEdge)();
    extra.setSource(port);
    extra.setTarget(elementAt(graph, `${TARGET_NODE}/p0`) as LPort);
    const dump = phaseDump(graph, importDumpOf(graph));
    expect(dump.layerless).toEqual([SOURCE_NODE, TARGET_NODE, 'new/n0']);
    expect(dump.edges.map((e) => e.path)).toEqual([EDGE, 'new/e0']);
    expect(dump.edges[1]?.src).toBe('new/p0');
    expect(contextOf(graph).paths.get(created)).toBe('new/n0');
    expect(phaseDump(graph, importDumpOf(graph)).edges[1]?.path).toBe('new/e0');
  });

  it('refuses a graph that was not imported through the replay', async () => {
    const { LGraph: Fresh } = await import('../../src/alg/layered/graph/LGraph.js');
    const fresh = new Fresh();
    expect(() => phaseDump(fresh, { graphs: [] })).toThrow(/was not imported/);
    expect(() => elementAt(imported(), 'g9/n9')).toThrow(/no element has the path g9\/n9/);
  });
});

describe('phaseDump of a vendored model', () => {
  const MODEL = 'realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json';

  it('has no layers, no change and only unreversed edges after import and normalise', () => {
    const file = `test/golden/inputs/${MODEL}`;
    const sha256 = (manifest.files as Record<string, string>)[MODEL] as string;
    const { graph, importDump } = importRow({ ...ROW, input: { path: file, sha256 } });
    normalise(graph);
    const dump = phaseDump(graph, importDump);
    expect(dump.layers).toEqual([]);
    expect(dump.changed).toEqual([]);
    expect(dump.edges.length).toBeGreaterThan(0);
    expect(dump.edges.every((e) => !e.reversed)).toBe(true);
    expect(dump.layerless.length).toBe(graph.getLayerlessNodes().length);
  });
});
