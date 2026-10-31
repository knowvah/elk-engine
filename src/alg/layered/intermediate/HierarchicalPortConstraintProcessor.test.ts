// SPDX-License-Identifier: EPL-2.0
// Proof of HierarchicalPortConstraintProcessor: every row of layered-order.json whose last replayed entry is HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR (mission 7c, T4b), with the
// classes injected through `createProcessor` (the enum arms are wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { LGraph as Graph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { HierarchicalPortConstraintProcessorNodeComparator } from './HierarchicalPortConstraintProcessorNodeComparator.js';
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
const PROCESSOR = 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR';

const ROW_NAMES: readonly string[] = [
  'models/ptolemy-multicoreexecution/N2/HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-multicoreexecution/N8/HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR/default',
  'models/ptolemy-htvq4/N7/HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR/default',
  'models/ticket-600/N1/HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR/default',
  'models/ticket-528-nodeEdgeOverlap/A/HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR/default',
  'scenarios/HierarchicalPortConstraintProcessor/FIXED_SIDE',
  'scenarios/HierarchicalPortConstraintProcessor/FIXED_ORDER',
  'scenarios/HierarchicalPortConstraintProcessor/FIXED_POS',
  'scenarios/HierarchicalPortConstraintProcessor/FIXED_RATIO',
  'scenarios/HierarchicalPortConstraintProcessor/north-south-chain',
  'scenarios/HierarchicalPortConstraintProcessor/north-south-chain-order',
  'scenarios/HierarchicalPortConstraintProcessor/fixed-order-two-per-side',
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

describe('HierarchicalPortConstraintProcessor (oracle rows)', () => {
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

// The four arms of the Java `NodeComparator.compare` (HierarchicalPortConstraintProcessor.java:86-107), which the
// rows only partly reach (no row sorts a layer holding a regular node beside the dummies).
describe('HierarchicalPortConstraintProcessorNodeComparator (from the Java text)', () => {
  const graph = new Graph();
  const comparator = new HierarchicalPortConstraintProcessorNodeComparator();
  const dummy = (position: number) => {
    const node = addNode(graph, NodeType.EXTERNAL_PORT);
    node.setProperty(InternalProperties.PORT_RATIO_OR_POSITION, position);
    return node;
  };

  it('sorts a regular second node below the first (-1) and a regular first node above the second (1)', () => {
    const regular = addNode(graph);
    expect(comparator.compare(dummy(1), regular)).toBe(-1);
    expect(comparator.compare(regular, dummy(1))).toBe(1);
    expect(comparator.compare(regular, addNode(graph))).toBe(-1);
  });

  it('compares two dummies by position: equal is 0, smaller first is -1, larger first is 1', () => {
    expect(comparator.compare(dummy(2), dummy(2))).toBe(0);
    expect(comparator.compare(dummy(1), dummy(2))).toBe(-1);
    expect(comparator.compare(dummy(2), dummy(1))).toBe(1);
  });
});
