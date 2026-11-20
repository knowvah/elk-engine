// SPDX-License-Identifier: EPL-2.0
// Proof of SortByInputModelProcessor: every row of layered-order.json whose last replayed entry is SORT_BY_INPUT_ORDER_OF_MODEL (mission 7c, T4b), with the
// classes injected through `createProcessor` (the enum arms are wired by T8). Expectations come only from the rows and
// the Java (L4).
import { describe, expect, it } from 'vitest';
import { InternalProperties } from '../options/InternalProperties.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareOrder, compareOrderFullDump } from '../../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../../test/helpers/layered-order-replay-dump.js';
import { runOrderPrefix } from '../../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { LGraph } from '../graph/LGraph.js';
import { SortByInputModelProcessor } from './SortByInputModelProcessor.js';
import { ORDER_PROCESSOR_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const PROCESSOR = 'SORT_BY_INPUT_ORDER_OF_MODEL';

const ROW_NAMES: readonly string[] = [
  'models/ptolemy-checkexecutiontimeconstraints/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-checkexecutiontimeconstraints/N1/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-sinewaveoptimization/N7/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-multicoreexecution/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-multicoreexecution/N2/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-multicoreexecution/N8/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-htvq4/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-htvq4/N7/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-levelcrossingdetector/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-randomwalk/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-router/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-producer/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ptolemy-thalesdynamicmodalmodelpn/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-01/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-02/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-03/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-emptyLayerFirst/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-emptyLayerLast/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/layer_constraints-emptyLayerMid/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ticket-600/N1/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/partitioning-nonConsecutivePartitions/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/partitioning-partitions01/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/partitioning-partitions02/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ticket-656/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ticket-528-nodeEdgeOverlap/A/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/ticket-528-violatedNodeOrder/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-linear_segments_cycle/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-north_multiple/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-north_south_fixed_side/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-nsp1/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-nsp2/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-nsp3/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'models/north_south_ports-south_multiple/root/SORT_BY_INPUT_ORDER_OF_MODEL/PREFER_EDGES',
  'scenarios/SortByInputModelProcessor/PREFER_EDGES',
  'scenarios/SortByInputModelProcessor/NODES_AND_EDGES',
  'scenarios/SortByInputModelProcessor/PREFER_NODES',
  'scenarios/SortByInputModelProcessor/port-model-order',
  'scenarios/SortByInputModelProcessor/preserve-order-small',
  'scenarios/SortByInputModelProcessor/preserve-order-long',
  'scenarios/SortByInputModelProcessor/group-enforced',
  'scenarios/SortByInputModelProcessor/feedback-edges',
];

/** The entries a row replays, spelled like prefix entries (`NAME` or `PHASE/STRATEGY`). */
function entriesOf(row: OrderRow): readonly string[] {
  return row.prefix !== null
    ? row.prefix
    : row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase').map((step) => step.slice(1).join('/'));
}

const rows = loadOrderRows(ROWS_FILE).filter((row) => entriesOf(row).at(-1) === PROCESSOR);

function replay(row: OrderRow): LGraph {
  return row.steps === null ? runOrderPrefix(row, ORDER_PROCESSOR_FACTORIES) : runSteps(row, ORDER_PROCESSOR_FACTORIES);
}

describe('SortByInputModelProcessor (oracle rows)', () => {
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

// Java `longEdgeTargetNodePreprocessing` unboxes `edge.getProperty(MODEL_ORDER)` (SortByInputModelProcessor.java:125):
// a graph imported without a model-order strategy has none, which is a NullPointerException there and a TypeError
// here (AD-16b). The graph is the PREFER_EDGES scenario replayed up to, not including, the processor.
describe('SortByInputModelProcessor.longEdgeTargetNodePreprocessing (null model order)', () => {
  const scenario = rows.find((row) => row.id === 'scenarios/SortByInputModelProcessor/PREFER_EDGES')!;
  const beforeProcessor = { ...scenario, steps: scenario.steps!.slice(0, -2) };

  function nodeWithOutgoingEdge(graph: LGraph) {
    return graph
      .getLayers()
      .flatMap((layer) => layer.getNodes())
      .find((node) => node.getPorts().some((port) => port.getOutgoingEdges().length > 0))!;
  }

  it('throws a TypeError when an unreversed outgoing edge has no model order', () => {
    const graph = runSteps(beforeProcessor, ORDER_PROCESSOR_FACTORIES);
    const node = nodeWithOutgoingEdge(graph);
    node
      .getPorts()
      .forEach((port) =>
        port.getOutgoingEdges().forEach((edge) => edge.setProperty(InternalProperties.MODEL_ORDER, null)),
      );
    expect(() => SortByInputModelProcessor.longEdgeTargetNodePreprocessing(node)).toThrow(
      new TypeError('Cannot unbox the model order of an edge without one'),
    );
  });

  it('returns the cached map of the node on a second call', () => {
    const graph = runSteps(beforeProcessor, ORDER_PROCESSOR_FACTORIES);
    const node = nodeWithOutgoingEdge(graph);
    const first = SortByInputModelProcessor.longEdgeTargetNodePreprocessing(node);
    expect(node.getProperty(InternalProperties.TARGET_NODE_MODEL_ORDER)).toBe(first);
    expect(SortByInputModelProcessor.longEdgeTargetNodePreprocessing(node)).toBe(first);
  });
});
