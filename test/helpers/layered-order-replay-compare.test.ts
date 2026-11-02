// SPDX-License-Identifier: EPL-2.0
// Tests of the order comparer: equal dumps, a fake P3 phase that reorders nodes and ports, and each port-diff kind.
import { describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { dumpLGraph } from './layered-framework-replay.js';
import { compareOrder, compareOrderFullDump } from './layered-order-replay-compare.js';
import { orderDump } from './layered-order-replay-dump.js';
import type { OrderExpected } from './layered-order-replay-rows.js';
import { elementAt, importDumpOf } from './layered-phase-replay-dump.js';
import { importRow, type PhaseRow } from './layered-phase-replay-rows.js';

const GRAPH = {
  id: 'root',
  children: [
    { id: 'a', width: 10, height: 10, ports: [{ id: 'a0' }, { id: 'a1' }] },
    { id: 'b', width: 10, height: 10, ports: [{ id: 'b0' }] },
  ],
  edges: [{ id: 'e', sources: ['a0'], targets: ['b0'] }],
};
const ROW: PhaseRow = {
  id: 'scenarios/order-compare',
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

/** Both nodes in one layer, as a layerer leaves them. */
function layered(): LGraph {
  const graph = importRow(ROW).graph;
  const layer = new Layer(graph);
  graph.getLayers().push(layer);
  [A, B].forEach((path) => (elementAt(graph, path) as LNode).setLayer(layer));
  graph.getLayerlessNodes().length = 0;
  return graph;
}

/** A fake P3: swaps the two nodes of the layer and the two ports of the first node. */
const fakeP3: ILayoutProcessor<LGraph> = {
  process(graph) {
    const nodes = graph.getLayers()[0]!.getNodes();
    [nodes[0], nodes[1]] = [nodes[1] as LNode, nodes[0] as LNode];
    const ports = (elementAt(graph, A) as LNode).getPorts();
    [ports[0], ports[1]] = [ports[1]!, ports[0]!];
  },
} as ILayoutProcessor<LGraph>;

function dumped(graph: LGraph): OrderExpected {
  return orderDump(graph, importDumpOf(graph));
}

describe('compareOrder', () => {
  it('reports no difference between equal dumps', () => {
    const graph = layered();
    expect(compareOrder(dumped(graph), dumped(graph))).toEqual([]);
  });

  it('reports the node swap of a fake P3 phase by layers, and the port swap by node', () => {
    const graph = layered();
    const before = dumped(graph);
    fakeP3.process(graph, new NullElkProgressMonitor());
    const diffs = compareOrder(dumped(graph), before);
    expect(diffs.map((d) => d.where)).toEqual(['layers', `ports ${A}`]);
    expect(diffs[0]?.message).toBe(`expected [["${A}","${B}"]], got [["${B}","${A}"]]`);
    expect(diffs[1]?.message).toBe(`expected ["${A}/p0","${A}/p1"], got ["${A}/p1","${A}/p0"]`);
  });

  it('reports a missing and an unexpected node in ports', () => {
    const base = dumped(layered());
    const { [B]: dropped, ...rest } = base.ports;
    expect(dropped).toEqual([`${B}/p0`]);
    expect(compareOrder({ ...base, ports: rest }, base)).toEqual([{ where: `ports ${B}`, message: 'missing' }]);
    expect(compareOrder(base, { ...base, ports: rest })).toEqual([{ where: `ports ${B}`, message: 'unexpected' }]);
  });

  it('reports a port list of a different length', () => {
    const base = dumped(layered());
    const shorter = { ...base, ports: { ...base.ports, [A]: [`${A}/p0`] } };
    expect(compareOrder(shorter, base).map((d) => d.where)).toEqual([`ports ${A}`]);
  });
});

describe('compareOrder (Java collection class names)', () => {
  const withClass = (base: OrderExpected, cls: string): OrderExpected => ({
    ...base,
    changed: [{ path: A, props: { 'org.eclipse.elk.layered.targetNode.modelOrder': { class: cls } } }],
  });

  it('compares a replayed Map as the recorded java.util.HashMap (AD-10 twin)', () => {
    const base = dumped(layered());
    expect(compareOrder(withClass(base, 'Map'), withClass(base, 'java.util.HashMap'))).toEqual([]);
  });

  it('still reports a class that is not the recorded one', () => {
    const base = dumped(layered());
    expect(compareOrder(withClass(base, 'Set'), withClass(base, 'java.util.HashMap')).map((d) => d.where)).toEqual([
      `changed ${A}`,
    ]);
  });
});

describe('compareOrderFullDump', () => {
  it('is empty when the row stores no full dump, and compares the dump when it does', () => {
    const graph = layered();
    const actual = { ...dumped(graph), dump: dumpLGraph(graph) };
    expect(compareOrderFullDump(actual, dumped(graph))).toEqual([]);
    expect(compareOrderFullDump(actual, actual)).toEqual([]);
    expect(compareOrderFullDump(dumped(graph), actual)).toEqual([
      { where: 'dump', message: 'the replay produced no full dump' },
    ]);
  });
});
