// SPDX-License-Identifier: EPL-2.0
// Structural checks of the ported TestGraphCreator (mission 7c-tests, T2). Every expectation is derived by hand from
// the Java builder in TestGraphCreator.java: node and port-creation order, port sides in port order, and edges as
// `layer.node>layer.node` in iteration order (layer, node, port, outgoing edge), nodes and layers by index.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { GraphProperties } from '../../src/alg/layered/options/GraphProperties.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { Property } from '../../src/graph/properties/Property.js';
import { IndexOutOfBoundsException } from '../../src/java/lang/IndexOutOfBoundsException.js';
import { expectSameElements } from './junit-asserts.js';
import { MockRandom, TestGraphCreator } from './TestGraphCreator.js';

// the creator reads list- and set-valued option defaults, which are cloned through ElkReflect
beforeAll(() => LayoutMetaDataService.initElkReflect());

const SIDE_LETTERS: ReadonlyMap<PortSide, string> = new Map([
  [PortSide.EAST, 'E'],
  [PortSide.WEST, 'W'],
  [PortSide.NORTH, 'N'],
  [PortSide.SOUTH, 'S'],
]);
const NORMAL = NodeType.NORMAL.name();

/** The port sides of a node, in port order, as one letter each. */
function sidesOf(node: LNode): string {
  return node
    .getPorts()
    .map((port) => SIDE_LETTERS.get(port.getSide()))
    .join('');
}

/** Per layer, per node: its port sides in port order. */
function portSides(graph: LGraph): string[][] {
  return graph.getLayers().map((layer) => layer.getNodes().map(sidesOf));
}

/** Per layer, per node: its node type name. */
function nodeTypes(graph: LGraph): string[][] {
  return graph.getLayers().map((layer) => layer.getNodes().map((node) => node.getType().name()));
}

/** Every node of the graph's layers, flattened in order. */
function allNodes(graph: LGraph): LNode[] {
  return graph.getLayers().flatMap((layer) => layer.getNodes());
}

function position(node: LNode | null): string {
  const layer = node?.getLayer() ?? null;
  return `${layer?.getIndex()}.${layer?.getNodes().indexOf(node as LNode)}`;
}

/** All edges as `layer.node>layer.node`, in iteration order (layer, node, port, outgoing edge). */
function edgeList(graph: LGraph, keep: (edge: LEdge) => boolean = () => true): string[] {
  return allNodes(graph)
    .flatMap((node) => node.getPorts())
    .flatMap((port) => port.getOutgoingEdges())
    .filter(keep)
    .map((edge) => `${position(edge.getSource()?.getNode() ?? null)}>${position(edge.getTarget()?.getNode() ?? null)}`);
}

interface BuilderCase {
  readonly name: string;
  readonly build: (creator: TestGraphCreator) => LGraph;
  /** port sides per node per layer; its shape is also the layer and node count */
  readonly ports: string[][];
  readonly edges: string[];
  readonly types?: string[][];
  readonly keepEdge?: (edge: LEdge) => boolean;
  /** the Java builder returns without a final setUpIds, so the ids are only numbered after one more call */
  readonly idsStale?: boolean;
  readonly details?: (creator: TestGraphCreator, graph: LGraph) => void;
}

const E = 'E';
const W = 'W';

const BUILDERS: readonly BuilderCase[] = [
  { name: 'getEmptyGraph', build: (c) => c.getEmptyGraph(), ports: [], edges: [] },
  {
    name: 'getTwoNodesNoConnectionGraph',
    build: (c) => c.getTwoNodesNoConnectionGraph(),
    ports: [['', '']],
    edges: [],
  },
  { name: 'getOneNodeGraph', build: (c) => c.getOneNodeGraph(), ports: [['']], edges: [] },
  {
    name: 'getCrossFormedGraph',
    build: (c) => c.getCrossFormedGraph(),
    ports: [
      [E, E],
      [W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.0'],
  },
  {
    name: 'multipleEdgesAndSingleEdge',
    build: (c) => c.multipleEdgesAndSingleEdge(),
    ports: [[E + E, E], [W + W + W]],
    edges: ['0.0>1.0', '0.0>1.0', '0.1>1.0'],
  },
  {
    name: 'getCrossFormedGraphWithConstraintsInSecondLayer',
    build: (c) => c.getCrossFormedGraphWithConstraintsInSecondLayer(),
    ports: [
      [E, E],
      [W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.0'],
    details: (_c, g) => {
      const [first, second] = g.getLayers()[1]!.getNodes();
      expectSameElements(first!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [second!]);
      expectSameElements(second!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
      expectSameElements(allNodes(g)[0]!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
    },
  },
  {
    name: 'getCrossFormedGraphConstraintsPreventAnySwitch',
    build: (c) => c.getCrossFormedGraphConstraintsPreventAnySwitch(),
    ports: [
      [E, E],
      [W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.0'],
    details: (_c, g) => {
      const [topLeft, bottomLeft, topRight, bottomRight] = allNodes(g);
      expectSameElements(topLeft!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [bottomLeft!]);
      expectSameElements(topRight!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [bottomRight!]);
      expectSameElements(bottomLeft!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
      expectSameElements(bottomRight!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
    },
  },
  {
    name: 'getInLayerEdgesGraph',
    build: (c) => c.getInLayerEdgesGraph(),
    ports: [[E], [W, E + W, W], [W]],
    edges: ['0.0>1.1', '1.0>1.2', '1.1>2.0'],
  },
  {
    name: 'getInLayerEdgesGraphWhichResultsInCrossingsWhenSwitched',
    build: (c) => c.getInLayerEdgesGraphWhichResultsInCrossingsWhenSwitched(),
    ports: [[E], [W, W, W]],
    edges: ['0.0>1.2', '1.0>1.1'],
  },
  {
    name: 'getMultipleEdgesBetweenSameNodesGraph',
    build: (c) => c.getMultipleEdgesBetweenSameNodesGraph(),
    ports: [
      [E + E, E + E],
      [W + W, W + W],
    ],
    edges: ['0.0>1.1', '0.0>1.1', '0.1>1.0', '0.1>1.0'],
  },
  {
    name: 'getCrossWithExtraEdgeInBetweenGraph',
    build: (c) => c.getCrossWithExtraEdgeInBetweenGraph(),
    ports: [
      [E, E, E],
      [W, W, W],
    ],
    edges: ['0.0>1.2', '0.1>1.1', '0.2>1.0'],
  },
  {
    // the top-left and bottom-left nodes own a port before the six self loops (3 east, 3 west, two ports each); the
    // right nodes get theirs after
    name: 'getCrossWithManySelfLoopsGraph',
    build: (c) => c.getCrossWithManySelfLoopsGraph(),
    ports: [
      [E.repeat(7) + W.repeat(6), E.repeat(7) + W.repeat(6)],
      [E.repeat(6) + W.repeat(7), E.repeat(6) + W.repeat(7)],
    ],
    edges: ['0.0>1.1', '0.1>1.0'],
    keepEdge: (edge) => !edge.isSelfLoop(),
    // Java ends this builder without setUpIds: ports added after the mid-builder setUpIds keep their creation ids
    idsStale: true,
    details: (_c, g) => {
      const selfLoops = edgeList(g, (edge) => edge.isSelfLoop());
      expect(selfLoops).toHaveLength(24);
      expect(edgeList(g)).toHaveLength(26);
      expect(selfLoops.slice(0, 6)).toEqual(Array<string>(6).fill('0.0>0.0'));
      // the two ports created before the mid-builder setUpIds were renumbered 0 and 1; the self-loop ports got 2, 3, ...
      const topLeftPorts = allNodes(g)[0]!.getPorts();
      expect([topLeftPorts[0]!.id, topLeftPorts[1]!.id, topLeftPorts[2]!.id]).toEqual([0, 2, 3]);
    },
  },
  {
    name: 'getMoreComplexThreeLayerGraph',
    build: (c) => c.getMoreComplexThreeLayerGraph(),
    ports: [
      [E, E, E],
      [E + W + W + W, E + E + W],
      [W, W, W],
    ],
    edges: ['0.0>1.0', '0.1>1.0', '0.1>1.1', '0.2>1.0', '1.0>2.0', '1.0>2.1', '1.0>2.1', '1.1>2.2', '1.1>2.0'],
  },
  {
    name: 'getFixedPortOrderGraph',
    build: (c) => c.getFixedPortOrderGraph(),
    ports: [[E + E], [W, W]],
    edges: ['0.0>1.1', '0.0>1.0'],
    details: (_c, g) => {
      expect(allNodes(g).map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toEqual([
        PortConstraints.FIXED_ORDER,
        PortConstraints.FIXED_SIDE,
        PortConstraints.FIXED_SIDE,
      ]);
    },
  },
  {
    name: 'getGraphNoCrossingsDueToPortOrderNotFixed',
    build: (c) => c.getGraphNoCrossingsDueToPortOrderNotFixed(),
    ports: [[E + E], [W, W]],
    edges: ['0.0>1.1', '0.0>1.0'],
    details: (_c, g) => {
      expect(allNodes(g).map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toEqual([
        PortConstraints.FIXED_SIDE,
        PortConstraints.FIXED_SIDE,
        PortConstraints.FIXED_SIDE,
      ]);
    },
  },
  {
    name: 'getSwitchOnlyOneSided',
    build: (c) => c.getSwitchOnlyOneSided(),
    ports: [
      [E, E],
      [E + W, E + W],
      [W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.0', '1.0>2.0', '1.1>2.1'],
  },
  {
    name: 'getSwitchOnlyEastOneSided',
    build: (c) => c.getSwitchOnlyEastOneSided(),
    ports: [
      [E, E],
      [W + E, W + E],
      [W, W],
    ],
    edges: ['0.0>1.0', '0.1>1.1', '1.0>2.1', '1.1>2.0'],
  },
  {
    name: 'getFixedPortOrderInLayerEdgesDontCrossEachOther',
    build: (c) => c.getFixedPortOrderInLayerEdgesDontCrossEachOther(),
    ports: [[E + E, E + E]],
    edges: ['0.0>0.1', '0.0>0.1'],
    details: (_c, g) => {
      const [upper, lower] = allNodes(g);
      const [upperPorts, lowerPorts] = [upper!.getPorts(), lower!.getPorts()];
      // upper port of the upper node to the lower port of the lower node, and the lower to the upper
      expect(upperPorts[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(lowerPorts[1]);
      expect(upperPorts[1]!.getOutgoingEdges()[0]!.getTarget()).toBe(lowerPorts[0]);
      expect(allNodes(g).map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toEqual([
        PortConstraints.FIXED_ORDER,
        PortConstraints.FIXED_ORDER,
      ]);
    },
  },
  {
    name: 'getFixedPortOrderInLayerEdgesWithCrossings',
    build: (c) => c.getFixedPortOrderInLayerEdgesWithCrossings(),
    ports: [[E + E, E + E]],
    edges: ['0.0>0.1', '0.0>0.1'],
    details: (_c, g) => {
      const [upper, lower] = allNodes(g);
      expect(upper!.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(lower!.getPorts()[0]);
      expect(upper!.getPorts()[1]!.getOutgoingEdges()[0]!.getTarget()).toBe(lower!.getPorts()[1]);
    },
  },
  {
    name: 'getMoreComplexInLayerGraph',
    build: (c) => c.getMoreComplexInLayerGraph(),
    ports: [[E, E, E, E], [W.repeat(4) + E + E, W + W + W + E, W], [W]],
    edges: ['0.0>1.0', '0.1>1.0', '0.2>1.1', '0.3>1.1', '1.0>1.1', '1.0>1.2', '1.0>1.1', '1.0>2.0'],
    details: (_c, g) => {
      expect(allNodes(g).map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS).name())).toEqual([
        'FIXED_SIDE',
        'FIXED_SIDE',
        'FIXED_SIDE',
        'FIXED_SIDE',
        'FIXED_ORDER',
        'FIXED_ORDER',
        'FIXED_SIDE',
        'FIXED_SIDE',
      ]);
    },
  },
  {
    name: 'getGraphWhichCouldBeWorsenedBySwitch',
    build: (c) => c.getGraphWhichCouldBeWorsenedBySwitch(),
    ports: [
      [E + E, E + E],
      [E + W + W, E + W + W],
      [W, W],
    ],
    edges: ['0.0>1.0', '0.0>1.0', '0.1>1.1', '0.1>1.1', '1.0>2.1', '1.1>2.0'],
    details: (_c, g) => {
      const [leftTop, leftBottom, , , rightTop, rightBottom] = allNodes(g);
      expectSameElements(leftTop!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [leftBottom!]);
      expectSameElements(rightTop!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [rightBottom!]);
    },
  },
  {
    name: 'getNodesInDifferentLayoutUnitsPreventSwitch',
    build: (c) => c.getNodesInDifferentLayoutUnitsPreventSwitch(),
    ports: [
      [E, E],
      [W, W, E],
    ],
    edges: ['0.0>1.1', '0.1>1.0'],
    types: [
      [NORMAL, NORMAL],
      [NORMAL, NodeType.NORTH_SOUTH_PORT.name(), NORMAL],
    ],
    details: (_c, g) => {
      const [leftTop, leftBottom, rightTop, dummy, nsNode] = allNodes(g);
      expect(leftTop!.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(leftTop);
      expect(leftBottom!.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(leftBottom);
      expect(rightTop!.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(rightTop);
      expect(dummy!.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(nsNode);
      expect(nsNode!.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(nsNode);
      expect(dummy!.getProperty(InternalProperties.ORIGIN)).toBe(nsNode);
      expectSameElements(nsNode!.getProperty(InternalProperties.BARYCENTER_ASSOCIATES), [dummy!]);
      expectSameElements(nsNode!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [dummy!]);
      const originPort = nsNode!.getPorts()[0]!;
      expect(dummy!.getPorts()[0]!.getProperty(InternalProperties.ORIGIN)).toBe(originPort);
      expect(originPort.getProperty(InternalProperties.PORT_DUMMY)).toBe(dummy);
    },
  },
  {
    name: 'multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrder',
    build: (c) => c.multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrder(),
    ports: [
      [E + E, ''],
      [W, W + W + W],
    ],
    edges: ['0.0>1.1', '0.0>1.1', '1.0>1.1'],
  },
  {
    name: 'multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings',
    build: (c) => c.multipleInBetweenLayerEdgesIntoNodeWithNoFixedPortOrderCauseCrossings(),
    ports: [
      [E + E, ''],
      [W, W + W, W],
    ],
    edges: ['0.0>1.1', '0.0>1.1', '1.0>1.2'],
  },
  {
    name: 'getSwitchedProblemGraph',
    build: (c) => c.getSwitchedProblemGraph(),
    ports: [
      [E + E + E, E + E],
      [W, W, W + W, W],
    ],
    edges: ['0.0>1.0', '0.0>1.1', '0.0>1.2', '0.1>1.2', '0.1>1.3'],
  },
  {
    name: 'twoEdgesIntoSamePort',
    build: (c) => c.twoEdgesIntoSamePort(),
    ports: [
      [E, E + E],
      [W + W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.0', '0.1>1.0'],
  },
  {
    name: 'twoEdgesIntoSamePortCrossesWhenSwitched',
    build: (c) => c.twoEdgesIntoSamePortCrossesWhenSwitched(),
    ports: [
      [E, E + E],
      [W, W],
    ],
    edges: ['0.0>1.0', '0.1>1.0', '0.1>1.1'],
    details: (_c, g) => {
      expect(allNodes(g)[2]!.getPorts()[0]!.getIncomingEdges()).toHaveLength(2);
    },
  },
  {
    name: 'twoEdgesIntoSamePortResolvesCrossingWhenSwitched',
    build: (c) => c.twoEdgesIntoSamePortResolvesCrossingWhenSwitched(),
    ports: [
      [E, E + E],
      [W, W],
    ],
    edges: ['0.0>1.1', '0.1>1.1', '0.1>1.0'],
    details: (_c, g) => {
      expect(allNodes(g)[3]!.getPorts()[0]!.getIncomingEdges()).toHaveLength(2);
    },
  },
  {
    name: 'twoEdgesIntoSamePortFromEastWithFixedPortOrder',
    build: (c) => c.twoEdgesIntoSamePortFromEastWithFixedPortOrder(),
    ports: [
      [E, E],
      [W, W],
    ],
    edges: ['0.0>1.0', '0.1>1.1', '0.1>1.0'],
    details: (_c, g) => {
      expect(allNodes(g).map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS).name())).toEqual([
        'FIXED_SIDE',
        'FIXED_ORDER',
        'FIXED_ORDER',
        'FIXED_SIDE',
      ]);
      expect(allNodes(g)[1]!.getPorts()[0]!.getOutgoingEdges()).toHaveLength(2);
    },
  },
  {
    name: 'multipleEdgesIntoOnePortAndFreePortOrder',
    build: (c) => c.multipleEdgesIntoOnePortAndFreePortOrder(),
    ports: [[W + W, W, W + W]],
    edges: ['0.0>0.2', '0.0>0.2', '0.0>0.1'],
    details: (_c, g) => {
      expect(allNodes(g)[0]!.getPorts()[1]!.getOutgoingEdges()).toHaveLength(2);
    },
  },
  {
    name: 'getOnlyCorrectlyImprovedByBestOfForwardAndBackwardSweepsInSingleLayer',
    build: (c) => c.getOnlyCorrectlyImprovedByBestOfForwardAndBackwardSweepsInSingleLayer(),
    ports: [[E + E + E], [W, W, W + W + W]],
    edges: ['0.0>1.2', '0.0>1.2', '0.0>1.1', '1.0>1.2'],
    details: (_c, g) => {
      expect(allNodes(g)[0]!.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
    },
  },
];

describe.each(BUILDERS)('$name', (spec) => {
  let creator: TestGraphCreator;
  let graph: LGraph;

  beforeEach(() => {
    creator = new TestGraphCreator();
    graph = spec.build(creator);
  });

  it('has the layers, nodes and port sides of the Java builder', () => {
    expect(portSides(graph)).toEqual(spec.ports);
  });

  it('has the edges of the Java builder', () => {
    expect(edgeList(graph, spec.keepEdge)).toEqual(spec.edges);
  });

  it('has the node types of the Java builder', () => {
    expect(nodeTypes(graph)).toEqual(spec.types ?? spec.ports.map((layer) => layer.map(() => NORMAL)));
  });

  it('returns the creator graph, configured by setUpGraph', () => {
    expect(graph).toBe(creator.graph);
    expect(graph.getProperty(LayeredOptions.EDGE_ROUTING)).toBe(EdgeRouting.ORTHOGONAL);
    expect(graph.getProperty(LayeredOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.INCLUDE_CHILDREN);
    expect(graph.getProperty(InternalProperties.RANDOM)).toBe(creator.getRandom());
  });

  it('numbers layers, nodes per layer and ports per graph', () => {
    if (spec.idsStale === true) {
      creator.setUpIds();
    }
    let portId = 0;
    graph.getLayers().forEach((layer, layerIndex) => {
      expect(layer.id).toBe(layerIndex);
      layer.getNodes().forEach((node, nodeIndex) => {
        expect(node.id).toBe(nodeIndex);
        node.getPorts().forEach((port) => {
          expect(port.id).toBe(portId++);
        });
      });
    });
  });

  it('keeps the details of the Java builder', () => {
    spec.details?.(creator, graph);
  });
});

describe('TestGraphCreator constructor and getGraph', () => {
  it('starts with an empty configured graph and a MockRandom', () => {
    const creator = new TestGraphCreator();
    expect(creator.graph.getLayers()).toHaveLength(0);
    expect(creator.getGraph()).toBe(creator.graph);
    expect(creator.getRandom()).toBeInstanceOf(MockRandom);
    expect(creator.graph.getProperty(InternalProperties.RANDOM)).toBe(creator.getRandom());
    expect(creator.graph.getProperty(LayeredOptions.EDGE_ROUTING)).toBe(EdgeRouting.ORTHOGONAL);
  });

  it('getGraph re-applies setUpGraph and the ids', () => {
    const creator = new TestGraphCreator();
    const layer = creator.makeLayer();
    const node = creator.addNodeToLayer(layer);
    creator.graph.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.POLYLINE);
    layer.id = 42;
    node.id = 42;
    expect(creator.getGraph().getProperty(LayeredOptions.EDGE_ROUTING)).toBe(EdgeRouting.ORTHOGONAL);
    expect([layer.id, node.id]).toEqual([0, 0]);
  });

  it('getEmptyGraph replaces the graph with a new configured one', () => {
    const creator = new TestGraphCreator();
    const before = creator.getOneNodeGraph();
    const after = creator.getEmptyGraph();
    expect(after).not.toBe(before);
    expect(after).toBe(creator.graph);
    expect(after.getLayers()).toHaveLength(0);
    expect(after.getProperty(InternalProperties.RANDOM)).toBe(creator.getRandom());
  });

  it('setRandom replaces the random that setUpGraph installs', () => {
    const creator = new TestGraphCreator();
    const random = new MockRandom();
    creator.setRandom(random);
    expect(creator.getRandom()).toBe(random);
    expect(creator.getGraph().getProperty(InternalProperties.RANDOM)).toBe(random);
  });
});

describe('MockRandom', () => {
  it('advances a single-precision counter by 0.0001 per float draw', () => {
    const random = new MockRandom();
    const draws = [random.nextFloat(), random.nextFloat(), random.nextFloat()];
    // Java float arithmetic: each sum narrowed to float, so the values are not the doubles 0.0001, 0.0002, 0.0003
    expect(draws).toEqual([0.00009999999747378752, 0.00019999999494757503, 0.00029999998514540493]);
    for (const draw of draws) {
      expect(Math.fround(draw)).toBe(draw);
    }
  });

  it('draws doubles from the same sequence as floats', () => {
    const random = new MockRandom();
    expect(random.nextDouble()).toBe(0.00009999999747378752);
    expect(random.nextFloat()).toBe(0.00019999999494757503);
    expect(random.nextDouble()).toBe(0.00029999998514540493);
  });

  it('returns true from nextBoolean until told otherwise', () => {
    const random = new MockRandom();
    expect(random.nextBoolean()).toBe(true);
    random.setNextBoolean(false);
    expect(random.nextBoolean()).toBe(false);
    random.setNextBoolean(true);
    expect(random.nextBoolean()).toBe(true);
  });

  it('setChangeBy sets the step of later draws', () => {
    const random = new MockRandom();
    random.setChangeBy(0.5);
    expect([random.nextFloat(), random.nextDouble(), random.nextFloat()]).toEqual([0.5, 1, 1.5]);
  });

  it('setCurrent stores a Java float', () => {
    const random = new MockRandom();
    random.setChangeBy(0);
    random.setCurrent(0.1);
    // 0.1 as a float, not as the double 0.1
    expect(random.nextFloat()).toBe(0.10000000149011612);
    random.setChangeBy(1);
    random.setCurrent(2);
    expect(random.nextDouble()).toBe(3);
  });

  it('ignores the seed', () => {
    const random = new MockRandom();
    random.setSeed(7);
    expect(random.nextFloat()).toBe(0.00009999999747378752);
    expect(random.nextBoolean()).toBe(true);
  });
});

describe('TestGraphCreator primitives', () => {
  let creator: TestGraphCreator;

  beforeEach(() => {
    creator = new TestGraphCreator();
  });

  describe('makeLayer and makeLayers', () => {
    it('makeLayer() appends a layer to the creator graph', () => {
      const first = creator.makeLayer();
      const second = creator.makeLayer();
      expectSameElements(creator.graph.getLayers(), [first, second]);
      expect(first.getGraph()).toBe(creator.graph);
    });

    it('makeLayer(g) appends to the given graph only', () => {
      const other = creator.getEmptyGraph();
      creator.graph = creator.getEmptyGraph();
      const layer = creator.makeLayer(other);
      expectSameElements(other.getLayers(), [layer]);
      expect(creator.graph.getLayers()).toHaveLength(0);
      expect(layer.getGraph()).toBe(other);
    });

    it('makeLayers(amount) creates that many distinct layers in order', () => {
      const layers = creator.makeLayers(3);
      expect(layers).toHaveLength(3);
      expectSameElements(creator.graph.getLayers(), layers);
      expect(new Set(layers).size).toBe(3);
    });

    it('makeLayers(amount, g) creates the layers in the given graph', () => {
      const other = creator.getEmptyGraph();
      creator.graph = creator.getEmptyGraph();
      const layers = creator.makeLayers(2, other);
      expectSameElements(other.getLayers(), layers);
      expect(creator.graph.getLayers()).toHaveLength(0);
    });

    it('makeLayers(0) creates none', () => {
      expect(creator.makeLayers(0)).toEqual([]);
      expect(creator.graph.getLayers()).toHaveLength(0);
    });
  });

  describe('addNodeToLayer and addNodesToLayer', () => {
    it('adds a NORMAL node that is its own layout unit and numbers it by creation', () => {
      const layer = creator.makeLayer();
      const first = creator.addNodeToLayer(layer);
      const second = creator.addNodeToLayer(layer);
      expectSameElements(layer.getNodes(), [first, second]);
      expect(first.getLayer()).toBe(layer);
      expect(first.getGraph()).toBe(creator.graph);
      expect(first.getType()).toBe(NodeType.NORMAL);
      expect(first.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(first);
      expect([first.id, second.id]).toEqual([0, 1]);
    });

    it('the node counter spans layers', () => {
      const [left, right] = creator.makeLayers(2);
      creator.addNodeToLayer(left!);
      const node = creator.addNodeToLayer(right!);
      expect(node.id).toBe(1);
    });

    it('addNodesToLayer adds that many nodes in order', () => {
      const layer = creator.makeLayer();
      const nodes = creator.addNodesToLayer(3, layer);
      expectSameElements(layer.getNodes(), nodes);
      expect(nodes.map((n) => n.id)).toEqual([0, 1, 2]);
    });
  });

  describe('addPortOnSide and addPortsOnSide', () => {
    it('adds a port on the side, numbered by creation, and fixes the side of a free node', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.UNDEFINED);
      const first = creator.addPortOnSide(node, PortSide.NORTH);
      const second = creator.addPortOnSide(node, PortSide.SOUTH);
      expectSameElements(node.getPorts(), [first, second]);
      expect([first.getSide(), second.getSide()]).toEqual([PortSide.NORTH, PortSide.SOUTH]);
      expect([first.id, second.id]).toEqual([0, 1]);
      expect(first.getNode()).toBe(node);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_SIDE);
    });

    it('keeps constraints that already fix the sides', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      creator.setFixedOrderConstraint(node);
      creator.addPortOnSide(node, PortSide.EAST);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
    });

    it('addPortsOnSide adds n ports on that side in order', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const ports = creator.addPortsOnSide(3, node, PortSide.WEST);
      expectSameElements(node.getPorts(), ports);
      expect(ports.map((p) => p.getSide())).toEqual([PortSide.WEST, PortSide.WEST, PortSide.WEST]);
      expect(ports.map((p) => p.id)).toEqual([0, 1, 2]);
    });

    it('addPortTo adds a port without a side or constraint change', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const port = creator.addPortTo(node);
      expectSameElements(node.getPorts(), [port]);
      expect(port.getSide()).toBe(PortSide.UNDEFINED);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.UNDEFINED);
    });
  });

  describe('addEdgeBetweenPorts', () => {
    it('connects the ports and numbers edges by creation', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const [from, to] = creator.addPortsOnSide(2, node, PortSide.EAST);
      creator.addEdgeBetweenPorts(from!, to!);
      creator.addEdgeBetweenPorts(to!, from!);
      const forward = from!.getOutgoingEdges()[0]!;
      const backward = to!.getOutgoingEdges()[0]!;
      expect([forward.getSource(), forward.getTarget()]).toEqual([from, to]);
      expect(forward.getSource()).toBe(from);
      expect(forward.getTarget()).toBe(to);
      expect(backward.getSource()).toBe(to);
      expect(backward.getTarget()).toBe(from);
      expect([forward.id, backward.id]).toEqual([0, 1]);
    });

    it('selfLoopOn adds one self loop between two new ports of the side', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      creator.selfLoopOn(node, PortSide.WEST);
      expect(sidesOf(node)).toBe('WW');
      const edge = node.getPorts()[0]!.getOutgoingEdges()[0]!;
      expect(edge.isSelfLoop()).toBe(true);
      expect(edge.getTarget()).toBe(node.getPorts()[1]);
    });
  });

  describe('eastWestEdgeFromTo', () => {
    it('node to node adds an east port left and a west port right', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const left = creator.addNodeToLayer(leftLayer!);
      const right = creator.addNodeToLayer(rightLayer!);
      creator.eastWestEdgeFromTo(left, right);
      expect([sidesOf(left), sidesOf(right)]).toEqual(['E', 'W']);
      expect(left.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(right.getPorts()[0]);
    });

    it('port to node adds only the west port on the node', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const left = creator.addNodeToLayer(leftLayer!);
      const right = creator.addNodeToLayer(rightLayer!);
      const leftPort = creator.addPortOnSide(left, PortSide.EAST);
      creator.eastWestEdgeFromTo(leftPort, right);
      expect([sidesOf(left), sidesOf(right)]).toEqual(['E', 'W']);
      expect(leftPort.getOutgoingEdges()[0]!.getTarget()).toBe(right.getPorts()[0]);
    });

    it('node to port adds only the east port on the node', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const left = creator.addNodeToLayer(leftLayer!);
      const right = creator.addNodeToLayer(rightLayer!);
      const rightPort = creator.addPortOnSide(right, PortSide.WEST);
      creator.eastWestEdgeFromTo(left, rightPort);
      expect([sidesOf(left), sidesOf(right)]).toEqual(['E', 'W']);
      expect(left.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(rightPort);
    });

    it('eastWestEdgesFromTo adds that many parallel edges', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const left = creator.addNodeToLayer(leftLayer!);
      const right = creator.addNodeToLayer(rightLayer!);
      creator.eastWestEdgesFromTo(3, left, right);
      expect([sidesOf(left), sidesOf(right)]).toEqual(['EEE', 'WWW']);
      expect(edgeList(creator.graph)).toEqual(['0.0>1.0', '0.0>1.0', '0.0>1.0']);
    });
  });

  describe('addInLayerEdge', () => {
    it('node, node, side adds a port per node on that side and joins them', () => {
      const [first, second] = creator.addNodesToLayer(2, creator.makeLayer());
      creator.addInLayerEdge(first!, second!, PortSide.WEST);
      expect([sidesOf(first!), sidesOf(second!)]).toEqual(['W', 'W']);
      expect(first!.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(second!.getPorts()[0]);
    });

    it('node, port, side adds a port only on the node', () => {
      const [first, second] = creator.addNodesToLayer(2, creator.makeLayer());
      const port = creator.addPortOnSide(second!, PortSide.EAST);
      creator.addInLayerEdge(first!, port, PortSide.EAST);
      expect([sidesOf(first!), sidesOf(second!)]).toEqual(['E', 'E']);
      expect(first!.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(port);
    });

    it('port, node adds a port on the side of the given port', () => {
      const [first, second] = creator.addNodesToLayer(2, creator.makeLayer());
      const port = creator.addPortOnSide(first!, PortSide.WEST);
      creator.addInLayerEdge(port, second!);
      expect(sidesOf(second!)).toBe('W');
      expect(port.getOutgoingEdges()[0]!.getTarget()).toBe(second!.getPorts()[0]);
    });
  });

  describe('node markers and constraints', () => {
    it('setFixedOrderConstraint(node) sets FIXED_ORDER and returns the node as property holder', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const holder = creator.setFixedOrderConstraint(node);
      expect(holder).toBe(node);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
    });

    it('setFixedOrderConstraint(nodes) sets FIXED_ORDER on every node', () => {
      const nodes = creator.addNodesToLayer(3, creator.makeLayer());
      creator.setFixedOrderConstraint(nodes);
      expect(nodes.map((n) => n.getProperty(LayeredOptions.PORT_CONSTRAINTS))).toEqual([
        PortConstraints.FIXED_ORDER,
        PortConstraints.FIXED_ORDER,
        PortConstraints.FIXED_ORDER,
      ]);
    });

    it('setInLayerOrderConstraint replaces the successor constraints with the one node', () => {
      const [first, second, third] = creator.addNodesToLayer(3, creator.makeLayer());
      creator.setInLayerOrderConstraint(first!, second!);
      creator.setInLayerOrderConstraint(first!, third!);
      expectSameElements(first!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [third!]);
    });

    it('setAsLongEdgeDummy sets the type and removes the layout unit', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      expect(node.hasProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(true);
      creator.setAsLongEdgeDummy(node);
      expect(node.getType()).toBe(NodeType.LONG_EDGE);
      expect(node.hasProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT)).toBe(false);
    });

    it('setAsNorthSouthNode sets the type', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      creator.setAsNorthSouthNode(node);
      expect(node.getType()).toBe(NodeType.NORTH_SOUTH_PORT);
    });

    it('setPortOrderFixed fixes the order and flags the graph', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      creator.setPortOrderFixed(node);
      expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
      const flags = creator.graph.getProperty(InternalProperties.GRAPH_PROPERTIES);
      expect(flags.contains(GraphProperties.NON_FREE_PORTS)).toBe(true);
      expect(flags.contains(GraphProperties.EXTERNAL_PORTS)).toBe(false);
    });
  });

  describe('addNorthSouthEdge', () => {
    it('north side, edge out of the dummy, normal node in a later layer, existing associates kept', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const [nsNode, dummy, other] = creator.addNodesToLayer(3, leftLayer!);
      const ewNode = creator.addNodeToLayer(rightLayer!);
      nsNode!.setProperty(InternalProperties.BARYCENTER_ASSOCIATES, [other!]);

      creator.addNorthSouthEdge(PortSide.NORTH, nsNode!, dummy!, ewNode, false);

      // the normal node is east of the NS node: the dummy gets an east port and the normal node a west port
      expect([sidesOf(ewNode), sidesOf(dummy!), sidesOf(nsNode!)]).toEqual(['W', 'E', 'N']);
      expect(dummy!.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(ewNode.getPorts()[0]);
      expect(dummy!.getType()).toBe(NodeType.NORTH_SOUTH_PORT);
      expectSameElements(nsNode!.getProperty(InternalProperties.BARYCENTER_ASSOCIATES), [other!, dummy!]);
      // north: the dummy must precede the NS node
      expectSameElements(dummy!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [nsNode!]);
      expectSameElements(nsNode!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
    });

    it('south side, edge into the dummy, normal node in an earlier layer', () => {
      const [leftLayer, rightLayer] = creator.makeLayers(2);
      const ewNode = creator.addNodeToLayer(leftLayer!);
      const [nsNode, dummy] = creator.addNodesToLayer(2, rightLayer!);

      creator.addNorthSouthEdge(PortSide.SOUTH, nsNode!, dummy!, ewNode, true);

      expect([sidesOf(ewNode), sidesOf(dummy!), sidesOf(nsNode!)]).toEqual(['E', 'W', 'S']);
      expect(ewNode.getPorts()[0]!.getOutgoingEdges()[0]!.getTarget()).toBe(dummy!.getPorts()[0]);
      expectSameElements(nsNode!.getProperty(InternalProperties.BARYCENTER_ASSOCIATES), [dummy!]);
      // south: the NS node must precede the dummy
      expectSameElements(nsNode!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), [dummy!]);
      expectSameElements(dummy!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS), []);
    });
  });

  describe('setUpIds', () => {
    it('numbers the nested graph on its own, with layers, nodes per layer and ports restarting at 0', () => {
      const [layer] = creator.makeLayers(1);
      const [host, plain] = creator.addNodesToLayer(2, layer!);
      creator.addPortsOnSide(1, host!, PortSide.EAST);
      creator.addPortsOnSide(2, plain!, PortSide.WEST);

      const nested = creator.nestedGraph(host!);
      const [nestedFirst, nestedSecond] = creator.makeLayers(2, nested);
      const [a, b] = creator.addNodesToLayer(2, nestedFirst!);
      const c = creator.addNodeToLayer(nestedSecond!);
      creator.addPortsOnSide(2, a!, PortSide.EAST);
      creator.addPortsOnSide(1, b!, PortSide.EAST);
      creator.addPortsOnSide(1, c, PortSide.WEST);

      creator.setUpIds();

      expect(creator.graph.getLayers().map((l) => l.id)).toEqual([0]);
      expect([host!.id, plain!.id]).toEqual([0, 1]);
      expect(allNodes(creator.graph).flatMap((n) => n.getPorts().map((p) => p.id))).toEqual([0, 1, 2]);
      expect(nested.getLayers().map((l) => l.id)).toEqual([0, 1]);
      expect([a!.id, b!.id, c.id]).toEqual([0, 1, 0]);
      expect(allNodes(nested).flatMap((n) => n.getPorts().map((p) => p.id))).toEqual([0, 1, 2, 3]);
    });
  });

  describe('list and array helpers', () => {
    it('getCurrentOrder returns the nodes of each layer as arrays of the same objects', () => {
      const [left, right] = creator.makeLayers(2);
      const leftNodes = creator.addNodesToLayer(2, left!);
      const rightNodes = creator.addNodesToLayer(1, right!);
      const order = creator.getCurrentOrder(creator.graph);
      expect(order).toHaveLength(2);
      expectSameElements(order[0]!, leftNodes);
      expectSameElements(order[1]!, rightNodes);
    });

    it('getCurrentOrder is a copy, not the layer list', () => {
      const nodes = creator.addNodesToLayer(2, creator.makeLayer());
      const order = creator.getCurrentOrder(creator.graph);
      expect(order[0]).not.toBe(creator.graph.getLayers()[0]!.getNodes());
      expectSameElements(order[0]!, nodes);
    });

    it('copyOfNodesInLayer returns a copy of the same node objects in order', () => {
      const [, second] = creator.makeLayers(2);
      const nodes = creator.addNodesToLayer(3, second!);
      const copy = creator.copyOfNodesInLayer(1);
      expectSameElements(copy, nodes);
      expect(copy).not.toBe(second!.getNodes());
      copy.reverse();
      expectSameElements(second!.getNodes(), nodes);
    });

    it('copyOfNodesInLayer rejects an index outside the layers', () => {
      creator.makeLayer();
      expect(() => creator.copyOfNodesInLayer(1)).toThrow(IndexOutOfBoundsException);
    });

    it('switchOrderOfNodesInLayer swaps two positions in a copy', () => {
      const layer = creator.makeLayer();
      const [a, b, c] = creator.addNodesToLayer(3, layer);
      expectSameElements(creator.switchOrderOfNodesInLayer(0, 2, layer), [c!, b!, a!]);
      expectSameElements(layer.getNodes(), [a!, b!, c!]);
    });

    it('copyOfSwitchOrderOfNodesInLayer swaps two positions of the copy of a layer', () => {
      const layer = creator.makeLayer();
      const [a, b, c] = creator.addNodesToLayer(3, layer);
      expectSameElements(creator.copyOfSwitchOrderOfNodesInLayer(0, 1, 0), [b!, a!, c!]);
      expectSameElements(layer.getNodes(), [a!, b!, c!]);
    });

    it('getCopyWithSwitchedOrder swaps two positions in a copy of the given list', () => {
      const [a, b, c] = creator.addNodesToLayer(3, creator.makeLayer());
      const list = [a!, b!, c!];
      expectSameElements(creator.getCopyWithSwitchedOrder(1, 2, list), [a!, c!, b!]);
      expectSameElements(list, [a!, b!, c!]);
    });

    it('copyPortsInIndexOrder picks the ports by index, repeating allowed', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const ports = creator.addPortsOnSide(3, node, PortSide.EAST);
      expectSameElements(creator.copyPortsInIndexOrder(node, 2, 0, 2), [ports[2]!, ports[0]!, ports[2]!]);
      expect(creator.copyPortsInIndexOrder(node)).toEqual([]);
    });

    it('getListCopyInIndexOrder picks the elements by index', () => {
      expect(creator.getListCopyInIndexOrder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a']);
      expect(() => creator.getListCopyInIndexOrder(['a'], 1)).toThrow(IndexOutOfBoundsException);
    });

    it('getArrayInIndexOrder overwrites the leading positions of a copy', () => {
      const source = ['a', 'b', 'c'];
      expect(creator.getArrayInIndexOrder(source, 2, 1)).toEqual(['c', 'b', 'c']);
      expect(creator.getArrayInIndexOrder(source)).toEqual(['a', 'b', 'c']);
      expect(source).toEqual(['a', 'b', 'c']);
    });

    it('copyOfListSwitchingOrder swaps two positions in a copy', () => {
      const source = ['a', 'b', 'c'];
      expect(creator.copyOfListSwitchingOrder(0, 2, source)).toEqual(['c', 'b', 'a']);
      expect(source).toEqual(['a', 'b', 'c']);
      expect(() => creator.copyOfListSwitchingOrder(0, 3, source)).toThrow(IndexOutOfBoundsException);
    });

    it('switchOrderInArray swaps two positions in a copy', () => {
      const source = ['a', 'b', 'c'];
      expect(creator.switchOrderInArray(1, 2, source)).toEqual(['a', 'c', 'b']);
      expect(source).toEqual(['a', 'b', 'c']);
    });
  });

  describe('external port dummies', () => {
    it('addExternalPortDummyNodeToLayer links dummy and port and flags the graph', () => {
      const [hostLayer, dummyLayer] = creator.makeLayers(2);
      const host = creator.addNodeToLayer(hostLayer!);
      const port = creator.addPortOnSide(host, PortSide.WEST);
      const dummy = creator.addExternalPortDummyNodeToLayer(dummyLayer!, port);
      expectSameElements(dummyLayer!.getNodes(), [dummy]);
      expect(dummy.getType()).toBe(NodeType.EXTERNAL_PORT);
      expect(dummy.getProperty(InternalProperties.ORIGIN)).toBe(port);
      expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE)).toBe(PortSide.WEST);
      expect(port.getProperty(InternalProperties.PORT_DUMMY)).toBe(dummy);
      expect(port.getProperty(InternalProperties.INSIDE_CONNECTIONS)).toBe(true);
      expect(
        creator.graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS),
      ).toBe(true);
    });

    it('addExternalPortDummiesToLayer keeps east port order and reverses west port order', () => {
      const [hostLayer, dummyLayer] = creator.makeLayers(2);
      const host = creator.addNodeToLayer(hostLayer!);
      const eastPorts = creator.addPortsOnSide(3, host, PortSide.EAST);
      const eastDummies = creator.addExternalPortDummiesToLayer(dummyLayer!, eastPorts);
      expect(eastDummies.map((d) => d.getProperty(InternalProperties.ORIGIN))).toEqual(eastPorts);
      expectSameElements(
        eastDummies.map((d) => d.getProperty(InternalProperties.ORIGIN)),
        eastPorts,
      );

      const westPorts = creator.addPortsOnSide(3, host, PortSide.WEST);
      const westDummies = creator.addExternalPortDummiesToLayer(dummyLayer!, westPorts);
      expectSameElements(
        westDummies.map((d) => d.getProperty(InternalProperties.ORIGIN)),
        [westPorts[2]!, westPorts[1]!, westPorts[0]!],
      );
      expectSameElements(dummyLayer!.getNodes(), [...eastDummies, ...westDummies]);
    });
  });

  describe('nestedGraph and setOnAllGraphs', () => {
    it('nestedGraph creates a configured child graph once and marks the node compound', () => {
      const node = creator.addNodeToLayer(creator.makeLayer());
      const nested = creator.nestedGraph(node);
      expect(node.getNestedGraph()).toBe(nested);
      expect(nested.getParentNode()).toBe(node);
      expect(node.getProperty(InternalProperties.COMPOUND_NODE)).toBe(true);
      expect(nested.getProperty(LayeredOptions.EDGE_ROUTING)).toBe(EdgeRouting.ORTHOGONAL);
      expect(nested.getProperty(InternalProperties.RANDOM)).toBe(creator.getRandom());
      expect(nested).not.toBe(creator.graph);
      expect(creator.nestedGraph(node)).toBe(nested);
    });

    it('setOnAllGraphs sets the property on the graph and on every nested graph, at any depth', () => {
      const probe = new Property<number>('test.probe', 0);
      const node = creator.addNodeToLayer(creator.makeLayer());
      const nested = creator.nestedGraph(node);
      const innerNode = creator.addNodeToLayer(creator.makeLayer(nested));
      const innermost = creator.nestedGraph(innerNode);
      const unrelated = creator.getEmptyGraph();

      creator.setOnAllGraphs(probe, 7, nested);
      expect([nested.getProperty(probe), innermost.getProperty(probe)]).toEqual([7, 7]);
      expect(unrelated.getProperty(probe)).toBe(0);

      creator.graph = node.getGraph()!;
      creator.setOnAllGraphs(probe, 9, creator.graph);
      expect([creator.graph.getProperty(probe), nested.getProperty(probe), innermost.getProperty(probe)]).toEqual([
        9, 9, 9,
      ]);
    });
  });
});
