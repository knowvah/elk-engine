// SPDX-License-Identifier: EPL-2.0
// Cases of the index helpers and predicates of LayerSweepCrossingMinimizer (java:557-607; mission 7c, T7), decided by
// hand from the Java.
import { describe, expect, it } from 'vitest';
import { addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import {
  dummyNodeFor,
  endIndex,
  firstFree,
  firstIndex,
  hasNestedGraph,
  isExternalPortDummy,
  isHierarchical,
  isNotEnd,
  isOnEndOfSweepSide,
  next,
  originPort,
  sideOpposedSweepDirection,
} from './LayerSweepCrossingMinimizerSweepHelpers.js';

describe('the sweep index helpers', () => {
  it('start a forward sweep at the first layer, a backward one at the last', () => {
    expect([firstIndex(true, 5), firstIndex(false, 5)]).toEqual([0, 4]);
    expect([endIndex(true, 5), endIndex(false, 5)]).toEqual([4, 0]);
  });

  it('start freeing at the second layer going forward and the second to last going backward', () => {
    expect([firstFree(true, 5), firstFree(false, 5)]).toEqual([1, 3]);
    expect([next(true), next(false)]).toEqual([1, -1]);
  });

  it('end a forward sweep at the length and a backward one below zero', () => {
    expect([isNotEnd(3, 2, true), isNotEnd(3, 3, true), isNotEnd(3, 0, false), isNotEnd(3, -1, false)]).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});

describe('the sweep predicates', () => {
  it('name the side opposed to the sweep direction and the side where a sweep ends', () => {
    expect([sideOpposedSweepDirection(true), sideOpposedSweepDirection(false)]).toEqual([PortSide.WEST, PortSide.EAST]);
    const graph = new LGraph();
    const east = addPort(addNode(graph), PortSide.EAST);
    const west = addPort(addNode(graph), PortSide.WEST);
    expect([isOnEndOfSweepSide(east, true), isOnEndOfSweepSide(west, true)]).toEqual([true, false]);
    expect([isOnEndOfSweepSide(east, false), isOnEndOfSweepSide(west, false)]).toEqual([false, true]);
  });

  it('read nested graphs, node types and the port and node properties', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const dummy = addNode(graph, NodeType.EXTERNAL_PORT);
    const port = addPort(node, PortSide.EAST);
    port.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
    port.setProperty(InternalProperties.PORT_DUMMY, dummy);
    dummy.setProperty(InternalProperties.ORIGIN, port);
    expect([hasNestedGraph(node), isExternalPortDummy(node), isExternalPortDummy(dummy)]).toEqual([false, false, true]);
    node.setNestedGraph(new LGraph());
    expect(hasNestedGraph(node)).toBe(true);
    expect([isHierarchical(port), dummyNodeFor(port), originPort(dummy)]).toEqual([true, dummy, port]);
  });
});
