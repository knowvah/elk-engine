// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-order.json (mission 7c, C3): the 7b row format, whose `expected` also carries
// `ports`, the port order of every node (layered or layerless) after the phase. Loading, import and replay are the 7b
// helpers; only the `ports` check is new.
import { loadRows, type PhaseRow } from './layered-phase-replay-rows.js';
import type { Expected } from './layered-phase-replay-dump.js';

/** B2's `expected` plus the port order: node path to the paths of its ports, in list order. */
export interface OrderExpected extends Expected {
  readonly ports: Readonly<Record<string, readonly string[]>>;
}

export interface OrderRow extends PhaseRow {
  readonly expected: OrderExpected;
}

function hasPorts(expected: Expected): expected is OrderExpected {
  const { ports } = expected as { ports?: unknown };
  return (
    ports !== null &&
    typeof ports === 'object' &&
    !Array.isArray(ports) &&
    Object.values(ports).every((list) => Array.isArray(list) && list.every((path) => typeof path === 'string'))
  );
}

/** The rows of a `layered-order.json` file; a row whose `expected.ports` is missing or malformed is rejected. */
export function loadOrderRows(file: string): OrderRow[] {
  return loadRows(file).map((row) => {
    if (!hasPorts(row.expected)) {
      throw new Error(`row ${row.id}: expected.ports is missing or is not a map of path lists`);
    }
    return row as OrderRow;
  });
}
