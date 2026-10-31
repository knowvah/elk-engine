// SPDX-License-Identifier: EPL-2.0
// Proof of PortSideProcessor: every row of layered-order.json whose last replayed entry is PORT_SIDE_PROCESSOR (mission 7c, T4a), with the
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
const PROCESSOR = 'PORT_SIDE_PROCESSOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-sinewaveoptimization/N7/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N2/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-htvq4/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-levelcrossingdetector/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-randomwalk/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-router/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-producer/root/PORT_SIDE_PROCESSOR/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-01/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-02/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-03/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerFirst/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerLast/root/PORT_SIDE_PROCESSOR/default',
  'models/layer_constraints-emptyLayerMid/root/PORT_SIDE_PROCESSOR/default',
  'models/ticket-600/N1/PORT_SIDE_PROCESSOR/default',
  'models/partitioning-nonConsecutivePartitions/root/PORT_SIDE_PROCESSOR/default',
  'models/partitioning-partitions01/root/PORT_SIDE_PROCESSOR/default',
  'models/partitioning-partitions02/root/PORT_SIDE_PROCESSOR/default',
  'models/ticket-656/root/PORT_SIDE_PROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/PORT_SIDE_PROCESSOR/default',
  'models/ticket-528-violatedNodeOrder/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-linear_segments_cycle/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-north_multiple/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-north_south_fixed_side/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-nsp1/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-nsp2/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-nsp3/root/PORT_SIDE_PROCESSOR/default',
  'models/north_south_ports-south_multiple/root/PORT_SIDE_PROCESSOR/default',
  'scenarios/PortSideProcessor/fixed-side',
  'scenarios/PortSideProcessor/free-ports',
  'scenarios/PortSideProcessor/fixed-order-north-south',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/PortSideProcessor/undefinedSide',
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

describe('PortSideProcessor (oracle rows)', () => {
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
