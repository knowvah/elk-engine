// SPDX-License-Identifier: EPL-2.0
// The H3 twins of the compound processors (mission 7h, T9). The identity-keyed, iterated containers of CompoundGraphPreprocessor and
// CompoundGraphPostprocessor iterate in insertion order here (the oracle runs under -XX:hashCode=2: every identity hash is 1, one
// bucket, insertion order while the bucket is small). A twin reverses ONE iteration at a time (the finer-grained switches of the two
// section entries; the facades and every production call site keep the Java order) and replays, through the real driver, the rows that
// reach that iteration with more than one element (reversing zero or one element proves nothing):
//   preprocessor   dummyNodeMap.entrySet()                      CompoundGraphPreprocessor.java:129
//                  crossHierarchyMap.keySet()                   :252
//                  each key's values before the sort            :258-259
//   postprocessor  crossHierarchyMap.keySet()                   CompoundGraphPostprocessor.java:89
//                  each key's values before the sort            :93
//                  dummyEdges (the removal loop)                :86 / :191
// Reach is counted by instrumenting the run of every row in the Java order (the same replay that proves the row against the oracle).
// The assertion per site: where the reversed run differs from the oracle on a row, the Java order matches the oracle on that row and
// the reversed order does not (insertion order is the order the oracle has); where it does not differ on any row, the equality under
// reversal is asserted. The id lists below are twin comparisons (the Java-order run against the reversed run on the same row), not
// hand-derived values; a change in either direction fails the site.
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
  type CompoundRow,
} from '../../../test/helpers/layered-compound-replay-rows.js';
import { COMPOUND_POSTPROCESSOR } from '../../../test/helpers/layered-compound-replay-run.js';
import { isSiteThrowRow } from '../../../test/helpers/layered-compound-replay-sites.js';
import { replayFull, replayScenario, runToStop } from '../../../test/helpers/layered-compound-replay-stops.js';
import type { CompoundScenarioRow, FullRow } from '../../../test/helpers/layered-compound-replay-rows.js';
import { runRow } from '../../../test/helpers/layered-compound-replay-run.js';
import { exportLikeOracle } from '../../../test/helpers/graph-json-oracle.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import { CompoundGraphPostprocessor } from './compound/CompoundGraphPostprocessor.js';
import {
  processCompoundGraphPostprocessor,
  type PostprocessorOrder,
} from './compound/CompoundGraphPostprocessorSections.js';
import { CompoundGraphPreprocessor } from './compound/CompoundGraphPreprocessor.js';
import type { CompoundIterationOrder } from './compound/CompoundGraphPreprocessorSegments.js';
import { processCompoundGraphPreprocessor } from './compound/CompoundGraphPreprocessorSections.js';
import { CrossHierarchyEdge } from './compound/CrossHierarchyEdge.js';
import type { LGraph } from './graph/LGraph.js';
import { InternalProperties } from './options/InternalProperties.js';

/** The engine runs of a pass over many rows; coverage instrumentation at high machine load needs room. */
const PASS_TIMEOUT_MS = 600_000;
/** Under -XX:hashCode=2 a bucket of more than this many entries treeifies (the recorder header: "up to 10 entries"). */
const TREEIFY_BOUND = 10;

// ------------------------------------------------------------------------------------------------------------
// the sites

interface Site {
  readonly id: string;
  /** The Java lines of the iteration. */
  readonly java: string;
  readonly orders: { readonly pre?: CompoundIterationOrder; readonly post?: PostprocessorOrder };
  /** The measured size (element count) of the iterated container of one run. */
  readonly sizeOf: (stats: RunStats) => number[];
  /** Whether a row's replay is affected by the site (a models row stopping before the postprocessor is not, for a post site). */
  readonly affects: (row: CompoundRow) => boolean;
}

/** What one compound layout of a run measured: the sizes of the iterated containers. */
interface CallStats {
  readonly dummyNodeMap: number;
  readonly keys: number;
  readonly keyValues: readonly number[];
  readonly sorts: readonly number[];
  readonly dummyEdges: number;
}
interface RunStats {
  readonly pre: CallStats[];
  readonly post: CallStats[];
}

const stopsAtPostprocessor = (row: CompoundRow): boolean =>
  !isCompoundModelsRow(row) || row.expected.stop.processor === COMPOUND_POSTPROCESSOR;
const always = (): boolean => true;
const maxOf = (values: readonly number[]): number => values.reduce((a, b) => Math.max(a, b), 0);

const SITES: readonly Site[] = [
  {
    id: 'pre dummyNodeMap.entrySet() (:129)',
    java: 'CompoundGraphPreprocessor.java:129',
    orders: { pre: { dummyNodeMap: true } },
    sizeOf: (s) => s.pre.map((c) => c.dummyNodeMap),
    affects: always,
  },
  {
    id: 'pre crossHierarchyMap.keySet() (:252)',
    java: 'CompoundGraphPreprocessor.java:252',
    orders: { pre: { keys: true } },
    sizeOf: (s) => s.pre.map((c) => c.keys),
    affects: always,
  },
  {
    id: 'pre key values before the sort (:258-259)',
    java: 'CompoundGraphPreprocessor.java:258-259',
    orders: { pre: { values: true } },
    sizeOf: (s) => s.pre.map((c) => maxOf(c.sorts)),
    affects: always,
  },
  {
    id: 'post crossHierarchyMap.keySet() (:89)',
    java: 'CompoundGraphPostprocessor.java:89',
    orders: { post: { keys: true } },
    sizeOf: (s) => s.post.map((c) => c.keys),
    affects: stopsAtPostprocessor,
  },
  {
    id: 'post key values before the sort (:93)',
    java: 'CompoundGraphPostprocessor.java:93',
    orders: { post: { values: true } },
    sizeOf: (s) => s.post.map((c) => maxOf(c.sorts)),
    affects: stopsAtPostprocessor,
  },
  {
    id: 'post dummyEdges (:86, :191)',
    java: 'CompoundGraphPostprocessor.java:86,191',
    orders: { post: { dummyEdges: true } },
    sizeOf: (s) => s.post.map((c) => c.dummyEdges),
    affects: stopsAtPostprocessor,
  },
];

/** The rows whose reversed run differs from the oracle, per site id (a twin comparison, see the header). */
const DIFFERING_ROWS: Readonly<Record<string, readonly string[]>> = {
  // The original edges are re-attached in key order (`origEdge.setSource(sourcePort)` / `setTarget(targetPort)`, java:186-187), which
  // appends each to the port's outgoing / incoming list; a port shared by two original edges lists them in key order. The tree dump
  // numbers edges by first meeting, ports in order, so the order shows in `incoming` / `outgoing` and in the edge paths.
  'post crossHierarchyMap.keySet() (:89)': [
    'models/edge_label_placement-hierarchy01/14--CompoundGraphPostprocessor/default',
    'models/edge_label_placement-hierarchy01/14-n0-CompoundGraphPostprocessor/DOWN',
    'models/ptolemy-clockdrifthierarchy/5-G1-CompoundGraphPostprocessor/default',
    'scenarios/CompoundGraphPostprocessor/junctions-out/RIGHT',
    'scenarios/CompoundGraphPostprocessor/junctions-out/DOWN',
    'scenarios/CompoundGraphPostprocessor/junctions-in/RIGHT',
    'scenarios/CompoundGraphPostprocessor/junctions-in/DOWN',
    // T14: the `sites` run rows added later; the loop below asserts the same per-row conditions on them
    'sites/CompoundGraphPreprocessor/insideSelfLoopFlow',
    'sites/CompoundGraphPreprocessor/deepOutMerged',
    'sites/CompoundGraphPreprocessor/deepToParentPort',
    'sites/OrthogonalEdgeRouter/extPortSelfLoop/north',
    'sites/OrthogonalEdgeRouter/extPortSelfLoop/south',
    'sites/JsonDebugUtil/loggedCompound',
    // #60 (compound-mutant-rows): the evidence rows with a port that two cross-hierarchy original edges share (the maintainer's ruling
    // on #156, applied to #60); the loop below asserts the same per-row conditions on them
    'sites/CompoundGraphPreprocessor/mergeInDeep',
    'sites/CompoundGraphPreprocessor/mergeOffOut',
    'sites/CompoundGraphPreprocessor/outThenParent',
    'sites/CompoundGraphPreprocessor/parentThenOut',
    'sites/CompoundGraphPreprocessor/inThenParent',
    'sites/CompoundGraphPreprocessor/parentThenIn',
    'sites/CompoundGraphPreprocessor/flowInside',
    'sites/CompoundGraphPreprocessor/flowInsideRev',
    'sites/CompoundGraphPreprocessor/mergedThickness',
  ],
};

// ------------------------------------------------------------------------------------------------------------
// the probe: the facades' `process` replaced by the section entries, measuring what they iterate

function callStats(graph: LGraph, sorts: readonly number[], dummyNodeMap: number): CallStats {
  const map = graph.getProperty(InternalProperties.CROSS_HIERARCHY_MAP);
  const keys = map.keySet();
  const keyValues = keys.map((key) => [...map.get(key)].length);
  const edges = new Set(keys.flatMap((key) => [...map.get(key)].map((segment) => segment.getEdge())));
  return { dummyNodeMap, keys: keys.length, keyValues, sorts, dummyEdges: edges.size };
}

/** Runs `body` while recording the length of every array of CrossHierarchyEdge that is sorted (the key's values, `:259` / `:93`). */
function recordingSorts<T>(body: () => T): { result: T; sorts: number[] } {
  const original = Array.prototype.sort;
  const sorts: number[] = [];
  const spy = vi.spyOn(Array.prototype, 'sort').mockImplementation(function (this: unknown[], compare) {
    if (this[0] instanceof CrossHierarchyEdge) {
      sorts.push(this.length);
    }
    return original.call(this, compare);
  });
  try {
    return { result: body(), sorts };
  } finally {
    spy.mockRestore();
  }
}

/** `env.around`: both facades call their section entry with the given orders and the calls are measured. */
function probeAround(orders: Site['orders'], stats: RunStats): <T>(run: () => T) => T {
  return <T>(run: () => T): T => {
    const pre = vi.spyOn(CompoundGraphPreprocessor.prototype, 'process').mockImplementation(function (
      this: CompoundGraphPreprocessor,
      graph: LGraph,
      monitor: IElkProgressMonitor,
    ) {
      let mapSize = 0;
      const map = this.dummyNodeMap;
      const clear = map.clear.bind(map);
      map.clear = (): void => {
        mapSize = map.size;
        clear();
      };
      const { sorts } = recordingSorts(() =>
        processCompoundGraphPreprocessor(this, graph, monitor, orders.pre ?? 'java'),
      );
      stats.pre.push(callStats(graph, sorts, mapSize));
    });
    const post = vi
      .spyOn(CompoundGraphPostprocessor.prototype, 'process')
      .mockImplementation((graph: LGraph, monitor: IElkProgressMonitor) => {
        const before = callStats(graph, [], 0);
        const { sorts } = recordingSorts(() =>
          processCompoundGraphPostprocessor(graph, monitor, orders.post ?? 'java'),
        );
        stats.post.push({ ...before, sorts });
      });
    try {
      return run();
    } finally {
      post.mockRestore();
      pre.mockRestore();
    }
  };
}

function replayWith(row: CompoundRow, around: ReturnType<typeof probeAround>): string[] {
  switch (row.group) {
    case 'models':
      return runToStop(row as Parameters<typeof runToStop>[0], { around }).diffs;
    case 'scenarios':
      return replayScenario(row as CompoundScenarioRow, { around }).diffs;
    case 'full':
      return replayFull(row as FullRow, { around }).diffs;
    case 'sites':
      return replayScenario(row as unknown as CompoundScenarioRow, { around }).diffs;
    default:
      // every group of COMPOUND_ROW_GROUPS has a case above; a group added later is an error here
      throw new Error(`row ${(row as CompoundRow).id}: no replay form for group ${(row as CompoundRow).group}`);
  }
}

// ------------------------------------------------------------------------------------------------------------
// the passes

interface Baseline {
  readonly diffs: string[];
  readonly stats: RunStats;
}

// The twins replay the rows that have a tree (every row but a `sites` throws row: it has no layout to compare, T14).
const rows = loadCompoundRowsIfPresent().filter((row) => !isSiteThrowRow(row));
const baseline = new Map<string, Baseline>();

function baselinePass(): void {
  for (const row of rows) {
    const stats: RunStats = { pre: [], post: [] };
    const diffs = replayWith(row, probeAround({}, stats));
    baseline.set(row.id, { diffs, stats });
  }
}

/** The exported layout of a run of the row with the orders. */
const exportOf = (row: CompoundRow, orders: Site['orders']): string =>
  exportLikeOracle(runRow(row, { around: probeAround(orders, { pre: [], post: [] }) }).root);

const reaches = (site: Site, row: CompoundRow): boolean =>
  site.affects(row) && maxOf(site.sizeOf(baseline.get(row.id)!.stats)) > 1;

const reversedDiffs = new Map<string, string[]>();
const reportLines: string[] = [];

describe.skipIf(rows.length === 0)('H3 twins: the compound processors', () => {
  it(
    'replays every row in the Java order with the probes (the baseline of the twins)',
    () => {
      baselinePass();
      expect(baseline.size).toBe(rows.length);
    },
    PASS_TIMEOUT_MS,
  );

  describe.each(SITES.map((site) => [site.id, site] as const))('%s', (_id, site) => {
    it(
      'replays the rows that reach it with the iteration reversed',
      () => {
        const reached = rows.filter((row) => reaches(site, row));
        expect(reached.length).toBeGreaterThan(0);
        const sizes = rows.flatMap((row) => site.sizeOf(baseline.get(row.id)!.stats));
        for (const row of reached) {
          const reversed = replayWith(row, probeAround(site.orders, { pre: [], post: [] }));
          reversedDiffs.set(`${site.id}\u0000${row.id}`, reversed);
        }
        const differing = reached.filter((row) => reversedDiffs.get(`${site.id}\u0000${row.id}`)!.length > 0);
        reportLines.push(
          `${site.java}: ${String(reached.length)} of ${String(rows.length)} rows reach it, ${String(differing.length)} differ reversed; largest size ${String(maxOf(sizes))}, rows over ${String(TREEIFY_BOUND)}: ${String(rows.filter((row) => maxOf(site.sizeOf(baseline.get(row.id)!.stats)) > TREEIFY_BOUND).length)}`,
        );
        expect(differing.map((row) => row.id)).toEqual(DIFFERING_ROWS[site.id] ?? []);
        for (const row of differing) {
          expect(baseline.get(row.id)!.diffs).toEqual([]);
          expect(reversedDiffs.get(`${site.id}\u0000${row.id}`)!.length).toBeGreaterThan(0);
          // the difference stays in the intermediate tree: the exported layout of the two runs is identical
          expect(exportOf(row, site.orders)).toBe(exportOf(row, {}));
          // an observable site is below the treeification bound on its rows, so insertion order is the faithful reading
          expect(maxOf(site.sizeOf(baseline.get(row.id)!.stats))).toBeLessThanOrEqual(TREEIFY_BOUND);
        }
      },
      PASS_TIMEOUT_MS,
    );
  });
});

afterAll(() => {
  console.info(`T9 twins:\n${reportLines.join('\n')}`);
});
