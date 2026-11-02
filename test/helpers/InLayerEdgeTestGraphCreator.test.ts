// SPDX-License-Identifier: EPL-2.0
// Structural checks of the ported InLayerEdgeTestGraphCreator (mission 7c-tests, T3a). Every expectation is derived by
// hand from the Java builder in InLayerEdgeTestGraphCreator.java: node and port-creation order, port sides in port
// order (an `addInLayerEdge` adds a port to its first node, then one to its second), and edges as `layer.node>layer.node`
// in iteration order (layer, node, port, outgoing edge). In-layer edges join two nodes of one layer and are listed as
// `layer.node.port>layer.node.port` (ports by index within their node).
import { beforeAll, describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { GraphProperties } from '../../src/alg/layered/options/GraphProperties.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { InLayerEdgeTestGraphCreator } from './InLayerEdgeTestGraphCreator.js';

// the fixed-port-order builder reads a set-valued option default, which is cloned through ElkReflect
beforeAll(() => LayoutMetaDataService.initElkReflect());

const SIDE_LETTERS: ReadonlyMap<PortSide, string> = new Map([
  [PortSide.EAST, 'E'],
  [PortSide.WEST, 'W'],
]);
const NORMAL = NodeType.NORMAL.name();
const E = 'E';
const W = 'W';

/** The port sides of a node, in port order, as one letter each. */
function sidesOf(node: LNode): string {
  return node
    .getPorts()
    .map((port) => SIDE_LETTERS.get(port.getSide()))
    .join('');
}

/** Every node of the graph's layers, flattened in order. */
function allNodes(graph: LGraph): LNode[] {
  return graph.getLayers().flatMap((layer) => layer.getNodes());
}

/** Every edge, in iteration order (layer, node, port, outgoing edge). */
function allEdges(graph: LGraph): LEdge[] {
  return allNodes(graph)
    .flatMap((node) => node.getPorts())
    .flatMap((port) => port.getOutgoingEdges());
}

function nodePosition(node: LNode | null): string {
  const layer = node?.getLayer() ?? null;
  return `${layer?.getIndex()}.${layer?.getNodes().indexOf(node as LNode)}`;
}

function portPosition(port: LPort | null): string {
  return `${nodePosition(port?.getNode() ?? null)}.${port
    ?.getNode()
    ?.getPorts()
    .indexOf(port as LPort)}`;
}

function isInLayer(edge: LEdge): boolean {
  const source = edge.getSource()?.getNode()?.getLayer() ?? null;
  const target = edge.getTarget()?.getNode()?.getLayer() ?? null;
  return source !== null && source === target;
}

/** The names of the creator's argument-less graph builders. */
type BuilderName = {
  [K in keyof InLayerEdgeTestGraphCreator]: InLayerEdgeTestGraphCreator[K] extends () => LGraph ? K : never;
}[keyof InLayerEdgeTestGraphCreator];

interface BuilderCase {
  readonly name: BuilderName;
  /** port sides per node per layer; its shape is also the layer and node count */
  readonly ports: string[][];
  /** all edges as `layer.node>layer.node` */
  readonly edges: string[];
  /** the in-layer edges as `layer.node.port>layer.node.port` */
  readonly inLayerEdges: string[];
  /** the nodes (`layer.node`) whose port constraints the builder sets to FIXED_ORDER; all other nodes are FIXED_SIDE */
  readonly fixedOrder: string[];
}

const BUILDERS: readonly BuilderCase[] = [
  {
    name: 'getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder',
    ports: [[E + E + E], [W + W + W + W, W]],
    edges: ['0.0>1.0', '0.0>1.0', '0.0>1.0', '1.0>1.1'],
    inLayerEdges: ['1.0.1>1.1.0'],
    fixedOrder: ['1.0'],
  },
  {
    name: 'getInLayerEdgesWithFixedPortOrderAndNormalEdgeCrossings',
    ports: [[E + E], [W + W, W, W]],
    edges: ['0.0>1.0', '0.0>1.1', '1.0>1.2'],
    inLayerEdges: ['1.0.1>1.2.0'],
    fixedOrder: ['1.0'],
  },
  {
    name: 'getInLayerEdgesCrossingsButNoFixedOrder',
    ports: [
      [E, E],
      [W + W, W + W],
    ],
    edges: ['0.0>1.0', '0.1>1.1', '1.0>1.1'],
    inLayerEdges: ['1.0.1>1.1.0'],
    fixedOrder: [],
  },
  {
    name: 'getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLower',
    ports: [
      ['', E + E],
      [W + W, W, W + W + W],
    ],
    edges: ['0.1>1.1', '0.1>1.2', '1.0>1.2', '1.0>1.2'],
    inLayerEdges: ['1.0.0>1.2.0', '1.0.1>1.2.1'],
    fixedOrder: [],
  },
  {
    name: 'getInLayerEdgesCrossingsNoFixedOrderNoEdgeBetweenUpperAndLowerUpsideDown',
    ports: [
      [E, E],
      [W, W + W + W + W, W, W + W],
    ],
    edges: ['0.0>1.1', '0.1>1.2', '1.0>1.1', '1.1>1.3', '1.1>1.3'],
    inLayerEdges: ['1.0.0>1.1.1', '1.1.2>1.3.0', '1.1.3>1.3.1'],
    fixedOrder: [],
  },
  {
    name: 'getInLayerCrossingsOnBothSides',
    ports: [[E], [E + W, E + W, E + W], [W]],
    edges: ['0.0>1.1', '1.0>1.2', '1.0>1.2', '1.1>2.0'],
    inLayerEdges: ['1.0.0>1.2.0', '1.0.1>1.2.1'],
    fixedOrder: [],
  },
  {
    name: 'getInLayerEdgesFixedPortOrderInLayerAndInBetweenLayerCrossing',
    ports: [[E], [W, W + W + W, W]],
    edges: ['0.0>1.1', '1.0>1.1', '1.1>1.2'],
    inLayerEdges: ['1.0.0>1.1.1', '1.1.2>1.2.0'],
    fixedOrder: ['1.1'],
  },
  {
    name: 'getInLayerEdgesFixedPortOrderInLayerCrossing',
    ports: [[W, W + W, W]],
    edges: ['0.0>0.1', '0.1>0.2'],
    inLayerEdges: ['0.0.0>0.1.0', '0.1.1>0.2.0'],
    fixedOrder: ['0.1'],
  },
  {
    name: 'getFixedPortOrderTwoInLayerEdgesCrossEachOther',
    ports: [[W + W, W, W]],
    edges: ['0.0>0.2', '0.0>0.1'],
    inLayerEdges: ['0.0.0>0.2.0', '0.0.1>0.1.0'],
    fixedOrder: ['0.0'],
  },
  {
    name: 'getInLayerEdgesDownwardGraphNoFixedOrder',
    ports: [[E], [W, W + W + W, W]],
    edges: ['0.0>1.1', '1.0>1.1', '1.1>1.2'],
    inLayerEdges: ['1.0.0>1.1.1', '1.1.2>1.2.0'],
    fixedOrder: [],
  },
  {
    // the two in-layer edges join four different nodes; the normal edge and the edge from the top port both end in
    // the one port of the third right node
    name: 'getInLayerEdgesMultipleEdgesIntoSinglePort',
    ports: [[E], [W, W, W, W]],
    edges: ['0.0>1.2', '1.0>1.2', '1.1>1.3'],
    inLayerEdges: ['1.0.0>1.2.0', '1.1.0>1.3.0'],
    fixedOrder: [],
  },
  {
    name: 'getOneLayerWithInLayerCrossings',
    ports: [[W, W, W, W]],
    edges: ['0.0>0.2', '0.1>0.3'],
    inLayerEdges: ['0.0.0>0.2.0', '0.1.0>0.3.0'],
    fixedOrder: [],
  },
  {
    name: 'getInLayerOneLayerNoCrossings',
    ports: [[W, W, W, W]],
    edges: ['0.0>0.3', '0.1>0.2'],
    inLayerEdges: ['0.0.0>0.3.0', '0.1.0>0.2.0'],
    fixedOrder: [],
  },
];

for (const spec of BUILDERS) {
  describe(spec.name, () => {
    const build = (): { creator: InLayerEdgeTestGraphCreator; graph: LGraph } => {
      const creator = new InLayerEdgeTestGraphCreator();
      return { creator, graph: creator[spec.name]() };
    };

    it('returns the creator graph', () => {
      const { creator, graph } = build();
      expect(graph).toBe(creator.graph);
      expect(creator.getGraph()).toBe(graph);
    });

    it('builds the expected layers and nodes, all of normal type', () => {
      const { graph } = build();
      expect(graph.getLayers().map((layer) => layer.getNodes().length)).toEqual(
        spec.ports.map((layer) => layer.length),
      );
      expect(allNodes(graph).map((node) => node.getType().name())).toEqual(allNodes(graph).map(() => NORMAL));
      for (const layer of graph.getLayers()) {
        for (const node of layer.getNodes()) {
          expect(node.getLayer()).toBe(layer);
        }
      }
    });

    it('adds the ports on the expected sides in port order', () => {
      const { graph } = build();
      expect(graph.getLayers().map((layer) => layer.getNodes().map(sidesOf))).toEqual(spec.ports);
    });

    it('creates the expected edges', () => {
      const { graph } = build();
      const edges = allEdges(graph);
      expect(edges).toHaveLength(spec.edges.length);
      expect(
        edges.map(
          (edge) =>
            `${nodePosition(edge.getSource()?.getNode() ?? null)}>${nodePosition(edge.getTarget()?.getNode() ?? null)}`,
        ),
      ).toEqual(spec.edges);
    });

    it('joins the expected ports by in-layer edges', () => {
      const { graph } = build();
      const inLayer = allEdges(graph).filter(isInLayer);
      expect(inLayer).toHaveLength(spec.inLayerEdges.length);
      expect(inLayer.map((edge) => `${portPosition(edge.getSource())}>${portPosition(edge.getTarget())}`)).toEqual(
        spec.inLayerEdges,
      );
    });

    it('fixes the port order of the expected nodes and the port sides of all other nodes with ports', () => {
      const { graph } = build();
      for (const layer of graph.getLayers()) {
        for (const node of layer.getNodes()) {
          // addPortOnSide raises the default (UNDEFINED) to FIXED_SIDE, so a node without ports keeps the default
          const fixedSide = node.getPorts().length > 0 ? PortConstraints.FIXED_SIDE : PortConstraints.UNDEFINED;
          const expected = spec.fixedOrder.includes(nodePosition(node)) ? PortConstraints.FIXED_ORDER : fixedSide;
          expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(expected);
        }
      }
    });

    it('numbers nodes per layer and ports across the graph', () => {
      const { graph } = build();
      for (const layer of graph.getLayers()) {
        expect(layer.getNodes().map((node) => node.id)).toEqual(layer.getNodes().map((_node, index) => index));
      }
      const portIds = allNodes(graph)
        .flatMap((node) => node.getPorts())
        .map((port) => port.id);
      expect(portIds).toEqual(portIds.map((_id, index) => index));
    });
  });
}

describe('getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder graph properties', () => {
  it('marks the graph as having non-free ports', () => {
    const graph =
      new InLayerEdgeTestGraphCreator().getInLayerEdgesGraphWithCrossingsToBetweenLayerEdgeWithFixedPortOrder();
    expect(graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.NON_FREE_PORTS)).toBe(true);
  });
});
