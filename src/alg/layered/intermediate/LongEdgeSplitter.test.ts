// SPDX-License-Identifier: EPL-2.0
// Proof of LongEdgeSplitter: every row of layered-order.json whose last replayed entry is LONG_EDGE_SPLITTER (mission 7c, T4a), with the
// class injected through `createProcessor` (the enum arm is wired by T8). Expectations come only from the rows and
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
import { PortListSorter } from './PortListSorter.js';
import { PortSideProcessor } from './PortSideProcessor.js';
import { SemiInteractiveCrossMinProcessor } from './SemiInteractiveCrossMinProcessor.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const PROCESSOR = 'LONG_EDGE_SPLITTER';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-sinewaveoptimization/N7/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-multicoreexecution/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-multicoreexecution/N2/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-multicoreexecution/N8/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-htvq4/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-htvq4/N7/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-levelcrossingdetector/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-randomwalk/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-router/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-producer/root/LONG_EDGE_SPLITTER/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-01/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-02/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-03/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-emptyLayerFirst/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-emptyLayerLast/root/LONG_EDGE_SPLITTER/default',
  'models/layer_constraints-emptyLayerMid/root/LONG_EDGE_SPLITTER/default',
  'models/ticket-600/N1/LONG_EDGE_SPLITTER/default',
  'models/partitioning-nonConsecutivePartitions/root/LONG_EDGE_SPLITTER/default',
  'models/partitioning-partitions01/root/LONG_EDGE_SPLITTER/default',
  'models/partitioning-partitions02/root/LONG_EDGE_SPLITTER/default',
  'models/ticket-656/root/LONG_EDGE_SPLITTER/default',
  'models/ticket-528-nodeEdgeOverlap/A/LONG_EDGE_SPLITTER/default',
  'models/ticket-528-violatedNodeOrder/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-linear_segments_cycle/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-north_multiple/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-north_south_fixed_side/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-nsp1/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-nsp2/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-nsp3/root/LONG_EDGE_SPLITTER/default',
  'models/north_south_ports-south_multiple/root/LONG_EDGE_SPLITTER/default',
  'scenarios/LongEdgeSplitter/long-edges',
  'scenarios/LongEdgeSplitter/fixed-side-ports',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/LongEdgeSplitter/negativeThickness',
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
      case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
        return new HierarchicalPortConstraintProcessor();
      case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
        return new SemiInteractiveCrossMinProcessor();
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

describe('LongEdgeSplitter (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.map((row) => row.id)).toEqual(ROW_NAMES);
  });

  it.each(ROW_NAMES.map((id) => [id] as const))('replays %s', (id) => {
    const row = rows.find((candidate) => candidate.id === id)!;
    const graph = replay(row);
    const actual = orderDump(graph, importRow(row).importDump);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    if (row.steps !== null) {
      expect(row.expected.dump).toBeDefined();
    }
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

describe('LongEdgeSplitter on the site rows', () => {
  it('resets a negative edge thickness to zero on both halves of the split edge', () => {
    // oracle: sites/LongEdgeSplitter/negativeThickness; LongEdgeSplitter.java:141-143
    const { actual } = siteReplay('sites/LongEdgeSplitter/negativeThickness');
    // the row's `double 0.0`, in the encoding of the TS dump
    const zero = { 'org.eclipse.elk.edge.thickness': { t: 'number', v: 0 } };
    expect(propsOf(actual, 'g0/e1')).toEqual(zero);
    expect(propsOf(actual, 'new/e0')).toEqual({ ...zero, origin: { elk: 'e2' } });
    expect(actual.layers).toEqual([['g0/n0'], ['g0/n1', 'new/n0'], ['g0/n2']]);
  });

  it('marks a HEAD label of a split edge with the first segment as its END_LABEL_EDGE', () => {
    // oracle: sites/HeadLabels/longEdge; LongEdgeSplitter.java:236-243
    const { actual } = siteReplay('sites/HeadLabels/longEdge');
    expect(propsOf(actual, 'g0/e1/l0')).toEqual({ 'endLabel.origin': { ref: 'g0/e1' } });
    expect(actual.layers).toEqual([['g0/n0'], ['g0/n1', 'new/n0'], ['g0/n2']]);
  });
});
