// SPDX-License-Identifier: EPL-2.0
// Proof of SemiInteractiveCrossMinProcessor: every row of layered-order.json whose last replayed entry is SEMI_INTERACTIVE_CROSSMIN_PROCESSOR (mission 7c, T4b), with the
// classes injected through `createProcessor` (the enum arms are wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
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
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
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
const PROCESSOR = 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR';

const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-checkexecutiontimeconstraints/N1/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-sinewaveoptimization/N7/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-multicoreexecution/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-multicoreexecution/N2/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-multicoreexecution/N8/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-htvq4/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-htvq4/N7/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-levelcrossingdetector/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-randomwalk/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-router/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-producer/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-01/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-02/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-03/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-emptyLayerFirst/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-emptyLayerLast/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/layer_constraints-emptyLayerMid/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ticket-600/N1/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/partitioning-nonConsecutivePartitions/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/partitioning-partitions01/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/partitioning-partitions02/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ticket-656/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ticket-528-nodeEdgeOverlap/A/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/ticket-528-violatedNodeOrder/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-linear_segments_cycle/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-north_multiple/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-north_south_fixed_side/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-nsp1/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-nsp2/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-nsp3/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'models/north_south_ports-south_multiple/root/SEMI_INTERACTIVE_CROSSMIN_PROCESSOR/semi-interactive',
  'scenarios/SemiInteractiveCrossMinProcessor/positions',
  'scenarios/SemiInteractiveCrossMinProcessor/long-edges',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/SemiInteractive/noConstraints',
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

describe('SemiInteractiveCrossMinProcessor (oracle rows)', () => {
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

/** The `sites/` rows recorded for the branches the generic replay leaves untaken (T11), replayed through P3. */
const SITE_ROWS = loadOrderRows(ROWS_FILE).filter((row) => row.id.startsWith('sites/'));
const SITE_FACTORIES: Factories = {
  ...factories,
  createPhase: (phase, strategy) =>
    phase === 'P3_NODE_ORDERING'
      ? CrossingMinimizationStrategy.valueOf(strategy).create()
      : factories.createPhase(phase, strategy),
};

function siteReplay(id: string): { graph: LGraph; actual: ReturnType<typeof orderDump> } {
  const row = SITE_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`no site row ${id}`);
  }
  const graph = runSteps(row, SITE_FACTORIES);
  return { graph, actual: orderDump(graph, importRow(row).importDump) };
}

/** The properties the `changed` member records for one element path. */
function propsOf(actual: ReturnType<typeof orderDump>, path: string): unknown {
  return actual.changed.find((entry) => entry.path === path)?.props;
}

const FIXED_SIDE = { c: 'PortConstraints', n: 'FIXED_SIDE', t: 'enum' } as const;
const FIXED_POS = { c: 'PortConstraints', n: 'FIXED_POS', t: 'enum' } as const;

describe('SemiInteractiveCrossMinProcessor on the site rows', () => {
  it('adds no constraints when no normal node has a position', () => {
    // oracle: sites/SemiInteractive/noConstraints; SemiInteractiveCrossMinProcessor.java (addedConstraints false)
    const { actual } = siteReplay('sites/SemiInteractive/noConstraints');
    expect(actual.layers).toEqual([['g0/n0'], ['g0/n1'], ['g0/n2']]);
    expect(actual.changed).toEqual([]);
  });
});
