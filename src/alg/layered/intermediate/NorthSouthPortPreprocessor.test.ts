// SPDX-License-Identifier: EPL-2.0
// Proof of NorthSouthPortPreprocessor: every row of layered-order.json whose last replayed entry is NORTH_SOUTH_PORT_PREPROCESSOR (mission 7c, T4b), with the
// classes injected through `createProcessor` (the enum arms are wired by T8). Expectations come only from the rows and
// the Java (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { HierarchicalPortConstraintProcessor } from './HierarchicalPortConstraintProcessor.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { InvertedPortProcessor } from './InvertedPortProcessor.js';
import { LongEdgeSplitter } from './LongEdgeSplitter.js';
import { NorthSouthPortPreprocessor } from './NorthSouthPortPreprocessor.js';
import { PortListSorter } from './PortListSorter.js';
import { PortSideProcessor } from './PortSideProcessor.js';
import { SemiInteractiveCrossMinProcessor } from './SemiInteractiveCrossMinProcessor.js';
import { SortByInputModelProcessor } from './SortByInputModelProcessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const PROCESSOR = 'NORTH_SOUTH_PORT_PREPROCESSOR';

const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/ptolemy-levelcrossingdetector/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/ptolemy-router/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/ticket-528-violatedNodeOrder/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-linear_segments_cycle/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-north_multiple/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-north_south_fixed_side/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-nsp1/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-nsp2/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-nsp3/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'models/north_south_ports-south_multiple/root/NORTH_SOUTH_PORT_PREPROCESSOR/default',
  'scenarios/NorthSouthPortPreprocessor/north-south',
  'scenarios/NorthSouthPortPreprocessor/fixed-order',
  'scenarios/NorthSouthPortPreprocessor/long-edges',
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
      default:
        return IntermediateProcessorStrategy.valueOf(name).create();
    }
  },
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: OrderRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const rows = loadOrderRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === PROCESSOR);

function replay(row: OrderRow): LGraph {
  return row.steps === null ? runOrderPrefix(row, factories) : runSteps(row, factories);
}

describe('NorthSouthPortPreprocessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = orderDump(graph, importRow(row).importDump);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    expect(compareOrderFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
  });
});

// The self-loop dummies are spelled out statement by statement in the Java (`createNorthSouthSelfLoopDummyNodes`,
// `createSameSideSelfLoopDummyNode`, NorthSouthPortPreprocessor.java:627-715); no oracle row has a self-loop on odd
// ports, so these cases assert the structure those statements build and nothing else.
describe('NorthSouthPortPreprocessor (self-loop dummies, from the Java text)', () => {
  // `IN_LAYER_SUCCESSOR_CONSTRAINTS` has a list default that `getProperty` clones through `ElkReflect`.
  beforeAll(() => {
    LayoutMetaDataService.initElkReflect();
  });

  function nodeWithOddPorts(sides: readonly [PortSide, PortSide]) {
    const graph = new Graph();
    const layer = addLayer(graph);
    const node = addNode(graph);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    node.setLayer(layer);
    const [first, second] = sides.map((side) => addPort(node, side)) as [
      ReturnType<typeof addPort>,
      ReturnType<typeof addPort>,
    ];
    const edge = connect(first, second);
    new NorthSouthPortPreprocessor().process(graph, new NullElkProgressMonitor());
    return { layer, node, first, second, edge };
  }

  it('gives a north-south self-loop a northern and a southern dummy with one EAST port each', () => {
    const { layer, node, first, second, edge } = nodeWithOddPorts([PortSide.NORTH, PortSide.SOUTH]);
    const [northDummy, regular, southDummy] = layer.getNodes();
    expect(regular).toBe(node);
    expect(northDummy!.getType()).toBe(NodeType.NORTH_SOUTH_PORT);
    expect(southDummy!.getType()).toBe(NodeType.NORTH_SOUTH_PORT);
    expect(northDummy!.getPorts().map((port) => port.getSide())).toEqual([PortSide.EAST]);
    expect(southDummy!.getPorts().map((port) => port.getSide())).toEqual([PortSide.EAST]);
    expect(edge.getSource()).toBe(northDummy!.getPorts()[0]);
    expect(edge.getTarget()).toBe(southDummy!.getPorts()[0]);
    expect(northDummy!.getProperty(InternalProperties.ORIGIN)).toBe(node);
    expect(southDummy!.getProperty(InternalProperties.ORIGIN)).toBe(node);
    expect(first.getProperty(InternalProperties.PORT_DUMMY)).toBe(northDummy);
    expect(second.getProperty(InternalProperties.PORT_DUMMY)).toBe(southDummy);
    expect(northDummy!.getProperty(InternalProperties.CROSSING_HINT)).toBe(1);
    expect(southDummy!.getProperty(InternalProperties.CROSSING_HINT)).toBe(1);
    expect(northDummy!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)).toEqual([node]);
    expect(node.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)).toEqual([southDummy]);
    expect(node.hasProperty(InternalProperties.BARYCENTER_ASSOCIATES)).toBe(false);
  });

  it('gives a same-side self-loop one dummy with a WEST and an EAST port and disconnects the edge', () => {
    const { layer, node, first, second, edge } = nodeWithOddPorts([PortSide.NORTH, PortSide.NORTH]);
    const [dummy, regular] = layer.getNodes();
    expect(regular).toBe(node);
    expect(dummy!.getType()).toBe(NodeType.NORTH_SOUTH_PORT);
    expect(dummy!.getProperty(InternalProperties.ORIGIN)).toBe(edge);
    const [input, output] = dummy!.getPorts();
    expect([input!.getSide(), output!.getSide()]).toEqual([PortSide.WEST, PortSide.EAST]);
    expect(input!.getProperty(InternalProperties.ORIGIN)).toBe(second);
    expect(output!.getProperty(InternalProperties.ORIGIN)).toBe(first);
    expect(first.getProperty(InternalProperties.PORT_DUMMY)).toBe(dummy);
    expect(second.getProperty(InternalProperties.PORT_DUMMY)).toBe(dummy);
    expect(edge.getSource()).toBeNull();
    expect(edge.getTarget()).toBeNull();
    expect(dummy!.getProperty(InternalProperties.CROSSING_HINT)).toBe(2);
    expect(dummy!.getProperty(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS)).toEqual([node]);
  });
});
