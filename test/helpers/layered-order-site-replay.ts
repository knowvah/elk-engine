// SPDX-License-Identifier: EPL-2.0
// Replays one row of test/golden/refs/java/layered-order.json by id through the real processors and phases (issue #46).
// The class tests of the order mission each held this block (`SITE_ROWS`, `siteFactories`, `replaySite`); the
// assertions on the returned dump stay in those tests.
import { repoRoot } from '../corpus/corpus.js';
import { orderDump } from './layered-order-replay-dump.js';
import { loadOrderRows, type OrderExpected, type OrderRow } from './layered-order-replay-rows.js';
import { runSteps } from './layered-phase-replay-ops.js';
import { importRow } from './layered-phase-replay-rows.js';
import { ORDER_PHASE_FACTORIES } from './layered-replay-factories.js';

const ORDER_ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;

/** The rows of the ref, read on the first replay and kept for the worker: nothing writes to them. */
let orderRows: OrderRow[] | undefined;

/** Replays the site row `id` with the real processors and phases and dumps the result in the recorder's shape. */
export function replayOrderSite(id: string): OrderExpected {
  orderRows ??= loadOrderRows(ORDER_ROWS_FILE);
  const row = orderRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`site row ${id} is not in layered-order.json`);
  }
  return orderDump(runSteps(row, ORDER_PHASE_FACTORIES), importRow(row).importDump);
}
