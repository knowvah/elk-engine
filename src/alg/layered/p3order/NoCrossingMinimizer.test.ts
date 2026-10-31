// SPDX-License-Identifier: EPL-2.0
// Proof of NoCrossingMinimizer (mission 7c, T7): every row of layered-order.json whose last step runs
// `P3_NODE_ORDERING NONE`, replayed through `CrossingMinimizationStrategy.NONE.create()`, plus the five greedy-switch
// rows that run it before the processor under test. Expectations come only from the rows and the Java (L4).
import { describe, expect, it, vi } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
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
import { NoCrossingMinimizer } from './NoCrossingMinimizer.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const ROW_NAMES: readonly string[] = [
  'scenarios/None/crossing',
  'scenarios/None/long-edges',
  'scenarios/None/external-ports',
  'scenarios/None/north-south',
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
  return last !== undefined && last[2] === 'NONE' && row.steps!.at(-2)?.[0] === 'runPhase';
});

describe('NoCrossingMinimizer (oracle rows)', () => {
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

  it('leaves the graph exactly as the phase before it left it', () => {
    // oracle: scenarios/None/crossing; NoCrossingMinimizer.java:42-46 only opens and closes its monitor
    const row = rows.find((candidate) => candidate.id === 'scenarios/None/crossing')!;
    const before = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, factories);
    const beforeDump = orderDump(before, importRow(row).importDump);
    expect(compareOrder(beforeDump, row.expected)).toEqual([]);
  });
});

describe('NoCrossingMinimizer', () => {
  const names = (set: Set<{ create(): unknown }>): string[] =>
    [...set].map((factory) => (factory as unknown as { name(): string }).name());

  it('configures P3 as Java does and copies the shared configuration (NoCrossingMinimizer.java:49-67)', () => {
    const phase = new NoCrossingMinimizer();
    const configuration = phase.getLayoutProcessorConfiguration(new LGraph());
    expect(names(configuration.processorsBefore(LayeredPhases.P3_NODE_ORDERING))).toEqual([
      'LONG_EDGE_SPLITTER',
      'PORT_LIST_SORTER',
    ]);
    expect(names(configuration.processorsBefore(LayeredPhases.P4_NODE_PLACEMENT))).toEqual([
      'IN_LAYER_CONSTRAINT_PROCESSOR',
    ]);
    expect(names(configuration.processorsAfter(LayeredPhases.P5_EDGE_ROUTING))).toEqual(['LONG_EDGE_JOINER']);
    const again = phase.getLayoutProcessorConfiguration(new LGraph());
    expect(again).not.toBe(configuration);
    expect(again.processorsBefore(LayeredPhases.P3_NODE_ORDERING).size).toBe(2);
  });

  it('names its task and finishes it', () => {
    const monitor = new NullElkProgressMonitor();
    const begin = vi.spyOn(monitor, 'begin');
    const done = vi.spyOn(monitor, 'done');
    new NoCrossingMinimizer().process(new LGraph(), monitor);
    expect(begin).toHaveBeenCalledWith('No crossing minimization', 1);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
