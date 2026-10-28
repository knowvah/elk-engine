// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode, addPort, connect, label } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LGraph } from './LGraph.js';
import { LMargin } from './LMargin.js';
import { LPort } from './LPort.js';
import { LShape } from './LShape.js';

/** A graph with two nodes named `A` and `B` (by label), and a port named `a`/`b` on each. */
function twoNodes(): { a: LPort; b: LPort } {
  const graph = new LGraph();
  const nodeA = addNode(graph);
  nodeA.getLabels().push(label('A'));
  const nodeB = addNode(graph);
  nodeB.getLabels().push(label('B'));
  const a = addPort(nodeA);
  a.getLabels().push(label('a'));
  const b = addPort(nodeB);
  b.getLabels().push(label('b'));
  return { a, b };
}

describe('LPort defaults', () => {
  it('starts unattached, side UNDEFINED, external connections on, anchor not explicit', () => {
    const port = new LPort();
    expect(port).toBeInstanceOf(LShape);
    expect(port.getNode()).toBeNull();
    expect(port.getSide()).toBe(PortSide.UNDEFINED);
    expect(port.isExplicitlySuppliedPortAnchor()).toBe(false);
    expect(port.isConnectedToExternalNodes()).toBe(true);
    expect(port.getMargin()).toBeInstanceOf(LMargin);
    expect(port.getLabels()).toEqual([]);
    expect(port.getIncomingEdges()).toEqual([]);
    expect(port.getOutgoingEdges()).toEqual([]);
    expect(port.getDegree()).toBe(0);
    expect(port.getNetFlow()).toBe(0);
    expect(port.getIndex()).toBe(-1);
    expect(port.getName()).toBeNull();
  });

  it('setConnectedToExternalNodes and setExplicitlySuppliedPortAnchor store the flag', () => {
    const port = new LPort();
    port.setConnectedToExternalNodes(false);
    port.setExplicitlySuppliedPortAnchor(true);
    expect(port.isConnectedToExternalNodes()).toBe(false);
    expect(port.isExplicitlySuppliedPortAnchor()).toBe(true);
  });
});

describe('LPort.setNode', () => {
  it('adds the port to the node list and moves it between nodes', () => {
    const graph = new LGraph();
    const n1 = addNode(graph);
    const n2 = addNode(graph);
    const p = new LPort();
    const q = new LPort();
    p.setNode(n1);
    q.setNode(n1);
    expect(n1.getPorts()).toEqual([p, q]);
    expect(p.getNode()).toBe(n1);
    expect(p.getIndex()).toBe(0);
    expect(q.getIndex()).toBe(1);

    p.setNode(n2);
    expect(n1.getPorts()).toEqual([q]);
    expect(n2.getPorts()).toEqual([p]);
    expect(p.getNode()).toBe(n2);
    expect(q.getIndex()).toBe(0);

    p.setNode(null);
    expect(n2.getPorts()).toEqual([]);
    expect(p.getNode()).toBeNull();
  });

  it('tolerates an owner list that no longer holds the port (List.remove(Object) is a no-op then)', () => {
    const graph = new LGraph();
    const n1 = addNode(graph);
    const n2 = addNode(graph);
    const p = addPort(n1);
    n1.getPorts().length = 0;
    p.setNode(n2);
    expect(n2.getPorts()).toEqual([p]);
    expect(p.getNode()).toBe(n2);
  });
});

describe('LPort.setSide', () => {
  it('stores each side', () => {
    const port = new LPort();
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST, PortSide.UNDEFINED]) {
      port.setSide(side);
      expect(port.getSide()).toBe(side);
    }
  });

  it('rejects a null side with a TypeError naming the parameter', () => {
    expect(() => new LPort().setSide(null as unknown as PortSide)).toThrow(TypeError);
    expect(() => new LPort().setSide(undefined as unknown as PortSide)).toThrow('theside');
  });

  it('resets a non-explicit anchor to the side default (all-zero size gives the origin)', () => {
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
      const port = new LPort();
      port.getAnchor().x = 5;
      port.getAnchor().y = 6;
      port.setSide(side);
      expect([port.getAnchor().x, port.getAnchor().y]).toEqual([0, 0]);
    }
  });

  it('leaves the anchor of an UNDEFINED side alone', () => {
    const port = new LPort();
    port.getAnchor().x = 5;
    port.getAnchor().y = 6;
    port.setSide(PortSide.UNDEFINED);
    expect([port.getAnchor().x, port.getAnchor().y]).toEqual([5, 6]);
  });

  it('keeps an explicitly supplied anchor', () => {
    const port = new LPort();
    port.getAnchor().x = 5;
    port.getAnchor().y = 6;
    port.setExplicitlySuppliedPortAnchor(true);
    port.setSide(PortSide.EAST);
    expect([port.getAnchor().x, port.getAnchor().y]).toEqual([5, 6]);
  });
});

describe('LPort.getAbsoluteAnchor', () => {
  it('returns a new vector that is not the anchor itself', () => {
    const { a } = twoNodes();
    const absolute = a.getAbsoluteAnchor();
    expect(absolute).not.toBe(a.getAnchor());
    expect([absolute.x, absolute.y]).toEqual([0, 0]);
    absolute.x = 9;
    expect(a.getAnchor().x).toBe(0);
  });
});

describe('LPort edges', () => {
  it('counts degree and net flow from the incoming and outgoing lists', () => {
    const { a, b } = twoNodes();
    connect(a, b);
    connect(a, b);
    connect(b, a);
    expect(a.getDegree()).toBe(3);
    expect(a.getNetFlow()).toBe(-1);
    expect(b.getDegree()).toBe(3);
    expect(b.getNetFlow()).toBe(1);
  });

  it('iterates incoming edges before outgoing ones in the connected-edges view', () => {
    const { a, b } = twoNodes();
    const out1 = connect(a, b);
    const in1 = connect(b, a);
    const out2 = connect(a, b);
    expect([...a.getConnectedEdges()]).toEqual([in1, out1, out2]);
    expect(a.getIncomingEdges()).toEqual([in1]);
    expect(a.getOutgoingEdges()).toEqual([out1, out2]);
  });

  it('the connected-edges view is live', () => {
    const { a, b } = twoNodes();
    const view = a.getConnectedEdges();
    expect([...view]).toEqual([]);
    const e = connect(a, b);
    expect([...view]).toEqual([e]);
  });

  it('lists predecessor, successor and connected ports', () => {
    const { a, b } = twoNodes();
    const c = addPort(b.getNode()!);
    connect(b, a);
    connect(c, a);
    connect(a, b);
    connect(a, c);
    expect([...a.getPredecessorPorts()]).toEqual([b, c]);
    expect([...a.getSuccessorPorts()]).toEqual([b, c]);
    expect([...a.getConnectedPorts()]).toEqual([b, c, b, c]);
  });
});

describe('LPort predicates', () => {
  it('classifies input and output ports by their edge lists', () => {
    const { a, b } = twoNodes();
    connect(a, b);
    expect(LPort.OUTPUT_PREDICATE(a)).toBe(true);
    expect(LPort.INPUT_PREDICATE(a)).toBe(false);
    expect(LPort.INPUT_PREDICATE(b)).toBe(true);
    expect(LPort.OUTPUT_PREDICATE(b)).toBe(false);
  });

  it('classifies ports by side', () => {
    const predicates = [
      [PortSide.NORTH, LPort.NORTH_PREDICATE],
      [PortSide.EAST, LPort.EAST_PREDICATE],
      [PortSide.SOUTH, LPort.SOUTH_PREDICATE],
      [PortSide.WEST, LPort.WEST_PREDICATE],
    ] as const;
    for (const [side, predicate] of predicates) {
      const port = new LPort();
      port.setSide(side);
      for (const [otherSide, otherPredicate] of predicates) {
        expect(otherPredicate(port)).toBe(otherSide === side);
      }
      expect(predicate(new LPort())).toBe(false);
    }
  });
});

describe('LPort naming', () => {
  it('getName is the text of the first label', () => {
    const { a } = twoNodes();
    expect(a.getName()).toBe('a');
    a.getLabels().push(label('second'));
    expect(a.getName()).toBe('a');
  });

  it('designates itself by label text, else origin identifier, else owner index', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    const p0 = addPort(node);
    const p1 = addPort(node);
    expect(p0.getDesignation()).toBe('0');
    expect(p1.getDesignation()).toBe('1');
    expect(new LPort().getDesignation()).toBe('-1');
    p1.getLabels().push(label(''));
    expect(p1.getDesignation()).toBe('1');
    p1.getLabels().length = 0;
    p1.getLabels().push(label('named'));
    expect(p1.getDesignation()).toBe('named');
    p1.getLabels().length = 0;
    const origin = ElkGraphUtil.createGraph();
    origin.setIdentifier('orig');
    p1.setProperty(InternalProperties.ORIGIN, origin);
    expect(p1.getDesignation()).toBe('orig');
  });

  it('prints p_<designation>[<node>] for an unconnected port and no owner part without a node', () => {
    const { a } = twoNodes();
    expect(a.toString()).toBe('p_a[n_A]');
    const loose = new LPort();
    loose.getLabels().push(label('x'));
    expect(loose.toString()).toBe('p_x');
  });

  it('appends the single source of a lone incoming edge and the single target of a lone outgoing edge', () => {
    const { a, b } = twoNodes();
    connect(a, b);
    expect(a.toString()).toBe('p_a[n_A] >> b[n_B]');
    expect(b.toString()).toBe('p_b[n_B] << a[n_A]');
  });

  it('prints neither neighbour when the port has several edges', () => {
    const { a, b } = twoNodes();
    connect(a, b);
    connect(a, b);
    expect(a.toString()).toBe('p_a[n_A]');
    expect(b.toString()).toBe('p_b[n_B]');
  });

  it('prints neither neighbour when the port has one incoming and one outgoing edge', () => {
    const { a, b } = twoNodes();
    connect(a, b);
    connect(b, a);
    expect(a.toString()).toBe('p_a[n_A]');
  });
});
