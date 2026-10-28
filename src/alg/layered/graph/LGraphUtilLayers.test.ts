// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { alignedNode, layerNode, sizedLayer, wirePorts } from '../../../../test/helpers/lgraph-site-layers.js';
import { Alignment } from '../../../core/options/Alignment.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortSide } from '../../../core/options/PortSide.js';
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

describe('placeNodesHorizontally (oracle rows)', () => {
  // oracle: site/lgraphutil/layers/placeNodesHorizontally-alignments; LGraphUtil.java:223-277
  it('places LEFT, RIGHT, CENTER and AUTOMATIC nodes by the out/(in+out) port ratio, a long edge dummy centered', () => {
    const graph = new LGraph();
    const layer = sizedLayer(graph, 200, 100);
    const left = alignedNode(graph, layer, [0, 7, 0, 5], Alignment.LEFT);
    const right = alignedNode(graph, layer, [0, 7, 0, 5], Alignment.RIGHT);
    const center = alignedNode(graph, layer, [0, 7, 0, 5], Alignment.CENTER);
    const autoOut = alignedNode(graph, layer, [0, 0, 0, 0], Alignment.AUTOMATIC);
    wirePorts(graph, autoOut, [PortSide.WEST, PortSide.EAST, PortSide.EAST]);
    const autoIn = alignedNode(graph, layer, [0, 0, 0, 0], Alignment.AUTOMATIC);
    wirePorts(graph, autoIn, [PortSide.WEST, PortSide.WEST, PortSide.EAST]);
    const autoNone = alignedNode(graph, layer, [0, 0, 0, 0], Alignment.AUTOMATIC);
    const autoDefault = alignedNode(graph, layer, [0, 0, 0, 0]);
    wirePorts(graph, autoDefault, [PortSide.WEST]);
    const dummy = layerNode(graph, layer, [5, 5], [0, 0, 0, 0], NodeType.LONG_EDGE);

    placeNodesHorizontally(layer, 10);

    const xs = [left, right, center, autoOut, autoIn, autoNone, autoDefault, dummy].map((n) => n.getPosition().x);
    // a left-aligned node sits at the offset plus the maximal left margin (5 * 2 * 0.5); RIGHT is clamped by its margin
    expect(xs).toEqual([15, 163, 90, 114.33333333333333, 65, 90, 15, 107.5]);
  });

  // oracle: site/lgraphutil/layers/placeNodesHorizontally-clamp-{left,right,both}; LGraphUtil.java:263-271
  it.each([
    ['clamp-left', [0, 0, 0, 15], [15, 15]],
    ['clamp-right', [0, 15, 0, 0], [5, 0]],
    ['clamp-both', [0, 15, 0, 15], [5, 15]],
  ] as const)('%s: a wide CENTER node is clamped by its own margins', (_row, margin, [wideX, narrowX]) => {
    const graph = new LGraph();
    const layer = sizedLayer(graph, 100, 100);
    const wide = layerNode(graph, layer, [80, 10], [...margin]);
    wide.setProperty(LayeredOptions.ALIGNMENT, Alignment.CENTER);
    const narrow = layerNode(graph, layer, [20, 10], [0, 0, 0, 0]);
    narrow.setProperty(LayeredOptions.ALIGNMENT, Alignment.LEFT);
    placeNodesHorizontally(layer, 0);
    expect([wide.getPosition().x, narrow.getPosition().x]).toEqual([wideX, narrowX]);
  });
});

describe('findMaxNonDummyNodeWidth (oracle rows)', () => {
  // oracle: site/lgraphutil/layers/findMaxNonDummyNodeWidth; LGraphUtil.java:313-345
  it.each([
    [Direction.UNDEFINED, 59, 50],
    [Direction.LEFT, 59, 50],
    [Direction.RIGHT, 59, 50],
    [Direction.UP, 0, 0],
    [Direction.DOWN, 0, 0],
  ])('under %s the widest non-dummy node is %j with margins and %j without', (direction, withMargins, without) => {
    const graph = new LGraph();
    const layer = sizedLayer(graph, 100, 100);
    layerNode(graph, layer, [30, 10], [0, 3, 0, 2]);
    layerNode(graph, layer, [50, 10], [0, 5, 0, 4]);
    layerNode(graph, layer, [500, 5], [0, 9, 0, 9], NodeType.LONG_EDGE);
    graph.setProperty(LayeredOptions.DIRECTION, direction);
    expect(findMaxNonDummyNodeWidth(layer, true)).toBe(withMargins);
    expect(findMaxNonDummyNodeWidth(layer, false)).toBe(without);
  });
});
