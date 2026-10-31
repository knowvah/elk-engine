// SPDX-License-Identifier: EPL-2.0
// Proof of InvertedPortProcessor: every row of layered-order.json whose last replayed entry is INVERTED_PORT_PROCESSOR (mission 7c, T4a), with the
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
const PROCESSOR = 'INVERTED_PORT_PROCESSOR';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-sinewaveoptimization/N7/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N2/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-htvq4/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-levelcrossingdetector/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-randomwalk/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-router/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-producer/root/INVERTED_PORT_PROCESSOR/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/INVERTED_PORT_PROCESSOR/default',
  'models/ticket-600/N1/INVERTED_PORT_PROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/INVERTED_PORT_PROCESSOR/default',
  'models/ticket-528-violatedNodeOrder/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-linear_segments_cycle/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-north_multiple/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-north_south_fixed_side/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-nsp1/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-nsp2/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-nsp3/root/INVERTED_PORT_PROCESSOR/default',
  'models/north_south_ports-south_multiple/root/INVERTED_PORT_PROCESSOR/default',
  'scenarios/InvertedPortProcessor/inverted-ports',
  'scenarios/InvertedPortProcessor/long-edges',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/InvertedPortProcessor/freePorts',
  'sites/HeadLabels/longEdge',
  'sites/HeadLabels/invertedPort/short',
  'sites/HeadLabels/invertedPort/both',
  'sites/HeadLabels/westOutput',
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

describe('InvertedPortProcessor (oracle rows)', () => {
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

const FIXED_SIDE = { c: 'PortConstraints', n: 'FIXED_SIDE', t: 'enum' } as const;
const FIXED_POS = { c: 'PortConstraints', n: 'FIXED_POS', t: 'enum' } as const;

describe('InvertedPortProcessor on the site rows', () => {
  it('skips nodes whose port sides are not fixed', () => {
    // oracle: sites/InvertedPortProcessor/freePorts; InvertedPortProcessor.java:117-118
    const { actual } = siteReplay('sites/InvertedPortProcessor/freePorts');
    expect(actual.edges.find((edge) => edge.path === 'g0/e5')).toEqual({
      path: 'g0/e5',
      src: 'g0/n2/p1',
      tgt: 'g0/n3/p0',
      reversed: false,
    });
    expect(actual.ports['g0/n2']).toEqual(['g0/n2/p0', 'g0/n2/p1']);
    expect(actual.ports['g0/n3']).toEqual(['g0/n3/p0', 'g0/n3/p1', 'g0/n3/p2']);
  });

  it('sets END_LABEL_EDGE on the HEAD label of an edge into an east input port', () => {
    // oracle: sites/HeadLabels/invertedPort/short; InvertedPortProcessor.java:213-218
    const { actual } = siteReplay('sites/HeadLabels/invertedPort/short');
    expect(propsOf(actual, 'g0/e0/l0')).toEqual({ 'endLabel.origin': { ref: 'g0/e0' } });
    expect(actual.layers).toEqual([['g0/n1'], ['g0/n0', 'new/n0']]);
  });

  it('keeps the END_LABEL_EDGE a long-edge split already set', () => {
    // oracle: sites/HeadLabels/invertedPort/both; InvertedPortProcessor.java:217 (hasProperty true)
    const { actual } = siteReplay('sites/HeadLabels/invertedPort/both');
    expect(propsOf(actual, 'g0/e0/l0')).toEqual({ 'endLabel.origin': { ref: 'g0/e0' } });
    expect(actual.layers).toEqual([['g0/n1'], ['g0/n2', 'new/n0'], ['g0/n3', 'new/n1'], ['g0/n0', 'new/n2']]);
  });

  it('sets END_LABEL_EDGE on the HEAD label of an edge leaving a west output port', () => {
    // oracle: sites/HeadLabels/westOutput; InvertedPortProcessor.java:282-285
    const { actual } = siteReplay('sites/HeadLabels/westOutput');
    expect(propsOf(actual, 'g0/e0/l0')).toEqual({ 'endLabel.origin': { ref: 'g0/e0' } });
    expect(actual.layers).toEqual([['g0/n0', 'new/n0'], ['g0/n1']]);
  });

  it('creates no dummy for a west-to-east self loop', () => {
    // oracle: sites/NorthSouth/selfLoops/inverted; InvertedPortProcessor.java (self loops are left alone, class comment)
    const { actual } = siteReplay('sites/NorthSouth/selfLoops/inverted');
    expect(actual.edges.find((edge) => edge.path === 'g0/e1')).toEqual({
      path: 'g0/e1',
      src: 'g0/n1/p1',
      tgt: 'g0/n1/p0',
      reversed: false,
    });
    expect(actual.ports['g0/n1']).toEqual(['g0/n1/p0', 'g0/n1/p1']);
  });
});
