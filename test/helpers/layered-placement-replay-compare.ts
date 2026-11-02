// SPDX-License-Identifier: EPL-2.0
// Comparison of a replayed placement dump with a recorded one (mission 7d, N3): the 7c order comparison, plus the
// geometry. Coordinates are hex doubles within the AD-4 bar (`compareValues`, the 7a number rule); the key sets of
// nodes, ports and labels and the number of layers are exact. `ports` and `labels` are compared only when the expected
// side carries them.
import type { Diff } from './layered-phase-replay-compare.js';
import { compareOrder, compareOrderFullDump } from './layered-order-replay-compare.js';
import { compareValues } from './layered-site-replay-compare.js';
import { GEOMETRY_KEY, type PlacementExpected } from './layered-placement-replay-rows.js';

const MISSING = 'missing';
const UNEXPECTED = 'unexpected';

const whereOf = (member: string, key: string): string => `${GEOMETRY_KEY} ${member} ${key}`;

function valueDiffs(where: string, actual: unknown, expected: unknown): Diff[] {
  return compareValues(where, actual, expected).map((message) => ({ where, message }));
}

function compareEntries(
  member: string,
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): Diff[] {
  const diffs: Diff[] = [];
  for (const [key, want] of Object.entries(expected)) {
    const where = whereOf(member, key);
    diffs.push(...(key in actual ? valueDiffs(where, actual[key], want) : [{ where, message: MISSING }]));
  }
  for (const key of Object.keys(actual)) {
    if (!(key in expected)) {
      diffs.push({ where: whereOf(member, key), message: UNEXPECTED });
    }
  }
  return diffs;
}

function compareLayers(actual: readonly unknown[], expected: readonly unknown[]): Diff[] {
  const count = Math.max(actual.length, expected.length);
  const keyed = (list: readonly unknown[]): Record<string, unknown> =>
    Object.fromEntries(list.map((size, i) => [`layer${String(i)}`, size]));
  return count === 0 ? [] : compareEntries('layers', keyed(actual), keyed(expected));
}

function compareGeometry(actual: PlacementExpected['geometry'], expected: PlacementExpected['geometry']): Diff[] {
  const diffs = [
    ...compareEntries('nodes', actual.nodes, expected.nodes),
    ...compareLayers(actual.layers, expected.layers),
  ];
  if (expected.ports !== undefined) {
    diffs.push(...compareEntries('ports', actual.ports ?? {}, expected.ports));
  }
  if (expected.labels !== undefined) {
    diffs.push(...compareEntries('labels', actual.labels ?? {}, expected.labels));
  }
  return diffs;
}

/** The differences between a replayed and a recorded placement dump (`[]`: equal); the full `dump` is not compared. */
export function comparePlacement(actual: PlacementExpected, expected: PlacementExpected): Diff[] {
  return [...compareOrder(actual, expected), ...compareGeometry(actual.geometry, expected.geometry)];
}

/** The 7a whole-graph comparison of a row that stores a full `dump` (as `compareOrderFullDump`); `[]` otherwise. */
export function comparePlacementFullDump(actual: PlacementExpected, expected: PlacementExpected): Diff[] {
  return compareOrderFullDump(actual, expected);
}
