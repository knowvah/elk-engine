// SPDX-License-Identifier: EPL-2.0
// EdgeRouter and its private cyrusBeck against the groups `edgeRouter` (422 rows) and `cyrusBeck` (46 rows) of
// test/golden/refs/java/mrtree-units.json (recorded by tools/vectors/MrTreeUnitVectors.java): hand-built TGraphs (all three routing
// modes, all five directions, multi level, cycle inducing and same-level edges, steep ends, every gap kind) run through the oracle's
// EdgeRouter; bend points compared at 1e-6, exceptions by class.
import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  CYRUS_BECK_GROUP,
  EDGE_ROUTER_GROUP,
  unhex,
  unitRowsOf,
  type GraphRow,
} from '../../../../test/helpers/mrtree-unit-vectors.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { EdgeRouter } from './EdgeRouter.js';
import { cyrusBeck } from './EdgeRouterCyrusBeck.js';

const TOLERANCE = 1e-6;

const ERRORS: Readonly<Record<string, new (...args: never[]) => Error>> = {
  'java.lang.IndexOutOfBoundsException': IndexOutOfBoundsException,
  'java.util.NoSuchElementException': NoSuchElementException,
};

function replayGroup(group: typeof EDGE_ROUTER_GROUP | typeof CYRUS_BECK_GROUP): GraphRow[] {
  const rows = unitRowsOf<GraphRow['input'], GraphRow['expected']>(group) as GraphRow[];
  const failures: string[] = [];
  for (const row of rows) {
    const { graph, edges } = buildGraph(row.input);
    const run = (): void => {
      if (group === CYRUS_BECK_GROUP) {
        cyrusBeck(graph);
      } else {
        new EdgeRouter().process(graph, new NullElkProgressMonitor());
      }
    };
    const expectedError = row.expected.error;
    if (expectedError !== null) {
      expect(() => run(), row.id).toThrow(ERRORS[expectedError]!);
      continue;
    }
    run();
    expect(edges.length, row.id).toBe(row.expected.bends.length);
    edges.forEach((e, k) => {
      const actual = [...e.getBendPoints()];
      const expected = row.expected.bends[k]!;
      if (actual.length !== expected.length) {
        failures.push(
          `${row.id} edge ${String(k)}: ${String(actual.length)} bend points, expected ${String(expected.length)}`,
        );
        return;
      }
      expected.forEach(([hx, hy], j) => {
        if (Math.abs(actual[j]!.x - unhex(hx)) > TOLERANCE || Math.abs(actual[j]!.y - unhex(hy)) > TOLERANCE) {
          failures.push(`${row.id} edge ${String(k)} bend ${String(j)}`);
        }
      });
    });
  }
  expect(failures).toEqual([]);
  return rows;
}

function errorCounts(rows: readonly GraphRow[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.expected.error !== null) {
      counts.set(r.expected.error, (counts.get(r.expected.error) ?? 0) + 1);
    }
  }
  return [...counts].sort();
}

describe('EdgeRouter against the JVM unit vectors', () => {
  it('equals the recorded bend points of every edgeRouter row', { timeout: 60_000 }, () => {
    const rows = replayGroup(EDGE_ROUTER_GROUP);
    expect(rows.length).toBe(422);
    expect(errorCounts(rows)).toEqual([['java.util.NoSuchElementException', 2]]);
    expect(new Set(rows.map((r) => `${r.input.mode}/${r.input.direction}`)).size).toBe(15);
  });

  it('equals the recorded bend points or exception of every cyrusBeck row', { timeout: 60_000 }, () => {
    const rows = replayGroup(CYRUS_BECK_GROUP);
    expect(rows.length).toBe(46);
    expect(errorCounts(rows)).toEqual([['java.lang.IndexOutOfBoundsException', 5]]);
  });
});
