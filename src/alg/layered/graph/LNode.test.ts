// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect, label } from '../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { InteractiveReferencePoint } from '../options/InteractiveReferencePoint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { LGraph } from './LGraph.js';
import { LLabel } from './LLabel.js';
import { LMargin } from './LMargin.js';
import { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';
import { LPadding } from './LPadding.js';
import { LShape } from './LShape.js';

describe('LNode defaults', () => {
  it('starts as a normal, layerless node without ports, labels or nested graph', () => {
    const graph = new LGraph();
    const node = new LNode(graph);
    expect(node).toBeInstanceOf(LShape);
    expect(node.getGraph()).toBe(graph);
    expect(node.getLayer()).toBeNull();
    expect(node.getType()).toBe(NodeType.NORMAL);
    expect(node.getPorts()).toEqual([]);
    expect(node.getLabels()).toEqual([]);
    expect(node.getNestedGraph()).toBeNull();
    expect(node.getMargin()).toBeInstanceOf(LMargin);
    expect(node.getPadding()).toBeInstanceOf(LPadding);
    expect(node.getIndex()).toBe(-1);
  });

  it('stores type, nested graph and graph', () => {
    const graph = new LGraph();
    const node = new LNode(null);
    expect(node.getGraph()).toBeNull();
    node.setType(NodeType.LABEL);
    expect(node.getType()).toBe(NodeType.LABEL);
    node.setNestedGraph(graph);
    expect(node.getNestedGraph()).toBe(graph);
    node.setNestedGraph(null);
    expect(node.getNestedGraph()).toBeNull();
    node.setGraph(graph);
    expect(node.getGraph()).toBe(graph);
  });

  it('falls back to the layer graph while no graph is set', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const node = new LNode(null);
    node.setLayer(layer);
    expect(node.getGraph()).toBe(graph);
    const other = new LGraph();
    node.setGraph(other);
    expect(node.getGraph()).toBe(other);
  });
});

describe('LNode.setLayer', () => {
  it('appends to the layer, moves between layers and detaches with null', () => {
    const graph = new LGraph();
    const l0 = addLayer(graph);
    const l1 = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    a.setLayer(l0);
    b.setLayer(l0);
    expect(l0.getNodes()).toEqual([a, b]);
    expect(a.getLayer()).toBe(l0);
    expect(a.getIndex()).toBe(0);
    expect(b.getIndex()).toBe(1);

    a.setLayer(l1);
    expect(l0.getNodes()).toEqual([b]);
    expect(l1.getNodes()).toEqual([a]);
    expect(b.getIndex()).toBe(0);

    a.setLayer(null);
    expect(l1.getNodes()).toEqual([]);
    expect(a.getLayer()).toBeNull();
  });

  it('inserts at an index with the indexed form', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    const c = addNode(graph);
    a.setLayer(layer);
    b.setLayer(layer);
    c.setLayer(0, layer);
    expect(layer.getNodes()).toEqual([c, a, b]);
    const d = addNode(graph);
    d.setLayer(3, layer);
    expect(layer.getNodes()).toEqual([c, a, b, d]);
  });

  it('removes from the old layer before inserting at the index', () => {
    const graph = new LGraph();
    const l0 = addLayer(graph);
    const l1 = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    a.setLayer(l0);
    b.setLayer(l1);
    a.setLayer(0, l1);
    expect(l0.getNodes()).toEqual([]);
    expect(l1.getNodes()).toEqual([a, b]);
    a.setLayer(0, null);
    expect(l1.getNodes()).toEqual([b]);
    expect(a.getLayer()).toBeNull();
  });

  it('rejects an out-of-range index for a non-null layer and ignores it for null', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const node = addNode(graph);
    expect(() => node.setLayer(-1, layer)).toThrow(IllegalArgumentException);
    expect(() => node.setLayer(1, layer)).toThrow('index must be >= 0 and <= layer node count');
    expect(layer.getNodes()).toEqual([]);
    expect(node.getLayer()).toBeNull();
    node.setLayer(5, null);
    expect(node.getLayer()).toBeNull();
  });
});

describe('LNode ports by type and side', () => {
  /** Ports in order: n(out), e(in), e2(out+in), s(none), w(in). */
  function portNode(): {
    node: LNode;
    n: ReturnType<typeof addPort>;
    e: ReturnType<typeof addPort>;
    e2: ReturnType<typeof addPort>;
    s: ReturnType<typeof addPort>;
    w: ReturnType<typeof addPort>;
  } {
    const graph = new LGraph();
    const node = addNode(graph);
    const other = addNode(graph);
    const n = addPort(node, PortSide.NORTH);
    const e = addPort(node, PortSide.EAST);
    const e2 = addPort(node, PortSide.EAST);
    const s = addPort(node, PortSide.SOUTH);
    const w = addPort(node, PortSide.WEST);
    const far = addPort(other);
    connect(n, far);
    connect(far, e);
    connect(e2, far);
    connect(far, e2);
    connect(far, w);
    return { node, n, e, e2, s, w };
  }

  it('getPorts() is the live list', () => {
    const { node, n, e, e2, s, w } = portNode();
    expect(node.getPorts()).toEqual([n, e, e2, s, w]);
    expect(node.getPorts()).toBe(node.getPorts());
  });

  it('filters by port type; UNDEFINED has none', () => {
    const { node, n, e, e2, w } = portNode();
    expect([...node.getPorts(PortType.INPUT)]).toEqual([e, e2, w]);
    expect([...node.getPorts(PortType.OUTPUT)]).toEqual([n, e2]);
    expect([...node.getPorts(PortType.UNDEFINED)]).toEqual([]);
  });

  it('filters by side; UNDEFINED has none', () => {
    const { node, n, e, e2, s, w } = portNode();
    expect([...node.getPorts(PortSide.NORTH)]).toEqual([n]);
    expect([...node.getPorts(PortSide.EAST)]).toEqual([e, e2]);
    expect([...node.getPorts(PortSide.SOUTH)]).toEqual([s]);
    expect([...node.getPorts(PortSide.WEST)]).toEqual([w]);
    expect([...node.getPorts(PortSide.UNDEFINED)]).toEqual([]);
  });

  it('filters by type and side together', () => {
    const { node, n, e, e2, w } = portNode();
    expect([...node.getPorts(PortType.INPUT, PortSide.EAST)]).toEqual([e, e2]);
    expect([...node.getPorts(PortType.OUTPUT, PortSide.EAST)]).toEqual([e2]);
    expect([...node.getPorts(PortType.OUTPUT, PortSide.NORTH)]).toEqual([n]);
    expect([...node.getPorts(PortType.INPUT, PortSide.WEST)]).toEqual([w]);
    expect([...node.getPorts(PortType.INPUT, PortSide.NORTH)]).toEqual([]);
    expect([...node.getPorts(PortType.INPUT, PortSide.SOUTH)]).toEqual([]);
    expect([...node.getPorts(PortType.OUTPUT, PortSide.SOUTH)]).toEqual([]);
    expect([...node.getPorts(PortType.INPUT, PortSide.WEST)]).toEqual([w]);
    expect([...node.getPorts(PortType.UNDEFINED, PortSide.EAST)]).toEqual([]);
    expect([...node.getPorts(PortType.INPUT, PortSide.UNDEFINED)]).toEqual([]);
  });

  it('lists incoming, outgoing and connected edges port by port', () => {
    const { node, n, e, e2, w } = portNode();
    const in1 = e.getIncomingEdges()[0]!;
    const in2 = e2.getIncomingEdges()[0]!;
    const in3 = w.getIncomingEdges()[0]!;
    const out1 = n.getOutgoingEdges()[0]!;
    const out2 = e2.getOutgoingEdges()[0]!;
    expect([...node.getIncomingEdges()]).toEqual([in1, in2, in3]);
    expect([...node.getOutgoingEdges()]).toEqual([out1, out2]);
    expect([...node.getConnectedEdges()]).toEqual([out1, in1, in2, out2, in3]);
  });
});

describe('LNode.getPortSideView', () => {
  function sorted(sides: readonly PortSide[]): { node: LNode; ports: ReturnType<typeof addPort>[] } {
    const node = addNode(new LGraph());
    return { node, ports: sides.map((side) => addPort(node, side)) };
  }

  const SIDES = [PortSide.NORTH, PortSide.EAST, PortSide.EAST, PortSide.SOUTH, PortSide.WEST, PortSide.WEST];

  it('returns the ports of one side, computed on demand when sides are not cached', () => {
    const { node, ports } = sorted(SIDES);
    expect([...node.getPortSideView(PortSide.NORTH)]).toEqual([ports[0]]);
    expect([...node.getPortSideView(PortSide.EAST)]).toEqual([ports[1], ports[2]]);
    expect([...node.getPortSideView(PortSide.SOUTH)]).toEqual([ports[3]]);
    expect([...node.getPortSideView(PortSide.WEST)]).toEqual([ports[4], ports[5]]);
    expect(node.getPortSideView(PortSide.EAST).length).toBe(2);
  });

  it('is empty for a side without ports and for the undefined side', () => {
    const { node } = sorted([PortSide.EAST, PortSide.WEST]);
    expect([...node.getPortSideView(PortSide.NORTH)]).toEqual([]);
    expect([...node.getPortSideView(PortSide.SOUTH)]).toEqual([]);
    expect([...node.getPortSideView(PortSide.UNDEFINED)]).toEqual([]);
    expect([...sorted([]).node.getPortSideView(PortSide.EAST)]).toEqual([]);
  });

  it('returns a view onto the node port list: element writes go through', () => {
    const { node, ports } = sorted(SIDES);
    const view = node.getPortSideView(PortSide.EAST);
    view[0] = ports[2]!;
    view[1] = ports[1]!;
    expect(node.getPorts()).toEqual([ports[0], ports[2], ports[1], ports[3], ports[4], ports[5]]);
    expect([...node.getPortSideView(PortSide.EAST)]).toEqual([ports[2], ports[1]]);
  });

  it('exposes only its own slice by index and reports membership by index', () => {
    const { node, ports } = sorted(SIDES);
    const view = node.getPortSideView(PortSide.WEST);
    expect(view[0]).toBe(ports[4]);
    expect(view[1]).toBe(ports[5]);
    // oracle: site/lnode/portSideView (cached.get.NORTH.2); LNode.java:298 returns ports.subList(...), whose get(int)
    // runs Objects.checkIndex. Re-anchored under X7: the first version expected a TS-array `undefined`.
    expect(() => view[2]).toThrow(IndexOutOfBoundsException);
    expect(() => view[2]).toThrow('Index 2 out of bounds for length 2');
    expect(0 in view).toBe(true);
    expect(2 in view).toBe(false);
    expect('length' in view).toBe(true);
  });

  it('rejects writes outside the view and structural changes', () => {
    const { node, ports } = sorted(SIDES);
    const view = node.getPortSideView(PortSide.EAST);
    // oracle: site/lnode/portSideView (set.NORTH.5); LNode.java:298, SubList.set(int) runs Objects.checkIndex. A JS
    // push is an index write at index = size, the same Java set(size). Re-anchored under X7: the first version
    // expected UnsupportedOperationException for both, which the view now reserves for non-index writes.
    expect(() => view.push(ports[0]!)).toThrow(IndexOutOfBoundsException);
    expect(() => view.push(ports[0]!)).toThrow('Index 2 out of bounds for length 2');
    expect(() => {
      view[5] = ports[0]!;
    }).toThrow(IndexOutOfBoundsException);
    expect(() => {
      view[5] = ports[0]!;
    }).toThrow('Index 5 out of bounds for length 2');
    expect(() => {
      view.length = 0;
    }).toThrow(UnsupportedOperationException);
    expect(node.getPorts().length).toBe(6);
  });

  it('cachePortSides freezes the index ranges used by later views', () => {
    const { node, ports } = sorted(SIDES);
    node.cachePortSides();
    const extra = addPort(node, PortSide.NORTH);
    node.getPorts().unshift(node.getPorts().pop()!);
    expect(node.getPorts()[0]).toBe(extra);
    expect([...node.getPortSideView(PortSide.NORTH)]).toEqual([extra]);
    expect([...node.getPortSideView(PortSide.EAST)]).toEqual([ports[0], ports[1]]);
  });
});

describe('LNode naming', () => {
  it('designates itself by label text, else origin identifier, else layer index', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    expect(a.getDesignation()).toBe('-1');
    a.setLayer(layer);
    b.setLayer(layer);
    expect(a.getDesignation()).toBe('0');
    expect(b.getDesignation()).toBe('1');
    b.getLabels().push(new LLabel(''));
    expect(b.getDesignation()).toBe('1');
    const origin = ElkGraphUtil.createGraph();
    origin.setIdentifier('orig');
    b.setProperty(InternalProperties.ORIGIN, origin);
    expect(b.getDesignation()).toBe('orig');
    b.getLabels().length = 0;
    b.getLabels().push(label('named'));
    expect(b.getDesignation()).toBe('named');
  });

  it('prints n_<designation>, with the lower-case type for non-normal nodes', () => {
    const node = addNode(new LGraph());
    node.getLabels().push(label('x'));
    expect(node.toString()).toBe('n_x');
    node.setType(NodeType.LONG_EDGE);
    expect(node.toString()).toBe('n(long_edge)_x');
    node.setType(NodeType.NONSHIFTING_PLACEHOLDER);
    expect(node.toString()).toBe('n(nonshifting_placeholder)_x');
  });
});

describe('LNode.isInlineEdgeLabel', () => {
  function labelDummy(inline: readonly boolean[]): LNode {
    const node = addNode(new LGraph(), NodeType.LABEL);
    const labels = inline.map((flag) => {
      const l = new LLabel('l');
      l.setProperty(LayeredOptions.EDGE_LABELS_INLINE, flag);
      return l;
    });
    node.setProperty(InternalProperties.REPRESENTED_LABELS, labels);
    return node;
  }

  it('is true for a label dummy whose represented labels are all inline', () => {
    expect(labelDummy([true, true]).isInlineEdgeLabel()).toBe(true);
    expect(labelDummy([]).isInlineEdgeLabel()).toBe(true);
  });

  it('is false when any represented label is not inline', () => {
    expect(labelDummy([true, false]).isInlineEdgeLabel()).toBe(false);
  });

  it('is false for every other node type', () => {
    const node = labelDummy([true]);
    node.setType(NodeType.NORMAL);
    expect(node.isInlineEdgeLabel()).toBe(false);
  });
});

describe('LNode coordinate helpers', () => {
  it('borderToContentAreaCoordinates moves only the requested axes', () => {
    const graph = new LGraph();
    graph.getPadding().setLeft(7);
    graph.getPadding().setTop(11);
    graph.getOffset().x = 3;
    graph.getOffset().y = 5;
    const node = addNode(graph);
    node.getPosition().x = 100;
    node.getPosition().y = 200;

    node.borderToContentAreaCoordinates(false, false);
    expect([node.getPosition().x, node.getPosition().y]).toEqual([100, 200]);

    node.borderToContentAreaCoordinates(true, false);
    expect(node.getPosition().x).not.toBe(100);
    expect(node.getPosition().y).toBe(200);

    const x = node.getPosition().x;
    node.borderToContentAreaCoordinates(false, true);
    expect(node.getPosition().x).toBe(x);
    expect(node.getPosition().y).not.toBe(200);
  });

  it('getInteractiveReferencePoint returns a new vector for each reference point', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    node.getPosition().x = 8;
    node.getPosition().y = 9;

    graph.setProperty(LayeredOptions.INTERACTIVE_REFERENCE_POINT, InteractiveReferencePoint.TOP_LEFT);
    const topLeft = node.getInteractiveReferencePoint()!;
    expect([topLeft.x, topLeft.y]).toEqual([8, 9]);
    expect(topLeft).not.toBe(node.getPosition());

    graph.setProperty(LayeredOptions.INTERACTIVE_REFERENCE_POINT, InteractiveReferencePoint.CENTER);
    const center = node.getInteractiveReferencePoint()!;
    expect(center).not.toBe(node.getPosition());
    // zero size: the centre is the position
    expect([center.x, center.y]).toEqual([8, 9]);
  });

  it('getInteractiveReferencePoint is null for an unknown reference point (Java default arm)', () => {
    const graph = new LGraph();
    const node = addNode(graph);
    graph.setProperty(LayeredOptions.INTERACTIVE_REFERENCE_POINT, {
      unknown: true,
    } as unknown as InteractiveReferencePoint);
    expect(node.getInteractiveReferencePoint()).toBeNull();
  });
});
