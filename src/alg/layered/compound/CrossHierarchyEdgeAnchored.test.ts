// SPDX-License-Identifier: EPL-2.0
// Anchored cases for `CrossHierarchyEdge` and `CrossHierarchyEdgeComparator` (mission 7h, T15, H12/F12): the cross-hierarchy map and
// the restored edges of recorded rows, compared with the recorded tree. The tree dump of the map sorts each key's segments with the
// ported comparator, so a wrong order of the comparator shows as a difference in the recorded segment order; the restored source and
// target of an original edge come from `getActualSource` / `getActualTarget`; the logged map text is `CrossHierarchyEdge.toString`.
// Every literal is the row's.
import { describe, it, expect } from 'vitest';
import { loadCompoundRowsIfPresent, type CompoundRow } from '../../../../test/helpers/layered-compound-replay-rows.js';
import {
  actualFinalTree,
  compoundRowById,
  expectedTree,
  perGraph,
  projectionDiffs,
} from '../../../../test/helpers/layered-compound-anchored.js';
import { isSiteLoggedRow, replayLoggedSite } from '../../../../test/helpers/layered-compound-replay-sites.js';
import type { TreeGraphDump } from '../../../../test/helpers/layered-compound-replay-dump.js';

const ROW_TIMEOUT_MS = 120_000;
const hasRef = loadCompoundRowsIfPresent().length > 0;
const MAP_FIELD = 'crossHierarchyMap';

const endsOfEdges = (graph: TreeGraphDump): [string, string | null, string | null][] =>
  graph.edges.map((edge) => [edge.path, edge.source, edge.target]);

describe.skipIf(!hasRef)('CrossHierarchyEdge and its comparator, anchored cases', () => {
  for (const variant of [
    'deep-mixed/RIGHT',
    'deep-in-long/RIGHT',
    'deep-out-long/RIGHT',
    'siblings/RIGHT',
    'siblings-reverse/RIGHT',
  ]) {
    it(
      `orders the segments of every original edge from source to target, ${variant} (CrossHierarchyEdgeComparator.java:43-60)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: scenarios/CompoundGraphPreprocessor/<variant>; CrossHierarchyEdgeComparator.java:43-60
        const id = `scenarios/CompoundGraphPreprocessor/${variant}`;
        const expected = expectedTree(id)[MAP_FIELD];
        expect(expected?.length ?? 0).toBeGreaterThan(0);
        expect(actualFinalTree(id)[MAP_FIELD]).toEqual(expected);
      },
    );
  }

  for (const variant of ['deep-mixed/RIGHT', 'ns-through/RIGHT']) {
    it(
      `restores the actual source and target port of every original edge, ${variant} (CrossHierarchyEdge.java:95-120)`,
      { timeout: ROW_TIMEOUT_MS },
      () => {
        // oracle: scenarios/CompoundGraphPreprocessor/<variant>; CrossHierarchyEdge.java:95-120
        const id = `scenarios/CompoundGraphPreprocessor/${variant}`;
        const expected = perGraph(expectedTree(id), endsOfEdges);
        expect(expected.some(([, ends]) => ends.length > 0)).toBe(true);
        expect(projectionDiffs(perGraph(actualFinalTree(id), endsOfEdges), expected)).toEqual([]);
      },
    );
  }

  it(
    'prints a segment as its type and its edge in the logged map (CrossHierarchyEdge.java:56)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/JsonDebugUtil/loggedCompound; CrossHierarchyEdge.java:56
      const row: CompoundRow = compoundRowById('sites/JsonDebugUtil/loggedCompound');
      expect(isSiteLoggedRow(row)).toBe(true);
      const diffs = isSiteLoggedRow(row) ? replayLoggedSite(row) : ['not a logged row'];
      expect(diffs.filter((diff) => diff.includes(MAP_FIELD))).toEqual([]);
    },
  );
});
