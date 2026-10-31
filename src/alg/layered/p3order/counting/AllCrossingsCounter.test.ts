// SPDX-License-Identifier: EPL-2.0
// Structural cases only; the counter is proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { AllCrossingsCounter } from './AllCrossingsCounter.js';
import { init } from './IInitializable.js';

/** Two layers of `leftCount` and `rightCount` nodes, each with one east respectively west port, no edges. */
function edgelessLayers(leftCount: number, rightCount: number): LNode[][] {
  const graph = new LGraph();
  const left = addLayer(graph);
  const right = addLayer(graph);
  const make = (layer: typeof left, side: PortSide): LNode => {
    const node = addNode(graph);
    node.setLayer(layer);
    addPort(node, side);
    return node;
  };
  return [
    Array.from({ length: leftCount }, () => make(left, PortSide.EAST)),
    Array.from({ length: rightCount }, () => make(right, PortSide.WEST)),
  ];
}

describe('AllCrossingsCounter', () => {
  it('answers 0 for an empty order without being initialised', () => {
    expect(new AllCrossingsCounter([]).countAllCrossings([])).toBe(0);
  });

  it('numbers the ports in traversal order during init', () => {
    const order = edgelessLayers(2, 1);
    init([new AllCrossingsCounter(order)], order);
    const ids = order.flat().map((node) => node.getPorts().map((port) => port.id));
    expect(ids).toEqual([[0], [1], [2]]);
  });

  it('counts 0 crossings in an order whose layers have no edges', () => {
    const order = edgelessLayers(2, 2);
    const counter = new AllCrossingsCounter(order);
    init([counter], order);
    expect(counter.countAllCrossings(order)).toBe(0);
  });

  it('counts 0 crossings with a north/south port dummy in the layer and no edges to it', () => {
    const order = edgelessLayers(1, 1);
    const graph = new LGraph();
    const dummy = addNode(graph, NodeType.NORTH_SOUTH_PORT);
    dummy.setLayer(order[0]![0]!.getLayer());
    order[0]!.push(dummy);
    const counter = new AllCrossingsCounter(order);
    init([counter], order);
    expect(counter.countAllCrossings(order)).toBe(0);
  });

  it('initAtEdgeLevel only counts an edge at its source port', () => {
    const order = edgelessLayers(1, 1);
    const edge = connect(order[0]![0]!.getPorts()[0]!, order[1]![0]!.getPorts()[0]!);
    const counter = new AllCrossingsCounter(order);
    // a between-layer edge is not an in-layer edge: nothing is counted for either end
    counter.initAtEdgeLevel(0, 0, 0, 0, edge, order);
    counter.initAtEdgeLevel(1, 0, 0, 0, edge, order);
    expect(Reflect.get(counter, 'inLayerEdgeCounts')).toEqual(Int32Array.of(0, 0));
  });
});
