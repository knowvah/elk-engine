// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph } from './LGraph.js';
import { Layer } from './Layer.js';
import { LGraphElement } from './LGraphElement.js';

describe('Layer', () => {
  it('records its owner without adding itself to the graph', () => {
    const graph = new LGraph();
    const layer = new Layer(graph);
    expect(layer).toBeInstanceOf(LGraphElement);
    expect(layer.getGraph()).toBe(graph);
    expect(graph.getLayers()).toEqual([]);
    expect(layer.getNodes()).toEqual([]);
    expect(layer.getSize().x).toBe(0);
    expect(layer.getSize().y).toBe(0);
  });

  it('getIndex is the position in the graph layer list, -1 when not added', () => {
    const graph = new LGraph();
    const first = addLayer(graph);
    const second = addLayer(graph);
    expect(first.getIndex()).toBe(0);
    expect(second.getIndex()).toBe(1);
    expect(new Layer(graph).getIndex()).toBe(-1);
  });

  it('iterates its nodes in list order', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    a.setLayer(layer);
    b.setLayer(layer);
    expect([...layer]).toEqual([a, b]);
    expect(layer.getNodes()).toEqual([a, b]);
  });

  it('prints L_<index>[<nodes>]', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    expect(layer.toString()).toBe('L_0[]');
    const a = addNode(graph);
    const b = addNode(graph);
    a.setLayer(layer);
    b.setLayer(layer);
    expect(layer.toString()).toBe(`L_0[${a.toString()}, ${b.toString()}]`);
    expect(layer.toString()).toBe('L_0[n_0, n_1]');
  });
});
