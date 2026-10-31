// SPDX-License-Identifier: EPL-2.0
// Unit cases of GreedyPortDistributor (mission 7c, T6), including the C9 proof: the ports are switched through
// `Lists.reverse(node.getPortSideView(side))`, which must write through to the node's port list.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { reverse } from '../../../guava/Lists.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { init } from './counting/IInitializable.js';
import { GreedyPortDistributor } from './GreedyPortDistributor.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

/** Left layer: nodes a (above) and b; right layer: x with two west ports fed from `feeds` in list order. */
function crossing(
  feeds: readonly ('a' | 'b')[],
  constraints?: PortConstraints,
): { order: LNode[][]; x: LNode; ports: LPort[]; distributor: GreedyPortDistributor } {
  const graph = new LGraph();
  const left = addLayer(graph);
  const right = addLayer(graph);
  const [a, b] = ['a', 'b'].map(() => {
    const node = addNode(graph);
    node.setLayer(left);
    return node;
  }) as [LNode, LNode];
  const sources = { a: addPort(a, PortSide.EAST), b: addPort(b, PortSide.EAST) };
  const x = addNode(graph);
  x.setLayer(right);
  if (constraints !== undefined) {
    x.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
  }
  const ports = feeds.map((from) => {
    const port = addPort(x, PortSide.WEST);
    connect(sources[from], port);
    return port;
  });
  x.cachePortSides();
  const order = [[a, b], [x]];
  const distributor = new GreedyPortDistributor();
  init([new NodeRelativePortDistributor(2), distributor], order);
  return { order, x, ports, distributor };
}

describe('GreedyPortDistributor: the reversed port side view writes through (C9)', () => {
  it('swaps two ports of the node through Lists.reverse of the side view', () => {
    const { x, ports } = crossing(['a', 'b']);
    const view = reverse(x.getPortSideView(PortSide.WEST));
    const lower = view.get(1);
    view.set(1, view.get(0));
    view.set(0, lower);
    // the reversed view index 0 is the last west port: the swap reached the node's own list
    expect(x.getPorts()).toEqual([ports[1], ports[0]]);
  });

  it('throws an IndexOutOfBoundsException for a set beyond the view, as ArrayList.SubList does', () => {
    const { x } = crossing(['a', 'b']);
    const view = x.getPortSideView(PortSide.WEST);
    expect(() => {
      view[2] = view[0]!;
    }).toThrow(IndexOutOfBoundsException);
    expect(() => reverse(view).set(2, view[0]!)).toThrow(IndexOutOfBoundsException);
    expect(() => reverse(view).set(-1, view[0]!)).toThrow(IndexOutOfBoundsException);
  });
});

/** The T6 form of the C9 cases: a node with one east and two west ports, no distributor involved. */
function nodeWithWestPorts(): { ports: ReturnType<typeof addPort>[]; node: ReturnType<typeof addNode> } {
  const graph = new LGraph();
  const node = addNode(graph);
  node.setLayer(addLayer(graph));
  const ports = [addPort(node, PortSide.EAST), addPort(node, PortSide.WEST), addPort(node, PortSide.WEST)];
  node.cachePortSides();
  return { ports, node };
}

describe('GreedyPortDistributor: the reversed port side view writes through (C9, T6 cases)', () => {
  it('swaps two ports of the node through Lists.reverse of the side view', () => {
    const { node, ports } = nodeWithWestPorts();
    const view = reverse(node.getPortSideView(PortSide.WEST));
    const lower = view.get(1);
    view.set(1, view.get(0));
    view.set(0, lower);
    // reversed index 0 is the last west port: the swap reached the node's own list, the east port is untouched
    expect(node.getPorts()).toEqual([ports[0], ports[2], ports[1]]);
  });

  it('throws an IndexOutOfBoundsException for a set beyond the view, as ArrayList.SubList does', () => {
    const { node } = nodeWithWestPorts();
    const view = node.getPortSideView(PortSide.WEST);
    expect(() => {
      view[2] = view[0]!;
    }).toThrow(IndexOutOfBoundsException);
    expect(() => reverse(view).set(2, view[0]!)).toThrow(IndexOutOfBoundsException);
    expect(() => reverse(view).set(-1, view[0]!)).toThrow(IndexOutOfBoundsException);
  });
});

describe('GreedyPortDistributor', () => {
  it('switches the west ports of a crossing until no switch decreases the crossings', () => {
    const { order, x, ports, distributor } = crossing(['a', 'b']);
    // a is above b, the west list runs bottom to top: [fed from b, fed from a] is the crossing-free order
    expect(distributor.distributePortsWhileSweeping(order, 1, true)).toBe(true);
    expect(x.getPorts()).toEqual([ports[1], ports[0]]);
    expect(distributor.distributePortsWhileSweeping(order, 1, true)).toBe(false);
    expect(x.getPorts()).toEqual([ports[1], ports[0]]);
  });

  it('leaves a crossing-free order and a node with a fixed port order alone', () => {
    const free = crossing(['b', 'a']);
    expect(free.distributor.distributePortsWhileSweeping(free.order, 1, true)).toBe(false);
    expect(free.x.getPorts()).toEqual(free.ports);
    const fixed = crossing(['a', 'b'], PortConstraints.FIXED_ORDER);
    expect(fixed.distributor.distributePortsWhileSweeping(fixed.order, 1, true)).toBe(false);
    expect(fixed.x.getPorts()).toEqual(fixed.ports);
  });
});
