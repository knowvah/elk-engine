// SPDX-License-Identifier: EPL-2.0
// Proof of LayerSweepCrossingMinimizer (mission 7c, T7): every row of layered-order.json whose last step runs
// `P3_NODE_ORDERING LAYER_SWEEP` or `MEDIAN_LAYER_SWEEP`, replayed through `CrossingMinimizationStrategy.<S>.create()`,
// with the greedy-switch processors injected by name (T8 wires the enum arms). Expectations come only from the rows
// and the Java (L4). The nested-graph paths (`GraphInfoHolder` child graphs, `sweepInHierarchicalNodes`) are U until
// 7h: no row nests graphs.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { Random } from '../../../java/util/Random.js';
import { HIERARCHY_AWARE, isHierarchyAwareLayoutProcessor } from '../IHierarchyAwareLayoutProcessor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import { LGraph } from '../graph/LGraph.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
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
import { LayerSweepCrossingMinimizer } from './LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const LAYER_SWEEP_ROWS: readonly string[] = [
  'scenarios/LayerSweep/crossing',
  'scenarios/LayerSweep/layered10',
  'scenarios/LayerSweep/layered10-seed-2',
  'scenarios/LayerSweep/layered10-seed-3',
  'scenarios/LayerSweep/hyperedge-ports',
  'scenarios/LayerSweep/hyperedge-ports-seed-2',
  'scenarios/LayerSweep/ports-all-sides',
  'scenarios/LayerSweep/north-south',
  'scenarios/LayerSweep/north-south-seed-2',
  'scenarios/LayerSweep/inverted-ports',
  'scenarios/LayerSweep/long-edges',
  'scenarios/LayerSweep/in-layer-edges',
  'scenarios/LayerSweep/in-layer-edges-seed-2',
  'scenarios/LayerSweep/hand-placed-layers',
  'scenarios/LayerSweep/semi-interactive',
  'scenarios/LayerSweep/semi-interactive-ns',
  'scenarios/LayerSweep/model-order-PREFER_EDGES',
  'scenarios/LayerSweep/model-order-force-PREFER_EDGES',
  'scenarios/LayerSweep/model-order-NODES_AND_EDGES',
  'scenarios/LayerSweep/model-order-force-NODES_AND_EDGES',
  'scenarios/LayerSweep/model-order-port-model-order',
  'scenarios/LayerSweep/model-order-influence',
  'scenarios/LayerSweep/model-order-long-edge-DUMMY_NODE_OVER',
  'scenarios/LayerSweep/model-order-long-edge-DUMMY_NODE_UNDER',
  'scenarios/LayerSweep/model-order-long-edge-EQUAL',
  'scenarios/LayerSweep/model-order-group-enforced',
  'scenarios/LayerSweep/model-order-group-enforced-force',
  'scenarios/LayerSweep/model-order-feedback-edges',
  'scenarios/LayerSweep/external-ports',
  'scenarios/LayerSweep/external-ports-chain',
  'scenarios/LayerSweep/greedy-ONE_SIDED',
  'scenarios/LayerSweep/greedy-TWO_SIDED',
  'scenarios/LayerSweep/greedy-OFF',
  'scenarios/LayerSweep/thoroughness-1',
  'scenarios/LayerSweep/fixed-order-ports',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/LayerSweep/singleNode',
  'sites/LayerSweep/empty',
  'sites/InLayerConstraints/connected',
  'sites/InLayerConstraints/cycle',
  'sites/InLayerConstraints/selfReference',
  'sites/InLayerConstraints/equalBarycenters',
  'sites/ModelOrder/zeroCrossings/initial',
  'sites/ModelOrder/zeroCrossings/afterSweep',
  'sites/ModelOrder/separate',
  'sites/ModelOrder/transitive/force',
  'sites/ModelOrder/transitive/counting',
  'sites/ModelOrder/transitive/equalBarycenters',
  'sites/ModelOrder/transitive/groupOrder',
  'sites/ModelOrder/externalPorts',
  'sites/ModelOrder/feedback/sameNode',
  'sites/ModelOrder/feedback/mixed',
  'sites/ModelOrder/feedback/noEdgeOrder',
  'sites/ModelOrder/ports/sameSource',
  'sites/ModelOrder/ports/sameTarget',
  'sites/ModelOrder/ports/unconnected',
  'sites/ModelOrder/ports/notPreviousLayer',
  'sites/ModelOrder/ports/notPreviousLayer/noPortModelOrder',
  'sites/ModelOrder/portModelOrder',
  'sites/ModelOrder/northSouth',
  'sites/NorthSouth/inputRanks/seed1',
  'sites/NorthSouth/inputRanks/seed2',
  'sites/NorthSouth/selfLoops/sameSide',
  'sites/NorthSouth/selfLoops/northSouth',
  'sites/NorthSouth/selfLoops/inverted',
  'sites/Hyperedges/merge',
  'sites/Hyperedges/mergeAcross',
  'sites/Hyperedges/sameHyperedge',
  'sites/Hyperedges/corners',
  'sites/Hyperedges/westFirstLayer',
  'sites/Hyperedges/neitherLayer',
  'sites/ExternalPorts/equalPositions',
  'sites/ExternalPorts/northSouth',
  'sites/ExternalPorts/normalNodeInLayer',
  'sites/ExternalPorts/newFirstLastLayer',
  'sites/NorthSouth/portOptions/portAnchors',
  'sites/NorthSouth/portOptions/allowNonFlow',
];

const MEDIAN_ROWS: readonly string[] = [
  'scenarios/MedianLayerSweep/crossing',
  'scenarios/MedianLayerSweep/layered10',
  'scenarios/MedianLayerSweep/hyperedge-ports',
  'scenarios/MedianLayerSweep/north-south',
  'scenarios/MedianLayerSweep/in-layer-edges',
  'scenarios/MedianLayerSweep/external-ports',
  'scenarios/MedianLayerSweep/seed-2',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/Median/forwardFirst',
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

const allRows = loadOrderRows(ROWS_FILE);

function replayRow(id: string): { row: OrderRow; graph: LGraph } {
  const row = allRows.find((candidate) => candidate.id === id)!;
  return { row, graph: runSteps(row, factories) };
}

/** The `P3_NODE_ORDERING` strategy a step row ends with, or `null`. */
function lastP3Strategy(row: OrderRow): string | null {
  const last = row.steps?.filter(([op]) => op === 'runPhase').at(-1);
  return last !== undefined && last[1] === 'P3_NODE_ORDERING' ? (last[2] as string) : null;
}

describe('LayerSweepCrossingMinimizer (oracle rows)', () => {
  it('finds the recorded LAYER_SWEEP rows', () => {
    const found = allRows.filter(
      (row) => row.steps?.at(-2)?.[2] === 'LAYER_SWEEP' && lastP3Strategy(row) === 'LAYER_SWEEP',
    );
    expect(found.map((row) => row.id)).toEqual([...LAYER_SWEEP_ROWS]);
  });

  it('finds the recorded MEDIAN_LAYER_SWEEP rows', () => {
    const found = allRows.filter((row) => lastP3Strategy(row) === 'MEDIAN_LAYER_SWEEP');
    expect(found.map((row) => row.id)).toEqual([...MEDIAN_ROWS]);
  });

  it.each([...LAYER_SWEEP_ROWS, ...MEDIAN_ROWS].map((id) => [id] as const))('replays %s', (id) => {
    const { row, graph } = replayRow(id);
    const actual = orderDump(graph, importRow(row).importDump);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    expect(compareOrderFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
  });
});

describe('LayerSweepCrossingMinimizer (the rows are not vacuous)', () => {
  it('the state before P3 differs from the recorded state after it for the crossing scenario', () => {
    // oracle: scenarios/LayerSweep/crossing; the P3 phase must move nodes or ports for the replay above to prove it
    const row = allRows.find((candidate) => candidate.id === 'scenarios/LayerSweep/crossing')!;
    const before = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, factories);
    const actual = orderDump(before, importRow(row).importDump);
    expect(compareOrder(actual, row.expected).length).toBeGreaterThan(0);
  });
});

describe('LayerSweepCrossingMinimizer', () => {
  it('carries the 7a hierarchy-aware brand (C10)', () => {
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
    expect(phase[HIERARCHY_AWARE]).toBe(true);
    expect(isHierarchyAwareLayoutProcessor(phase)).toBe(true);
  });

  it('configures P3 as Java does: splitter and port list sorter before it, the in-layer processor before P4', () => {
    // LayerSweepCrossingMinimizer.java:642-649, :673-679
    const configuration = new LayerSweepCrossingMinimizer(CrossMinType.MEDIAN).getLayoutProcessorConfiguration(
      new LGraph(),
    );
    const names = (set: Set<{ create(): unknown }>): string[] =>
      [...set].map((factory) => (factory as unknown as { name(): string }).name());
    expect(names(configuration.processorsBefore(LayeredPhases.P3_NODE_ORDERING))).toEqual([
      'LONG_EDGE_SPLITTER',
      'PORT_LIST_SORTER',
    ]);
    expect(names(configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT))).toEqual([
      'IN_LAYER_CONSTRAINT_PROCESSOR',
    ]);
    expect(names(configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING))).toEqual(['LONG_EDGE_JOINER']);
  });

  it('copies the shared configuration, so the PORT_LIST_SORTER of one call never reaches the next', () => {
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
    const first = phase.getLayoutProcessorConfiguration(new LGraph());
    const second = phase.getLayoutProcessorConfiguration(new LGraph());
    expect(second).not.toBe(first);
    expect(second.processorsBefore(LayeredPhases.P3_NODE_ORDERING).size).toBe(2);
  });

  it('names its task after the crossing minimizer type', () => {
    const monitor = new NullElkProgressMonitor();
    const begin = vi.spyOn(monitor, 'begin');
    new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH).process(new LGraph(), monitor);
    expect(begin).toHaveBeenCalledWith('Minimize Crossings ONE_SIDED_GREEDY_SWITCH', 1);
  });

  it('does nothing for a graph without layers or with empty layers, and draws nothing', () => {
    // LayerSweepCrossingMinimizer.java:117-125
    const random = new Random(1);
    const noLayers = new LGraph();
    noLayers.setProperty(InternalProperties.RANDOM, random);
    const emptyLayers = new LGraph();
    emptyLayers.setProperty(InternalProperties.RANDOM, random);
    addLayer(emptyLayers);
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
    phase.process(noLayers, new NullElkProgressMonitor());
    phase.process(emptyLayers, new NullElkProgressMonitor());
    expect(random.nextLong()).toBe(new Random(1).nextLong());
  });

  it('does nothing for a single node unless the layout is hierarchical, and draws nothing', () => {
    const random = new Random(1);
    const graph = new LGraph();
    graph.setProperty(InternalProperties.RANDOM, random);
    const layer = addLayer(graph);
    addNode(graph).setLayer(layer);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(graph, new NullElkProgressMonitor());
    expect(random.nextLong()).toBe(new Random(1).nextLong());
  });

  it('has no graph holders before the first run (the Java field is null until initialize)', () => {
    expect(new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).getGraphData()).toBeNull();
  });

  it('exposes the graph holders of the last run: the root graph only, indexed by LGraph.id', () => {
    const phase = new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
    const row = allRows.find((candidate) => candidate.id === 'scenarios/LayerSweep/crossing')!;
    const graph = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, factories);
    phase.process(graph, new NullElkProgressMonitor());
    const holders = phase.getGraphData()!;
    expect(holders.length).toBe(1);
    expect(holders[0]!.lGraph()).toBe(graph);
    expect(graph.id).toBe(0);
  });
});

describe('LayerSweepCrossingMinimizer: the thoroughness loops (hand-built two-layer graphs)', () => {
  beforeAll(() => LayoutMetaDataService.initElkReflect());

  /** Layers [a, b] | [u, l] with the edges b-u and a-l (one crossing), or a-u and b-l (none); edges carry a model order. */
  function twoLayers(crossed: boolean): { graph: LGraph; order: LNode[][] } {
    const graph = new LGraph();
    graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
    graph.setProperty(InternalProperties.RANDOM, new Random(1));
    const layers = [addLayer(graph), addLayer(graph)];
    const make = (layer: (typeof layers)[number], side: PortSide): { node: LNode; port: LPort } => {
      const node = addNode(graph);
      node.setLayer(layer);
      const port = addPort(node, side);
      node.cachePortSides();
      return { node, port };
    };
    const [a, b] = [make(layers[0]!, PortSide.EAST), make(layers[0]!, PortSide.EAST)];
    const [u, l] = [make(layers[1]!, PortSide.WEST), make(layers[1]!, PortSide.WEST)];
    connect(crossed ? b.port : a.port, u.port).setProperty(InternalProperties.MODEL_ORDER, 0);
    connect(crossed ? a.port : b.port, l.port).setProperty(InternalProperties.MODEL_ORDER, 1);
    return {
      graph,
      order: [
        [a.node, b.node],
        [u.node, l.node],
      ],
    };
  }

  const crossingsOf = (graph: LGraph): number => {
    const holder = new GraphInfoHolder(graph, CrossMinType.MEDIAN, []);
    return holder.crossCounter().countAllCrossings(holder.currentNodeOrder());
  };

  it('leaves a graph without crossings as it is when the model order is considered (java:249-253: first try)', () => {
    // LayerSweepCrossingMinimizer.java:196-198,237-244: FIRST_TRY_WITH_INITIAL_ORDER is set, the initial order has no
    // crossings, so the minimizer answers 0 before any sweep and nothing is copied back to the graph
    const { graph, order } = twoLayers(false);
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NODES_AND_EDGES);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(graph, new NullElkProgressMonitor());
    expect(graph.getLayers().map((layer) => layer.getNodes())).toEqual(order);
    expect(graph.getProperty(InternalProperties.FIRST_TRY_WITH_INITIAL_ORDER)).toBe(true);
  });

  it('untangles a single crossing with the plain counter and stops at the first crossing-free layout', () => {
    const { graph } = twoLayers(true);
    expect(crossingsOf(graph)).toBe(1);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(graph, new NullElkProgressMonitor());
    expect(crossingsOf(graph)).toBe(0);
  });

  it('does the same with the node/port-order counter when a crossing-counter influence is set (java:195-211)', () => {
    const { graph } = twoLayers(true);
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE, 0.5);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(graph, new NullElkProgressMonitor());
    expect(crossingsOf(graph)).toBe(0);
  });

  it('leaves a crossing-free graph as it is with the node/port-order counter when the model order is considered', () => {
    const { graph, order } = twoLayers(false);
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE, 0.5);
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NODES_AND_EDGES);
    new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER).process(graph, new NullElkProgressMonitor());
    expect(graph.getLayers().map((layer) => layer.getNodes())).toEqual(order);
  });
});
