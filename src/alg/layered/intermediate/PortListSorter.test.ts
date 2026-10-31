// SPDX-License-Identifier: EPL-2.0
// Proof of PortListSorter: every row of layered-order.json whose last replayed entry is PORT_LIST_SORTER (mission 7c, T4a), with the
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
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const PROCESSOR = 'PORT_LIST_SORTER';
const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/PORT_LIST_SORTER/default',
  'models/ptolemy-checkexecutiontimeconstraints/N1/PORT_LIST_SORTER/default',
  'models/ptolemy-sinewaveoptimization/N7/PORT_LIST_SORTER/default',
  'models/ptolemy-multicoreexecution/root/PORT_LIST_SORTER/default',
  'models/ptolemy-multicoreexecution/N2/PORT_LIST_SORTER/default',
  'models/ptolemy-multicoreexecution/N8/PORT_LIST_SORTER/default',
  'models/ptolemy-htvq4/root/PORT_LIST_SORTER/default',
  'models/ptolemy-htvq4/N7/PORT_LIST_SORTER/default',
  'models/ptolemy-levelcrossingdetector/root/PORT_LIST_SORTER/default',
  'models/ptolemy-randomwalk/root/PORT_LIST_SORTER/default',
  'models/ptolemy-router/root/PORT_LIST_SORTER/default',
  'models/ptolemy-producer/root/PORT_LIST_SORTER/default',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-01/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-02/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-03/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-emptyLayerFirst/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-emptyLayerLast/root/PORT_LIST_SORTER/default',
  'models/layer_constraints-emptyLayerMid/root/PORT_LIST_SORTER/default',
  'models/ticket-600/N1/PORT_LIST_SORTER/default',
  'models/partitioning-nonConsecutivePartitions/root/PORT_LIST_SORTER/default',
  'models/partitioning-partitions01/root/PORT_LIST_SORTER/default',
  'models/partitioning-partitions02/root/PORT_LIST_SORTER/default',
  'models/ticket-656/root/PORT_LIST_SORTER/default',
  'models/ticket-528-nodeEdgeOverlap/A/PORT_LIST_SORTER/default',
  'models/ticket-528-violatedNodeOrder/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-linear_segments_cycle/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-north_multiple/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-north_south_fixed_side/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-nsp1/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-nsp2/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-nsp3/root/PORT_LIST_SORTER/default',
  'models/north_south_ports-south_multiple/root/PORT_LIST_SORTER/default',
  'scenarios/PortListSorter/fixed-order',
  'scenarios/PortListSorter/fixed-side',
  // T11 site rows (branch probes; replayed here through the class's own factories)
  'sites/PortListSorter/freePorts',
  'sites/PortListSorter/portDegree',
  'sites/PortListSorter/fixedPosAllSides',
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

describe('PortListSorter (oracle rows)', () => {
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

describe('PortListSorter (Java throw site)', () => {
  // PortListSorter.java:243-245 (a FIXED_ORDER node whose ports on one undefined side have no port index)
  it('throws for two ports of an undefined side on a node with fixed port order', () => {
    const graph = new Graph();
    const node = addNode(graph);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    addPort(node);
    addPort(node);
    node.setLayer(addLayer(graph));
    expect(() => new PortListSorter().process(graph, new NullElkProgressMonitor())).toThrow(IllegalStateException);
    expect(() => new PortListSorter().process(graph, new NullElkProgressMonitor())).toThrow('Port side is undefined');
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

describe('PortListSorter on the site rows', () => {
  it('leaves the ports of a FREE node in input order', () => {
    // oracle: sites/PortListSorter/freePorts; PortListSorter.java:74-76 (neither order nor side fixed)
    const { actual } = siteReplay('sites/PortListSorter/freePorts');
    expect(actual.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1', 'g0/n0/p2']);
    expect(actual.changed).toEqual([]);
  });

  it('sorts the east and west ports of a FIXED_SIDE node by port degree', () => {
    // oracle: sites/PortListSorter/portDegree; PortListSorter.java:81-83, CMP_PORT_DEGREE_EAST_WEST :181
    const { actual } = siteReplay('sites/PortListSorter/portDegree');
    expect(actual.ports['g0/n1']).toEqual(['g0/n1/p3', 'g0/n1/p0', 'g0/n1/p1', 'g0/n1/p2']);
    expect(actual.ports['g0/n0']).toEqual(['g0/n0/p0', 'g0/n0/p1', 'g0/n0/p2']);
    expect(propsOf(actual, 'g0/e3')).toEqual({ reversed: { t: 'bool', v: true } });
  });

  it('orders FIXED_POS ports clockwise by position on all four sides', () => {
    // oracle: sites/PortListSorter/fixedPosAllSides; PortListSorter.java:240-258 (CMP_FIXED_ORDER_AND_FIXED_POS)
    const { actual } = siteReplay('sites/PortListSorter/fixedPosAllSides');
    expect(actual.ports['g0/n0']).toEqual([
      'g0/n0/p4',
      'g0/n0/p5',
      'g0/n0/p0',
      'g0/n0/p1',
      'g0/n0/p7',
      'g0/n0/p6',
      'g0/n0/p3',
      'g0/n0/p2',
    ]);
  });
});
