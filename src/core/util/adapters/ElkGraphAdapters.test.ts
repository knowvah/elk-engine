// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { LayoutMetaDataService } from '../../data/LayoutMetaDataService.js';
import { ElkMargin } from '../../math/ElkMargin.js';
import { ElkPadding } from '../../math/ElkPadding.js';
import { KVector } from '../../math/KVector.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import { LabelSide } from '../../options/LabelSide.js';
import { PortConstraints } from '../../options/PortConstraints.js';
import { PortSide } from '../../options/PortSide.js';
import {
  ElkGraphAdapter,
  ElkGraphAdapters,
  ElkNodeAdapter,
  ElkPortAdapter,
  PortComparator,
} from './ElkGraphAdapters.js';
import { ElkEdgeAdapter } from './ElkGraphAdaptersElkEdgeAdapter.js';
import { ElkLabelAdapter } from './ElkGraphAdaptersElkLabelAdapter.js';

const NODE_X = 3;
const NODE_Y = 4;
const NODE_W = 50;
const NODE_H = 20;

function portOn(node: ElkNode, side: PortSide, x = 0, y = 0): ElkPort {
  const port = ElkGraphUtil.createPort(node);
  port.setProperty(CoreOptions.PORT_SIDE, side);
  port.setLocation(x, y);
  return port;
}

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphAdapters facade', () => {
  it('adapt wraps the graph root', () => {
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    const adapter = ElkGraphAdapters.adapt(root);
    expect(adapter).toBeInstanceOf(ElkGraphAdapter);
    const nodes = [...adapter.getNodes()];
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toBeInstanceOf(ElkNodeAdapter);
    expect((nodes[0] as ElkNodeAdapter).getGraph()).toBe(adapter);
    expect(adapter.getNodes()).toBe(adapter.getNodes());
    expect(child.getParent()).toBe(root);
  });

  it('adaptSingleNode has a null graph for a parentless node and a graph adapter otherwise', () => {
    const root = ElkGraphUtil.createGraph();
    const child = ElkGraphUtil.createNode(root);
    expect(ElkGraphAdapters.adaptSingleNode(root).getGraph()).toBeNull();
    expect(ElkGraphAdapters.adaptSingleNode(child).getGraph()).toBeInstanceOf(ElkGraphAdapter);
  });

  it('adaptSinglePort wraps the port', () => {
    const node = ElkGraphUtil.createNode(null);
    const port = portOn(node, PortSide.EAST);
    const adapter = ElkGraphAdapters.adaptSinglePort(port);
    expect(adapter).toBeInstanceOf(ElkPortAdapter);
    expect(adapter.getSide()).toBe(PortSide.EAST);
  });

  it('exposes the default port sorter', () => {
    expect(ElkGraphAdapters.DEFAULT_PORTLIST_SORTER).toBeInstanceOf(PortComparator);
  });
});

describe('graph element adapter behaviour', () => {
  function adapted(): { node: ElkNode; adapter: ElkNodeAdapter } {
    const node = ElkGraphUtil.createNode(null);
    node.setLocation(NODE_X, NODE_Y);
    node.setDimensions(NODE_W, NODE_H);
    return { node, adapter: ElkGraphAdapters.adaptSingleNode(node) };
  }

  it('reads position and size as fresh vectors', () => {
    const { adapter } = adapted();
    expect(adapter.getPosition()).toEqual(new KVector(NODE_X, NODE_Y));
    expect(adapter.getSize()).toEqual(new KVector(NODE_W, NODE_H));
    expect(adapter.getPosition()).not.toBe(adapter.getPosition());
  });

  it('writes position and size through to the element', () => {
    const { node, adapter } = adapted();
    adapter.setPosition(new KVector(7, 8));
    adapter.setSize(new KVector(9, 10));
    expect([node.getX(), node.getY(), node.getWidth(), node.getHeight()]).toEqual([7, 8, 9, 10]);
  });

  it('keeps the volatile id on the adapter', () => {
    const { adapter } = adapted();
    expect(adapter.getVolatileId()).toBe(0);
    adapter.setVolatileId(42);
    expect(adapter.getVolatileId()).toBe(42);
  });

  it('delegates getProperty and hasProperty', () => {
    const { node, adapter } = adapted();
    expect(adapter.hasProperty(CoreOptions.PORT_CONSTRAINTS)).toBe(false);
    node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    expect(adapter.hasProperty(CoreOptions.PORT_CONSTRAINTS)).toBe(true);
    expect(adapter.getProperty(CoreOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
  });

  it('returns 0.0 for an unset PORT_BORDER_OFFSET through OFFSET_PROXY and the set value otherwise', () => {
    const node = ElkGraphUtil.createNode(null);
    const port = portOn(node, PortSide.NORTH);
    const adapter = ElkGraphAdapters.adaptSinglePort(port);
    expect(adapter.getProperty(CoreOptions.PORT_BORDER_OFFSET)).toBe(0);
    expect(adapter.hasProperty(CoreOptions.PORT_BORDER_OFFSET)).toBe(false);
    port.setProperty(CoreOptions.PORT_BORDER_OFFSET, -2.5);
    expect(adapter.getProperty(CoreOptions.PORT_BORDER_OFFSET)).toBe(-2.5);
  });

  it('copies padding on read and on write', () => {
    const { node, adapter } = adapted();
    const padding = new ElkPadding(1, 2, 3, 4);
    adapter.setPadding(padding);
    const stored = node.getProperty(CoreOptions.PADDING);
    expect(stored).not.toBe(padding);
    expect(stored.equals(padding)).toBe(true);
    const read = adapter.getPadding();
    expect(read).not.toBe(stored);
    expect(read.equals(padding)).toBe(true);
  });

  it('reads the default padding as a copy', () => {
    const { adapter } = adapted();
    const expected = CoreOptions.PADDING.getDefault();
    expect(adapter.getPadding().equals(expected)).toBe(true);
  });

  it('returns the stored margin object itself on read and copies on write', () => {
    const { node, adapter } = adapted();
    const margin = new ElkMargin(5, 6, 7, 8);
    adapter.setMargin(margin);
    const stored = node.getProperty(CoreOptions.MARGINS);
    expect(stored).not.toBe(margin);
    expect(stored.equals(margin)).toBe(true);
    expect(adapter.getMargin()).toBe(stored);
  });

  it('reads the default margin when none was set', () => {
    const { adapter } = adapted();
    expect(adapter.getMargin().equals(CoreOptions.MARGINS.getDefault())).toBe(true);
  });
});

describe('ElkNodeAdapter', () => {
  it('adapts labels with text and side, cached', () => {
    const node = ElkGraphUtil.createNode(null);
    const label = ElkGraphUtil.createLabelWithText('hello', node);
    label.setProperty(LabelSide.LABEL_SIDE, LabelSide.ABOVE);
    const adapter = ElkGraphAdapters.adaptSingleNode(node);
    const labels = adapter.getLabels();
    expect(labels).toHaveLength(1);
    expect(labels[0]).toBeInstanceOf(ElkLabelAdapter);
    expect(labels[0]?.getText()).toBe('hello');
    expect(labels[0]?.getSide()).toBe(LabelSide.ABOVE);
    expect(adapter.getLabels()).toBe(labels);
  });

  it('adapts ports, cached', () => {
    const node = ElkGraphUtil.createNode(null);
    portOn(node, PortSide.WEST);
    portOn(node, PortSide.EAST);
    const adapter = ElkGraphAdapters.adaptSingleNode(node);
    const ports = adapter.getPorts();
    expect(ports.map((p) => p.getSide())).toEqual([PortSide.WEST, PortSide.EAST]);
    expect(adapter.getPorts()).toBe(ports);
  });

  it('adapts incoming and outgoing edges including port edges, cached', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    const pa = portOn(a, PortSide.EAST);
    const e1 = ElkGraphUtil.createSimpleEdge(a, b);
    ElkGraphUtil.createSimpleEdge(pa, b);
    ElkGraphUtil.createLabelWithText('e1', e1);
    const aAdapter = ElkGraphAdapters.adaptSingleNode(a);
    const bAdapter = ElkGraphAdapters.adaptSingleNode(b);
    const out = [...aAdapter.getOutgoingEdges()];
    const inc = [...bAdapter.getIncomingEdges()];
    expect(out).toHaveLength(2);
    expect(inc).toHaveLength(2);
    expect([...aAdapter.getIncomingEdges()]).toHaveLength(0);
    expect(out[0]).toBeInstanceOf(ElkEdgeAdapter);
    expect(aAdapter.getOutgoingEdges()).toBe(aAdapter.getOutgoingEdges());
    expect(bAdapter.getIncomingEdges()).toBe(bAdapter.getIncomingEdges());
    const edgeLabels = [...out[0]!.getLabels()];
    expect(edgeLabels.map((l) => (l as ElkLabelAdapter).getText())).toEqual(['e1']);
    expect(out[0]!.getLabels()).toBe(out[0]!.getLabels());
  });

  it('isCompoundNode: children, inside self loops, or neither', () => {
    const leaf = ElkGraphUtil.createNode(null);
    expect(ElkGraphAdapters.adaptSingleNode(leaf).isCompoundNode()).toBe(false);
    leaf.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true);
    expect(ElkGraphAdapters.adaptSingleNode(leaf).isCompoundNode()).toBe(true);
    const parent = ElkGraphUtil.createNode(null);
    ElkGraphUtil.createNode(parent);
    expect(ElkGraphAdapters.adaptSingleNode(parent).isCompoundNode()).toBe(true);
  });

  function shuffledNode(constraints: PortConstraints): { node: ElkNode; ports: ElkPort[] } {
    const node = ElkGraphUtil.createNode(null);
    node.setProperty(CoreOptions.PORT_CONSTRAINTS, constraints);
    const w1 = portOn(node, PortSide.WEST, 0, 5);
    const w2 = portOn(node, PortSide.WEST, 0, 9);
    const s1 = portOn(node, PortSide.SOUTH, 2, 0);
    const s2 = portOn(node, PortSide.SOUTH, 8, 0);
    const e1 = portOn(node, PortSide.EAST, 0, 7);
    const e2 = portOn(node, PortSide.EAST, 0, 1);
    const n1 = portOn(node, PortSide.NORTH, 6, 0);
    const n2 = portOn(node, PortSide.NORTH, 1, 0);
    return { node, ports: [w1, w2, s1, s2, e1, e2, n1, n2] };
  }

  it('sortPortList orders by side then by position with the default sorter', () => {
    const { node, ports } = shuffledNode(PortConstraints.FIXED_ORDER);
    const [w1, w2, s1, s2, e1, e2, n1, n2] = ports;
    ElkGraphAdapters.adaptSingleNode(node).sortPortList();
    // N asc x, E asc y, S desc x, W desc y
    expect([...node.getPorts()]).toEqual([n2, n1, e2, e1, s2, s1, w2, w1]);
  });

  it('sortPortList uses a supplied comparator', () => {
    const { node, ports } = shuffledNode(PortConstraints.FIXED_POS);
    const byIdentity = (a: ElkPort, b: ElkPort): number => ports.indexOf(b) - ports.indexOf(a);
    ElkGraphAdapters.adaptSingleNode(node).sortPortList(byIdentity as (a: never, b: never) => number);
    expect([...node.getPorts()]).toEqual([...ports].reverse());
  });

  it('sortPortList leaves ports alone unless the order is fixed', () => {
    const { node, ports } = shuffledNode(PortConstraints.FIXED_SIDE);
    ElkGraphAdapters.adaptSingleNode(node).sortPortList();
    expect([...node.getPorts()]).toEqual(ports);
  });
});

describe('ElkPortAdapter', () => {
  it('adapts labels and edges, cached', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    const pa = portOn(a, PortSide.EAST);
    const pb = portOn(b, PortSide.WEST);
    ElkGraphUtil.createLabelWithText('p', pa);
    ElkGraphUtil.createSimpleEdge(pa, pb);
    const adapterA = ElkGraphAdapters.adaptSinglePort(pa);
    const adapterB = ElkGraphAdapters.adaptSinglePort(pb);
    expect(adapterA.getLabels().map((l) => (l as ElkLabelAdapter).getText())).toEqual(['p']);
    expect(adapterA.getLabels()).toBe(adapterA.getLabels());
    expect([...adapterA.getOutgoingEdges()]).toHaveLength(1);
    expect([...adapterA.getIncomingEdges()]).toHaveLength(0);
    expect([...adapterB.getIncomingEdges()]).toHaveLength(1);
    expect(adapterA.getOutgoingEdges()).toBe(adapterA.getOutgoingEdges());
    expect(adapterB.getIncomingEdges()).toBe(adapterB.getIncomingEdges());
  });

  it('hasCompoundConnections is false for sibling connections and unconnected ports', () => {
    const root = ElkGraphUtil.createGraph();
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    const pa = portOn(a, PortSide.EAST);
    ElkGraphUtil.createSimpleEdge(pa, b);
    expect(ElkGraphAdapters.adaptSinglePort(pa).hasCompoundConnections()).toBe(false);
    expect(ElkGraphAdapters.adaptSinglePort(portOn(a, PortSide.WEST)).hasCompoundConnections()).toBe(false);
  });

  it('hasCompoundConnections is true for an outgoing edge to a descendant', () => {
    const root = ElkGraphUtil.createGraph();
    const parent = ElkGraphUtil.createNode(root);
    const child = ElkGraphUtil.createNode(parent);
    const pp = portOn(parent, PortSide.WEST);
    ElkGraphUtil.createSimpleEdge(pp, child);
    expect(ElkGraphAdapters.adaptSinglePort(pp).hasCompoundConnections()).toBe(true);
  });

  it('hasCompoundConnections is true for an incoming edge from a descendant', () => {
    const root = ElkGraphUtil.createGraph();
    const parent = ElkGraphUtil.createNode(root);
    const child = ElkGraphUtil.createNode(parent);
    const pp = portOn(parent, PortSide.EAST);
    ElkGraphUtil.createSimpleEdge(child, pp);
    expect(ElkGraphAdapters.adaptSinglePort(pp).hasCompoundConnections()).toBe(true);
  });

  it('hasCompoundConnections treats inside self loops as compound only when flagged', () => {
    const root = ElkGraphUtil.createGraph();
    const node = ElkGraphUtil.createNode(root);
    const p = portOn(node, PortSide.EAST);
    const edge = ElkGraphUtil.createSimpleEdge(p, node);
    expect(ElkGraphAdapters.adaptSinglePort(p).hasCompoundConnections()).toBe(false);
    edge.setProperty(CoreOptions.INSIDE_SELF_LOOPS_YO, true);
    expect(ElkGraphAdapters.adaptSinglePort(p).hasCompoundConnections()).toBe(true);
  });
});

describe('PortComparator', () => {
  const comparator = new PortComparator();

  function lone(side: PortSide, x = 0, y = 0): ElkPort {
    return portOn(ElkGraphUtil.createNode(null), side, x, y);
  }

  it('returns the ordinal difference for different sides', () => {
    expect(comparator.compare(lone(PortSide.NORTH), lone(PortSide.WEST))).toBe(-3);
    expect(comparator.compare(lone(PortSide.SOUTH), lone(PortSide.EAST))).toBe(1);
  });

  it('uses the PORT_INDEX difference on equal sides when both are set', () => {
    const a = lone(PortSide.NORTH, 100, 0);
    const b = lone(PortSide.NORTH, 0, 0);
    a.setProperty(CoreOptions.PORT_INDEX, 5);
    b.setProperty(CoreOptions.PORT_INDEX, 2);
    expect(comparator.compare(a, b)).toBe(3);
  });

  it('falls back to position when indices are equal or one is missing', () => {
    const a = lone(PortSide.NORTH, 1, 0);
    const b = lone(PortSide.NORTH, 2, 0);
    a.setProperty(CoreOptions.PORT_INDEX, 4);
    b.setProperty(CoreOptions.PORT_INDEX, 4);
    expect(comparator.compare(a, b)).toBe(-1);
    b.setProperty(CoreOptions.PORT_INDEX, null);
    expect(comparator.compare(a, b)).toBe(-1);
  });

  it('compares positions per side, reversed for south and west', () => {
    expect(comparator.compare(lone(PortSide.NORTH, 1), lone(PortSide.NORTH, 2))).toBe(-1);
    expect(comparator.compare(lone(PortSide.EAST, 0, 3), lone(PortSide.EAST, 0, 2))).toBe(1);
    expect(comparator.compare(lone(PortSide.SOUTH, 1), lone(PortSide.SOUTH, 2))).toBe(1);
    expect(comparator.compare(lone(PortSide.WEST, 0, 1), lone(PortSide.WEST, 0, 2))).toBe(1);
    expect(comparator.compare(lone(PortSide.WEST, 0, 2), lone(PortSide.WEST, 0, 2))).toBe(0);
  });

  it('throws IllegalStateException for undefined sides', () => {
    expect(() => comparator.compare(lone(PortSide.UNDEFINED), lone(PortSide.UNDEFINED))).toThrow(
      new IllegalStateException('Port side is undefined'),
    );
  });
});
