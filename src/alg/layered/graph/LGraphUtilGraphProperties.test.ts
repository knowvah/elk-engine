// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { Direction } from '../../../core/options/Direction.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import { computeGraphProperties } from './LGraphUtilGraphProperties.js';
import { LLabel } from './LLabel.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

/** The computed flags as sorted names. */
function flags(graph: LGraph): string[] {
  return [...graph.getProperty(InternalProperties.GRAPH_PROPERTIES)].map((p) => p.name()).sort();
}

/** A graph (direction RIGHT) whose nodes all have FREE port constraints, so only the flag under test is set. */
function freeGraph(direction: Direction = Direction.RIGHT): LGraph {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.DIRECTION, direction);
  return graph;
}

function freeNode(graph: LGraph, type: NodeType = NodeType.NORMAL): LNode {
  const node = addNode(graph, type);
  node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  return node;
}

describe('computeGraphProperties: nodes', () => {
  it('sets no flag for a plain free node', () => {
    const graph = freeGraph();
    freeNode(graph);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual([]);
  });

  it('flags comment boxes', () => {
    const graph = freeGraph();
    freeNode(graph).setProperty(LayeredOptions.COMMENT_BOX, true);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['COMMENTS']);
  });

  it('flags hypernodes as hypernodes and hyperedges', () => {
    const graph = freeGraph();
    freeNode(graph).setProperty(LayeredOptions.HYPERNODE, true);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['HYPEREDGES', 'HYPERNODES']);
  });

  it('flags external port dummies', () => {
    const graph = freeGraph();
    freeNode(graph, NodeType.EXTERNAL_PORT);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['EXTERNAL_PORTS']);
  });

  it('prefers the comment branch over the hypernode and external-port branches', () => {
    const graph = freeGraph();
    const node = freeNode(graph, NodeType.EXTERNAL_PORT);
    node.setProperty(LayeredOptions.COMMENT_BOX, true);
    node.setProperty(LayeredOptions.HYPERNODE, true);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['COMMENTS']);
  });

  it('turns UNDEFINED port constraints into FREE without a flag', () => {
    const graph = freeGraph();
    const node = addNode(graph);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.UNDEFINED);
    computeGraphProperties(graph);
    expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FREE);
    expect(flags(graph)).toEqual([]);
  });

  it('flags every non-free, defined port constraint', () => {
    for (const constraints of [
      PortConstraints.FIXED_SIDE,
      PortConstraints.FIXED_ORDER,
      PortConstraints.FIXED_RATIO,
      PortConstraints.FIXED_POS,
    ]) {
      const graph = freeGraph();
      const node = addNode(graph);
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
      computeGraphProperties(graph);
      expect(flags(graph)).toEqual(['NON_FREE_PORTS']);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(constraints);
    }
  });

  it('clears flags of an earlier computation first', () => {
    const graph = freeGraph();
    freeNode(graph);
    graph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.PARTITIONS);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual([]);
  });
});

describe('computeGraphProperties: ports and edges', () => {
  it('flags hyperedges on a port with more than one edge', () => {
    const graph = freeGraph();
    const a = freeNode(graph);
    const b = freeNode(graph);
    const pa = addPort(a, PortSide.EAST);
    const pb = addPort(b, PortSide.WEST);
    connect(pa, pb);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual([]);
    connect(pa, pb);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['HYPEREDGES']);
  });

  it('flags north/south ports for horizontal directions', () => {
    for (const direction of [Direction.RIGHT, Direction.LEFT, Direction.UNDEFINED]) {
      for (const side of [PortSide.NORTH, PortSide.SOUTH]) {
        const graph = freeGraph(direction);
        addPort(freeNode(graph), side);
        computeGraphProperties(graph);
        expect(flags(graph)).toEqual(['NORTH_SOUTH_PORTS']);
      }
      const graph = freeGraph(direction);
      addPort(freeNode(graph), PortSide.EAST);
      addPort(freeNode(graph), PortSide.WEST);
      computeGraphProperties(graph);
      expect(flags(graph)).toEqual([]);
    }
  });

  it('flags east/west ports for vertical directions', () => {
    for (const direction of [Direction.UP, Direction.DOWN]) {
      for (const side of [PortSide.EAST, PortSide.WEST]) {
        const graph = freeGraph(direction);
        addPort(freeNode(graph), side);
        computeGraphProperties(graph);
        expect(flags(graph)).toEqual(['NORTH_SOUTH_PORTS']);
      }
      const graph = freeGraph(direction);
      addPort(freeNode(graph), PortSide.NORTH);
      addPort(freeNode(graph), PortSide.SOUTH);
      computeGraphProperties(graph);
      expect(flags(graph)).toEqual([]);
    }
  });

  it('flags self loops through the outgoing edges of a port', () => {
    const graph = freeGraph();
    const node = freeNode(graph);
    const out = addPort(node, PortSide.EAST);
    const into = addPort(node, PortSide.WEST);
    connect(out, into);
    computeGraphProperties(graph);
    expect(flags(graph)).toEqual(['SELF_LOOPS']);
  });

  it('flags center labels and end labels from the edge label placements', () => {
    const cases: [EdgeLabelPlacement, string[]][] = [
      [EdgeLabelPlacement.CENTER, ['CENTER_LABELS']],
      [EdgeLabelPlacement.HEAD, ['END_LABELS']],
      [EdgeLabelPlacement.TAIL, ['END_LABELS']],
    ];
    for (const [placement, expected] of cases) {
      const graph = freeGraph();
      const a = freeNode(graph);
      const b = freeNode(graph);
      const edge = connect(addPort(a, PortSide.EAST), addPort(b, PortSide.WEST));
      const edgeLabel = new LLabel('l');
      edgeLabel.setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, placement);
      edge.getLabels().push(edgeLabel);
      computeGraphProperties(graph);
      expect(flags(graph)).toEqual(expected);
    }
  });
});
