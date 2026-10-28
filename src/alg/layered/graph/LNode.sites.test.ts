// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import {
  portName,
  portsScenario,
  type PortsScenario,
  SCENARIO_KINDS,
  SCENARIO_SIDES,
  type PortKind,
} from '../../../../test/helpers/lgraph-site-lnode.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { LEdge } from './LEdge.js';
import { LGraph } from './LGraph.js';
import { LLabel } from './LLabel.js';
import { LNode } from './LNode.js';
import type { LPort } from './LPort.js';
import { NodeType } from './LNodeNodeType.js';

/**
 * Cases anchored on the `site/lnode/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10). The scenarios
 * are built here with the TS API; the literals are the row values.
 */
describe('LNode.setLayer (oracle row)', () => {
  // oracle: site/lnode/setLayer; LNode.java:133, 182
  it('moves a node between layers, appends, inserts at an index and rejects a bad index', () => {
    const graph = new LGraph();
    const [l0, l1] = [addLayer(graph), addLayer(graph)] as const;
    const [n, m, o] = [new LNode(graph), new LNode(graph), new LNode(graph)] as const;
    const nodes = (): [LNode[], LNode[]] => [[...l0.getNodes()], [...l1.getNodes()]];

    n.setLayer(l0);
    expect(nodes()).toEqual([[n], []]);
    expect(n.getIndex()).toBe(0);
    n.setLayer(l1);
    expect(nodes()).toEqual([[], [n]]);
    m.setLayer(l1);
    o.setLayer(l1);
    expect(o.getIndex()).toBe(2);
    n.setLayer(l1);
    expect(nodes()).toEqual([[], [m, o, n]]);
    expect(n.getIndex()).toBe(2);
    n.setLayer(null);
    expect(nodes()).toEqual([[], [m, o]]);
    expect(n.getLayer()).toBeNull();
    expect(n.getIndex()).toBe(-1);

    n.setLayer(0, l1);
    expect(nodes()).toEqual([[], [n, m, o]]);
    o.setLayer(0, l0);
    expect(nodes()).toEqual([[o], [n, m]]);
    m.setLayer(1, l1);
    expect(nodes()).toEqual([[o], [n, m]]);
    expect(() => m.setLayer(9, l0)).toThrow(IllegalArgumentException);
    expect(() => m.setLayer(9, l0)).toThrow('index must be >= 0 and <= layer node count');
    expect(() => m.setLayer(-1, l0)).toThrow(IllegalArgumentException);
    expect(nodes()).toEqual([[o], [n, m]]);
    n.setLayer(7, null);
    expect(nodes()).toEqual([[o], [m]]);
    expect(n.getLayer()).toBeNull();
  });
});

describe('LNode port and edge queries (oracle rows)', () => {
  const names = (s: PortsScenario, items: Iterable<LPort | LEdge>): string[] => [...items].map(s.nameOf);

  function expectedPorts(sides: readonly PortSide[], kinds: readonly PortKind[]): string[] {
    return sides.flatMap((side) => kinds.map((kind) => portName(side, kind)));
  }

  // oracle: site/lnode/getPorts; LNode.java:233-320
  it('getPorts filters by type, side, and both: an undefined type or side matches nothing', () => {
    const s = portsScenario();
    expect(names(s, s.n.getPorts())).toEqual(expectedPorts(SCENARIO_SIDES, SCENARIO_KINDS));
    expect(names(s, s.n.getPorts(PortType.INPUT))).toEqual(expectedPorts(SCENARIO_SIDES, ['in', 'both']));
    expect(names(s, s.n.getPorts(PortType.OUTPUT))).toEqual(expectedPorts(SCENARIO_SIDES, ['out', 'both']));
    expect(names(s, s.n.getPorts(PortType.UNDEFINED))).toEqual([]);
    expect(names(s, s.n.getPorts(PortSide.UNDEFINED))).toEqual([]);
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
      expect(names(s, s.n.getPorts(side))).toEqual(expectedPorts([side], SCENARIO_KINDS));
      expect(names(s, s.n.getPorts(PortType.INPUT, side))).toEqual(expectedPorts([side], ['in', 'both']));
      expect(names(s, s.n.getPorts(PortType.OUTPUT, side))).toEqual(expectedPorts([side], ['out', 'both']));
      expect(names(s, s.n.getPorts(PortType.UNDEFINED, side))).toEqual([]);
    }
    for (const type of [PortType.INPUT, PortType.OUTPUT, PortType.UNDEFINED]) {
      expect(names(s, s.n.getPorts(type, PortSide.UNDEFINED))).toEqual([]);
    }
  });

  // oracle: site/lnode/edgeIterables; LNode.java:340-380
  it('the edge iterables follow the port order; connected edges list incoming before outgoing per port', () => {
    const s = portsScenario();
    const sides = SCENARIO_SIDES.map((side) => side.name().toLowerCase());
    expect(names(s, s.n.getIncomingEdges())).toEqual(sides.flatMap((x) => [`e.${x}.in.in`, `e.${x}.both.in`]));
    expect(names(s, s.n.getOutgoingEdges())).toEqual(sides.flatMap((x) => [`e.${x}.out.out`, `e.${x}.both.out`]));
    expect(names(s, s.n.getConnectedEdges())).toEqual(
      sides.flatMap((x) => [`e.${x}.in.in`, `e.${x}.out.out`, `e.${x}.both.in`, `e.${x}.both.out`]),
    );
    const empty = addNode(s.graph);
    expect([...empty.getIncomingEdges()]).toEqual([]);
    expect([...empty.getOutgoingEdges()]).toEqual([]);
    expect([...empty.getConnectedEdges()]).toEqual([]);
  });
});

describe('LNode.getPortSideView (oracle row)', () => {
  /** A node with one port per entry of `sides`, in this order. */
  function nodeWith(sides: PortSide[]): { node: LNode; ports: LPort[] } {
    const node = addNode(new LGraph());
    return { node, ports: sides.map((side) => addPort(node, side)) };
  }

  // oracle: site/lnode/portSideView (v0-v6 part); LNode.java:287, 410-445
  it('shows the ports of one side before and after caching, and writes through to the port list', () => {
    const { node, ports } = nodeWith([
      PortSide.NORTH,
      PortSide.NORTH,
      PortSide.EAST,
      PortSide.SOUTH,
      PortSide.SOUTH,
      PortSide.SOUTH,
      PortSide.WEST,
    ]);
    const [v0, v1, v2, v3, v4, v5, v6] = ports as [LPort, LPort, LPort, LPort, LPort, LPort, LPort];
    const sideViews = (): Record<string, LPort[]> =>
      Object.fromEntries(SCENARIO_SIDES.map((side) => [side.name(), [...node.getPortSideView(side)]]));
    const expected = { UNDEFINED: [], NORTH: [v0, v1], EAST: [v2], SOUTH: [v3, v4, v5], WEST: [v6] };
    expect(sideViews()).toEqual(expected);
    expect(node.getPortSideView(PortSide.SOUTH).length).toBe(3);
    expect(node.getPortSideView(PortSide.SOUTH)[1]).toBe(v4);
    node.cachePortSides();
    expect(sideViews()).toEqual(expected);
    expect(node.getPortSideView(PortSide.NORTH)[0]).toBe(v0);
    // List.get / List.set outside the view are IndexOutOfBoundsException with the JDK 21 text
    expect(() => node.getPortSideView(PortSide.NORTH)[2]).toThrow(IndexOutOfBoundsException);
    expect(() => node.getPortSideView(PortSide.NORTH)[2]).toThrow('Index 2 out of bounds for length 2');
    expect(() => node.getPortSideView(PortSide.SOUTH)[-1]).toThrow('Index -1 out of bounds for length 3');
    expect(() => (node.getPortSideView(PortSide.NORTH)[5] = v3)).toThrow('Index 5 out of bounds for length 2');

    const south = node.getPortSideView(PortSide.SOUTH);
    const replaced = south[0];
    south[0] = v6;
    expect(replaced).toBe(v3);
    expect(node.getPorts()).toEqual([v0, v1, v2, v6, v4, v5, v6]);
    expect([...node.getPortSideView(PortSide.SOUTH)]).toEqual([v6, v4, v5]);
    const north = node.getPortSideView(PortSide.NORTH);
    const replacedNorth = north[1];
    north[1] = v3;
    expect(replacedNorth).toBe(v1);
    expect(node.getPorts()).toEqual([v0, v3, v2, v6, v4, v5, v6]);
  });

  // oracle: site/lnode/portSideView (one, none and stale part); LNode.java:287
  it('a node with one side, a node without ports, and a cache that does not see a later port', () => {
    const one = nodeWith([PortSide.EAST, PortSide.EAST]);
    const [one0, one1] = one.ports as [LPort, LPort];
    expect([...one.node.getPortSideView(PortSide.EAST)]).toEqual([one0, one1]);
    expect([...one.node.getPortSideView(PortSide.NORTH)]).toEqual([]);
    one.node.cachePortSides();
    expect([...one.node.getPortSideView(PortSide.EAST)]).toEqual([one0, one1]);
    expect([...one.node.getPortSideView(PortSide.WEST)]).toEqual([]);

    const none = addNode(new LGraph());
    for (const side of SCENARIO_SIDES) {
      expect(none.getPortSideView(side)).toEqual([]);
    }
    none.cachePortSides();
    for (const side of SCENARIO_SIDES) {
      expect(none.getPortSideView(side)).toEqual([]);
    }

    addPort(one.node, PortSide.WEST);
    expect([...one.node.getPortSideView(PortSide.WEST)]).toEqual([]);
    expect([...one.node.getPortSideView(PortSide.EAST)]).toEqual([one0, one1]);
  });
});

describe('LNode index, graph, inline labels and strings (oracle rows)', () => {
  // oracle: site/lnode/getIndex; LNode.java:447
  it('getIndex is the position in the layer, or -1 without a layer', () => {
    const graph = new LGraph();
    const [l0, l1] = [addLayer(graph), addLayer(graph)] as const;
    const [n, m] = [new LNode(graph), new LNode(graph)] as const;
    expect(n.getIndex()).toBe(-1);
    m.setLayer(l0);
    n.setLayer(l0);
    expect([n.getIndex(), m.getIndex()]).toEqual([1, 0]);
    m.setLayer(l1);
    expect([n.getIndex(), m.getIndex()]).toEqual([0, 0]);
  });

  // oracle: site/lnode/getGraph; LNode.java:150
  it('getGraph prefers the node own graph, else the graph of its layer, else null', () => {
    const g0 = new LGraph();
    const l0 = addLayer(g0);
    const l1 = addLayer(g0);
    const g1 = new LGraph();
    const loose = new LNode(null);
    const withGraph = new LNode(g0);
    const otherGraph = new LNode(g1);
    const layered = new LNode(null);
    layered.setLayer(l0);
    const both = new LNode(g1);
    both.setLayer(l1);
    expect([loose, withGraph, otherGraph, layered, both].map((n) => n.getGraph())).toEqual([null, g0, g1, g0, g1]);
  });

  // oracle: site/lnode/isInlineEdgeLabel; LNode.java:554
  it('isInlineEdgeLabel needs the LABEL type and only inline represented labels', () => {
    const graph = new LGraph();
    const inline1 = new LLabel('a');
    inline1.setProperty(LayeredOptions.EDGE_LABELS_INLINE, true);
    const inline2 = new LLabel('b');
    inline2.setProperty(LayeredOptions.EDGE_LABELS_INLINE, true);
    const outside = new LLabel('c');
    const labelNode = (labels: LLabel[]): LNode => {
      const node = addNode(graph);
      node.setType(NodeType.LABEL);
      node.setProperty(InternalProperties.REPRESENTED_LABELS, labels);
      return node;
    };
    const normal = addNode(graph);
    normal.setProperty(InternalProperties.REPRESENTED_LABELS, [inline1]);
    expect(normal.isInlineEdgeLabel()).toBe(false);
    expect(labelNode([inline1, inline2]).isInlineEdgeLabel()).toBe(true);
    expect(labelNode([inline1, outside]).isInlineEdgeLabel()).toBe(false);
    expect(labelNode([outside]).isInlineEdgeLabel()).toBe(false);
    expect(labelNode([]).isInlineEdgeLabel()).toBe(true);
  });

  // oracle: site/lnode/strings; LNode.java:537, 560 (index, label text, type prefix)
  it.each([
    [NodeType.NORMAL, 'n', 0],
    [NodeType.LONG_EDGE, 'n(long_edge)', 1],
    [NodeType.EXTERNAL_PORT, 'n(external_port)', 2],
    [NodeType.NORTH_SOUTH_PORT, 'n(north_south_port)', 3],
    [NodeType.LABEL, 'n(label)', 4],
    [NodeType.BREAKING_POINT, 'n(breaking_point)', 5],
    [NodeType.PLACEHOLDER, 'n(placeholder)', 6],
    [NodeType.NONSHIFTING_PLACEHOLDER, 'n(nonshifting_placeholder)', 7],
  ])('a %s node prints %s_-1 without a layer and %s_<index> in layer L0', (type, prefix, index) => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    // earlier types occupy the first positions of the layer, as in the recorded sequence
    for (let i = 0; i < index; i++) {
      new LNode(graph).setLayer(layer);
    }
    const node = new LNode(graph);
    node.setType(type);
    expect(node.getType()).toBe(type);
    expect(node.toString()).toBe(`${prefix}_-1`);
    expect(node.getDesignation()).toBe('-1');
    node.setLayer(layer);
    expect(node.toString()).toBe(`${prefix}_${index}`);
    expect(node.getDesignation()).toBe(String(index));
  });

  // oracle: site/lnode/strings (labelled, emptyLabelled, nullLabelled); LNode.java:537
  it('the first label text designates the node unless it is empty or null', () => {
    const graph = new LGraph();
    const labelled = new LNode(graph);
    labelled.getLabels().push(new LLabel('caption'));
    expect([labelled.toString(), labelled.getDesignation()]).toEqual(['n_caption', 'caption']);
    const emptyLabelled = new LNode(graph);
    emptyLabelled.getLabels().push(new LLabel(''));
    expect(emptyLabelled.toString()).toBe('n_-1');
    const nullLabelled = new LNode(graph);
    // Java's LLabel(String) accepts null, which Guava's isNullOrEmpty treats like ""
    nullLabelled.getLabels().push(new LLabel(null as unknown as string));
    expect(nullLabelled.toString()).toBe('n_-1');
  });
});
