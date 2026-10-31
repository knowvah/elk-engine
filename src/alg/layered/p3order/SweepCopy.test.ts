// SPDX-License-Identifier: EPL-2.0
// Unit cases of SweepCopy (mission 7c, T6): orders are copied, restored and re-sided as SweepCopy.java defines.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { SweepCopy } from './SweepCopy.js';

/** Two layers of two nodes, each node with two ports. */
function twoLayers(): { graph: LGraph; order: LNode[][] } {
  const graph = new LGraph();
  const order = [0, 1].map(() => {
    const layer = addLayer(graph);
    return [0, 1].map(() => {
      const node = addNode(graph);
      node.setLayer(layer);
      addPort(node, PortSide.EAST);
      addPort(node, PortSide.EAST);
      return node;
    });
  });
  return { graph, order };
}

describe('SweepCopy', () => {
  it('copies the node order deeply and the port orders by value', () => {
    const { order } = twoLayers();
    const copy = new SweepCopy(order);
    const ports = order.map((layer) => layer.map((node) => [...node.getPorts()]));
    order[0]!.reverse();
    order[1]![0]!.getPorts().reverse();
    expect(copy.nodes()).toEqual([
      [order[0]![1], order[0]![0]],
      [order[1]![0], order[1]![1]],
    ]);
    expect(copy.nodes()[0]).not.toBe(order[0]);
    expect(order[1]![0]!.getPorts()[0]).toBe(ports[1]![0]![1]);
    expect(Reflect.get(copy, 'portOrders')[1][0][0]).toBe(ports[1]![0]![0]);
  });

  it('copies a copy: new node arrays, the same port order lists', () => {
    const { order } = twoLayers();
    const first = new SweepCopy(order);
    const second = new SweepCopy(first);
    expect(second.nodes()).toEqual(first.nodes());
    expect(second.nodes()).not.toBe(first.nodes());
    expect(second.nodes()[0]).not.toBe(first.nodes()[0]);
    expect(Reflect.get(second, 'portOrders')[0]).toBe(Reflect.get(first, 'portOrders')[0]);
  });

  it('writes node order, ids and port order back and fixes the port order when asked', () => {
    const { graph, order } = twoLayers();
    const copy = new SweepCopy(order);
    const nodesBefore = order.map((layer) => [...layer]);
    const portsBefore = order.map((layer) => layer.map((node) => [...node.getPorts()]));
    graph.getLayers().forEach((layer) => layer.getNodes().reverse());
    order.flat().forEach((node) => node.getPorts().reverse());
    copy.transferNodeAndPortOrdersToGraph(graph, true);
    expect(graph.getLayers().map((layer) => layer.getNodes())).toEqual(nodesBefore);
    expect(nodesBefore.flatMap((layer) => layer.map((node) => node.id))).toEqual([0, 1, 0, 1]);
    expect(nodesBefore.map((layer) => layer.map((node) => node.getPorts()))).toEqual(portsBefore);
    expect(nodesBefore.flat().map((node) => node.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toEqual(
      nodesBefore.flat().map(() => PortConstraints.FIXED_ORDER),
    );
  });

  it('leaves the port constraints alone when not asked and keeps a fixed order', () => {
    const { graph, order } = twoLayers();
    order[0]![1]!.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    new SweepCopy(order).transferNodeAndPortOrdersToGraph(graph, false);
    expect(order[0]![0]!.hasProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(false);
    new SweepCopy(order).transferNodeAndPortOrdersToGraph(graph, true);
    expect(order[0]![1]!.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
  });

  /** One layer: origin node with a port on `side`, and its north/south dummy at `dummyFirst` or after the origin. */
  function northSouth(side: PortSide, dummyFirst: boolean, anchored: boolean) {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const origin = addNode(graph);
    origin.setLayer(layer);
    const port = addPort(origin, side);
    port.getSize().y = 10;
    if (anchored) {
      port.getAnchor().y = 3;
      port.setExplicitlySuppliedPortAnchor(true);
    }
    const dummy = addNode(graph, NodeType.NORTH_SOUTH_PORT);
    dummy.setLayer(layer);
    dummy.setProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT, origin);
    const dummyPort = addPort(dummy, PortSide.WEST);
    dummyPort.setProperty(InternalProperties.ORIGIN, port);
    connect(addPort(addNode(graph), PortSide.EAST), dummyPort);
    const order = [dummyFirst ? [dummy, origin] : [origin, dummy]];
    new SweepCopy(order).transferNodeAndPortOrdersToGraph(graph, false);
    return { port, anchor: port.getAnchor().y };
  }

  it('switches a northern port to the south when its dummy ends up behind the node, mirroring an explicit anchor', () => {
    const plain = northSouth(PortSide.NORTH, false, false);
    expect(plain.port.getSide()).toBe(PortSide.SOUTH);
    const anchored = northSouth(PortSide.NORTH, false, true);
    expect(anchored.anchor).toBe(10 - 3);
  });

  it('switches a southern port to the north when its dummy ends up before the node, mirroring an explicit anchor', () => {
    const plain = northSouth(PortSide.SOUTH, true, false);
    expect(plain.port.getSide()).toBe(PortSide.NORTH);
    const anchored = northSouth(PortSide.SOUTH, true, true);
    expect(anchored.anchor).toBe(-(10 - 3));
  });

  it('keeps the side of a port whose dummy is already on the right side', () => {
    expect(northSouth(PortSide.NORTH, true, false).port.getSide()).toBe(PortSide.NORTH);
    expect(northSouth(PortSide.SOUTH, false, false).port.getSide()).toBe(PortSide.SOUTH);
  });
});
