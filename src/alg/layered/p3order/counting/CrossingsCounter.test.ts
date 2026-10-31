// SPDX-License-Identifier: EPL-2.0
// Structural cases only (an edge-less layer counts 0; the init methods fill the positions the Java says they fill).
// The counters are proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { addNode, addPort } from '../../../../../test/helpers/lgraph-builders.js';
import { CrossingsCounter } from './CrossingsCounter.js';

/** A node with the given west ports, ids assigned from `nextId` upward in creation order. */
function westNode(graph: LGraph, count: number, nextId: number): { node: LNode; ports: LPort[] } {
  const node = addNode(graph);
  const ports: LPort[] = [];
  for (let i = 0; i < count; i++) {
    const port = addPort(node, PortSide.WEST);
    port.id = nextId + i;
    ports.push(port);
  }
  return { node, ports };
}

describe('CrossingsCounter', () => {
  it('counts 0 crossings between two layers without edges', () => {
    const graph = new LGraph();
    const a = westNode(graph, 0, 0);
    const b = westNode(graph, 1, 0);
    const counter = new CrossingsCounter(new Int32Array(1));
    expect(counter.countCrossingsBetweenLayers([a.node], [b.node])).toBe(0);
  });

  it('counts 0 in-layer crossings on a side whose ports have no edges', () => {
    const graph = new LGraph();
    const a = westNode(graph, 2, 0);
    const counter = new CrossingsCounter(new Int32Array(2));
    expect(counter.countInLayerCrossingsOnSide([a.node], PortSide.WEST)).toBe(0);
  });

  it('counts 0 north/south crossings in a layer of normal nodes without north/south ports', () => {
    const graph = new LGraph();
    const a = westNode(graph, 1, 0);
    const counter = new CrossingsCounter(new Int32Array(1));
    expect(counter.countNorthSouthPortCrossingsInLayer([a.node])).toBe(0);
  });

  describe('initPortPositionsForInLayerCrossings', () => {
    it('returns the ports of the side top-down, west ports reversed, and numbers them in that order', () => {
      const graph = new LGraph();
      const a = westNode(graph, 2, 0); // ids 0, 1
      const b = westNode(graph, 1, 2); // id 2
      const positions = new Int32Array(3);
      const counter = new CrossingsCounter(positions);

      const ports = counter.initPortPositionsForInLayerCrossings([a.node, b.node], PortSide.WEST);

      // CrossingsCounter.java:577-589: topDown with side WEST reads the reversed side view of each node
      expect(ports).toEqual([a.ports[1], a.ports[0], b.ports[0]]);
      expect([...positions]).toEqual([1, 0, 2]);
    });

    it('records the node cardinalities that switchNodes moves positions by', () => {
      const graph = new LGraph();
      const a = westNode(graph, 2, 0);
      const b = westNode(graph, 1, 2);
      a.node.id = 0;
      b.node.id = 1;
      const positions = new Int32Array(3);
      const counter = new CrossingsCounter(positions);
      counter.initPortPositionsForInLayerCrossings([a.node, b.node], PortSide.WEST);

      // CrossingsCounter.java:319-329: the upper node's ports move down by the lower node's port count (1), the lower
      // node's ports move up by the upper node's port count (2)
      counter.switchNodes(a.node, b.node, PortSide.WEST);

      expect([...positions]).toEqual([2, 1, 0]);
    });
  });

  describe('initForCountingBetween', () => {
    it('numbers the left layer east ports top-down, then the right layer west ports bottom-up', () => {
      const graph = new LGraph();
      const left = addNode(graph);
      const e0 = addPort(left, PortSide.EAST);
      const e1 = addPort(left, PortSide.EAST);
      e0.id = 0;
      e1.id = 1;
      const right = westNode(graph, 2, 2);
      const positions = new Int32Array(4);
      const counter = new CrossingsCounter(positions);

      counter.initForCountingBetween([left], [right.node]);

      // CrossingsCounter.java:479-485: EAST top-down keeps the side view order; WEST bottom-up (topDown false) keeps
      // the side view order too, continuing the numbering
      expect([...positions]).toEqual([0, 1, 2, 3]);
    });
  });

  it('switchPorts swaps the two positions', () => {
    const graph = new LGraph();
    const a = westNode(graph, 2, 0);
    const positions = Int32Array.of(7, 9);
    const counter = new CrossingsCounter(positions);
    counter.switchPorts(a.ports[0]!, a.ports[1]!);
    expect([...positions]).toEqual([9, 7]);
  });
});
