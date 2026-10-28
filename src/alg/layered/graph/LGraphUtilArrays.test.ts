// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph } from './LGraph.js';
import { toEdgeArray, toNodeArray, toPortArray } from './LGraphUtilArrays.js';

describe('LGraphUtilArrays', () => {
  it('copies nodes, ports and edges into new arrays, keeping order', () => {
    const graph = new LGraph();
    const a = addNode(graph);
    const b = addNode(graph);
    const pa = addPort(a);
    const pb = addPort(b);
    const e1 = connect(pa, pb);
    const e2 = connect(pb, pa);

    const nodes = toNodeArray(graph.getLayerlessNodes());
    expect(nodes).toEqual([a, b]);
    expect(nodes).not.toBe(graph.getLayerlessNodes());
    expect(toPortArray([pb, pa])).toEqual([pb, pa]);
    expect(toEdgeArray(new Set([e2, e1]))).toEqual([e2, e1]);

    nodes.pop();
    expect(graph.getLayerlessNodes()).toEqual([a, b]);
  });

  it('copies an empty collection to an empty array', () => {
    expect(toNodeArray([])).toEqual([]);
    expect(toEdgeArray([])).toEqual([]);
    expect(toPortArray([])).toEqual([]);
  });
});
