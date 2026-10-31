// SPDX-License-Identifier: EPL-2.0
// The TS side of the order sweep (mission 7c, T10, B6): the 7b phase sweep helper (layered-phase-sweep.ts, never edited)
// reads `results.jsonl` and rewrites C4 values; this file adds the one thing the order dump has over the phase dump,
// `ports`, to the canonical form of the oracle's `OrderSweep.orderCanonical` (tools/vectors/LayeredOrderVectors.java):
// `edges` and `changed` sorted by path, C4 values rewritten, object keys sorted recursively (so the `ports` keys are),
// no whitespace, SHA-256 of the UTF-8 text.
import type { OrderExpected, OrderRow } from './layered-order-replay-rows.js';
import { c4Free, canonicalHash, sweepRow, type SweepReplay } from './layered-phase-sweep.js';

export {
  isOk,
  isThrows,
  readSweep,
  STATUS_REFUSED,
  STATUS_TIMEOUT,
  type SweepLine,
  type SweepOk,
  type SweepThrows,
} from './layered-phase-sweep.js';

const byPath = (a: { readonly path: string }, b: { readonly path: string }): number =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/** The canonical hash of an order dump: `edges`/`changed` sorted by path, C4 values rewritten, `ports` included. */
export function orderHash(expected: OrderExpected): string {
  return canonicalHash(
    c4Free({
      ...expected,
      edges: [...expected.edges].sort(byPath),
      changed: [...expected.changed].sort(byPath),
    }),
  );
}

/** The pipeline row an ok case replays: the model file inline, the recorded options and prefix. */
export function orderSweepRow(line: SweepReplay, modelsDir: string): OrderRow {
  const row = sweepRow(line, modelsDir);
  return { ...row, expected: { ...row.expected, ports: {} } };
}
