// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { adapterScenario, namesOf, scenarioNames } from '../../../../test/helpers/lgraph-site-adapters.js';
import { nodeAt, portAt, xy } from '../../../../test/helpers/lgraph-site-shapes.js';
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import { LGraphAdapters } from './LGraphAdapters.js';
import { LPort } from './LPort.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';

/**
 * Cases anchored on the `site/lgraphAdapters/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10). The
 * scenario (test/helpers/lgraph-site-adapters.ts) is the recorder's: layers L0 (A, D) and L1 (B, X), A a compound node
 * with eight ports and labels, D the north/south port dummy of A's port pn1, C1-C3 the comment nodes of A.
 */
function fixture() {
  const s = adapterScenario();
  const names = scenarioNames(s);
  const named = (items: Iterable<object>): string[] => namesOf(items, names);
  return { s, named };
}

const sidesOf = (s: ElkMargin | ElkPadding): number[] => [s.getTop(), s.getRight(), s.getBottom(), s.getLeft()];

describe('LGraphAdapter (oracle rows)', () => {
  // oracle: site/lgraphAdapters/graph-adapter; LGraphAdapters.java:206-316 (LGraphAdapter)
  it('adapts the layered nodes and passes size, volatile id and properties through', () => {
    const { s, named } = fixture();
    const ga = LGraphAdapters.adapt(s.g0);
    expect(named(ga.getNodes())).toEqual(['A', 'D', 'B', 'X']);
    expect(xy(ga.getSize())).toEqual([0, 0]);
    ga.setSize(new KVector(70, 50));
    expect(xy(ga.getSize())).toEqual([70, 50]);
    expect(xy(s.g0.getSize())).toEqual([70, 50]);
    expect(ga.getVolatileId()).toBe(0);
    ga.setVolatileId(7);
    expect(ga.getVolatileId()).toBe(7);
    expect(s.g0.id).toBe(7);
    expect(ga.hasProperty(CoreOptions.DIRECTION)).toBe(false);
    expect(ga.getProperty(CoreOptions.DIRECTION).name()).toBe('UNDEFINED');
    expect(() => ga.getPosition()).toThrow(UnsupportedOperationException);
    expect(() => ga.getPosition()).toThrow('Not supported by LGraph');
    expect(() => ga.setPosition(new KVector(1, 2))).toThrow(UnsupportedOperationException);
    expect(() => ga.setPosition(new KVector(1, 2))).toThrow('Not supported by LGraph');
  });

  // oracle: site/lgraphAdapters/graph-adapter-transparent; LGraphAdapters.java:79
  it('a transparent north/south edge adapter shows the same nodes', () => {
    const { s, named } = fixture();
    expect(named(LGraphAdapters.adapt(s.g0, true).getNodes())).toEqual(['A', 'D', 'B', 'X']);
  });

  // [transparentNorthSouthEdges, transparentCommentNodes, nodes under "all", under "normal", under "none"]
  const FILTER_ROWS: [boolean, boolean, string[], string[], string[]][] = [
    [false, false, ['A', 'D', 'B', 'X'], ['A', 'B', 'X'], []],
    [false, true, ['A', 'C1', 'C2', 'C3', 'D', 'B', 'X'], ['A', 'C1', 'C2', 'C3', 'B', 'X'], []],
    [true, false, ['A', 'D', 'B', 'X'], ['A', 'B', 'X'], []],
    [true, true, ['A', 'C1', 'C2', 'C3', 'D', 'B', 'X'], ['A', 'C1', 'C2', 'C3', 'B', 'X'], []],
  ];

  // oracle: site/lgraphAdapters/graph-adapter-filter-{all,normal,none}; LGraphAdapters.java:275-304
  it.each(FILTER_ROWS)(
    'nodes with transparent N/S edges %s and comments %s: the top and bottom comments follow their node',
    (northSouth, comments, all, normal, none) => {
      const { s, named } = fixture();
      const nodes = (filter: (n: LNode) => boolean): string[] =>
        named(LGraphAdapters.adapt(s.g0, northSouth, comments, filter).getNodes());
      expect(nodes(() => true)).toEqual(all);
      expect(nodes((n) => n.getType() === NodeType.NORMAL)).toEqual(normal);
      expect(nodes(() => false)).toEqual(none);
    },
  );
});

describe('LNodeAdapter (oracle rows)', () => {
  // per node of the adapted graph (comments transparent): size, margin, padding, compound, ports, labels
  const NODES: [
    string,
    [number, number],
    [number, number, number, number],
    [number, number, number, number],
    boolean,
    string[],
    string[],
  ][] = [
    [
      'A',
      [60, 40],
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      true,
      ['pn1', 'pn2', 'pe1', 'pe2', 'ps1', 'ps2', 'pw1', 'pw2'],
      ['A.l'],
    ],
    ['C1', [20, 8], [0, 0, 0, 0], [0, 0, 0, 0], false, [], []],
    ['C2', [21, 9], [0, 0, 0, 0], [0, 0, 0, 0], false, [], []],
    ['C3', [22, 10], [0, 0, 0, 0], [0, 0, 0, 0], false, [], []],
    ['D', [2, 2], [0, 0, 0, 0], [0, 0, 0, 0], false, ['D.in', 'D.out'], []],
    ['B', [30, 20], [0, 0, 0, 0], [0, 0, 0, 0], false, ['B.w', 'B.e'], []],
    ['X', [10, 10], [0, 0, 0, 0], [0, 0, 0, 0], false, ['X.out', 'X.in'], []],
  ];

  // oracle: site/lgraphAdapters/node-adapters; LGraphAdapters.java:319-436 (LNodeAdapter)
  it('every node adapter passes the node values through and has no directly connected edges', () => {
    const { s, named } = fixture();
    const ga = LGraphAdapters.adapt(s.g0, true, true, () => true);
    const adapters = [...ga.getNodes()];
    expect(named(adapters)).toEqual(NODES.map(([name]) => name));
    adapters.forEach((adapter, i) => {
      const [, size, margin, padding, compound, ports, labels] = NODES[i]!;
      expect(xy(adapter.getSize())).toEqual(size);
      expect(xy(adapter.getPosition())).toEqual([0, 0]);
      expect(adapter.getVolatileId()).toBe(0);
      expect(sidesOf(adapter.getMargin())).toEqual(margin);
      expect(sidesOf(adapter.getPadding())).toEqual(padding);
      expect(adapter.isCompoundNode()).toBe(compound);
      expect(adapter.getGraph()).toBe(ga);
      expect(named(adapter.getPorts())).toEqual(ports);
      expect(named(adapter.getLabels())).toEqual(labels);
      expect([...adapter.getIncomingEdges()]).toEqual([]);
      expect([...adapter.getOutgoingEdges()]).toEqual([]);
    });
  });

  // oracle: site/lgraphAdapters/node-adapters (A.after); LGraphAdapters.java:409-436
  it('size, position, margin, padding and volatile id set through the adapter reach the node', () => {
    const { s } = fixture();
    const adapter = [...LGraphAdapters.adapt(s.g0, true, true, () => true).getNodes()][0]!;
    adapter.setSize(new KVector(80, 45));
    adapter.setPosition(new KVector(11, 12));
    adapter.setMargin(new ElkMargin(9, 8, 7, 6));
    adapter.setPadding(new ElkPadding(1, 2, 3, 4));
    adapter.setVolatileId(42);
    expect(xy(s.a.getPosition())).toEqual([11, 12]);
    expect(xy(s.a.getSize())).toEqual([80, 45]);
    expect(sidesOf(s.a.getPadding())).toEqual([1, 2, 3, 4]);
    expect(sidesOf(s.a.getMargin())).toEqual([9, 8, 7, 6]);
    expect(s.a.id).toBe(42);
    expect(adapter.hasProperty(CoreOptions.DIRECTION)).toBe(false);
  });

  // oracle: site/lgraphAdapters/node-adapter-standalone; LGraphAdapters.java:121
  it('a standalone node adapter has no parent graph adapter but adapts its ports', () => {
    const { s, named } = fixture();
    const standalone = LGraphAdapters.adapt(s.a, true);
    expect(named([standalone])).toEqual(['A']);
    expect(standalone.getGraph()).toBeNull();
    expect(named(standalone.getPorts())).toEqual(['pn1', 'pn2', 'pe1', 'pe2', 'ps1', 'ps2', 'pw1', 'pw2']);
    expect(LGraphAdapters.adapt(s.b, false).getGraph()).toBeNull();
  });
});

describe('LPortAdapter (oracle rows)', () => {
  // [side, hasCompoundConnections, label, incoming edges, outgoing edges] per port of A, plain and transparent
  const PLAIN: [string, boolean, string, string[], string[]][] = [
    ['NORTH', false, 'pn1.l', [], []],
    ['NORTH', false, 'pn2.l', [], []],
    ['EAST', false, 'pe1.l', [], ['eAB']],
    ['EAST', false, 'pe2.l', [], []],
    ['SOUTH', false, 'ps1.l', [], []],
    ['SOUTH', false, 'ps2.l', [], []],
    ['WEST', true, 'pw1.l', ['eBA'], []],
    ['WEST', false, 'pw2.l', [], []],
  ];

  function checkPorts(transparent: boolean, expected: typeof PLAIN, dummyIncoming: string[]): void {
    const { s, named } = fixture();
    const [aAdapter, dAdapter] = [...LGraphAdapters.adapt(s.g0, transparent, false, () => true).getNodes()];
    expect(named([aAdapter!, dAdapter!])).toEqual(['A', 'D']);
    [...aAdapter!.getPorts()].forEach((port, i) => {
      const [side, compound, label, incoming, outgoing] = expected[i]!;
      expect(port.getSide().name()).toBe(side);
      expect(port.hasCompoundConnections()).toBe(compound);
      expect(named(port.getLabels())).toEqual([label]);
      expect(named(port.getIncomingEdges())).toEqual(incoming);
      expect(named(port.getOutgoingEdges())).toEqual(outgoing);
    });
    const dummyPort = [...dAdapter!.getPorts()][0]!;
    expect(named(dummyPort.getIncomingEdges())).toEqual(dummyIncoming);
  }

  // oracle: site/lgraphAdapters/port-adapters-plain; LGraphAdapters.java:440-566 (LPortAdapter)
  it('plain port adapters see their own edges; the port dummy keeps its incoming edge', () => {
    checkPorts(false, PLAIN, ['eXD']);
  });

  // oracle: site/lgraphAdapters/port-adapters-transparent; LGraphAdapters.java:380-440 (port dummy edges)
  it('transparent port adapters show the port dummy edges at pn1 and hide them at the dummy', () => {
    const transparent = PLAIN.map((row): typeof row => [...row]);
    transparent[0] = ['NORTH', false, 'pn1.l', ['eXD'], ['eDX']];
    checkPorts(true, transparent, []);
  });
});

describe('port, label and edge adapters (oracle rows)', () => {
  // oracle: site/lgraphAdapters/port-adapters-plain (pn1.after); LGraphAdapters.java:485-497
  it('margin, position and size set through a port adapter reach the port', () => {
    const { s } = fixture();
    const port = [...[...LGraphAdapters.adapt(s.g0).getNodes()][0]!.getPorts()][0]!;
    port.setMargin(new ElkMargin(1, 2, 3, 4));
    port.setPosition(new KVector(5, 6));
    port.setSize(new KVector(7, 8));
    expect([xy(s.aPorts.pn1.getPosition()), xy(s.aPorts.pn1.getSize())]).toEqual([
      [5, 6],
      [7, 8],
    ]);
    expect(sidesOf(s.aPorts.pn1.getMargin())).toEqual([1, 2, 3, 4]);
    expect(s.aPorts.pn1.getAnchor().x).toBe(4);
  });

  // oracle: site/lgraphAdapters/label-and-edge-adapters; LGraphAdapters.java:569-625
  it('label adapters pass text, side and shape through; edge adapters adapt the edge labels', () => {
    const { s, named } = fixture();
    const nodeAdapter = [...LGraphAdapters.adapt(s.g0).getNodes()][0]!;
    const [pa0, , pa2] = [...nodeAdapter.getPorts()];
    const nodeLabel = [...nodeAdapter.getLabels()][0]!;
    const portLabel = [...pa0!.getLabels()][0]!;
    expect([nodeLabel.getText(), nodeLabel.getSide(), xy(nodeLabel.getSize()), xy(nodeLabel.getPosition())]).toEqual([
      'node A',
      LabelSide.ABOVE,
      [30, 12],
      [3, 4],
    ]);
    expect([portLabel.getText(), portLabel.getSide(), xy(portLabel.getSize()), xy(portLabel.getPosition())]).toEqual([
      'port pn1',
      LabelSide.UNKNOWN,
      [20, 10],
      [1, 2],
    ]);
    expect(named([nodeLabel, portLabel])).toEqual(['A.l', 'pn1.l']);
    nodeLabel.setSize(new KVector(31, 13));
    nodeLabel.setPosition(new KVector(4, 5));
    expect([xy(s.aLabel.getSize()), xy(s.aLabel.getPosition())]).toEqual([
      [31, 13],
      [4, 5],
    ]);
    const loose = LGraphAdapters.adapt(s.portLabels.pn2!);
    expect([loose.getText(), loose.getSide(), loose.hasProperty(LabelSide.LABEL_SIDE)]).toEqual([
      'port pn2',
      LabelSide.UNKNOWN,
      false,
    ]);
    const edge = [...pa2!.getOutgoingEdges()][0]!;
    expect(named([edge])).toEqual(['eAB']);
    const edgeLabel = [...edge.getLabels()][0]!;
    expect(named([edgeLabel])).toEqual(['eAB.l']);
    expect([edgeLabel.getText(), edgeLabel.getSide()]).toEqual(['edge', LabelSide.BELOW]);
  });
});

describe('sortPortList and the port comparator (oracle rows)', () => {
  // [name, side, x, y, PORT_INDEX or null] in creation order
  const SORT_PORTS: [string, PortSide, number, number, number | null][] = [
    ['s2', PortSide.SOUTH, 40, 0, null],
    ['w2', PortSide.WEST, 0, 30, null],
    ['n1', PortSide.NORTH, 30, 0, null],
    ['e1', PortSide.EAST, 0, 5, null],
    ['s1', PortSide.SOUTH, 10, 0, null],
    ['e2', PortSide.EAST, 0, 20, null],
    ['w1', PortSide.WEST, 0, 5, null],
    ['n2', PortSide.NORTH, 5, 0, null],
    ['i1', PortSide.EAST, 0, 50, 1],
    ['i0', PortSide.EAST, 0, 60, 0],
    ['i1b', PortSide.EAST, 0, 10, 1],
  ];
  const CREATION_ORDER = SORT_PORTS.map(([name]) => name);
  const CLOCKWISE_ORDER = ['n2', 'n1', 'e1', 'e2', 'i0', 'i1b', 'i1', 's2', 's1', 'w2', 'w1'];

  function sortedOrder(constraints: PortConstraints): string[] {
    const graph = new LGraph();
    const node = nodeAt(graph, 0, 0, 50, 50);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
    const byPort = new Map<LPort, string>();
    for (const [name, side, x, y, index] of SORT_PORTS) {
      const port = portAt(node, side, x, y, 2, 2);
      if (index !== null) {
        port.setProperty(LayeredOptions.PORT_INDEX, index);
      }
      byPort.set(port, name);
    }
    LGraphAdapters.adapt(node, false).sortPortList();
    return node.getPorts().map((p) => byPort.get(p)!);
  }

  // oracle: site/lgraphAdapters/sortPortList; LGraphAdapters.java:390-402
  it.each([
    [PortConstraints.FIXED_ORDER, CLOCKWISE_ORDER],
    [PortConstraints.FIXED_POS, CLOCKWISE_ORDER],
    [PortConstraints.FREE, CREATION_ORDER],
    [PortConstraints.FIXED_SIDE, CREATION_ORDER],
  ])('with %s the default sorter leaves the ports in the order %j', (constraints, order) => {
    expect(sortedOrder(constraints)).toEqual(order);
  });

  // oracle: site/lgraphAdapters/sortPortList (U.sort); LGraphAdapters.java:639
  it('sorting ports of an undefined side throws IllegalStateException', () => {
    const node = addNode(new LGraph());
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    for (let i = 0; i < 2; i++) {
      const port = new LPort();
      port.setNode(node);
    }
    const adapter = LGraphAdapters.adapt(node, false);
    expect(() => adapter.sortPortList()).toThrow(IllegalStateException);
    expect(() => adapter.sortPortList()).toThrow('Port side is undefined');
  });

  // [name, side, x, y, PORT_INDEX or null] of the comparator row
  const COMPARE_PORTS: [string, PortSide, number, number, number | null][] = [
    ['n1', PortSide.NORTH, 10, 0, null],
    ['n2', PortSide.NORTH, 30, 0, null],
    ['e1', PortSide.EAST, 0, 10, null],
    ['e2', PortSide.EAST, 0, 30, null],
    ['s1', PortSide.SOUTH, 10, 0, null],
    ['s2', PortSide.SOUTH, 30, 0, null],
    ['w1', PortSide.WEST, 0, 10, null],
    ['w2', PortSide.WEST, 0, 30, null],
    ['i1', PortSide.EAST, 0, 50, 1],
    ['i2', PortSide.EAST, 0, 5, 2],
    ['i3', PortSide.EAST, 0, 7, 2],
  ];

  // oracle: site/lgraphAdapters/portComparator; LGraphAdapters.java:637-700 (PortComparator)
  it.each([
    ['n1', 'n2', -1],
    ['n2', 'n1', 1],
    ['n1', 'n1', 0],
    ['e1', 'e2', -1],
    ['e2', 'e1', 1],
    ['s1', 's2', 1],
    ['s2', 's1', -1],
    ['w1', 'w2', 1],
    ['w2', 'w1', -1],
    ['n1', 'e1', -1],
    ['e1', 'n1', 1],
    ['w1', 's1', 1],
    ['i1', 'i2', -1],
    ['i2', 'i1', 1],
    ['i2', 'i3', -1],
    ['i1', 'e1', 1],
    ['e1', 'i1', -1],
    ['u1', 'n1', -1],
    ['n1', 'u1', 1],
  ])('compare(%s, %s) is %i', (first, second, expected) => {
    const node = nodeAt(new LGraph(), 0, 0, 50, 50);
    const ports = new Map<string, LPort>();
    for (const [name, side, x, y, index] of COMPARE_PORTS) {
      const port = portAt(node, side, x, y);
      if (index !== null) {
        port.setProperty(LayeredOptions.PORT_INDEX, index);
      }
      ports.set(name, port);
    }
    const undefinedSide = new LPort();
    undefinedSide.setNode(node);
    ports.set('u1', undefinedSide);
    expect(LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(ports.get(first)!, ports.get(second)!)).toBe(expected);
  });

  it('compare(u1, u2) of two ports of undefined side throws IllegalStateException', () => {
    const node = nodeAt(new LGraph(), 0, 0, 50, 50);
    const [u1, u2] = [new LPort(), new LPort()];
    u1.setNode(node);
    u2.setNode(node);
    // oracle: site/lgraphAdapters/portComparator (compare.u1.u2); LGraphAdapters.java:639
    expect(() => LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(u1, u2)).toThrow(IllegalStateException);
    expect(() => LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(u1, u2)).toThrow('Port side is undefined');
  });
});
