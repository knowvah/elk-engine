// SPDX-License-Identifier: EPL-2.0
// Structural checks of the ported NorthSouthEdgeTestGraphCreator (mission 7c-tests, T3b). Every expectation is derived
// by hand from the Java builder in NorthSouthEdgeTestGraphCreator.java and from the helpers it calls in
// TestGraphCreator.java: nodes and ports in creation order, edges as `layer.node>layer.node` in iteration order
// (layer, node, port, outgoing edge), nodes and layers by index. `addNorthSouthEdge(side, ns, dummy, ew, ewIsOrigin)`
// puts the dummy and the edge on `ew`'s side: `ew` in an earlier layer than `ns` gives the dummy a WEST port and `ew` an
// EAST port, otherwise the dummy gets an EAST port and `ew` a WEST port; the edge runs `ew` to the dummy when `ewIsOrigin`
// and dummy to `ew` otherwise; `ns` gets a `side` port, and the dummy gets type NORTH_SOUTH_PORT, ORIGIN `ns` and
// IN_LAYER_LAYOUT_UNIT `ns`.
import { beforeAll, describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { NorthSouthEdgeTestGraphCreator } from './NorthSouthEdgeTestGraphCreator.js';
import { TestGraphCreator } from './TestGraphCreator.js';

// addNorthSouthEdge reads list-valued option defaults, which are cloned through ElkReflect
beforeAll(() => LayoutMetaDataService.initElkReflect());

const SIDE_LETTERS: ReadonlyMap<PortSide, string> = new Map([
  [PortSide.EAST, 'E'],
  [PortSide.WEST, 'W'],
  [PortSide.NORTH, 'N'],
  [PortSide.SOUTH, 'S'],
]);
const E = 'E';
const W = 'W';
const N = 'N';
const S = 'S';

/** Node type codes, one character per node: normal, north/south port dummy, long edge dummy. */
const TYPE_BY_CODE: Readonly<Record<string, NodeType>> = {
  n: NodeType.NORMAL,
  s: NodeType.NORTH_SOUTH_PORT,
  l: NodeType.LONG_EDGE,
};

function nodesOf(graph: LGraph): LNode[] {
  return graph.getLayers().flatMap((layer) => layer.getNodes());
}

function position(node: LNode): string {
  const layer = node.getLayer();
  return `${layer?.getIndex()}.${layer?.getNodes().indexOf(node)}`;
}

function sidesOf(node: LNode): string {
  return node
    .getPorts()
    .map((port) => SIDE_LETTERS.get(port.getSide()))
    .join('');
}

/** All edges as `layer.node>layer.node`, in iteration order (layer, node, port, outgoing edge). */
function edgeList(graph: LGraph): string[] {
  return nodesOf(graph)
    .flatMap((node) => node.getPorts())
    .flatMap((port) => port.getOutgoingEdges())
    .map((edge) => `${position(edge.getSource()!.getNode()!)}>${position(edge.getTarget()!.getNode()!)}`);
}

/** The ORIGIN node of a node as a position, `null` when unset. */
function originOf(node: LNode): string | null {
  const origin = node.getProperty(InternalProperties.ORIGIN);
  return origin instanceof LNode ? position(origin) : null;
}

/** The IN_LAYER_LAYOUT_UNIT of a node as a position, `null` when unset. */
function unitOf(node: LNode): string | null {
  const unit = node.getProperty(InternalProperties.IN_LAYER_LAYOUT_UNIT) as LNode | null;
  return unit === null ? null : position(unit);
}

/** For every node with ports whose ORIGIN is a port: `dummy>owner-of-origin-port:side` of that port, in order. */
function portLinks(graph: LGraph): string[] {
  return nodesOf(graph).flatMap((node) =>
    node
      .getPorts()
      .map((port) => port.getProperty(InternalProperties.ORIGIN))
      .filter((origin): origin is LPort => origin instanceof LPort)
      .map((origin) => `${position(node)}>${position(origin.getNode()!)}:${SIDE_LETTERS.get(origin.getSide())}`),
  );
}

interface BuilderCase {
  readonly name: string;
  readonly build: (creator: NorthSouthEdgeTestGraphCreator) => LGraph;
  /** port sides per node per layer in port order; its shape is also the layer and node count */
  readonly ports: string[][];
  /** node types per layer, one code character per node */
  readonly types: string[];
  readonly edges: string[];
  /** nodes whose ORIGIN is a node (position to position) */
  readonly origins?: Readonly<Record<string, string>>;
  /** nodes whose layout unit is not themselves (position to position, `null` for no unit) */
  readonly units?: Readonly<Record<string, string | null>>;
  /** `dummy>owner:side` of every dummy port that has an ORIGIN port */
  readonly links?: string[];
  /** the dummies whose origin port has no PORT_DUMMY back link (the Java builder does not set it) */
  readonly noBackLink?: boolean;
  /** nodes that carry FIXED_ORDER port constraints */
  readonly fixed?: string[];
}

const BUILDERS: readonly BuilderCase[] = [
  {
    name: 'getNorthSouthUpwardCrossingGraph',
    build: (c) => c.getNorthSouthUpwardCrossingGraph(),
    ports: [
      [E, E, N + N],
      [W, W],
    ],
    types: ['ssn', 'nn'],
    edges: ['0.0>1.0', '0.1>1.1'],
    origins: { '0.0': '0.2', '0.1': '0.2' },
    units: { '0.0': '0.2', '0.1': '0.2' },
    links: ['0.0>0.2:N', '0.1>0.2:N'],
    fixed: ['0.2'],
  },
  {
    name: 'getNorthSouthUpwardMultipleCrossingGraph',
    build: (c) => c.getNorthSouthUpwardMultipleCrossingGraph(),
    ports: [
      [E, E, E, N + N + N],
      [W, W, W],
    ],
    types: ['sssn', 'nnn'],
    edges: ['0.0>1.0', '0.1>1.1', '0.2>1.2'],
    origins: { '0.0': '0.3', '0.1': '0.3', '0.2': '0.3' },
    units: { '0.0': '0.3', '0.1': '0.3', '0.2': '0.3' },
    links: ['0.0>0.3:N', '0.1>0.3:N', '0.2>0.3:N'],
    fixed: ['0.3'],
  },
  {
    name: 'getThreeLayerNorthSouthCrossingGraph',
    build: (c) => c.getThreeLayerNorthSouthCrossingGraph(),
    ports: [[E], [S + S + W, E, E], [W + W]],
    types: ['n', 'nss', 'n'],
    edges: ['0.0>1.0', '1.1>2.0', '1.2>2.0'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    fixed: ['1.0', '2.0'],
  },
  {
    // the Java builder sets ORIGIN on the dummies and their ports by hand: no layout units, no PORT_DUMMY back links
    name: 'getThreeLayerNorthSouthCrossingShouldSwitchGraph',
    build: (c) => c.getThreeLayerNorthSouthCrossingShouldSwitchGraph(),
    ports: [[''], [S + S, E, E], [W, W]],
    types: ['n', 'nss', 'nn'],
    edges: ['1.1>2.0', '1.2>2.1'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    noBackLink: true,
    fixed: ['1.0'],
  },
  {
    name: 'getSouthernNorthSouthDummyEdgeCrossingGraph',
    build: (c) => c.getSouthernNorthSouthDummyEdgeCrossingGraph(),
    ports: [[E], [S, W + E, E], [W, W]],
    types: ['n', 'nls', 'nn'],
    edges: ['0.0>1.1', '1.1>2.0', '2.1>1.2'],
    origins: { '1.2': '1.0' },
    units: { '1.1': null, '1.2': '1.0' },
    links: ['1.2>1.0:S'],
  },
  {
    name: 'getSouthernNorthSouthDummyEdgeTwoCrossingGraph',
    build: (c) => c.getSouthernNorthSouthDummyEdgeTwoCrossingGraph(),
    ports: [[E], [S + S, W + E, E, E], [W, W, W]],
    types: ['n', 'nlss', 'nnn'],
    edges: ['0.0>1.1', '1.1>2.0', '2.1>1.2', '2.2>1.3'],
    origins: { '1.2': '1.0', '1.3': '1.0' },
    units: { '1.1': null, '1.2': '1.0', '1.3': '1.0' },
    links: ['1.2>1.0:S', '1.3>1.0:S'],
  },
  {
    name: 'getSouthernTwoDummyEdgeAndNorthSouthCrossingGraph',
    build: (c) => c.getSouthernTwoDummyEdgeAndNorthSouthCrossingGraph(),
    ports: [
      [E, E],
      [S + S, W + E, E, W + E, E],
      [W, W, W, W],
    ],
    types: ['nn', 'nlsls', 'nnnn'],
    edges: ['0.0>1.1', '0.1>1.3', '1.1>2.0', '1.3>2.2', '2.1>1.2', '2.3>1.4'],
    origins: { '1.2': '1.0', '1.4': '1.0' },
    units: { '1.1': null, '1.3': null, '1.2': '1.0', '1.4': '1.0' },
    links: ['1.2>1.0:S', '1.4>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getNorthernNorthSouthDummyEdgeCrossingGraph',
    build: (c) => c.getNorthernNorthSouthDummyEdgeCrossingGraph(),
    ports: [[E], [E, W + E, N], [W, W]],
    types: ['n', 'sln', 'nn'],
    edges: ['0.0>1.1', '1.1>2.1', '2.0>1.0'],
    origins: { '1.0': '1.2' },
    units: { '1.0': '1.2', '1.1': null },
    links: ['1.0>1.2:N'],
  },
  {
    // setType(LONG_EDGE) only: unlike setAsLongEdgeDummy it leaves the layout unit on the node itself
    name: 'getSouthPortOnNormalNodeBelowLongEdgeDummy',
    build: (c) => c.getSouthPortOnNormalNodeBelowLongEdgeDummy(),
    ports: [[E], [W + E, S, E], [W, W]],
    types: ['n', 'lns', 'nn'],
    edges: ['0.0>1.0', '1.0>2.0', '1.2>2.1'],
    origins: { '1.2': '1.1' },
    units: { '1.2': '1.1' },
    links: ['1.2>1.1:S'],
  },
  {
    name: 'getNorthPortOndNormalNodeAboveLongEdgeDummy',
    build: (c) => c.getNorthPortOndNormalNodeAboveLongEdgeDummy(),
    ports: [[E], [E, N, W + E], [W, W]],
    types: ['n', 'snl', 'nn'],
    edges: ['0.0>1.2', '1.0>2.0', '1.2>2.1'],
    origins: { '1.0': '1.1' },
    units: { '1.0': '1.1' },
    links: ['1.0>1.1:N'],
  },
  {
    name: 'getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide',
    build: (c) => c.getLongEdgeDummyAndNormalNodeWithUnusedPortsOnSouthernSide(),
    ports: [[E], [S + S, W + E], [W]],
    types: ['n', 'nl', 'n'],
    edges: ['0.0>1.1', '1.1>2.0'],
    units: { '1.1': null },
    fixed: ['1.0'],
  },
  {
    name: 'getLongEdgeDummyAndNormalNodeWithUnusedPortsOnNorthernSide',
    build: (c) => c.getLongEdgeDummyAndNormalNodeWithUnusedPortsOnNorthernSide(),
    ports: [[E], [W + E, N + N], [W]],
    types: ['n', 'ln', 'n'],
    edges: ['0.0>1.0', '1.0>2.0'],
  },
  {
    name: 'getMultipleNorthSouthAndLongEdgeDummiesOnBothSides',
    build: (c) => c.getMultipleNorthSouthAndLongEdgeDummiesOnBothSides(),
    ports: [
      [E, E],
      [E, E, W + E, N + N + S + S, W + E, E, E],
      [W, W, W, '', W + W, W],
    ],
    types: ['nn', 'sslnlss', 'nnnnnn'],
    edges: ['0.0>1.2', '0.1>1.4', '1.0>2.0', '1.1>2.1', '1.2>2.2', '1.4>2.4', '1.5>2.4', '1.6>2.5'],
    origins: { '1.0': '1.3', '1.1': '1.3', '1.5': '1.3', '1.6': '1.3' },
    units: { '1.0': '1.3', '1.1': '1.3', '1.2': null, '1.4': null, '1.5': '1.3', '1.6': '1.3' },
    links: ['1.0>1.3:N', '1.1>1.3:N', '1.5>1.3:S', '1.6>1.3:S'],
  },
  {
    name: 'getNorthSouthDownwardCrossingGraph',
    build: (c) => c.getNorthSouthDownwardCrossingGraph(),
    ports: [
      [S + S, E, E],
      [W, W],
    ],
    types: ['nss', 'nn'],
    edges: ['0.1>1.0', '0.2>1.1'],
    origins: { '0.1': '0.0', '0.2': '0.0' },
    units: { '0.1': '0.0', '0.2': '0.0' },
    links: ['0.1>0.0:S', '0.2>0.0:S'],
    fixed: ['0.0'],
  },
  {
    name: 'getNorthSouthDownwardMultipleCrossingGraph',
    build: (c) => c.getNorthSouthDownwardMultipleCrossingGraph(),
    ports: [
      [S + S + S, E, E, E],
      [W, W, W],
    ],
    types: ['nsss', 'nnn'],
    edges: ['0.1>1.0', '0.2>1.1', '0.3>1.2'],
    origins: { '0.1': '0.0', '0.2': '0.0', '0.3': '0.0' },
    units: { '0.1': '0.0', '0.2': '0.0', '0.3': '0.0' },
    links: ['0.1>0.0:S', '0.2>0.0:S', '0.3>0.0:S'],
    fixed: ['0.0'],
  },
  {
    name: 'getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings',
    build: (c) => c.getSouthernNorthSouthGraphEdgesFromEastAndWestNoCrossings(),
    ports: [[E], [S + S, E, W], [W]],
    types: ['n', 'nss', 'n'],
    edges: ['0.0>1.2', '1.1>2.0'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings',
    build: (c) => c.getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossings(),
    ports: [[E], [W, E, N + N], [W]],
    types: ['n', 'ssn', 'n'],
    edges: ['0.0>1.0', '1.1>2.0'],
    origins: { '1.0': '1.2', '1.1': '1.2' },
    units: { '1.0': '1.2', '1.1': '1.2' },
    links: ['1.0>1.2:N', '1.1>1.2:N'],
    fixed: ['1.2'],
  },
  {
    name: 'getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossingsUpperEdgeEast',
    build: (c) => c.getNorthernNorthSouthGraphEdgesFromEastAndWestNoCrossingsUpperEdgeEast(),
    ports: [[E], [E, W, N + N], [W]],
    types: ['n', 'ssn', 'n'],
    edges: ['0.0>1.1', '1.0>2.0'],
    origins: { '1.0': '1.2', '1.1': '1.2' },
    units: { '1.0': '1.2', '1.1': '1.2' },
    links: ['1.0>1.2:N', '1.1>1.2:N'],
    fixed: ['1.2'],
  },
  {
    name: 'getNorthSouthEdgesFromEastAndWestAndCross',
    build: (c) => c.getNorthSouthEdgesFromEastAndWestAndCross(),
    ports: [[E], [S + S, W, E], [W]],
    types: ['n', 'nss', 'n'],
    edges: ['0.0>1.1', '1.2>2.0'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getSouthernNorthSouthEdgesBothToEast',
    build: (c) => c.getSouthernNorthSouthEdgesBothToEast(),
    ports: [
      [S + S, E, E],
      [W, W],
    ],
    types: ['nss', 'nn'],
    edges: ['0.1>1.0', '0.2>1.1'],
    origins: { '0.1': '0.0', '0.2': '0.0' },
    units: { '0.1': '0.0', '0.2': '0.0' },
    links: ['0.1>0.0:S', '0.2>0.0:S'],
    fixed: ['0.0'],
  },
  {
    name: 'getNorthSouthSouthernTwoWesternEdges',
    build: (c) => c.getNorthSouthSouthernTwoWesternEdges(),
    ports: [
      [E, E],
      [S + S, W, W],
    ],
    types: ['nn', 'nss'],
    edges: ['0.0>1.1', '0.1>1.2'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getNorthSouthSouthernThreeWesternEdges',
    build: (c) => c.getNorthSouthSouthernThreeWesternEdges(),
    ports: [
      [E, E, E],
      [S + S + S, W, W, W],
    ],
    types: ['nnn', 'nsss'],
    edges: ['0.0>1.1', '0.1>1.2', '0.2>1.3'],
    origins: { '1.1': '1.0', '1.2': '1.0', '1.3': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0', '1.3': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S', '1.3>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getNorthSouthNorthernWesternEdges',
    build: (c) => c.getNorthSouthNorthernWesternEdges(),
    ports: [
      [E, E],
      [W, W, N + N],
    ],
    types: ['nn', 'ssn'],
    edges: ['0.0>1.0', '0.1>1.1'],
    origins: { '1.0': '1.2', '1.1': '1.2' },
    units: { '1.0': '1.2', '1.1': '1.2' },
    links: ['1.0>1.2:N', '1.1>1.2:N'],
    fixed: ['1.2'],
  },
  {
    name: 'getNorthSouthNorthernEasternPortToWestWesternPortToEast',
    build: (c) => c.getNorthSouthNorthernEasternPortToWestWesternPortToEast(),
    ports: [[E], [W, E, N + N], [W]],
    types: ['n', 'ssn', 'n'],
    edges: ['0.0>1.0', '1.1>2.0'],
    origins: { '1.0': '1.2', '1.1': '1.2' },
    units: { '1.0': '1.2', '1.1': '1.2' },
    links: ['1.0>1.2:N', '1.1>1.2:N'],
    fixed: ['1.2'],
  },
  {
    name: 'getNorthSouthAllSidesMultipleCrossings',
    build: (c) => c.getNorthSouthAllSidesMultipleCrossings(),
    ports: [[E], [E, E, W, N + N + N + S + S + S, E, E, E], [W, W, W, W, W]],
    types: ['n', 'sssnsss', 'nnnnn'],
    edges: ['0.0>1.2', '1.0>2.0', '1.1>2.1', '1.4>2.2', '1.5>2.3', '1.6>2.4'],
    origins: { '1.0': '1.3', '1.1': '1.3', '1.2': '1.3', '1.4': '1.3', '1.5': '1.3', '1.6': '1.3' },
    units: { '1.0': '1.3', '1.1': '1.3', '1.2': '1.3', '1.4': '1.3', '1.5': '1.3', '1.6': '1.3' },
    links: ['1.0>1.3:N', '1.1>1.3:N', '1.2>1.3:N', '1.4>1.3:S', '1.5>1.3:S', '1.6>1.3:S'],
    fixed: ['1.3'],
  },
  {
    name: 'getNorthSouthSouthernWesternPortToEastAndEasternPortToWest',
    build: (c) => c.getNorthSouthSouthernWesternPortToEastAndEasternPortToWest(),
    ports: [[E], [S + S, E, W], [W]],
    types: ['n', 'nss', 'n'],
    edges: ['0.0>1.2', '1.1>2.0'],
    origins: { '1.1': '1.0', '1.2': '1.0' },
    units: { '1.1': '1.0', '1.2': '1.0' },
    links: ['1.1>1.0:S', '1.2>1.0:S'],
    fixed: ['1.0'],
  },
  {
    name: 'getGraphWhereLayoutUnitPreventsSwitch',
    build: (c) => c.getGraphWhereLayoutUnitPreventsSwitch(),
    ports: [
      [S, E, E, N],
      [W, W],
    ],
    types: ['nssn', 'nn'],
    edges: ['0.1>1.1', '0.2>1.0'],
    origins: { '0.1': '0.0', '0.2': '0.3' },
    units: { '0.1': '0.0', '0.2': '0.3' },
    links: ['0.1>0.0:S', '0.2>0.3:N'],
    fixed: ['0.0', '0.3'],
  },
  {
    name: 'getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithNorthernEdges',
    build: (c) => c.getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithNorthernEdges(),
    ports: [
      [E, N + E, E],
      [W, W, W],
    ],
    types: ['snn', 'nnn'],
    edges: ['0.0>1.0', '0.1>1.2', '0.2>1.1'],
    origins: { '0.0': '0.1' },
    units: { '0.0': '0.1' },
    links: ['0.0>0.1:N'],
  },
  {
    name: 'getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithSouthernEdges',
    build: (c) => c.getGraphLayoutUnitPreventsSwitchWithNodeWithNodeWithSouthernEdges(),
    ports: [
      [E, E + S, E, ''],
      [W, W, W],
    ],
    types: ['nnsn', 'nnn'],
    edges: ['0.0>1.1', '0.1>1.0', '0.2>1.2'],
    origins: { '0.2': '0.1' },
    units: { '0.2': '0.1' },
    links: ['0.2>0.1:S'],
  },
  {
    name: 'getGraphLayoutUnitDoesNotPreventSwitchWithLongEdgeDummy',
    build: (c) => c.getGraphLayoutUnitDoesNotPreventSwitchWithLongEdgeDummy(),
    ports: [[E], [W + E, E + E + S, E, ''], [W + W, W, W]],
    types: ['n', 'lnsn', 'nnn'],
    edges: ['0.0>1.0', '1.0>2.1', '1.1>2.0', '1.1>2.0', '1.2>2.2'],
    origins: { '1.2': '1.1' },
    units: { '1.0': null, '1.2': '1.1' },
    links: ['1.2>1.1:S'],
  },
];

describe('NorthSouthEdgeTestGraphCreator', () => {
  it('is a TestGraphCreator and declares exactly the 30 Java builders', () => {
    expect(new NorthSouthEdgeTestGraphCreator()).toBeInstanceOf(TestGraphCreator);
    const own = Object.getOwnPropertyNames(NorthSouthEdgeTestGraphCreator.prototype).filter((n) => n !== 'constructor');
    expect(own).toEqual(BUILDERS.map((b) => b.name));
  });
});

for (const builder of BUILDERS) {
  describe(builder.name, () => {
    const build = (): LGraph => builder.build(new NorthSouthEdgeTestGraphCreator());

    it('has the layers, nodes and port sides of the Java builder', () => {
      const graph = build();
      expect(graph.getLayers()).toHaveLength(builder.ports.length);
      expect(graph.getLayers().map((layer) => layer.getNodes().map(sidesOf))).toEqual(builder.ports);
    });

    it('has the edges of the Java builder', () => {
      const edges = edgeList(build());
      expect(edges).toHaveLength(builder.edges.length);
      expect(edges).toEqual(builder.edges);
    });

    it('has the node types of the Java builder', () => {
      const graph = build();
      expect(graph.getLayers().map((layer) => layer.getNodes().map((node) => node.getType().name()))).toEqual(
        builder.types.map((layer) => [...layer].map((code) => TYPE_BY_CODE[code]!.name())),
      );
      expect(builder.types.map((layer) => layer.length)).toEqual(builder.ports.map((layer) => layer.length));
    });

    it('links the dummies to their origin nodes and layout units', () => {
      const nodes = nodesOf(build());
      const origins = builder.origins ?? {};
      const units = builder.units ?? {};
      for (const node of nodes) {
        const at = position(node);
        expect([at, originOf(node)]).toEqual([at, origins[at] ?? null]);
        expect([at, unitOf(node)]).toEqual([at, at in units ? units[at] : at]);
      }
    });

    it('links the dummy ports to the north/south ports of their origin nodes', () => {
      const graph = build();
      expect(portLinks(graph)).toEqual(builder.links ?? []);
      const linked = nodesOf(graph)
        .flatMap((node) => node.getPorts())
        .map((port) => ({ dummy: port.getNode(), origin: port.getProperty(InternalProperties.ORIGIN) }))
        .filter((link): link is { dummy: LNode; origin: LPort } => link.origin instanceof LPort);
      expect(linked).toHaveLength((builder.links ?? []).length);
      for (const { dummy, origin } of linked) {
        // PORT_DUMMY is unset (null) on a port whose back link the Java builder does not set
        expect(origin.getProperty(InternalProperties.PORT_DUMMY)).toBe(builder.noBackLink === true ? null : dummy);
      }
    });

    it('sets FIXED_ORDER on the listed nodes and FIXED_SIDE on every other node with ports', () => {
      const graph = build();
      const fixed = builder.fixed ?? [];
      builder.ports.forEach((layer, l) =>
        layer.forEach((sides, n) => {
          const node = graph.getLayers()[l]!.getNodes()[n]!;
          const expected = fixed.includes(`${l}.${n}`)
            ? PortConstraints.FIXED_ORDER
            : sides.length > 0
              ? PortConstraints.FIXED_SIDE
              : PortConstraints.UNDEFINED;
          expect(node.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(expected);
        }),
      );
    });

    it('numbers layers, nodes per layer and ports per graph on getGraph', () => {
      const graph = build();
      expect(graph.getLayers().map((layer) => layer.id)).toEqual(builder.ports.map((_l, i) => i));
      expect(graph.getLayers().map((layer) => layer.getNodes().map((node) => node.id))).toEqual(
        builder.ports.map((layer) => layer.map((_n, i) => i)),
      );
      const portIds = nodesOf(graph).flatMap((node) => node.getPorts().map((port) => port.id));
      expect(portIds).toEqual(portIds.map((_id, i) => i));
    });

    it('returns the creator graph', () => {
      const creator = new NorthSouthEdgeTestGraphCreator();
      expect(builder.build(creator)).toBe(creator.graph);
    });
  });
}
