// SPDX-License-Identifier: EPL-2.0
// Unit cases of the port-ordering functions of LayerSweepCrossingMinimizer (java:504-543; mission 7c, T7), decided by
// hand from the Java. They run in the hierarchical sweep only, which no oracle row reaches (nested graphs are U until
// 7h), and in `setPortOrderOnParentGraph`.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import {
  sortPortDummiesByPortPositions,
  sortPortsByDummyPositionsInLastLayer,
} from './LayerSweepCrossingMinimizerHierarchical.js';

interface Parent {
  graph: LGraph;
  node: LNode;
  east: LPort[];
  west: LPort[];
}

/** A parent node with the given numbers of hierarchical east and west ports (list order: east ports, then west). */
function parentWith(eastPorts: number, westPorts: number): Parent {
  const graph = new LGraph();
  const node = addNode(graph);
  const hierarchical = (side: PortSide): LPort => {
    const port = addPort(node, side);
    port.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
    return port;
  };
  const east = Array.from({ length: eastPorts }, () => hierarchical(PortSide.EAST));
  const west = Array.from({ length: westPorts }, () => hierarchical(PortSide.WEST));
  node.cachePortSides();
  return { graph, node, east, west };
}

/** An external port dummy standing for `origin`, whose own PORT_DUMMY back-reference is not needed here. */
function dummyFor(graph: LGraph, origin: LPort): LNode {
  const dummy = addNode(graph, NodeType.EXTERNAL_PORT);
  dummy.setProperty(InternalProperties.ORIGIN, origin);
  return dummy;
}

describe('sortPortsByDummyPositionsInLastLayer', () => {
  it('rewrites the east ports of the parent in the order of the dummies of the last layer on a forward sweep', () => {
    const parent = parentWith(2, 1);
    const [e1, e2] = parent.east as [LPort, LPort];
    const first = dummyFor(parent.graph, e2);
    const second = dummyFor(parent.graph, e1);
    const order: LNode[][] = [[addNode(parent.graph)], [first, second]];
    sortPortsByDummyPositionsInLastLayer(order, parent.node, true);
    // the dummies stand in the order e2, e1: the east slots of the list take their origins in that order
    expect(parent.node.getPorts()).toEqual([e2, e1, parent.west[0]]);
  });

  it('rewrites the west ports from the end of the first layer on a backward sweep', () => {
    const parent = parentWith(1, 2);
    const [w1, w2] = parent.west as [LPort, LPort];
    // backward: j starts at the last index of layer 0 and counts down, so [d(w1), d(w2)] writes w2 then w1
    const order: LNode[][] = [[dummyFor(parent.graph, w1), dummyFor(parent.graph, w2)], [addNode(parent.graph)]];
    sortPortsByDummyPositionsInLastLayer(order, parent.node, false);
    expect(parent.node.getPorts()).toEqual([parent.east[0], w2, w1]);
  });

  it('leaves the ports alone when the node at the end of the sweep is not an external port dummy (java:510-513)', () => {
    const parent = parentWith(2, 0);
    const before = [...parent.node.getPorts()];
    sortPortsByDummyPositionsInLastLayer([[addNode(parent.graph)]], parent.node, true);
    expect(parent.node.getPorts()).toEqual(before);
  });

  it('skips ports that are not hierarchical or not on the sweep side (java:516-522)', () => {
    const parent = parentWith(2, 0);
    parent.east[0]!.setProperty(InternalProperties.INSIDE_CONNECTIONS, false);
    const dummy = dummyFor(parent.graph, parent.east[0]!);
    sortPortsByDummyPositionsInLastLayer([[dummy]], parent.node, true);
    // the first east port is not hierarchical and stays; the second takes the only dummy's origin
    expect(parent.node.getPorts()).toEqual([parent.east[0], parent.east[0]]);
  });
});

describe('sortPortDummiesByPortPositions', () => {
  function withDummies(parent: Parent, ports: LPort[]): LNode[] {
    return ports.map((port) => {
      const dummy = dummyFor(parent.graph, port);
      port.setProperty(InternalProperties.PORT_DUMMY, dummy);
      return dummy;
    });
  }

  it('orders the dummies by the east ports in list order', () => {
    const parent = parentWith(2, 0);
    const dummies = withDummies(parent, parent.east);
    expect(sortPortDummiesByPortPositions(parent.node, [dummies[1]!, dummies[0]!], PortSide.EAST)).toEqual(dummies);
  });

  it('orders the dummies by the west ports in reversed list order (CrossMinUtil.inNorthSouthEastWestOrder)', () => {
    const parent = parentWith(0, 2);
    const dummies = withDummies(parent, parent.west);
    expect(sortPortDummiesByPortPositions(parent.node, [dummies[0]!, dummies[1]!], PortSide.WEST)).toEqual([
      dummies[1],
      dummies[0],
    ]);
  });

  it('throws the Java IllegalStateException when fewer hierarchical ports than dummies are found', () => {
    const parent = parentWith(1, 0);
    const layer = [...withDummies(parent, parent.east), addNode(parent.graph), addNode(parent.graph)];
    expect(() => sortPortDummiesByPortPositions(parent.node, layer, PortSide.EAST)).toThrow(IllegalStateException);
    expect(() => sortPortDummiesByPortPositions(parent.node, layer, PortSide.EAST)).toThrow(
      'Expected 3 hierarchical ports, but found only 1.',
    );
  });

  it('ignores ports without hierarchical connections', () => {
    const parent = parentWith(2, 0);
    parent.east[1]!.setProperty(InternalProperties.INSIDE_CONNECTIONS, false);
    const [dummy] = withDummies(parent, [parent.east[0]!]);
    addLayer(parent.graph);
    expect(sortPortDummiesByPortPositions(parent.node, [dummy!], PortSide.EAST)).toEqual([dummy]);
  });
});
