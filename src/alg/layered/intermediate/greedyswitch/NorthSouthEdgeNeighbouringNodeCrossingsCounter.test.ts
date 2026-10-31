// SPDX-License-Identifier: EPL-2.0
// Unit cases of NorthSouthEdgeNeighbouringNodeCrossingsCounter (mission 7c, T7), counted by hand from
// NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:83-148; the greedy-switch north-south rows
// (scenarios/OneSidedGreedySwitch/north-south, scenarios/TwoSidedGreedySwitch/north-south) prove the class on the
// oracle's graphs.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { NorthSouthEdgeNeighbouringNodeCrossingsCounter } from './NorthSouthEdgeNeighbouringNodeCrossingsCounter.js';

interface Fixture {
  layer: LNode[];
  normal: LNode;
  north: LPort[];
  d1: LNode;
  d2: LNode;
}

/**
 * One layer [normal, d1, d2]: the normal node has two north ports p0, p1 (list order = position 0, 1); the north-south
 * dummies d1 and d2 stand for p0 and p1. The east port of d1 has degree 2, its west port 3; the west port of d2 has
 * degree 1, its east port 4.
 */
function northSouthLayer(sidesOfOrigins: readonly PortSide[] = [PortSide.NORTH, PortSide.NORTH]): Fixture {
  const graph = new LGraph();
  const layer = addLayer(graph);
  const normal = addNode(graph);
  normal.setLayer(layer);
  const north = sidesOfOrigins.map((side) => addPort(normal, side));
  normal.cachePortSides();
  const dummy = (origin: LPort): LNode => {
    const node = addNode(graph, NodeType.NORTH_SOUTH_PORT);
    node.setLayer(layer);
    node.setProperty(InternalProperties.ORIGIN, normal);
    addPort(node).setProperty(InternalProperties.ORIGIN, origin);
    return node;
  };
  const d1 = dummy(north[0]!);
  const d2 = dummy(north[1]!);
  const east = addPort(d1, PortSide.EAST);
  const west = addPort(d2, PortSide.WEST);
  const west1 = addPort(d1, PortSide.WEST);
  const east2 = addPort(d2, PortSide.EAST);
  for (const node of [d1, d2]) {
    node.getPorts().sort((x, y) => x.getSide().ordinal() - y.getSide().ordinal());
    node.cachePortSides();
  }
  const other = addNode(graph);
  other.setLayer(addLayer(graph));
  const degrees: [LPort, number][] = [
    [east, 2],
    [west1, 3],
    [west, 1],
    [east2, 4],
  ];
  for (const [port, degree] of degrees) {
    for (let i = 0; i < degree; i++) {
      connect(port, addPort(other, PortSide.WEST));
    }
  }
  return { layer: [normal, d1, d2], normal, north, d1, d2 };
}

describe('NorthSouthEdgeNeighbouringNodeCrossingsCounter', () => {
  it('counts the degrees of the ports facing the normal node for two dummies of one origin (java:94-117)', () => {
    const { layer, d1, d2 } = northSouthLayer();
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter(layer);
    // d1 stands for position 0 of the north ports, d2 for 1: the first is not further than the second, so the
    // west port of d2 (degree 1) and the east port of d1 (degree 2) are counted
    counter.countCrossings(d1, d2);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 2]);
    // reversed: d2 is further from the normal node than d1, so the east port of d1 (2) and the west port of d2 (1)
    counter.countCrossings(d2, d1);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([2, 1]);
  });

  it('treats a dummy whose origin port is not on the north side as south (java:177-179)', () => {
    const { layer, d1, d2 } = northSouthLayer([PortSide.SOUTH, PortSide.SOUTH]);
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter(layer);
    // upper d1 is not north of the normal node, so the roles swap: countCrossingsOfTwoNorthSouthDummies(d2, d1); d2
    // stands for the port at position 0 of the reversed south side, d1 for position 1, so the else branch counts the
    // west port of d1 (3) and the east port of d2 (4)
    counter.countCrossings(d1, d2);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([3, 4]);
  });

  it('counts nothing for two dummies of different origins (java:94-96)', () => {
    const { layer, d1, d2 } = northSouthLayer();
    d2.setProperty(InternalProperties.ORIGIN, d1);
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter(layer);
    counter.countCrossings(d1, d2);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
  });

  it('crosses a north-south dummy with a long edge dummy once, on the side of the normal node (java:119-135)', () => {
    const { layer, d1, d2 } = northSouthLayer();
    const graph = d1.getGraph()!;
    const longEdge = addNode(graph, NodeType.LONG_EDGE);
    longEdge.setLayer(d1.getLayer()!);
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter([...layer, longEdge]);
    counter.countCrossings(d1, longEdge);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
    counter.countCrossings(longEdge, d1);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 1]);
    // a dummy of a southern origin crosses on the other side
    d2.getPorts()[0]!.setProperty(
      InternalProperties.ORIGIN,
      northSouthLayer([PortSide.SOUTH, PortSide.SOUTH]).north[0]!,
    );
    counter.countCrossings(d2, longEdge);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 1]);
    counter.countCrossings(longEdge, d2);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([1, 0]);
  });

  it('crosses a normal node with a long edge dummy once per north-south port on the facing sides (java:136-147)', () => {
    const { layer, normal, north } = northSouthLayer();
    const longEdge = addNode(normal.getGraph()!, NodeType.LONG_EDGE);
    longEdge.setLayer(normal.getLayer()!);
    // two port dummies on the north side of the normal node, none on the south side
    north[0]!.setProperty(InternalProperties.PORT_DUMMY, layer[1]!);
    north[1]!.setProperty(InternalProperties.PORT_DUMMY, layer[2]!);
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter([...layer, longEdge]);
    counter.countCrossings(normal, longEdge);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 2]);
    counter.countCrossings(longEdge, normal);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([2, 0]);
    // a north port without a dummy is not counted (java:157-159)
    north[1]!.setProperty(InternalProperties.PORT_DUMMY, null);
    counter.countCrossings(normal, longEdge);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 1]);
  });

  it('counts 0 for two dummies of one origin whose facing ports are missing (java:106-116)', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const normal = addNode(graph);
    normal.setLayer(layer);
    const origins = [addPort(normal, PortSide.NORTH), addPort(normal, PortSide.NORTH)];
    normal.cachePortSides();
    const dummies = origins.map((origin) => {
      const node = addNode(graph, NodeType.NORTH_SOUTH_PORT);
      node.setLayer(layer);
      node.setProperty(InternalProperties.ORIGIN, normal);
      addPort(node).setProperty(InternalProperties.ORIGIN, origin);
      return node;
    }) as [LNode, LNode];
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter([normal, ...dummies]);
    counter.countCrossings(dummies[0], dummies[1]);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
    counter.countCrossings(dummies[1], dummies[0]);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
  });

  it('counts nothing for two normal nodes', () => {
    const { layer, normal } = northSouthLayer();
    const other = addNode(normal.getGraph()!);
    other.setLayer(normal.getLayer()!);
    const counter = new NorthSouthEdgeNeighbouringNodeCrossingsCounter([...layer, other]);
    counter.countCrossings(normal, other);
    expect([counter.getUpperLowerCrossings(), counter.getLowerUpperCrossings()]).toEqual([0, 0]);
  });
});
