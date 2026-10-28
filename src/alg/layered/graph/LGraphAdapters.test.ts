// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { KVector } from '../../../core/math/KVector.js';
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { addLayer, addNode, addPort, connect, label } from '../../../../test/helpers/lgraph-builders.js';
import { nodeInLayer, toArray, volatileIds } from '../../../../test/helpers/lgraph-adapter-fixtures.js';
import type { SelfLoopHolder } from '../intermediate/loops/SelfLoopHolder.js';
import type { SelfLoopPort } from '../intermediate/loops/SelfLoopPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import {
  LEdgeAdapter,
  LGraphAdapter,
  LGraphAdapters,
  LLabelAdapter,
  LNodeAdapter,
  LPortAdapter,
  PortComparator,
} from './LGraphAdapters.js';
import { DEFAULT_PORTLIST_SORTER } from './LGraphAdaptersPortComparator.js';
import { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';

const SOME_ID = 7;
const SOME_X = 11;
const SOME_Y = 13;
const SOME_SIDES = [3, 5, 17, 19] as const;

/** The four sides of a padding or margin as [top, right, bottom, left]. */
function sidesOf(s: ElkPadding | ElkMargin): number[] {
  return [s.getTop(), s.getRight(), s.getBottom(), s.getLeft()];
}

/** A graph with two layers holding the nodes a (layer 0), b and c (layer 1), plus a layerless node. */
function layeredGraph(): { graph: LGraph; a: LNode; b: LNode; c: LNode; layerless: LNode } {
  const graph = new LGraph();
  const layer0 = addLayer(graph);
  const layer1 = addLayer(graph);
  const a = nodeInLayer(graph, layer0);
  const b = nodeInLayer(graph, layer1);
  const c = nodeInLayer(graph, layer1);
  const layerless = addNode(graph);
  return { graph, a, b, c, layerless };
}

/** The LNode wrapped by a node adapter, found through its volatile id (ids are assigned from the node list). */
function adaptedNodes(adapter: LGraphAdapter, nodes: LNode[]): LNode[] {
  nodes.forEach((n, i) => (n.id = i));
  return volatileIds(adapter.getNodes()).map((id) => nodes[id]!);
}

describe('LGraphAdapters.adapt dispatch', () => {
  it('adapts a graph, a node and a label to the matching adapter classes', () => {
    const { graph, a } = layeredGraph();
    expect(LGraphAdapters.adapt(graph)).toBeInstanceOf(LGraphAdapter);
    expect(LGraphAdapters.adapt(graph, true)).toBeInstanceOf(LGraphAdapter);
    expect(LGraphAdapters.adapt(graph, true, true, () => true)).toBeInstanceOf(LGraphAdapter);
    expect(LGraphAdapters.adapt(a, true)).toBeInstanceOf(LNodeAdapter);
    expect(LGraphAdapters.adapt(label('x'))).toBeInstanceOf(LLabelAdapter);
  });

  it('exposes the default port comparator as the one shared instance', () => {
    expect(LGraphAdapters.DEFAULT_PORTLIST_SORTER).toBe(DEFAULT_PORTLIST_SORTER);
    expect(LGraphAdapters.DEFAULT_PORTLIST_SORTER).toBeInstanceOf(PortComparator);
  });

  it('adapts a single node without a parent graph adapter', () => {
    const { a } = layeredGraph();
    expect(LGraphAdapters.adapt(a, false).getGraph()).toBeNull();
  });
});

describe('LGraphAdapter', () => {
  it('adapts the nodes of the layers in layer order and ignores layerless nodes', () => {
    const { graph, a, b, c, layerless } = layeredGraph();
    const adapter = LGraphAdapters.adapt(graph);
    expect(adaptedNodes(adapter, [a, b, c, layerless])).toEqual([a, b, c]);
  });

  it('caches the node adapter list and sets itself as parent graph', () => {
    const { graph } = layeredGraph();
    const adapter = LGraphAdapters.adapt(graph);
    const first = adapter.getNodes();
    expect(adapter.getNodes()).toBe(first);
    for (const n of toArray(first)) {
      expect(n.getGraph()).toBe(adapter);
    }
  });

  it('shows only the nodes accepted by the node filter', () => {
    const { graph, a, b, c } = layeredGraph();
    b.setType(NodeType.LONG_EDGE);
    const adapter = LGraphAdapters.adapt(graph, false, false, (n) => n.getType() === NodeType.NORMAL);
    expect(adaptedNodes(adapter, [a, b, c])).toEqual([a, c]);
  });

  it('adds top then bottom comment nodes after their node only when comment nodes are transparent', () => {
    const { graph, a, b, c } = layeredGraph();
    const top = addNode(graph);
    const bottom = addNode(graph);
    a.setProperty(InternalProperties.TOP_COMMENTS, [top]);
    a.setProperty(InternalProperties.BOTTOM_COMMENTS, [bottom]);
    const all = [a, b, c, top, bottom];
    expect(
      adaptedNodes(
        LGraphAdapters.adapt(graph, false, true, () => true),
        all,
      ),
    ).toEqual([a, top, bottom, b, c]);
    expect(
      adaptedNodes(
        LGraphAdapters.adapt(graph, false, false, () => true),
        all,
      ),
    ).toEqual([a, b, c]);
  });

  it('does not show comment nodes of a filtered-out node', () => {
    const { graph, a, b, c } = layeredGraph();
    const top = addNode(graph);
    a.setProperty(InternalProperties.TOP_COMMENTS, [top]);
    const adapter = LGraphAdapters.adapt(graph, false, true, (n) => n !== a);
    expect(adaptedNodes(adapter, [a, b, c, top])).toEqual([b, c]);
  });

  it('passes size, properties and the volatile id through to the graph', () => {
    const { graph } = layeredGraph();
    const adapter = LGraphAdapters.adapt(graph);
    adapter.setSize(new KVector(SOME_X, SOME_Y));
    expect(adapter.getSize()).toBe(graph.getSize());
    expect([graph.getSize().x, graph.getSize().y]).toEqual([SOME_X, SOME_Y]);
    graph.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    expect(adapter.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
    expect(adapter.hasProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(true);
    expect(adapter.hasProperty(InternalProperties.COMPOUND_NODE)).toBe(false);
    adapter.setVolatileId(SOME_ID);
    expect(graph.id).toBe(SOME_ID);
    expect(adapter.getVolatileId()).toBe(SOME_ID);
  });

  it('does not support positions', () => {
    const adapter = LGraphAdapters.adapt(layeredGraph().graph);
    expect(() => adapter.getPosition()).toThrow(UnsupportedOperationException);
    expect(() => adapter.setPosition(new KVector())).toThrow(UnsupportedOperationException);
  });
});

describe('LNodeAdapter', () => {
  it('adapts ports in list order, labels, and caches both lists', () => {
    const { a } = layeredGraph();
    const p1 = addPort(a, PortSide.WEST);
    const p2 = addPort(a, PortSide.EAST);
    p1.id = 0;
    p2.id = 1;
    a.getLabels().push(label('one'), label('two'));
    const adapter = LGraphAdapters.adapt(a, false);
    expect(volatileIds(adapter.getPorts())).toEqual([0, 1]);
    expect(adapter.getPorts()).toBe(adapter.getPorts());
    expect(toArray(adapter.getLabels()).map((l) => (l as LLabelAdapter).getText())).toEqual(['one', 'two']);
    expect(adapter.getLabels()).toBe(adapter.getLabels());
  });

  it('has no directly connected edges', () => {
    const { a, b } = layeredGraph();
    connect(addPort(a), addPort(b));
    const adapter = LGraphAdapters.adapt(a, false);
    expect(toArray(adapter.getIncomingEdges())).toEqual([]);
    expect(toArray(adapter.getOutgoingEdges())).toEqual([]);
  });

  it('reports the compound node property', () => {
    const { a } = layeredGraph();
    const adapter = LGraphAdapters.adapt(a, false);
    expect(adapter.isCompoundNode()).toBe(false);
    a.setProperty(InternalProperties.COMPOUND_NODE, true);
    expect(adapter.isCompoundNode()).toBe(true);
  });

  it('passes size, position, volatile id and properties through', () => {
    const { a } = layeredGraph();
    const adapter = LGraphAdapters.adapt(a, false);
    adapter.setSize(new KVector(SOME_X, SOME_Y));
    adapter.setPosition(new KVector(SOME_Y, SOME_X));
    expect([a.getSize().x, a.getSize().y]).toEqual([SOME_X, SOME_Y]);
    expect([a.getPosition().x, a.getPosition().y]).toEqual([SOME_Y, SOME_X]);
    expect(adapter.getSize()).toBe(a.getSize());
    expect(adapter.getPosition()).toBe(a.getPosition());
    adapter.setVolatileId(SOME_ID);
    expect(a.id).toBe(SOME_ID);
    expect(adapter.getVolatileId()).toBe(SOME_ID);
  });

  it('copies padding and margin between ElkPadding/ElkMargin and the node values', () => {
    const { a } = layeredGraph();
    const adapter = LGraphAdapters.adapt(a, false);
    const [top, right, bottom, left] = SOME_SIDES;
    adapter.setPadding(new ElkPadding(top, right, bottom, left));
    adapter.setMargin(new ElkMargin(left, bottom, right, top));
    expect(sidesOf(a.getPadding())).toEqual([top, right, bottom, left]);
    expect(sidesOf(a.getMargin())).toEqual([left, bottom, right, top]);
    expect(sidesOf(adapter.getPadding())).toEqual([top, right, bottom, left]);
    expect(adapter.getPadding()).not.toBe(a.getPadding());
    expect(sidesOf(adapter.getMargin())).toEqual([left, bottom, right, top]);
    expect(adapter.getMargin()).not.toBe(a.getMargin());
  });

  describe('sortPortList', () => {
    /** Ports with the given sides in the given order; the id records the creation index. */
    function portsOf(node: LNode, sides: PortSide[]): void {
      sides.forEach((side, i) => (addPort(node, side).id = i));
    }
    const ids = (node: LNode): number[] => node.getPorts().map((p) => p.id);

    it('sorts clockwise by side (north, east, south, west) when the order is fixed', () => {
      const { a } = layeredGraph();
      a.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
      portsOf(a, [PortSide.WEST, PortSide.SOUTH, PortSide.NORTH, PortSide.EAST]);
      LGraphAdapters.adapt(a, false).sortPortList();
      expect(ids(a)).toEqual([2, 3, 1, 0]);
    });

    it('leaves the port list untouched when the order is not fixed', () => {
      const { a } = layeredGraph();
      a.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
      portsOf(a, [PortSide.WEST, PortSide.NORTH]);
      LGraphAdapters.adapt(a, false).sortPortList();
      expect(ids(a)).toEqual([0, 1]);
    });

    it('uses a supplied comparator instead of the default one', () => {
      const { a } = layeredGraph();
      a.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
      portsOf(a, [PortSide.NORTH, PortSide.EAST]);
      LGraphAdapters.adapt(a, false).sortPortList(((p1: { id: number }, p2: { id: number }) => p2.id - p1.id) as never);
      expect(ids(a)).toEqual([1, 0]);
    });
  });
});

describe('PortComparator', () => {
  const compare = (side: PortSide, p1: [number, number], p2: [number, number]): number => {
    const node = new LNode(null);
    const port1 = addPort(node, side);
    const port2 = addPort(node, side);
    port1.getPosition().x = p1[0];
    port1.getPosition().y = p1[1];
    port2.getPosition().x = p2[0];
    port2.getPosition().y = p2[1];
    return DEFAULT_PORTLIST_SORTER.compare(port1, port2);
  };
  const LOW: [number, number] = [SOME_X, SOME_X];
  const HIGH: [number, number] = [SOME_Y, SOME_Y];

  it('orders by side ordinal first', () => {
    const node = new LNode(null);
    const north = addPort(node, PortSide.NORTH);
    const east = addPort(node, PortSide.EAST);
    expect(DEFAULT_PORTLIST_SORTER.compare(north, east)).toBe(PortSide.NORTH.ordinal() - PortSide.EAST.ordinal());
  });

  it('orders ports of equal side by PORT_INDEX when both define one and they differ', () => {
    const node = new LNode(null);
    const p1 = addPort(node, PortSide.NORTH);
    const p2 = addPort(node, PortSide.NORTH);
    p1.setProperty(LayeredOptions.PORT_INDEX, SOME_ID);
    p2.setProperty(LayeredOptions.PORT_INDEX, SOME_ID + 2);
    expect(DEFAULT_PORTLIST_SORTER.compare(p1, p2)).toBe(-2);
  });

  it('falls back to the position when the indices are equal or one is missing', () => {
    const node = new LNode(null);
    const p1 = addPort(node, PortSide.NORTH);
    const p2 = addPort(node, PortSide.NORTH);
    p1.getPosition().x = SOME_Y;
    p1.setProperty(LayeredOptions.PORT_INDEX, SOME_ID);
    p2.setProperty(LayeredOptions.PORT_INDEX, SOME_ID);
    expect(DEFAULT_PORTLIST_SORTER.compare(p1, p2)).toBe(1);
    p2.setProperty(LayeredOptions.PORT_INDEX, null as never);
    expect(DEFAULT_PORTLIST_SORTER.compare(p1, p2)).toBe(1);
  });

  it('compares north by ascending x, east by ascending y, south by descending x, west by descending y', () => {
    expect(compare(PortSide.NORTH, LOW, HIGH)).toBe(-1);
    expect(compare(PortSide.EAST, LOW, HIGH)).toBe(-1);
    expect(compare(PortSide.SOUTH, LOW, HIGH)).toBe(1);
    expect(compare(PortSide.WEST, LOW, HIGH)).toBe(1);
  });

  it('rejects ports of undefined side', () => {
    expect(() => compare(PortSide.UNDEFINED, LOW, HIGH)).toThrow(IllegalStateException);
  });
});

describe('LPortAdapter', () => {
  it('passes side, margin, compound connections, labels and the id through', () => {
    const { a } = layeredGraph();
    const port = addPort(a, PortSide.SOUTH);
    port.getLabels().push(label('p'));
    const adapter = LGraphAdapters.adapt(a, false);
    const [portAdapter] = toArray(adapter.getPorts()) as LPortAdapter[];
    expect(portAdapter!.getSide()).toBe(PortSide.SOUTH);
    expect(portAdapter!.hasCompoundConnections()).toBe(false);
    port.setProperty(InternalProperties.INSIDE_CONNECTIONS, true);
    expect(portAdapter!.hasCompoundConnections()).toBe(true);
    portAdapter!.setMargin(new ElkMargin(SOME_SIDES[0], SOME_SIDES[1], SOME_SIDES[2], SOME_SIDES[3]));
    const m = portAdapter!.getMargin();
    expect([m.getTop(), m.getRight(), m.getBottom(), m.getLeft()]).toEqual([...SOME_SIDES]);
    expect(portAdapter!.getMargin()).not.toBe(port.getMargin());
    expect(toArray(portAdapter!.getLabels())).toHaveLength(1);
    expect(portAdapter!.getLabels()).toBe(portAdapter!.getLabels());
    portAdapter!.setVolatileId(SOME_ID);
    expect(port.id).toBe(SOME_ID);
  });

  it('adapts the incoming and outgoing edges of the port and caches the lists', () => {
    const { a, b } = layeredGraph();
    const out = addPort(a, PortSide.EAST);
    const inn = addPort(b, PortSide.WEST);
    connect(out, inn);
    const [outAdapter] = toArray(LGraphAdapters.adapt(a, false).getPorts()) as LPortAdapter[];
    const [inAdapter] = toArray(LGraphAdapters.adapt(b, false).getPorts()) as LPortAdapter[];
    expect(toArray(outAdapter!.getOutgoingEdges())).toHaveLength(1);
    expect(toArray(outAdapter!.getIncomingEdges())).toHaveLength(0);
    expect(toArray(inAdapter!.getIncomingEdges())).toHaveLength(1);
    expect(toArray(inAdapter!.getOutgoingEdges())).toHaveLength(0);
    expect(outAdapter!.getOutgoingEdges()).toBe(outAdapter!.getOutgoingEdges());
    expect(inAdapter!.getIncomingEdges()).toBe(inAdapter!.getIncomingEdges());
  });

  describe('transparent north/south edges', () => {
    /** An original port of `a` with a dummy node holding one edge in each direction. */
    function withDummy(): { adapterOf: (transparent: boolean) => LPortAdapter; dummyPort: LPortAdapter } {
      const { graph, a, b } = layeredGraph();
      const original = addPort(a, PortSide.NORTH);
      const dummy = nodeInLayer(graph, graph.getLayers()[0]!, NodeType.NORTH_SOUTH_PORT);
      const dummyIn = addPort(dummy);
      const dummyOut = addPort(dummy);
      connect(addPort(b), dummyIn);
      connect(dummyOut, addPort(b));
      original.setProperty(InternalProperties.PORT_DUMMY, dummy);
      return {
        adapterOf: (transparent) => toArray(LGraphAdapters.adapt(a, transparent).getPorts())[0] as LPortAdapter,
        dummyPort: toArray(LGraphAdapters.adapt(dummy, true).getPorts())[0] as LPortAdapter,
      };
    }

    it('appends the edges of the port dummy to the original port when transparent', () => {
      const { adapterOf } = withDummy();
      const adapter = adapterOf(true);
      expect(toArray(adapter.getIncomingEdges())).toHaveLength(1);
      expect(toArray(adapter.getOutgoingEdges())).toHaveLength(1);
    });

    it('does not look at the port dummy when not transparent', () => {
      const { adapterOf } = withDummy();
      const adapter = adapterOf(false);
      expect(toArray(adapter.getIncomingEdges())).toEqual([]);
      expect(toArray(adapter.getOutgoingEdges())).toEqual([]);
    });

    it('hides all edges of ports on the north/south dummy itself when transparent', () => {
      const { dummyPort } = withDummy();
      expect(toArray(dummyPort.getIncomingEdges())).toEqual([]);
      expect(toArray(dummyPort.getOutgoingEdges())).toEqual([]);
    });

    it('shows the edges of a north/south dummy port when not transparent', () => {
      const { graph, b } = layeredGraph();
      const dummy = nodeInLayer(graph, graph.getLayers()[0]!, NodeType.NORTH_SOUTH_PORT);
      const dummyPort = addPort(dummy);
      connect(addPort(b), dummyPort);
      connect(dummyPort, addPort(b));
      const [adapter] = toArray(LGraphAdapters.adapt(dummy, false).getPorts()) as LPortAdapter[];
      expect(toArray(adapter!.getIncomingEdges())).toHaveLength(1);
      expect(toArray(adapter!.getOutgoingEdges())).toHaveLength(1);
    });

    it('keeps a port without port dummy unchanged when transparent', () => {
      const { a, b } = layeredGraph();
      connect(addPort(b), addPort(a));
      const [adapter] = toArray(LGraphAdapters.adapt(a, true).getPorts()) as LPortAdapter[];
      expect(toArray(adapter!.getIncomingEdges())).toHaveLength(1);
    });
  });

  /**
   * The self loop holder branch (Java LGraphAdapters.java:515-552) is unreachable in mission 7a: nothing sets
   * SELF_LOOP_HOLDER before 7g, and the staged classes cannot be constructed. Structural stand-ins exercise it.
   */
  describe('self loop holder branch (staged classes)', () => {
    it('adds the incoming and outgoing self loop edges registered for the port', () => {
      const { a } = layeredGraph();
      const port = addPort(a, PortSide.EAST);
      const loopEdge = connect(addPort(a), addPort(a));
      const sle = { getLEdge: () => loopEdge };
      const slp = { getIncomingSLEdges: () => [sle, sle], getOutgoingSLEdges: () => [sle] } as unknown as SelfLoopPort;
      const holder = { getSLPortMap: () => new Map([[port, slp]]) } as unknown as SelfLoopHolder;
      a.setProperty(InternalProperties.SELF_LOOP_HOLDER, holder);
      const [adapter] = toArray(LGraphAdapters.adapt(a, false).getPorts()) as LPortAdapter[];
      expect(toArray(adapter!.getIncomingEdges())).toHaveLength(2);
      expect(toArray(adapter!.getOutgoingEdges())).toHaveLength(1);
    });

    it('adds nothing for a port the holder does not know', () => {
      const { a } = layeredGraph();
      addPort(a, PortSide.EAST);
      const holder = { getSLPortMap: () => new Map() } as unknown as SelfLoopHolder;
      a.setProperty(InternalProperties.SELF_LOOP_HOLDER, holder);
      const [adapter] = toArray(LGraphAdapters.adapt(a, false).getPorts()) as LPortAdapter[];
      expect(toArray(adapter!.getIncomingEdges())).toEqual([]);
      expect(toArray(adapter!.getOutgoingEdges())).toEqual([]);
    });
  });
});

describe('LLabelAdapter and LEdgeAdapter', () => {
  it('passes the label text, side and shape values through', () => {
    const l = label('hello');
    l.setProperty(LabelSide.LABEL_SIDE, LabelSide.BELOW);
    const adapter = LGraphAdapters.adapt(l);
    expect(adapter.getText()).toBe('hello');
    expect(adapter.getSide()).toBe(LabelSide.BELOW);
    adapter.setSize(new KVector(SOME_X, SOME_Y));
    adapter.setPosition(new KVector(SOME_Y, SOME_X));
    expect([l.getSize().x, l.getSize().y, l.getPosition().x, l.getPosition().y]).toEqual([
      SOME_X,
      SOME_Y,
      SOME_Y,
      SOME_X,
    ]);
  });

  it('adapts the labels of an edge and caches the list', () => {
    const { a, b } = layeredGraph();
    const edge = connect(addPort(a), addPort(b));
    edge.getLabels().push(label('e1'), label('e2'));
    const [portAdapter] = toArray(LGraphAdapters.adapt(a, false).getPorts()) as LPortAdapter[];
    const [edgeAdapter] = toArray(portAdapter!.getOutgoingEdges()) as LEdgeAdapter[];
    expect(toArray(edgeAdapter!.getLabels()).map((l) => (l as LLabelAdapter).getText())).toEqual(['e1', 'e2']);
    expect(edgeAdapter!.getLabels()).toBe(edgeAdapter!.getLabels());
  });
});
