// SPDX-License-Identifier: EPL-2.0
// Contract cases whose expectations follow from the Java code by inspection (ModelOrderPortComparator.java:107-351,
// :362-374, :376-401, :441); the comparator is proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { ModelOrderPortComparator } from './ModelOrderPortComparator.js';

function graphWithEnforcedOrders(): LGraph {
  const graph = new LGraph();
  // the Java reads the list before any branch; its default needs the ElkReflect registration of `Array`
  graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS, []);
  return graph;
}

function comparator(
  graph: LGraph,
  previousLayer: LNode[] = [],
  targetNodeModelOrder: Map<LNode, number> | null = null,
  portModelOrder = false,
): ModelOrderPortComparator {
  return new ModelOrderPortComparator(
    graph,
    previousLayer,
    OrderingStrategy.NODES_AND_EDGES,
    targetNodeModelOrder,
    portModelOrder,
  );
}

function portWithModelOrder(node: LNode, side: PortSide, modelOrder: number): LPort {
  const port = addPort(node, side);
  port.setProperty(InternalProperties.MODEL_ORDER, modelOrder);
  return port;
}

describe('ModelOrderPortComparator by side', () => {
  it('orders NORTH before EAST by the side ordinals and records the association', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const north = addPort(node, PortSide.NORTH);
    const east = addPort(node, PortSide.EAST);
    const cmp = comparator(graph);
    expect(cmp.compare(north, east)).toBe(-1);
    expect(cmp.compare(east, north)).toBe(1);
  });
});

describe('ModelOrderPortComparator without edges', () => {
  it('orders ports of one side by their port model order', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const first = portWithModelOrder(node, PortSide.EAST, 1);
    const second = portWithModelOrder(node, PortSide.EAST, 2);
    expect(comparator(graph).compare(first, second)).toBe(-1);
  });

  it('reverses the decision for two WEST ports (ModelOrderPortComparator.java:333-338)', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const first = portWithModelOrder(node, PortSide.WEST, 1);
    const second = portWithModelOrder(node, PortSide.WEST, 2);
    expect(comparator(graph).compare(first, second)).toBe(1);
  });

  it('puts the first port before the second when one has no model order', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const first = addPort(node, PortSide.EAST);
    const second = portWithModelOrder(node, PortSide.EAST, 2);
    expect(comparator(graph).compare(first, second)).toBe(-1);
  });
});

describe('ModelOrderPortComparator.checkPortModelOrder', () => {
  const setup = () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    return { node, cmp: comparator(graph) };
  };

  it('compares the model orders of two ports, as Integer.compare', () => {
    const { node, cmp } = setup();
    const low = portWithModelOrder(node, PortSide.EAST, 1);
    const high = portWithModelOrder(node, PortSide.EAST, 5);
    expect(cmp.checkPortModelOrder(low, high)).toBe(-1);
    expect(cmp.checkPortModelOrder(high, low)).toBe(1);
    expect(cmp.checkPortModelOrder(low, low)).toBe(0);
  });

  it('answers 0 unless both ports have a model order', () => {
    const { node, cmp } = setup();
    const withOrder = portWithModelOrder(node, PortSide.EAST, 1);
    const without = addPort(node, PortSide.EAST);
    expect(cmp.checkPortModelOrder(withOrder, without)).toBe(0);
    expect(cmp.checkPortModelOrder(without, withOrder)).toBe(0);
  });
});

describe('ModelOrderPortComparator with edges', () => {
  it('sorts outgoing ports before incoming ports (the incoming port is bigger)', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const other = addNode(graph);
    const incoming = addPort(node, PortSide.EAST);
    const outgoing = addPort(node, PortSide.EAST);
    connect(addPort(other, PortSide.EAST), incoming);
    connect(outgoing, addPort(other, PortSide.WEST));
    const cmp = comparator(graph);
    expect(cmp.compare(incoming, outgoing)).toBe(1);
    expect(cmp.compare(outgoing, incoming)).toBe(-1);
  });

  it('orders outgoing ports by the model order of their first edge', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const target = addNode(graph);
    const first = addPort(node, PortSide.EAST);
    const second = addPort(node, PortSide.EAST);
    connect(first, addPort(target, PortSide.WEST)).setProperty(InternalProperties.MODEL_ORDER, 3);
    connect(second, addPort(target, PortSide.WEST)).setProperty(InternalProperties.MODEL_ORDER, 1);
    expect(comparator(graph).compare(first, second)).toBe(1);
  });

  it('prefers the precomputed target node model order over the edge model order', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const target = addNode(graph);
    const [t1, t2] = [addNode(graph), addNode(graph)];
    const first = addPort(node, PortSide.EAST);
    const second = addPort(node, PortSide.EAST);
    first.setProperty(InternalProperties.LONG_EDGE_TARGET_NODE, t1);
    second.setProperty(InternalProperties.LONG_EDGE_TARGET_NODE, t2);
    connect(first, addPort(target, PortSide.WEST)).setProperty(InternalProperties.MODEL_ORDER, 3);
    connect(second, addPort(target, PortSide.WEST)).setProperty(InternalProperties.MODEL_ORDER, 1);
    const targetNodeModelOrder = new Map<LNode, number>([
      [t1, 0],
      [t2, 9],
    ]);
    expect(comparator(graph, [], targetNodeModelOrder).compare(first, second)).toBe(-1);
  });

  describe('incoming ports ordered by the previous layer', () => {
    const setup = (side: PortSide) => {
      const graph = graphWithEnforcedOrders();
      const previous = addLayer(graph);
      const next = addLayer(graph);
      previous.id = 0;
      next.id = 1;
      const [a, b, node] = [addNode(graph), addNode(graph), addNode(graph)];
      a.setLayer(previous);
      b.setLayer(previous);
      node.setLayer(next);
      const p1 = addPort(node, side);
      const p2 = addPort(node, side);
      connect(addPort(a, PortSide.EAST), p1);
      connect(addPort(b, PortSide.EAST), p2);
      return { graph, a, b, p1, p2 };
    };

    it('EAST ports follow the order of their source nodes', () => {
      const { graph, a, b, p1, p2 } = setup(PortSide.EAST);
      expect(comparator(graph, [a, b]).compare(p1, p2)).toBe(-1);
    });

    it('WEST ports are ordered the other way around (reverseOrder = -1)', () => {
      const { graph, a, b, p1, p2 } = setup(PortSide.WEST);
      expect(comparator(graph, [a, b]).compare(p1, p2)).toBe(1);
    });

    it('accepts the previous layer as a Layer', () => {
      const { graph, a, p1, p2 } = setup(PortSide.EAST);
      const cmp = new ModelOrderPortComparator(graph, a.getLayer()!, OrderingStrategy.NODES_AND_EDGES, null, false);
      expect(cmp.compare(p1, p2)).toBe(-1);
    });
  });

  it('clearTransitiveOrdering drops the recorded associations', () => {
    const graph = graphWithEnforcedOrders();
    const node = addNode(graph);
    const first = portWithModelOrder(node, PortSide.EAST, 1);
    const second = portWithModelOrder(node, PortSide.EAST, 2);
    const cmp = comparator(graph);
    cmp.compare(first, second); // records second > first
    first.setProperty(InternalProperties.MODEL_ORDER, 100);
    expect(cmp.compare(second, first)).toBe(1); // answered from the record
    cmp.clearTransitiveOrdering();
    expect(cmp.compare(second, first)).toBe(-1); // recomputed: 2 is not bigger than 100
  });
});
