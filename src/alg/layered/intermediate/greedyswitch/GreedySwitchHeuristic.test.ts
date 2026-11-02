// SPDX-License-Identifier: EPL-2.0
// Proof of GreedySwitchHeuristic (mission 7c, T7): every row of layered-order.json whose last step runs
// `ONE_SIDED_GREEDY_SWITCH` or `TWO_SIDED_GREEDY_SWITCH`, with `new LayerSweepCrossingMinimizer(CrossMinType.<X>)`
// injected by name (T8 wires the enum arms). The heuristic, `SwitchDecider`, `CrossingMatrixFiller`,
// `BetweenLayerEdgeTwoNodeCrossingsCounter` and `NorthSouthEdgeNeighbouringNodeCrossingsCounter` are reached through
// these rows. Expectations come only from the rows and the Java (L4).
import { describe, expect, it } from 'vitest';
import { LGraph } from '../../graph/LGraph.js';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import { loadOrderRows, type OrderRow } from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { HierarchicalPortConstraintProcessor } from '../../intermediate/HierarchicalPortConstraintProcessor.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { InvertedPortProcessor } from '../../intermediate/InvertedPortProcessor.js';
import { LongEdgeSplitter } from '../../intermediate/LongEdgeSplitter.js';
import { NorthSouthPortPreprocessor } from '../../intermediate/NorthSouthPortPreprocessor.js';
import { PortListSorter } from '../../intermediate/PortListSorter.js';
import { PortSideProcessor } from '../../intermediate/PortSideProcessor.js';
import { SemiInteractiveCrossMinProcessor } from '../../intermediate/SemiInteractiveCrossMinProcessor.js';
import { SortByInputModelProcessor } from '../../intermediate/SortByInputModelProcessor.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { LayerSweepCrossingMinimizer } from '../../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import { GreedySwitchHeuristic } from './GreedySwitchHeuristic.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const ONE_SIDED_ROWS: readonly string[] = [
  'scenarios/OneSidedGreedySwitch/crossing',
  'scenarios/OneSidedGreedySwitch/layered10',
  'scenarios/OneSidedGreedySwitch/ports-all-sides',
  'scenarios/OneSidedGreedySwitch/north-south',
  'scenarios/OneSidedGreedySwitch/in-layer-edges',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/NorthSouth/selfLoops/northEast',
];

const TWO_SIDED_ROWS: readonly string[] = [
  'scenarios/TwoSidedGreedySwitch/crossing',
  'scenarios/TwoSidedGreedySwitch/layered10',
  'scenarios/TwoSidedGreedySwitch/ports-all-sides',
  'scenarios/TwoSidedGreedySwitch/north-south',
  'scenarios/TwoSidedGreedySwitch/in-layer-edges',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/NorthSouth/selfLoops/greedyInLayer',
  'sites/NorthSouth/selfLoops/greedyPorts',
  'sites/GreedySwitch/parallelEdges',
  'sites/GreedySwitch/northSouthLongEdges',
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
const rowsEndingIn = (processor: string): OrderRow[] =>
  allRows.filter((row) => row.steps?.filter(([op]) => op === 'runProcessor').at(-1)?.[1] === processor);

function expectReplayed(id: string): void {
  const row = allRows.find((candidate) => candidate.id === id)!;
  const graph = runSteps(row, factories);
  const actual = orderDump(graph, importRow(row).importDump);
  expect(compareOrder(actual, row.expected)).toEqual([]);
  expect(compareOrderFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
}

describe('GreedySwitchHeuristic (oracle rows, one-sided)', () => {
  it('finds the recorded rows', () => {
    expect(rowsEndingIn('ONE_SIDED_GREEDY_SWITCH').map((row) => row.id)).toEqual([...ONE_SIDED_ROWS]);
  });

  it.each(ONE_SIDED_ROWS.map((id) => [id] as const))('replays %s', expectReplayed);
});

describe('GreedySwitchHeuristic (oracle rows, two-sided)', () => {
  it('finds the recorded rows', () => {
    expect(rowsEndingIn('TWO_SIDED_GREEDY_SWITCH').map((row) => row.id)).toEqual([...TWO_SIDED_ROWS]);
  });

  it.each(TWO_SIDED_ROWS.map((id) => [id] as const))('replays %s', expectReplayed);
});

describe('GreedySwitchHeuristic', () => {
  /** The graph of a row up to, not including, its processor, held by a GraphInfoHolder of the given type. */
  function holderFor(type: CrossMinType): GraphInfoHolder {
    const row = allRows.find((candidate) => candidate.id === 'scenarios/OneSidedGreedySwitch/crossing')!;
    const graph: LGraph = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, factories);
    return new GraphInfoHolder(graph, type, []);
  }

  it('is deterministic, and always improves only when two-sided (GreedySwitchHeuristic.java:136-143)', () => {
    const oneSided = holderFor(CrossMinType.ONE_SIDED_GREEDY_SWITCH).crossMinimizer();
    const twoSided = holderFor(CrossMinType.TWO_SIDED_GREEDY_SWITCH).crossMinimizer();
    expect(oneSided).toBeInstanceOf(GreedySwitchHeuristic);
    expect(twoSided).toBeInstanceOf(GreedySwitchHeuristic);
    expect([oneSided.isDeterministic(), twoSided.isDeterministic()]).toEqual([true, true]);
    expect([oneSided.alwaysImproves(), twoSided.alwaysImproves()]).toEqual([false, true]);
  });

  it('counts the ports of the graph into the port position array of its holder', () => {
    const holder = holderFor(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
    const ports = holder
      .currentNodeOrder()
      .flat()
      .flatMap((node) => node.getPorts());
    expect(holder.portPositions().length).toBe(ports.length);
  });

  it('setFirstLayerOrder of a forward sweep leaves every layer but the first alone', () => {
    // GreedySwitchHeuristic.java:70-74,131-134: setFirstLayerOrder sweeps downward in the start layer only
    const holder = holderFor(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
    const heuristic = holder.crossMinimizer();
    const order = holder.currentNodeOrder();
    const beforeLast = [...order[order.length - 1]!];
    heuristic.setFirstLayerOrder(order, true);
    expect(order[order.length - 1]).toEqual(beforeLast);
  });
});
