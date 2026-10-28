// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { IndividualSpacings } from '../../../core/util/IndividualSpacings.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LNode } from '../graph/LNode.js';
import { LayeredOptions } from './LayeredOptions.js';
import { Spacings } from './Spacings.js';
import { UnspecifiedSpacingException } from './SpacingsUnspecifiedSpacingException.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

/** Distinct values per option so that the option a lookup used is visible in its result. */
const NODE_NODE = 101;
const NODE_NODE_BETWEEN_LAYERS = 102;
const EDGE_NODE = 103;
const EDGE_NODE_BETWEEN_LAYERS = 104;
const EDGE_EDGE = 105;
const EDGE_EDGE_BETWEEN_LAYERS = 106;
const LABEL_NODE = 107;
const PORT_PORT = 108;
const LABEL_PORT_VERTICAL = 109;
const LABEL_PORT_HORIZONTAL = 110;

function configuredGraph(): LGraph {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.SPACING_NODE_NODE, NODE_NODE);
  graph.setProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, NODE_NODE_BETWEEN_LAYERS);
  graph.setProperty(LayeredOptions.SPACING_EDGE_NODE, EDGE_NODE);
  graph.setProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS, EDGE_NODE_BETWEEN_LAYERS);
  graph.setProperty(LayeredOptions.SPACING_EDGE_EDGE, EDGE_EDGE);
  graph.setProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS, EDGE_EDGE_BETWEEN_LAYERS);
  graph.setProperty(LayeredOptions.SPACING_LABEL_NODE, LABEL_NODE);
  graph.setProperty(LayeredOptions.SPACING_PORT_PORT, PORT_PORT);
  graph.setProperty(LayeredOptions.SPACING_LABEL_PORT_VERTICAL, LABEL_PORT_VERTICAL);
  graph.setProperty(LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL, LABEL_PORT_HORIZONTAL);
  return graph;
}

type Row = [NodeType, NodeType, number, number | null];

/**
 * The Java `precalculateNodeTypeSpacings` table: for each pair, the option read for the vertical spacing and, where
 * the Java sets one, for the horizontal spacing. The values are the configured per-option constants above.
 */
const PAIRS: Row[] = [
  [NodeType.NORMAL, NodeType.NORMAL, NODE_NODE, NODE_NODE_BETWEEN_LAYERS],
  [NodeType.NORMAL, NodeType.LONG_EDGE, EDGE_NODE, EDGE_NODE_BETWEEN_LAYERS],
  [NodeType.NORMAL, NodeType.NORTH_SOUTH_PORT, EDGE_NODE, null],
  [NodeType.NORMAL, NodeType.EXTERNAL_PORT, EDGE_NODE, null],
  [NodeType.NORMAL, NodeType.LABEL, NODE_NODE, NODE_NODE_BETWEEN_LAYERS],
  [NodeType.LONG_EDGE, NodeType.LONG_EDGE, EDGE_EDGE, EDGE_EDGE_BETWEEN_LAYERS],
  [NodeType.LONG_EDGE, NodeType.NORTH_SOUTH_PORT, EDGE_EDGE, null],
  [NodeType.LONG_EDGE, NodeType.EXTERNAL_PORT, EDGE_EDGE, null],
  [NodeType.LONG_EDGE, NodeType.LABEL, EDGE_NODE, EDGE_NODE_BETWEEN_LAYERS],
  [NodeType.NORTH_SOUTH_PORT, NodeType.NORTH_SOUTH_PORT, EDGE_EDGE, null],
  [NodeType.NORTH_SOUTH_PORT, NodeType.EXTERNAL_PORT, EDGE_EDGE, null],
  [NodeType.NORTH_SOUTH_PORT, NodeType.LABEL, LABEL_NODE, null],
  [NodeType.EXTERNAL_PORT, NodeType.EXTERNAL_PORT, PORT_PORT, null],
  [NodeType.EXTERNAL_PORT, NodeType.LABEL, LABEL_PORT_VERTICAL, LABEL_PORT_HORIZONTAL],
  [NodeType.LABEL, NodeType.LABEL, EDGE_EDGE, EDGE_EDGE],
  [NodeType.BREAKING_POINT, NodeType.BREAKING_POINT, EDGE_EDGE, EDGE_EDGE_BETWEEN_LAYERS],
  [NodeType.BREAKING_POINT, NodeType.NORMAL, EDGE_NODE, EDGE_NODE_BETWEEN_LAYERS],
  [NodeType.BREAKING_POINT, NodeType.LABEL, EDGE_NODE, EDGE_NODE_BETWEEN_LAYERS],
  [NodeType.BREAKING_POINT, NodeType.LONG_EDGE, EDGE_NODE, EDGE_NODE_BETWEEN_LAYERS],
];

describe('Spacings by node type', () => {
  it('returns the option value recorded for each type pair, in both argument orders', () => {
    const spacings = new Spacings(configuredGraph());
    for (const [a, b, vertical] of PAIRS) {
      expect(spacings.getVerticalSpacing(a, b)).toBe(vertical);
      expect(spacings.getVerticalSpacing(b, a)).toBe(vertical);
    }
  });

  it('returns the horizontal option value for the pairs that record one', () => {
    const spacings = new Spacings(configuredGraph());
    for (const [a, b, , horizontal] of PAIRS) {
      if (horizontal !== null) {
        expect(spacings.getHorizontalSpacing(a, b)).toBe(horizontal);
        expect(spacings.getHorizontalSpacing(b, a)).toBe(horizontal);
      }
    }
  });
});

describe('Spacings by node', () => {
  it('returns the graph value for nodes without individual spacings', () => {
    const graph = configuredGraph();
    const spacings = new Spacings(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    expect(spacings.getVerticalSpacing(a, b)).toBe(NODE_NODE);
    expect(spacings.getHorizontalSpacing(a, b)).toBe(NODE_NODE_BETWEEN_LAYERS);
  });

  it('uses the node types to choose the option', () => {
    const graph = configuredGraph();
    const spacings = new Spacings(graph);
    const normal = addNode(graph);
    const dummy = addNode(graph, NodeType.LONG_EDGE);
    expect(spacings.getVerticalSpacing(normal, dummy)).toBe(EDGE_NODE);
    expect(spacings.getHorizontalSpacing(dummy, normal)).toBe(EDGE_NODE_BETWEEN_LAYERS);
  });

  it('takes the larger of the two nodes individual values', () => {
    const graph = configuredGraph();
    const spacings = new Spacings(graph);
    const a = addNode(graph);
    const b = addNode(graph);
    const individual = new IndividualSpacings();
    individual.setProperty(LayeredOptions.SPACING_NODE_NODE, NODE_NODE + 50);
    a.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual);
    expect(spacings.getVerticalSpacing(a, b)).toBe(NODE_NODE + 50);
    expect(spacings.getVerticalSpacing(b, a)).toBe(NODE_NODE + 50);
    const lower = new IndividualSpacings();
    lower.setProperty(LayeredOptions.SPACING_NODE_NODE, NODE_NODE - 50);
    b.setProperty(LayeredOptions.SPACING_INDIVIDUAL, lower);
    expect(spacings.getVerticalSpacing(a, b)).toBe(NODE_NODE + 50);
  });

  it('getHorizontalSpacing of two graph elements that are not both nodes throws UnspecifiedSpacingException', () => {
    const graph = configuredGraph();
    const spacings = new Spacings(graph);
    const node = addNode(graph);
    expect(() => spacings.getHorizontalSpacing(node, new LGraph())).toThrow(UnspecifiedSpacingException);
    expect(() => spacings.getHorizontalSpacing(new LGraph(), node)).toThrow(UnspecifiedSpacingException);
    expect(() => spacings.getHorizontalSpacing(graph, new LGraph())).toThrow(UnspecifiedSpacingException);
  });
});

describe('Spacings.getIndividualOrDefault', () => {
  it('returns the individual override when the node has one for the property', () => {
    const graph = configuredGraph();
    const node = addNode(graph);
    const individual = new IndividualSpacings();
    individual.setProperty(LayeredOptions.SPACING_EDGE_NODE, 7);
    node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual);
    expect(Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_EDGE_NODE)).toBe(7);
  });

  it('returns the graph value when there is no individual value for the property', () => {
    const graph = configuredGraph();
    const node = addNode(graph);
    expect(Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_EDGE_NODE)).toBe(EDGE_NODE);
    const individual = new IndividualSpacings();
    individual.setProperty(LayeredOptions.SPACING_NODE_NODE, 7);
    node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual);
    expect(Spacings.getIndividualOrDefault(node, LayeredOptions.SPACING_EDGE_NODE)).toBe(EDGE_NODE);
  });

  it('reads the graph of the node', () => {
    const graph = configuredGraph();
    expect(Spacings.getIndividualOrDefault(new LNode(graph), LayeredOptions.SPACING_PORT_PORT)).toBe(PORT_PORT);
  });
});
