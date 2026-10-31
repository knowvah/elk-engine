// SPDX-License-Identifier: EPL-2.0
// Proof of InteractiveCrossingMinimizer (mission 7c, T7): every row of layered-order.json whose last step runs
// `P3_NODE_ORDERING INTERACTIVE`, replayed through `CrossingMinimizationStrategy.INTERACTIVE.create()`. Expectations
// come only from the rows and the Java (L4).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { HierarchicalPortConstraintProcessor } from '../intermediate/HierarchicalPortConstraintProcessor.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InvertedPortProcessor } from '../intermediate/InvertedPortProcessor.js';
import { LongEdgeSplitter } from '../intermediate/LongEdgeSplitter.js';
import { NorthSouthPortPreprocessor } from '../intermediate/NorthSouthPortPreprocessor.js';
import { PortListSorter } from '../intermediate/PortListSorter.js';
import { PortSideProcessor } from '../intermediate/PortSideProcessor.js';
import { SemiInteractiveCrossMinProcessor } from '../intermediate/SemiInteractiveCrossMinProcessor.js';
import { SortByInputModelProcessor } from '../intermediate/SortByInputModelProcessor.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { InteractiveCrossingMinimizer } from './InteractiveCrossingMinimizer.js';
import { LayerSweepCrossingMinimizer } from './LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { EnumSet } from '../../../java/util/EnumSet.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const ROW_NAMES: readonly string[] = [
  'scenarios/Interactive/positions',
  'scenarios/Interactive/long-edges',
  'scenarios/Interactive/fixed-side-ports',
  'scenarios/Interactive/external-ports',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/InLayerConstraints/interactive',
  'sites/Interactive/bendpoints/long',
  'sites/Interactive/bendpoints/reversed',
  'sites/Interactive/bendpoints/beyond',
];

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      case 'NORTH_SOUTH_PORT_PREPROCESSOR':
        return new NorthSouthPortPreprocessor();
      case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
        return new HierarchicalPortConstraintProcessor();
      case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
        return new SemiInteractiveCrossMinProcessor();
      case 'SORT_BY_INPUT_ORDER_OF_MODEL':
        return new SortByInputModelProcessor();
      case 'ONE_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
      case 'TWO_SIDED_GREEDY_SWITCH':
        return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : phase === 'P2_LAYERING'
        ? LayeringStrategy.valueOf(strategy).create()
        : CrossingMinimizationStrategy.valueOf(strategy).create(),
};

const rows = loadOrderRows(ROWS_FILE).filter((row) => {
  const last = row.steps?.filter(([op]) => op === 'runPhase').at(-1);
  return last !== undefined && last[2] === 'INTERACTIVE';
});

describe('InteractiveCrossingMinimizer (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual([...ROW_NAMES]);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = runSteps(row, factories);
    const actual = orderDump(graph, importRow(row).importDump);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    expect(compareOrderFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
  });

  it('the long-edge row records the ORIGINAL_DUMMY_NODE_POSITION property it sets (InteractiveCrossingMinimizer.java:117)', () => {
    // oracle: scenarios/Interactive/long-edges
    const row = rows.find((candidate) => candidate.id === 'scenarios/Interactive/long-edges')!;
    const graph = runSteps(row, factories);
    const dummies = graph
      .getLayers()
      .flatMap((layer) => layer.getNodes())
      .filter((node) => node.hasProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION));
    expect(dummies.length).toBeGreaterThan(0);
    const changed = row.expected.changed.filter((entry) => 'originalDummyNodePosition' in entry.props);
    expect(changed.length).toBe(dummies.length);
  });
});

describe('InteractiveCrossingMinimizer', () => {
  const names = (set: Set<{ create(): unknown }>): string[] =>
    [...set].map((factory) => (factory as unknown as { name(): string }).name());

  it('adds the PORT_LIST_SORTER only for graphs with non-free ports (InteractiveCrossingMinimizer.java:64-72)', () => {
    const free = new LGraph();
    free.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    const fixed = new LGraph();
    fixed.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.NON_FREE_PORTS));
    const phase = new InteractiveCrossingMinimizer();
    const before = (graph: LGraph) =>
      names(phase.getLayoutProcessorConfiguration(graph).processorsBefore(LayeredPhases.P3_NODE_ORDERING));
    expect(before(free)).toEqual(['LONG_EDGE_SPLITTER']);
    expect(before(fixed)).toEqual(['LONG_EDGE_SPLITTER', 'PORT_LIST_SORTER']);
    // the shared configuration is copied: the free graph still gets no sorter after the fixed one was configured
    expect(before(free)).toEqual(['LONG_EDGE_SPLITTER']);
    expect(
      names(phase.getLayoutProcessorConfiguration(free).processorsBefore(LayeredPhases.P4_NODE_PLACEMENT)),
    ).toEqual(['IN_LAYER_CONSTRAINT_PROCESSOR']);
    expect(names(phase.getLayoutProcessorConfiguration(free).processorsAfter(LayeredPhases.P5_EDGE_ROUTING))).toEqual([
      'LONG_EDGE_JOINER',
    ]);
  });

  it('names its task and finishes it on an empty graph', () => {
    const monitor = new NullElkProgressMonitor();
    const begin = vi.spyOn(monitor, 'begin');
    const done = vi.spyOn(monitor, 'done');
    new InteractiveCrossingMinimizer().process(new LGraph(), monitor);
    expect(begin).toHaveBeenCalledWith('Interactive crossing minimization', 1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('is not the layer sweep: the enum creates a distinct class', () => {
    expect(factories.createPhase('P3_NODE_ORDERING', 'INTERACTIVE')).toBeInstanceOf(InteractiveCrossingMinimizer);
    expect(factories.createPhase('P3_NODE_ORDERING', 'INTERACTIVE')).not.toBeInstanceOf(LayerSweepCrossingMinimizer);
  });
});

/** A graph with one layer whose nodes sit at the given positions (x, y) with size (0, height); order = input order. */
function layerAt(specs: readonly { x: number; y: number; height?: number; type?: NodeType }[]): {
  graph: LGraph;
  nodes: LNode[];
} {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  const layer = addLayer(graph);
  const nodes = specs.map(({ x, y, height = 0, type = NodeType.NORMAL }) => {
    const node = addNode(graph, type);
    node.setLayer(layer);
    node.getPosition().x = x;
    node.getPosition().y = y;
    node.getSize().y = height;
    return node;
  });
  return { graph, nodes };
}

function orderAfterProcess(graph: LGraph): LNode[] {
  new InteractiveCrossingMinimizer().process(graph, new NullElkProgressMonitor());
  return graph.getLayers()[0]!.getNodes();
}

describe('InteractiveCrossingMinimizer: the vertical position of a node (hand-built; java:160-250)', () => {
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  it('sorts plain nodes by the y of their centre, the interactive reference point of the default CENTER', () => {
    // centres: 110 (y 100, height 20), 60 (y 50, height 20), 130 (y 120, height 20)
    const { graph, nodes } = layerAt([
      { x: 0, y: 100, height: 20 },
      { x: 0, y: 50, height: 20 },
      { x: 0, y: 120, height: 20 },
    ]);
    expect(orderAfterProcess(graph)).toEqual([nodes[1], nodes[0], nodes[2]]);
  });

  it('places north-south dummies at the northern or southern side of their node (java:209-227)', () => {
    // N: y 100, height 20, centre 110. The dummy of its north port sorts at 100, that of its south port at 120.
    const { graph, nodes } = layerAt([
      { x: 0, y: 100, height: 20 },
      { x: 0, y: 0, type: NodeType.NORTH_SOUTH_PORT },
      { x: 0, y: 0, type: NodeType.NORTH_SOUTH_PORT },
    ]);
    const [normal, northDummy, southDummy] = nodes as [LNode, LNode, LNode];
    const north = addPort(normal, PortSide.NORTH);
    const south = addPort(normal, PortSide.SOUTH);
    addPort(northDummy).setProperty(InternalProperties.ORIGIN, north);
    addPort(southDummy).setProperty(InternalProperties.ORIGIN, south);
    expect(orderAfterProcess(graph)).toEqual([northDummy, normal, southDummy]);
  });

  it('falls back to the reference point for a north-south dummy whose origin port is on neither side (java:227)', () => {
    const { graph, nodes } = layerAt([
      { x: 0, y: 100, height: 20 },
      { x: 0, y: 10, type: NodeType.NORTH_SOUTH_PORT },
    ]);
    const [normal, dummy] = nodes as [LNode, LNode];
    addPort(dummy).setProperty(InternalProperties.ORIGIN, addPort(normal, PortSide.EAST));
    // the dummy's own centre (10) is above the normal node's (110)
    expect(orderAfterProcess(graph)).toEqual([dummy, normal]);
  });

  it('orders nodes of equal position by their in-layer successor constraints, either way (java:134-145)', () => {
    const { graph, nodes } = layerAt([
      { x: 0, y: 10 },
      { x: 0, y: 10 },
    ]);
    const [first, second] = nodes as [LNode, LNode];
    second.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [first]);
    // second must come before first: the input order [first, second] is reversed
    expect(orderAfterProcess(graph)).toEqual([second, first]);
  });

  it('keeps nodes of equal position whose first node has the second as successor (java:140-143)', () => {
    const { graph, nodes } = layerAt([
      { x: 0, y: 10 },
      { x: 0, y: 10 },
    ]);
    const [first, second] = nodes as [LNode, LNode];
    first.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, [second]);
    second.setProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS, []);
    expect(orderAfterProcess(graph)).toEqual([first, second]);
  });
});

describe('InteractiveCrossingMinimizer: the position of a long edge dummy (hand-built; java:162-207)', () => {
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  /**
   * A layer with an anchor node A at x 50 (so the horizontal position is 50, the only node with x > 0 that counts) and
   * a long edge dummy standing for an edge with the given original bend points; nodes of reference y 30 and 70 frame it.
   */
  function withDummy(points: [number, number][], reversed: boolean): { graph: LGraph; nodes: LNode[]; dummy: LNode } {
    const { graph, nodes } = layerAt([
      { x: 0, y: 70 },
      { x: 50, y: 30 },
      { x: 0, y: 0, type: NodeType.LONG_EDGE },
    ]);
    const dummy = nodes[2]!;
    const edge = new LEdge();
    edge.setProperty(
      InternalProperties.ORIGINAL_BENDPOINTS,
      new KVectorChain(...points.map(([x, y]) => new KVector(x, y))),
    );
    edge.setProperty(InternalProperties.REVERSED, reversed);
    dummy.setProperty(InternalProperties.ORIGIN, edge);
    return { graph, nodes, dummy };
  }

  it('interpolates between the two bend points around the horizontal position and records the position', () => {
    // horizontal position (0 + 50 + 0) / 1 = 50; (0,0)-(100,40): y = 0 + (50 - 0) / (100 - 0) * (40 - 0) = 20
    const { graph, nodes, dummy } = withDummy(
      [
        [0, 0],
        [100, 40],
      ],
      false,
    );
    expect(orderAfterProcess(graph)).toEqual([dummy, nodes[1], nodes[0]]);
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(20);
  });

  it('reverses the bend points of a reversed edge first, which interpolates to the same point here', () => {
    // the stored chain (100,40)-(0,0) is reversed to (0,0)-(100,40)
    const { graph, dummy } = withDummy(
      [
        [100, 40],
        [0, 0],
      ],
      true,
    );
    orderAfterProcess(graph);
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(20);
  });

  it('walks on along the chain while the second point is left of the horizontal position', () => {
    // (0,0)-(20,10)-(100,50): point2.x 20 < 50, so point1 = (20,10), point2 = (100,50): 10 + 30 / 80 * 40 = 25
    const { graph, dummy } = withDummy(
      [
        [0, 0],
        [20, 10],
        [100, 50],
      ],
      false,
    );
    orderAfterProcess(graph);
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(25);
  });

  it('falls back to the reference point without a usable chain of two points (java:200-207)', () => {
    const { graph, dummy } = withDummy([[0, 0]], false);
    orderAfterProcess(graph);
    // the dummy is at y 0, size 0: its centre 0
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(0);
  });

  it('takes the y of the source port when the horizontal position is not right of it (java:173-182)', () => {
    const { graph, dummy } = withDummy([[0, 0]], false);
    const owner = addNode(graph);
    owner.getPosition().x = 60;
    owner.getPosition().y = 5;
    const source = addPort(owner, PortSide.EAST);
    source.getPosition().y = 7;
    dummy.setProperty(InternalProperties.LONG_EDGE_SOURCE, source);
    orderAfterProcess(graph);
    // absolute anchor (60, 12), horizontal position 50 <= 60
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(12);
  });

  it('takes the y of the target port when it is not right of the horizontal position (java:184-193)', () => {
    const { graph, dummy } = withDummy([[0, 0]], false);
    const owner = addNode(graph);
    owner.getPosition().x = 40;
    owner.getPosition().y = 8;
    dummy.setProperty(InternalProperties.LONG_EDGE_TARGET, addPort(owner, PortSide.WEST));
    orderAfterProcess(graph);
    // absolute anchor (40, 8), 40 <= 50
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBe(8);
  });

  it('adds the source and target points to the chain when neither decides alone (java:181-203)', () => {
    const { graph, dummy } = withDummy([[0, 0]], false);
    const sourceOwner = addNode(graph);
    sourceOwner.getPosition().x = 10;
    sourceOwner.getPosition().y = 0;
    const source = addPort(sourceOwner, PortSide.EAST);
    const targetOwner = addNode(graph);
    targetOwner.getPosition().x = 110;
    targetOwner.getPosition().y = 60;
    const target = addPort(targetOwner, PortSide.WEST);
    dummy.setProperty(InternalProperties.LONG_EDGE_SOURCE, source);
    dummy.setProperty(InternalProperties.LONG_EDGE_TARGET, target);
    orderAfterProcess(graph);
    // chain (10,0) (0,0) (110,60): point1 = (10,0), point2 = (0,0): 0 < 50 and more points, so point1 = (0,0), point2 =
    // (110,60): 0 + (50 - 0) / (110 - 0) * (60 - 0) = 27.27...
    expect(dummy.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION)).toBeCloseTo(300 / 11, 12);
  });
});

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11). */
const SITE_ROWS = loadOrderRows(`${repoRoot()}/test/golden/refs/java/layered-order.json`).filter((row) =>
  row.id.startsWith('sites/'),
);

const siteFactories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      default:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
    }
  },
};

/** Replays the site row `id` with the real processors and phases and dumps the result in the recorder's shape. */
function replaySite(id: string): OrderExpected {
  const row = SITE_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  return orderDump(runSteps(row, siteFactories), importRow(row).importDump);
}

/** The changed properties the dump records for the element at `path`. */
function changedProps(result: OrderExpected, path: string): Record<string, unknown> | undefined {
  return result.changed.find((entry) => entry.path === path)?.props;
}

/** The recorded `ORIGINAL_DUMMY_NODE_POSITION` of the long edge dummy `new/n0`. */
function dummyPosition(result: OrderExpected): number {
  const value = changedProps(result, 'new/n0')?.originalDummyNodePosition as { t: 'double'; v: string };
  return Number(value.v);
}

describe('InteractiveCrossingMinimizer on the site rows', () => {
  it('orders two nodes of equal vertical position by the in-layer successor constraint', () => {
    // oracle: sites/InLayerConstraints/interactive; InteractiveCrossingMinimizer.java:131-136
    const result = replaySite('sites/InLayerConstraints/interactive');
    expect(result.layers).toEqual([['g0/n0'], ['g0/n2', 'g0/n1']]);
  });

  it('interpolates a long edge dummy along the recorded bend points', () => {
    // oracle: sites/Interactive/bendpoints/long; InteractiveCrossingMinimizer.java:166-204
    const result = replaySite('sites/Interactive/bendpoints/long');
    expect(result.layers[1]).toEqual(['new/n0', 'g0/n1']);
    expect(dummyPosition(result)).toBeCloseTo(30.833333333333336, 9);
  });

  it('reverses the bend points of a reversed edge before interpolating', () => {
    // oracle: sites/Interactive/bendpoints/reversed; InteractiveCrossingMinimizer.java:168-171
    const result = replaySite('sites/Interactive/bendpoints/reversed');
    expect(result.layers[1]).toEqual(['new/n0', 'g0/n1']);
    expect(dummyPosition(result)).toBeCloseTo(30.833333333333336, 9);
  });

  it('interpolates between the last bend points when the dummy lies beyond them', () => {
    // oracle: sites/Interactive/bendpoints/beyond; InteractiveCrossingMinimizer.java:197-204
    const result = replaySite('sites/Interactive/bendpoints/beyond');
    expect(result.layers[1]).toEqual(['new/n0', 'g0/n1']);
    expect(dummyPosition(result)).toBeCloseTo(36.25, 9);
  });
});
