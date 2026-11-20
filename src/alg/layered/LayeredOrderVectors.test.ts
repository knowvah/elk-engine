// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-order.json (mission 7c, T8; recorded by
// tools/vectors/LayeredOrderVectors.java from the source-built oracle) through the whole 7c set the way the pipeline
// uses it: processors by `IntermediateProcessorStrategy` name, phases by `CycleBreakingStrategy` / `LayeringStrategy` /
// `CrossingMinimizationStrategy`. Model rows replay their recorded `prefix`; step rows interpret their `steps`. Numbers
// within 1e-6 (AD-4), everything else exactly (the comparators of test/helpers/layered-order-replay-compare.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { dumpLGraph } from '../../../test/helpers/layered-framework-replay.js';
import { compareOrder, compareOrderFullDump } from '../../../test/helpers/layered-order-replay-compare.js';
import { orderDump } from '../../../test/helpers/layered-order-replay-dump.js';
import { runOrderPrefix } from '../../../test/helpers/layered-order-replay-ops.js';
import { loadOrderRows, type OrderRow } from '../../../test/helpers/layered-order-replay-rows.js';
import { runSteps } from '../../../test/helpers/layered-phase-replay-ops.js';
import { importRow, ROW_GROUPS } from '../../../test/helpers/layered-phase-replay-rows.js';
import { STRICT_ORDER_PHASE_FACTORIES } from '../../../test/helpers/layered-replay-factories.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

const rows = loadOrderRows(ROWS_FILE);
const rowCounts = (JSON.parse(readFileSync(ROWS_FILE, 'utf8')) as { rowCounts: Record<string, number> }).rowCounts;

function replay(row: OrderRow): ReturnType<typeof orderDump> {
  const graph =
    row.steps === null
      ? runOrderPrefix(row, STRICT_ORDER_PHASE_FACTORIES)
      : runSteps(row, STRICT_ORDER_PHASE_FACTORIES);
  const actual = orderDump(graph, importRow(row).importDump);
  return row.expected.dump === undefined ? actual : { ...actual, dump: dumpLGraph(graph) };
}

describe('layered-order.json replay', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded total row count', () => {
    expect(rows.length).toBe(Object.values(rowCounts).reduce((sum, n) => sum + n, 0));
  });

  it.each(ROW_GROUPS)('has the recorded %s row count', (group) => {
    expect(rows.filter((row) => row.group === group).length).toBe(rowCounts[group] ?? 0);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s: replays the recorded result', (_id, row) => {
    const actual = replay(row);
    expect(compareOrder(actual, row.expected)).toEqual([]);
    if (row.expected.dump !== undefined) {
      expect(compareOrderFullDump(actual, row.expected)).toEqual([]);
    }
  });
});
