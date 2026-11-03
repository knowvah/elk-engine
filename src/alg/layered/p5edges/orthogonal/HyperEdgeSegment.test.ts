// SPDX-License-Identifier: EPL-2.0
// Structural proof of HyperEdgeSegment (mission 7e, T4): the comparison by `mark` (HyperEdgeSegment.java:435-452) and
// the explicit-stack walk of `addPortPositions` against a verbatim recursive twin (R8). The coordinates, extents and
// splits are proven by the OrthogonalEdgeRouter rows.
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LEdge } from '../../graph/LEdge.js';
import { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { LPort } from '../../graph/LPort.js';
import { WestToEastRoutingStrategy } from './direction/WestToEastRoutingStrategy.js';
import { HyperEdgeSegment } from './HyperEdgeSegment.js';

/**
 * A ladder of `rungs` EAST source ports and `rungs` WEST target ports: source i reaches targets i and i+1, so the
 * whole ladder is one hyperedge and the walk from source 0 is `2 * rungs` ports deep.
 */
function ladder(rungs: number): LPort[] {
  const graph = new LGraph();
  const sources: LPort[] = [];
  const targets: LPort[] = [];
  for (let i = 0; i < rungs; i++) {
    sources.push(portOn(new LNode(graph), PortSide.EAST));
    targets.push(portOn(new LNode(graph), PortSide.WEST));
  }
  const connect = (from: LPort, to: LPort): void => {
    const edge = new LEdge();
    edge.setSource(from);
    edge.setTarget(to);
  };
  for (let i = 0; i < rungs; i++) {
    connect(sources[i]!, targets[i]!);
    if (i + 1 < rungs) {
      connect(sources[i + 1]!, targets[i]!);
    }
  }
  return [...sources, ...targets];
}

function portOn(node: LNode, side: PortSide): LPort {
  const port = new LPort();
  port.setNode(node);
  port.setSide(side);
  return port;
}

/** The recursion of `HyperEdgeSegment.addPortPositions` (HyperEdgeSegment.java:123-144), recording the visit order. */
function recursiveVisitOrder(port: LPort, visited: Map<LPort, true>, order: LPort[]): void {
  visited.set(port, true);
  order.push(port);
  for (const otherPort of port.getConnectedPorts()) {
    if (!visited.has(otherPort)) {
      recursiveVisitOrder(otherPort, visited, order);
    }
  }
}

describe('HyperEdgeSegment comparison by mark', () => {
  it('compareTo is the difference of the marks, equals and hashCode follow the mark', () => {
    const low = new HyperEdgeSegment(null);
    const high = new HyperEdgeSegment(null);
    const same = new HyperEdgeSegment(null);
    low.mark = 3;
    high.mark = 10;
    same.mark = 3;
    expect(low.compareTo(high)).toBe(-7);
    expect(high.compareTo(low)).toBe(7);
    expect(low.compareTo(same)).toBe(0);
    expect(low.equals(same)).toBe(true);
    expect(low.equals(high)).toBe(false);
    expect(low.equals('not a segment')).toBe(false);
    expect(low.hashCode()).toBe(3);
  });
});

describe('HyperEdgeSegment.addPortPositions', () => {
  it('visits the ports of a ladder hyperedge in the order of the Java recursion', () => {
    const rungs = 100;
    const ports = ladder(rungs);
    const start = ports[0]!;
    const expected: LPort[] = [];
    recursiveVisitOrder(start, new Map(), expected);

    const segment = new HyperEdgeSegment(new WestToEastRoutingStrategy());
    const map = new Map<LPort, HyperEdgeSegment>();
    segment.addPortPositions(start, map);

    expect(segment.getPorts()).toEqual(expected);
    expect(segment.getPorts()).toHaveLength(2 * rungs);
    expect([...map.keys()]).toEqual(expected);
  });

  it('walks a ladder far deeper than the stack the recursion can take', () => {
    const rungs = 20_000;
    const ports = ladder(rungs);
    const segment = new HyperEdgeSegment(new WestToEastRoutingStrategy());
    segment.addPortPositions(ports[0]!, new Map());
    expect(segment.getPorts()).toHaveLength(2 * rungs);
  });
});
