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
import { runSteps } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../../test/helpers/layered-site-replay-dump.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import { GreedySwitchHeuristic } from './GreedySwitchHeuristic.js';
import { GREEDY_SWITCH_FACTORIES } from '../../../../../test/helpers/layered-replay-factories.js';

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

const allRows = loadOrderRows(ROWS_FILE);
const rowsEndingIn = (processor: string): OrderRow[] =>
  allRows.filter((row) => row.steps?.filter(([op]) => op === 'runProcessor').at(-1)?.[1] === processor);

function expectReplayed(id: string): void {
  const row = allRows.find((candidate) => candidate.id === id)!;
  const graph = runSteps(row, GREEDY_SWITCH_FACTORIES);
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
    const graph: LGraph = runSteps({ ...row, steps: row.steps!.slice(0, -2) }, GREEDY_SWITCH_FACTORIES);
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
