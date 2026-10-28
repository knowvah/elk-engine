// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { Direction } from '../../../core/options/Direction.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import { findMaxNonDummyNodeWidth, placeNodesHorizontally } from './LGraphUtilLayers.js';
import { NodeType } from './LNodeNodeType.js';

const X_OFFSET = 17;

describe('placeNodesHorizontally', () => {
  it('places every node at the offset when layer, node sizes and margins are all zero, for each alignment', () => {
    for (const alignment of [Alignment.LEFT, Alignment.RIGHT, Alignment.CENTER, Alignment.AUTOMATIC, Alignment.TOP]) {
      const graph = new LGraph();
      const layer = addLayer(graph);
      const node = addNode(graph);
      node.setLayer(layer);
      node.setProperty(LayeredOptions.ALIGNMENT, alignment);
      node.getPosition().x = 99;
      placeNodesHorizontally(layer, X_OFFSET);
      expect(node.getPosition().x).toBe(X_OFFSET);
      expect(node.getPosition().y).toBe(0);
    }
  });

  it('with automatic alignment handles nodes with input ports, output ports and both', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const source = addNode(graph);
    const sink = addNode(graph);
    const middle = addNode(graph);
    const ps = addPort(source);
    const pt = addPort(sink);
    const pmIn = addPort(middle);
    const pmOut = addPort(middle);
    connect(ps, pmIn);
    connect(pmOut, pt);
    for (const node of [source, sink, middle]) {
      node.setLayer(layer);
      node.getPosition().x = 99;
    }
    placeNodesHorizontally(layer, X_OFFSET);
    expect([source, sink, middle].map((n) => n.getPosition().x)).toEqual([X_OFFSET, X_OFFSET, X_OFFSET]);
  });
});

describe('findMaxNonDummyNodeWidth', () => {
  const WIDTH = 40;

  function layerWith(direction: Direction): { layer: ReturnType<typeof addLayer>; normal: ReturnType<typeof addNode> } {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, direction);
    const layer = addLayer(graph);
    const normal = addNode(graph);
    normal.setLayer(layer);
    normal.getSize().x = WIDTH;
    const dummy = addNode(graph, NodeType.LONG_EDGE);
    dummy.setLayer(layer);
    dummy.getSize().x = WIDTH * 2;
    return { layer, normal };
  }

  it('is 0 for a vertical layout direction', () => {
    expect(findMaxNonDummyNodeWidth(layerWith(Direction.DOWN).layer, false)).toBe(0);
    expect(findMaxNonDummyNodeWidth(layerWith(Direction.UP).layer, true)).toBe(0);
  });

  it('is the width of the widest normal node, ignoring dummies', () => {
    expect(findMaxNonDummyNodeWidth(layerWith(Direction.RIGHT).layer, false)).toBe(WIDTH);
  });

  it('includes the node margins only when asked to', () => {
    const { layer, normal } = layerWith(Direction.RIGHT);
    normal.getMargin().left = 3;
    normal.getMargin().right = 4;
    expect(findMaxNonDummyNodeWidth(layer, false)).toBe(WIDTH);
    expect(findMaxNonDummyNodeWidth(layer, true)).toBeGreaterThan(WIDTH);
  });

  it('is 0 for a layer without normal nodes', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const dummy = addNode(graph, NodeType.LONG_EDGE);
    dummy.setLayer(layer);
    dummy.getSize().x = WIDTH;
    expect(findMaxNonDummyNodeWidth(layer, false)).toBe(0);
  });
});
