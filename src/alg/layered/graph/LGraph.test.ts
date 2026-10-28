// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, label } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph } from './LGraph.js';
import { LGraphElement } from './LGraphElement.js';
import { LPadding } from './LPadding.js';

function named(graph: LGraph, name: string): ReturnType<typeof addNode> {
  const node = addNode(graph);
  node.getLabels().push(label(name));
  return node;
}

describe('LGraph', () => {
  it('starts empty and unnested', () => {
    const graph = new LGraph();
    expect(graph).toBeInstanceOf(LGraphElement);
    expect(graph.getLayerlessNodes()).toEqual([]);
    expect(graph.getLayers()).toEqual([]);
    expect(graph.getParentNode()).toBeNull();
    expect(graph.getPadding()).toBeInstanceOf(LPadding);
    expect([graph.getSize().x, graph.getSize().y]).toEqual([0, 0]);
    expect([graph.getOffset().x, graph.getOffset().y]).toEqual([0, 0]);
  });

  it('hands out its live size, padding and offset', () => {
    const graph = new LGraph();
    expect(graph.getSize()).toBe(graph.getSize());
    expect(graph.getPadding()).toBe(graph.getPadding());
    expect(graph.getOffset()).toBe(graph.getOffset());
    graph.getSize().x = 4;
    expect(graph.getSize().x).toBe(4);
  });

  it('getActualSize is a new vector (zero for an empty graph) detached from the size', () => {
    const graph = new LGraph();
    const actual = graph.getActualSize();
    expect([actual.x, actual.y]).toEqual([0, 0]);
    expect(actual).not.toBe(graph.getSize());
    actual.x = 99;
    expect(graph.getSize().x).toBe(0);
    expect(graph.getActualSize().x).toBe(0);
  });

  it('stores and clears the parent node', () => {
    const outer = new LGraph();
    const parent = addNode(outer);
    const inner = new LGraph();
    inner.setParentNode(parent);
    expect(inner.getParentNode()).toBe(parent);
    inner.setParentNode(null);
    expect(inner.getParentNode()).toBeNull();
  });

  it('iterates over its layers in order', () => {
    const graph = new LGraph();
    const first = addLayer(graph);
    const second = addLayer(graph);
    expect([...graph]).toEqual([first, second]);
  });

  it('toNodeArray copies the node lists layer by layer', () => {
    const graph = new LGraph();
    const l0 = addLayer(graph);
    const l1 = addLayer(graph);
    const a = named(graph, 'a');
    const b = named(graph, 'b');
    const c = named(graph, 'c');
    a.setLayer(l0);
    b.setLayer(l0);
    c.setLayer(l1);
    const array = graph.toNodeArray();
    expect(array).toEqual([[a, b], [c]]);
    expect(array[0]).not.toBe(l0.getNodes());
    expect(new LGraph().toNodeArray()).toEqual([]);
  });

  it('prints the unlayered, layered and mixed forms', () => {
    const graph = new LGraph();
    expect(graph.toString()).toBe('G-unlayered[]');
    const a = named(graph, 'a');
    const b = named(graph, 'b');
    expect(graph.toString()).toBe('G-unlayered[n_a, n_b]');

    const layer = addLayer(graph);
    a.setLayer(layer);
    graph.getLayerlessNodes().splice(0, 1);
    expect(graph.toString()).toBe('G[layerless[n_b], layers[L_0[n_a]]]');

    b.setLayer(layer);
    graph.getLayerlessNodes().length = 0;
    expect(graph.toString()).toBe('G-layered[L_0[n_a, n_b]]');
  });
});
