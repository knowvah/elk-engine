// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { IndividualSpacings } from '../../../core/util/IndividualSpacings.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { LGraph } from '../graph/LGraph.js';
import { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { LayeredOptions } from './LayeredOptions.js';
import { Spacings } from './Spacings.js';
import { UnspecifiedSpacingException } from './SpacingsUnspecifiedSpacingException.js';

/**
 * Replays of the `site/spacings/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10): the graph has
 * ten spacing options set to the distinct values 11 to 20; per node type one plain node (`t.<TYPE>`) and one node
 * carrying an individual-spacings override (`o.<TYPE>`). A table label `<a>.<b>.<T1>.<T2>` is the pair of nodes of
 * types T1 and T2, each plain (`plain`) or overridden (`over`); a label `<T1>.<T2>` is a type pair.
 */
beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const GRAPH_VALUES: [IProperty<number>, number][] = [
  [LayeredOptions.SPACING_NODE_NODE, 11],
  [LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 12],
  [LayeredOptions.SPACING_EDGE_NODE, 13],
  [LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS, 14],
  [LayeredOptions.SPACING_EDGE_EDGE, 15],
  [LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS, 16],
  [LayeredOptions.SPACING_LABEL_NODE, 17],
  [LayeredOptions.SPACING_PORT_PORT, 18],
  [LayeredOptions.SPACING_LABEL_PORT_VERTICAL, 19],
  [LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL, 20],
];

const OVERRIDES: [IProperty<number>, number][] = [
  [LayeredOptions.SPACING_NODE_NODE, 101],
  [LayeredOptions.SPACING_EDGE_EDGE, 102],
  [LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS, 103],
];

interface Fixture {
  readonly graph: LGraph;
  readonly spacings: Spacings;
  readonly nodes: Map<string, LNode>;
}

function individual(values: [IProperty<number>, number][]): IndividualSpacings {
  const result = new IndividualSpacings();
  for (const [property, value] of values) {
    result.setProperty(property, value);
  }
  return result;
}

function fixture(): Fixture {
  const graph = new LGraph();
  for (const [property, value] of GRAPH_VALUES) {
    graph.setProperty(property, value);
  }
  const nodes = new Map<string, LNode>();
  for (const type of NodeType.values()) {
    const plain = new LNode(graph);
    plain.setType(type);
    nodes.set(`t.${type.name()}`, plain);
    const over = new LNode(graph);
    over.setType(type);
    over.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual(OVERRIDES));
    nodes.set(`o.${type.name()}`, over);
  }
  return { graph, spacings: new Spacings(graph), nodes };
}

function pair(f: Fixture, label: string): [LNode, LNode] {
  const [a, b, t1, t2] = label.split('.') as [string, string, string, string];
  const prefix = (kind: string): string => (kind === 'over' ? 'o' : 't');
  return [f.nodes.get(`${prefix(a)}.${t1}`)!, f.nodes.get(`${prefix(b)}.${t2}`)!];
}

function types(label: string): [NodeType, NodeType] {
  const [t1, t2] = label.split('.') as [string, string];
  return [NodeType.valueOf(t1), NodeType.valueOf(t2)];
}

// oracle: site/spacings/horizontal-nodes; Spacings.java:173
const HORIZONTAL_NODES: [string, number][] = [
  ['plain.plain.NORMAL.NORMAL', 12],
  ['over.plain.NORMAL.NORMAL', 12],
  ['plain.over.NORMAL.NORMAL', 12],
  ['over.over.NORMAL.NORMAL', 12],
  ['plain.plain.NORMAL.LONG_EDGE', 14],
  ['over.plain.NORMAL.LONG_EDGE', 103],
  ['plain.over.NORMAL.LONG_EDGE', 103],
  ['over.over.NORMAL.LONG_EDGE', 103],
  ['plain.plain.NORMAL.LABEL', 12],
  ['over.plain.NORMAL.LABEL', 12],
  ['plain.over.NORMAL.LABEL', 12],
  ['over.over.NORMAL.LABEL', 12],
  ['plain.plain.NORMAL.BREAKING_POINT', 14],
  ['over.plain.NORMAL.BREAKING_POINT', 103],
  ['plain.over.NORMAL.BREAKING_POINT', 103],
  ['over.over.NORMAL.BREAKING_POINT', 103],
  ['plain.plain.LONG_EDGE.NORMAL', 14],
  ['over.plain.LONG_EDGE.NORMAL', 103],
  ['plain.over.LONG_EDGE.NORMAL', 103],
  ['over.over.LONG_EDGE.NORMAL', 103],
  ['plain.plain.LONG_EDGE.LONG_EDGE', 16],
  ['over.plain.LONG_EDGE.LONG_EDGE', 16],
  ['plain.over.LONG_EDGE.LONG_EDGE', 16],
  ['over.over.LONG_EDGE.LONG_EDGE', 16],
  ['plain.plain.LONG_EDGE.LABEL', 14],
  ['over.plain.LONG_EDGE.LABEL', 103],
  ['plain.over.LONG_EDGE.LABEL', 103],
  ['over.over.LONG_EDGE.LABEL', 103],
  ['plain.plain.LONG_EDGE.BREAKING_POINT', 14],
  ['over.plain.LONG_EDGE.BREAKING_POINT', 103],
  ['plain.over.LONG_EDGE.BREAKING_POINT', 103],
  ['over.over.LONG_EDGE.BREAKING_POINT', 103],
  ['plain.plain.EXTERNAL_PORT.LABEL', 20],
  ['over.plain.EXTERNAL_PORT.LABEL', 20],
  ['plain.over.EXTERNAL_PORT.LABEL', 20],
  ['over.over.EXTERNAL_PORT.LABEL', 20],
  ['plain.plain.LABEL.NORMAL', 12],
  ['over.plain.LABEL.NORMAL', 12],
  ['plain.over.LABEL.NORMAL', 12],
  ['over.over.LABEL.NORMAL', 12],
  ['plain.plain.LABEL.LONG_EDGE', 14],
  ['over.plain.LABEL.LONG_EDGE', 103],
  ['plain.over.LABEL.LONG_EDGE', 103],
  ['over.over.LABEL.LONG_EDGE', 103],
  ['plain.plain.LABEL.EXTERNAL_PORT', 20],
  ['over.plain.LABEL.EXTERNAL_PORT', 20],
  ['plain.over.LABEL.EXTERNAL_PORT', 20],
  ['over.over.LABEL.EXTERNAL_PORT', 20],
  ['plain.plain.LABEL.LABEL', 15],
  ['over.plain.LABEL.LABEL', 102],
  ['plain.over.LABEL.LABEL', 102],
  ['over.over.LABEL.LABEL', 102],
  ['plain.plain.LABEL.BREAKING_POINT', 14],
  ['over.plain.LABEL.BREAKING_POINT', 103],
  ['plain.over.LABEL.BREAKING_POINT', 103],
  ['over.over.LABEL.BREAKING_POINT', 103],
  ['plain.plain.BREAKING_POINT.NORMAL', 14],
  ['over.plain.BREAKING_POINT.NORMAL', 103],
  ['plain.over.BREAKING_POINT.NORMAL', 103],
  ['over.over.BREAKING_POINT.NORMAL', 103],
  ['plain.plain.BREAKING_POINT.LONG_EDGE', 14],
  ['over.plain.BREAKING_POINT.LONG_EDGE', 103],
  ['plain.over.BREAKING_POINT.LONG_EDGE', 103],
  ['over.over.BREAKING_POINT.LONG_EDGE', 103],
  ['plain.plain.BREAKING_POINT.LABEL', 14],
  ['over.plain.BREAKING_POINT.LABEL', 103],
  ['plain.over.BREAKING_POINT.LABEL', 103],
  ['over.over.BREAKING_POINT.LABEL', 103],
  ['plain.plain.BREAKING_POINT.BREAKING_POINT', 16],
  ['over.plain.BREAKING_POINT.BREAKING_POINT', 16],
  ['plain.over.BREAKING_POINT.BREAKING_POINT', 16],
  ['over.over.BREAKING_POINT.BREAKING_POINT', 16],
];

// oracle: site/spacings/vertical-nodes; Spacings.java:195
const VERTICAL_NODES: [string, number][] = [
  ['plain.plain.NORMAL.NORMAL', 11],
  ['over.plain.NORMAL.NORMAL', 101],
  ['plain.over.NORMAL.NORMAL', 101],
  ['over.over.NORMAL.NORMAL', 101],
  ['plain.plain.NORMAL.LONG_EDGE', 13],
  ['over.plain.NORMAL.LONG_EDGE', 13],
  ['plain.over.NORMAL.LONG_EDGE', 13],
  ['over.over.NORMAL.LONG_EDGE', 13],
  ['plain.plain.NORMAL.EXTERNAL_PORT', 13],
  ['over.plain.NORMAL.EXTERNAL_PORT', 13],
  ['plain.over.NORMAL.EXTERNAL_PORT', 13],
  ['over.over.NORMAL.EXTERNAL_PORT', 13],
  ['plain.plain.NORMAL.NORTH_SOUTH_PORT', 13],
  ['over.plain.NORMAL.NORTH_SOUTH_PORT', 13],
  ['plain.over.NORMAL.NORTH_SOUTH_PORT', 13],
  ['over.over.NORMAL.NORTH_SOUTH_PORT', 13],
  ['plain.plain.NORMAL.LABEL', 11],
  ['over.plain.NORMAL.LABEL', 101],
  ['plain.over.NORMAL.LABEL', 101],
  ['over.over.NORMAL.LABEL', 101],
  ['plain.plain.NORMAL.BREAKING_POINT', 13],
  ['over.plain.NORMAL.BREAKING_POINT', 13],
  ['plain.over.NORMAL.BREAKING_POINT', 13],
  ['over.over.NORMAL.BREAKING_POINT', 13],
  ['plain.plain.LONG_EDGE.NORMAL', 13],
  ['over.plain.LONG_EDGE.NORMAL', 13],
  ['plain.over.LONG_EDGE.NORMAL', 13],
  ['over.over.LONG_EDGE.NORMAL', 13],
  ['plain.plain.LONG_EDGE.LONG_EDGE', 15],
  ['over.plain.LONG_EDGE.LONG_EDGE', 102],
  ['plain.over.LONG_EDGE.LONG_EDGE', 102],
  ['over.over.LONG_EDGE.LONG_EDGE', 102],
  ['plain.plain.LONG_EDGE.EXTERNAL_PORT', 15],
  ['over.plain.LONG_EDGE.EXTERNAL_PORT', 102],
  ['plain.over.LONG_EDGE.EXTERNAL_PORT', 102],
  ['over.over.LONG_EDGE.EXTERNAL_PORT', 102],
  ['plain.plain.LONG_EDGE.NORTH_SOUTH_PORT', 15],
  ['over.plain.LONG_EDGE.NORTH_SOUTH_PORT', 102],
  ['plain.over.LONG_EDGE.NORTH_SOUTH_PORT', 102],
  ['over.over.LONG_EDGE.NORTH_SOUTH_PORT', 102],
  ['plain.plain.LONG_EDGE.LABEL', 13],
  ['over.plain.LONG_EDGE.LABEL', 13],
  ['plain.over.LONG_EDGE.LABEL', 13],
  ['over.over.LONG_EDGE.LABEL', 13],
  ['plain.plain.LONG_EDGE.BREAKING_POINT', 13],
  ['over.plain.LONG_EDGE.BREAKING_POINT', 13],
  ['plain.over.LONG_EDGE.BREAKING_POINT', 13],
  ['over.over.LONG_EDGE.BREAKING_POINT', 13],
  ['plain.plain.EXTERNAL_PORT.NORMAL', 13],
  ['over.plain.EXTERNAL_PORT.NORMAL', 13],
  ['plain.over.EXTERNAL_PORT.NORMAL', 13],
  ['over.over.EXTERNAL_PORT.NORMAL', 13],
  ['plain.plain.EXTERNAL_PORT.LONG_EDGE', 15],
  ['over.plain.EXTERNAL_PORT.LONG_EDGE', 102],
  ['plain.over.EXTERNAL_PORT.LONG_EDGE', 102],
  ['over.over.EXTERNAL_PORT.LONG_EDGE', 102],
  ['plain.plain.EXTERNAL_PORT.EXTERNAL_PORT', 18],
  ['over.plain.EXTERNAL_PORT.EXTERNAL_PORT', 18],
  ['plain.over.EXTERNAL_PORT.EXTERNAL_PORT', 18],
  ['over.over.EXTERNAL_PORT.EXTERNAL_PORT', 18],
  ['plain.plain.EXTERNAL_PORT.NORTH_SOUTH_PORT', 15],
  ['over.plain.EXTERNAL_PORT.NORTH_SOUTH_PORT', 102],
  ['plain.over.EXTERNAL_PORT.NORTH_SOUTH_PORT', 102],
  ['over.over.EXTERNAL_PORT.NORTH_SOUTH_PORT', 102],
  ['plain.plain.EXTERNAL_PORT.LABEL', 19],
  ['over.plain.EXTERNAL_PORT.LABEL', 19],
  ['plain.over.EXTERNAL_PORT.LABEL', 19],
  ['over.over.EXTERNAL_PORT.LABEL', 19],
  ['plain.plain.NORTH_SOUTH_PORT.NORMAL', 13],
  ['over.plain.NORTH_SOUTH_PORT.NORMAL', 13],
  ['plain.over.NORTH_SOUTH_PORT.NORMAL', 13],
  ['over.over.NORTH_SOUTH_PORT.NORMAL', 13],
  ['plain.plain.NORTH_SOUTH_PORT.LONG_EDGE', 15],
  ['over.plain.NORTH_SOUTH_PORT.LONG_EDGE', 102],
  ['plain.over.NORTH_SOUTH_PORT.LONG_EDGE', 102],
  ['over.over.NORTH_SOUTH_PORT.LONG_EDGE', 102],
  ['plain.plain.NORTH_SOUTH_PORT.EXTERNAL_PORT', 15],
  ['over.plain.NORTH_SOUTH_PORT.EXTERNAL_PORT', 102],
  ['plain.over.NORTH_SOUTH_PORT.EXTERNAL_PORT', 102],
  ['over.over.NORTH_SOUTH_PORT.EXTERNAL_PORT', 102],
  ['plain.plain.NORTH_SOUTH_PORT.NORTH_SOUTH_PORT', 15],
  ['over.plain.NORTH_SOUTH_PORT.NORTH_SOUTH_PORT', 102],
  ['plain.over.NORTH_SOUTH_PORT.NORTH_SOUTH_PORT', 102],
  ['over.over.NORTH_SOUTH_PORT.NORTH_SOUTH_PORT', 102],
  ['plain.plain.NORTH_SOUTH_PORT.LABEL', 17],
  ['over.plain.NORTH_SOUTH_PORT.LABEL', 17],
  ['plain.over.NORTH_SOUTH_PORT.LABEL', 17],
  ['over.over.NORTH_SOUTH_PORT.LABEL', 17],
  ['plain.plain.LABEL.NORMAL', 11],
  ['over.plain.LABEL.NORMAL', 101],
  ['plain.over.LABEL.NORMAL', 101],
  ['over.over.LABEL.NORMAL', 101],
  ['plain.plain.LABEL.LONG_EDGE', 13],
  ['over.plain.LABEL.LONG_EDGE', 13],
  ['plain.over.LABEL.LONG_EDGE', 13],
  ['over.over.LABEL.LONG_EDGE', 13],
  ['plain.plain.LABEL.EXTERNAL_PORT', 19],
  ['over.plain.LABEL.EXTERNAL_PORT', 19],
  ['plain.over.LABEL.EXTERNAL_PORT', 19],
  ['over.over.LABEL.EXTERNAL_PORT', 19],
  ['plain.plain.LABEL.NORTH_SOUTH_PORT', 17],
  ['over.plain.LABEL.NORTH_SOUTH_PORT', 17],
  ['plain.over.LABEL.NORTH_SOUTH_PORT', 17],
  ['over.over.LABEL.NORTH_SOUTH_PORT', 17],
  ['plain.plain.LABEL.LABEL', 15],
  ['over.plain.LABEL.LABEL', 102],
  ['plain.over.LABEL.LABEL', 102],
  ['over.over.LABEL.LABEL', 102],
  ['plain.plain.LABEL.BREAKING_POINT', 13],
  ['over.plain.LABEL.BREAKING_POINT', 13],
  ['plain.over.LABEL.BREAKING_POINT', 13],
  ['over.over.LABEL.BREAKING_POINT', 13],
  ['plain.plain.BREAKING_POINT.NORMAL', 13],
  ['over.plain.BREAKING_POINT.NORMAL', 13],
  ['plain.over.BREAKING_POINT.NORMAL', 13],
  ['over.over.BREAKING_POINT.NORMAL', 13],
  ['plain.plain.BREAKING_POINT.LONG_EDGE', 13],
  ['over.plain.BREAKING_POINT.LONG_EDGE', 13],
  ['plain.over.BREAKING_POINT.LONG_EDGE', 13],
  ['over.over.BREAKING_POINT.LONG_EDGE', 13],
  ['plain.plain.BREAKING_POINT.LABEL', 13],
  ['over.plain.BREAKING_POINT.LABEL', 13],
  ['plain.over.BREAKING_POINT.LABEL', 13],
  ['over.over.BREAKING_POINT.LABEL', 13],
  ['plain.plain.BREAKING_POINT.BREAKING_POINT', 15],
  ['over.plain.BREAKING_POINT.BREAKING_POINT', 102],
  ['plain.over.BREAKING_POINT.BREAKING_POINT', 102],
  ['over.over.BREAKING_POINT.BREAKING_POINT', 102],
];

// oracle: site/spacings/horizontal-node-types; Spacings.java:184
const HORIZONTAL_TYPES: [string, number][] = [
  ['NORMAL.NORMAL', 12],
  ['NORMAL.LONG_EDGE', 14],
  ['NORMAL.LABEL', 12],
  ['NORMAL.BREAKING_POINT', 14],
  ['LONG_EDGE.NORMAL', 14],
  ['LONG_EDGE.LONG_EDGE', 16],
  ['LONG_EDGE.LABEL', 14],
  ['LONG_EDGE.BREAKING_POINT', 14],
  ['EXTERNAL_PORT.LABEL', 20],
  ['LABEL.NORMAL', 12],
  ['LABEL.LONG_EDGE', 14],
  ['LABEL.EXTERNAL_PORT', 20],
  ['LABEL.LABEL', 15],
  ['LABEL.BREAKING_POINT', 14],
  ['BREAKING_POINT.NORMAL', 14],
  ['BREAKING_POINT.LONG_EDGE', 14],
  ['BREAKING_POINT.LABEL', 14],
  ['BREAKING_POINT.BREAKING_POINT', 16],
];

// oracle: site/spacings/vertical-node-types; Spacings.java:206
const VERTICAL_TYPES: [string, number][] = [
  ['NORMAL.NORMAL', 11],
  ['NORMAL.LONG_EDGE', 13],
  ['NORMAL.EXTERNAL_PORT', 13],
  ['NORMAL.NORTH_SOUTH_PORT', 13],
  ['NORMAL.LABEL', 11],
  ['NORMAL.BREAKING_POINT', 13],
  ['LONG_EDGE.NORMAL', 13],
  ['LONG_EDGE.LONG_EDGE', 15],
  ['LONG_EDGE.EXTERNAL_PORT', 15],
  ['LONG_EDGE.NORTH_SOUTH_PORT', 15],
  ['LONG_EDGE.LABEL', 13],
  ['LONG_EDGE.BREAKING_POINT', 13],
  ['EXTERNAL_PORT.NORMAL', 13],
  ['EXTERNAL_PORT.LONG_EDGE', 15],
  ['EXTERNAL_PORT.EXTERNAL_PORT', 18],
  ['EXTERNAL_PORT.NORTH_SOUTH_PORT', 15],
  ['EXTERNAL_PORT.LABEL', 19],
  ['NORTH_SOUTH_PORT.NORMAL', 13],
  ['NORTH_SOUTH_PORT.LONG_EDGE', 15],
  ['NORTH_SOUTH_PORT.EXTERNAL_PORT', 15],
  ['NORTH_SOUTH_PORT.NORTH_SOUTH_PORT', 15],
  ['NORTH_SOUTH_PORT.LABEL', 17],
  ['LABEL.NORMAL', 11],
  ['LABEL.LONG_EDGE', 13],
  ['LABEL.EXTERNAL_PORT', 19],
  ['LABEL.NORTH_SOUTH_PORT', 17],
  ['LABEL.LABEL', 15],
  ['LABEL.BREAKING_POINT', 13],
  ['BREAKING_POINT.NORMAL', 13],
  ['BREAKING_POINT.LONG_EDGE', 13],
  ['BREAKING_POINT.LABEL', 13],
  ['BREAKING_POINT.BREAKING_POINT', 15],
];

describe('Spacings site rows: node pairs', () => {
  const f = fixture();

  it.each(HORIZONTAL_NODES)('site/spacings/horizontal-nodes %s', (label, expected) => {
    const [n1, n2] = pair(f, label);
    expect(f.spacings.getHorizontalSpacing(n1, n2)).toBe(expected);
  });

  it.each(VERTICAL_NODES)('site/spacings/vertical-nodes %s', (label, expected) => {
    const [n1, n2] = pair(f, label);
    expect(f.spacings.getVerticalSpacing(n1, n2)).toBe(expected);
  });
});

describe('Spacings site rows: type pairs', () => {
  const f = fixture();

  it.each(HORIZONTAL_TYPES)('site/spacings/horizontal-node-types %s', (label, expected) => {
    expect(f.spacings.getHorizontalSpacing(...types(label))).toBe(expected);
  });

  it.each(VERTICAL_TYPES)('site/spacings/vertical-node-types %s', (label, expected) => {
    expect(f.spacings.getVerticalSpacing(...types(label))).toBe(expected);
  });
});

describe('Spacings site rows: elements and individual overrides', () => {
  // oracle: site/spacings/horizontal-elements; Spacings.java:158
  it('site/spacings/horizontal-elements: two nodes use the node form, any other pair throws', () => {
    const f = fixture();
    const n1 = new LNode(f.graph);
    const n2 = new LNode(f.graph);
    f.graph.getLayerlessNodes().push(n1, n2);
    n1.getSize().x = 1;
    n1.getSize().y = 1;
    n2.getSize().x = 1;
    n2.getSize().y = 1;
    const lbl = new LLabel('x');
    const holderPort = new LPort();
    expect(f.spacings.getHorizontalSpacing(n1, n2)).toBe(12);
    for (const [e1, e2] of [
      [n1, lbl],
      [lbl, n1],
      [holderPort, holderPort],
      [f.graph, n1],
    ] as const) {
      expect(() => f.spacings.getHorizontalSpacing(e1, e2)).toThrow(UnspecifiedSpacingException);
      // Java records message null (the no-argument constructor); a JS Error without a message has ''.
      expect(() => f.spacings.getHorizontalSpacing(e1, e2)).toThrow(/^$/);
    }
  });

  // oracle: site/spacings/individualOrDefault; Spacings.java:239
  it.each([
    ['plain', 'nodeNode', LayeredOptions.SPACING_NODE_NODE, 11],
    ['plain', 'edgeEdge', LayeredOptions.SPACING_EDGE_EDGE, 15],
    ['withIndividual', 'nodeNode', LayeredOptions.SPACING_NODE_NODE, 77],
    ['withIndividual', 'edgeEdge', LayeredOptions.SPACING_EDGE_EDGE, 15],
    ['emptyIndividual', 'nodeNode', LayeredOptions.SPACING_NODE_NODE, 11],
    ['emptyIndividual', 'edgeEdge', LayeredOptions.SPACING_EDGE_EDGE, 15],
  ] as const)('site/spacings/individualOrDefault %s.%s', (kind, _option, property, expected) => {
    const f = fixture();
    const node = new LNode(f.graph);
    if (kind === 'withIndividual') {
      node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual([[LayeredOptions.SPACING_NODE_NODE, 77]]));
    } else if (kind === 'emptyIndividual') {
      node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual([]));
    }
    expect(Spacings.getIndividualOrDefault(node, property)).toBe(expected);
  });
});
