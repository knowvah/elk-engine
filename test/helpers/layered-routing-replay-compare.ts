// SPDX-License-Identifier: EPL-2.0
// Comparison of a replayed routing dump with a recorded one (mission 7e, R3): the 7d placement comparison, plus the
// graph box, the edge routes and (when the expected side carries them) the splines. Coordinates are hex doubles within
// the AD-4 bar (`compareValues`, the number rule of layered-framework-replay.ts); bend-point and junction-point counts,
// chains, ranks and booleans are exact. The key sets of `edges` and `splines` are exact: a missing or an extra edge or
// start edge is reported by its path. `compareCall` compares two call results of the same type.
import type { Diff } from './layered-phase-replay-compare.js';
import { comparePlacement, comparePlacementFullDump } from './layered-placement-replay-compare.js';
import { compareValues } from './layered-site-replay-compare.js';
import {
  IGNORED_ROUTE_START_ID,
  type CallResult,
  type RoutingExpected,
  type RoutingGeometry,
} from './layered-routing-replay-rows.js';

const MISSING = 'missing';
const UNEXPECTED = 'unexpected';
const GRAPH_WHERE = 'geometry graph';
const RESULT_WHERE = 'result';

function valueDiffs(where: string, actual: unknown, expected: unknown): Diff[] {
  return compareValues(where, actual, expected).map((message) => ({ where, message }));
}

function compareKeyed(
  member: string,
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): Diff[] {
  const diffs: Diff[] = [];
  for (const [key, want] of Object.entries(expected)) {
    const where = `geometry ${member} ${key}`;
    diffs.push(...(key in actual ? valueDiffs(where, actual[key], want) : [{ where, message: MISSING }]));
  }
  for (const key of Object.keys(actual)) {
    if (!(key in expected)) {
      diffs.push({ where: `geometry ${member} ${key}`, message: UNEXPECTED });
    }
  }
  return diffs;
}

function compareRoutingGeometry(actual: RoutingGeometry, expected: RoutingGeometry): Diff[] {
  const diffs = [
    ...valueDiffs(GRAPH_WHERE, actual.graph, expected.graph),
    ...compareKeyed('edges', actual.edges, expected.edges),
  ];
  if (expected.splines !== undefined) {
    diffs.push(...compareKeyed('splines', actual.splines ?? {}, expected.splines));
  }
  return diffs;
}

/** The differences between a replayed and a recorded routing dump (`[]`: equal); the full `dump` is not compared. */
export function compareRouting(actual: RoutingExpected, expected: RoutingExpected): Diff[] {
  return [...comparePlacement(actual, expected), ...compareRoutingGeometry(actual.geometry, expected.geometry)];
}

/** A dump with the route start removed from every `properties` map: the recorder never writes it. */
function withoutRouteStart(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(withoutRouteStart);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      key === 'properties'
        ? Object.fromEntries(Object.entries(value as object).filter(([id]) => id !== IGNORED_ROUTE_START_ID))
        : withoutRouteStart(value),
    ]),
  );
}

/**
 * The 7a whole-graph comparison of a row that stores a full `dump` (as `comparePlacementFullDump`); `[]` otherwise. The
 * replayed dump is compared without `splines.route.start`, which the recorded dump leaves out.
 */
export function compareRoutingFullDump(actual: RoutingExpected, expected: RoutingExpected): Diff[] {
  const dump = actual.dump === undefined ? undefined : (withoutRouteStart(actual.dump) as typeof actual.dump);
  return comparePlacementFullDump({ ...actual, dump }, expected);
}

/** The differences between a call's summarised result and a recorded one: the type exactly, the value per type. */
export function compareCall(actual: CallResult, expected: CallResult): Diff[] {
  if (actual.type !== expected.type) {
    return [{ where: RESULT_WHERE, message: `expected a ${expected.type} result, got ${actual.type}` }];
  }
  return valueDiffs(RESULT_WHERE, actual.value, expected.value);
}
