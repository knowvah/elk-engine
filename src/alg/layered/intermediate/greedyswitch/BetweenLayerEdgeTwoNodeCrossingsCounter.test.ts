// SPDX-License-Identifier: EPL-2.0
// Unit cases of BetweenLayerEdgeTwoNodeCrossingsCounter and its two nested classes (mission 7c, T7). The graphs are
// small enough to count by hand from the Java (BetweenLayerEdgeTwoNodeCrossingsCounter.java:210-224, the merge of the
// adjacency lists); the greedy-switch rows (GreedySwitchHeuristic.test.ts) prove the class on the oracle's graphs.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounter } from './BetweenLayerEdgeTwoNodeCrossingsCounter.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList as AdjacencyList } from './BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency as Adjacency } from './BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency.js';

interface Fixture {
  order: LNode[][];
  left: { a: LNode; b: LNode; pa: LPort; pb: LPort };
  free: { u: LNode; l: LNode; pu: LPort; pl: LPort };
}

/**
 * Left layer [a, b] with one east port each, free layer [u, l] with one west port each, and, when `crossing`, the
 * edges b-u and a-l (u above l is the crossed order); otherwise a-u and b-l.
 */
function twoLayers(crossing: boolean): Fixture {
  const graph = new LGraph();
  const leftLayer = addLayer(graph);
  const freeLayer = addLayer(graph);
  const place = (layer: typeof leftLayer, side: PortSide): { node: LNode; port: LPort } => {
    const node = addNode(graph);
    node.setLayer(layer);
    const port = addPort(node, side);
    node.cachePortSides();
    return { node, port };
  };
  const a = place(leftLayer, PortSide.EAST);
  const b = place(leftLayer, PortSide.EAST);
  const u = place(freeLayer, PortSide.WEST);
  const l = place(freeLayer, PortSide.WEST);
  connect(crossing ? b.port : a.port, u.port);
  connect(crossing ? a.port : b.port, l.port);
  return {
    order: [
      [a.node, b.node],
      [u.node, l.node],
    ],
    left: { a: a.node, b: b.node, pa: a.port, pb: b.port },
    free: { u: u.node, l: l.node, pu: u.port, pl: l.port },
  };
}

describe('BetweenLayerEdgeTwoNodeCrossingsCounter', () => {
  it('counts the western crossing of the crossed order, and none for the switched one', () => {
    const { order, free } = twoLayers(true);
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 1);
    counter.countWesternEdgeCrossings(free.u, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
    counter.countWesternEdgeCrossings(free.l, free.u);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 1]);
  });

  it('counts a crossing only for the switched order of an uncrossed pair', () => {
    const { order, free } = twoLayers(false);
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 1);
    counter.countWesternEdgeCrossings(free.u, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 1]);
    counter.countBothSideCrossings(free.l, free.u);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
  });

  it('counts only the side asked for: the eastern count of a free layer without east neighbours is zero', () => {
    const { order, free } = twoLayers(true);
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 1);
    counter.countEasternEdgeCrossings(free.u, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
    counter.countBothSideCrossings(free.u, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
  });

  it('resets both counts and counts nothing when asked for a node against itself', () => {
    const { order, free } = twoLayers(true);
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 1);
    counter.countWesternEdgeCrossings(free.u, free.l);
    counter.countWesternEdgeCrossings(free.u, free.u);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
    counter.countEasternEdgeCrossings(free.l, free.l);
    counter.countBothSideCrossings(free.l, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
  });

  it('counts edges that share a port at the adjacency of the first port (java:219-221)', () => {
    // both free nodes are fed by the one east port of a: equal positions, so neither order has a crossing
    const graph = new LGraph();
    const leftLayer = addLayer(graph);
    const freeLayer = addLayer(graph);
    const a = addNode(graph);
    a.setLayer(leftLayer);
    const pa = addPort(a, PortSide.EAST);
    a.cachePortSides();
    const nodes = [0, 1].map(() => {
      const node = addNode(graph);
      node.setLayer(freeLayer);
      const port = addPort(node, PortSide.WEST);
      node.cachePortSides();
      connect(pa, port);
      return node;
    });
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter([[a], nodes], 1);
    counter.countWesternEdgeCrossings(nodes[0]!, nodes[1]!);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
  });

  it('merges parallel edges of one node into one adjacency of cardinality 2 and counts both against a lower port', () => {
    // u has two edges to the lower port of the left layer, l has one to the upper port: u above l crosses twice
    const graph = new LGraph();
    const leftLayer = addLayer(graph);
    const freeLayer = addLayer(graph);
    const mk = (layer: typeof leftLayer, side: PortSide, ports: number): { node: LNode; ports: LPort[] } => {
      const node = addNode(graph);
      node.setLayer(layer);
      const made = Array.from({ length: ports }, () => addPort(node, side));
      node.cachePortSides();
      return { node, ports: made };
    };
    const a = mk(leftLayer, PortSide.EAST, 1);
    const b = mk(leftLayer, PortSide.EAST, 1);
    const u = mk(freeLayer, PortSide.WEST, 2);
    const l = mk(freeLayer, PortSide.WEST, 1);
    connect(b.ports[0]!, u.ports[0]!);
    connect(b.ports[0]!, u.ports[1]!);
    connect(a.ports[0]!, l.ports[0]!);
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(
      [
        [a.node, b.node],
        [u.node, l.node],
      ],
      1,
    );
    counter.countWesternEdgeCrossings(u.node, l.node);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([2, 0]);
    counter.countWesternEdgeCrossings(l.node, u.node);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 2]);
  });

  it('ignores in-layer edges and self loops of the free layer', () => {
    const { order, free } = twoLayers(true);
    // an in-layer edge u-l and a self loop at u change nothing
    connect(addPort(free.u, PortSide.EAST), addPort(free.l, PortSide.EAST));
    connect(addPort(free.u, PortSide.WEST), addPort(free.u, PortSide.EAST));
    // the side views need the ports sorted by side, as PortListSorter leaves them
    for (const node of [free.u, free.l]) {
      node.getPorts().sort((x, y) => x.getSide().ordinal() - y.getSide().ordinal());
      node.cachePortSides();
    }
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 1);
    counter.countBothSideCrossings(free.u, free.l);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
  });

  it('sets port positions only for the neighbouring layers that exist (first and last layer)', () => {
    const { order } = twoLayers(true);
    // as the free layer 0 there is no layer to the west, so the western adjacencies would have no position to read:
    // the counter is only asked about the east there
    const counter = new BetweenLayerEdgeTwoNodeCrossingsCounter(order, 0);
    counter.countEasternEdgeCrossings(order[0]![0]!, order[0]![1]!);
    // a feeds l, b feeds u: east ports of a and b sit at positions 0 and 1 of the layer to the east
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
  });
});

describe('BetweenLayerEdgeTwoNodeCrossingsCounter.AdjacencyList.Adjacency', () => {
  it('orders by position, as Comparable, and prints its three fields', () => {
    const low = new Adjacency(1, null);
    const high = new Adjacency(2, null);
    expect([low.compareTo(high), high.compareTo(low), low.compareTo(new Adjacency(1, null))]).toEqual([-1, 1, 0]);
    expect(low.toString()).toBe('Adjacency [position=1, cardinality=1, currentCardinality=1]');
  });

  it('reset restores the current cardinality to the full one', () => {
    const adjacency = new Adjacency(3, null);
    adjacency.cardinality = 4;
    adjacency.currentCardinality = 1;
    adjacency.reset();
    expect(adjacency.currentCardinality).toBe(4);
  });
});

describe('BetweenLayerEdgeTwoNodeCrossingsCounter.AdjacencyList', () => {
  /** One node with a west port fed by `positions.length` edges from east ports at those positions of a left layer. */
  function listWithPositions(positions: number[]): AdjacencyList {
    const graph = new LGraph();
    const leftLayer = addLayer(graph);
    const rightLayer = addLayer(graph);
    const node = addNode(graph);
    node.setLayer(rightLayer);
    const target = addPort(node, PortSide.WEST);
    node.cachePortSides();
    const positionsOfPorts = new Map<LPort, number>();
    for (const position of positions) {
      const source = addNode(graph);
      source.setLayer(leftLayer);
      const port = addPort(source, PortSide.EAST);
      connect(port, target);
      positionsOfPorts.set(port, position);
    }
    return new AdjacencyList(node, PortSide.WEST, positionsOfPorts);
  }

  it('merges equal neighbouring positions into one adjacency, sorts by position, and consumes one edge at a time', () => {
    // positions 2, 0, 2: the list is sorted to [0, 2], the last 2 is not adjacent to the first 2 at insertion time (the
    // merge only looks at the previous entry), so it is its own entry
    const list = listWithPositions([2, 0, 2]);
    expect([list.size(), list.first(), list.isEmpty()]).toEqual([3, 0, false]);
    list.removeFirst();
    expect([list.size(), list.first()]).toEqual([2, 2]);
    expect(list.countAdjacenciesBelowNodeOfFirstPort()).toBe(1);
    list.removeFirst();
    list.removeFirst();
    expect([list.size(), list.isEmpty()]).toEqual([0, true]);
    // removing from an empty list does nothing (java:310-312)
    list.removeFirst();
    expect(list.size()).toBe(0);
  });

  it('counts the remaining adjacencies below the first one and decrements a merged adjacency in place', () => {
    const list = listWithPositions([1, 1, 3]);
    // [1 x2, 3]: three edges, the first entry has cardinality 2
    expect(list.countAdjacenciesBelowNodeOfFirstPort()).toBe(1);
    list.removeFirst();
    expect([list.size(), list.first()]).toEqual([2, 1]);
    list.reset();
    expect([list.size(), list.first()]).toEqual([3, 1]);
  });

  it('prints the node and the adjacencies', () => {
    const list = listWithPositions([4]);
    expect(list.toString()).toMatch(
      /^AdjacencyList \[node=.*, adjacencies= \[Adjacency \[position=4, cardinality=1, currentCardinality=1\]\]\]$/,
    );
  });
});
