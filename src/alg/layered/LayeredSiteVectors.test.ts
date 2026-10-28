// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/layered-sites.json (mission 7a, T10, L4, X5, X6; recorded by
// tools/vectors/LayeredSiteVectors.java from the source-built oracle before any TS consumer): numbers within 1e-6
// (AD-4), ids, enum names, strings and counts exactly, whole-graph labels with the T1 comparators. This replay is the
// authority (6c D1) for the literals that the colocated unit tests re-anchor to a row id.
//
// Provider rows (`site/provider/*`): the TS `ElkLayered` is staged (7f), so `layout` throws
// `UnsupportedOperationException` naming 7f at the driver method the row selects (`doLayout`, or `doCompoundLayout`
// for INCLUDE_CHILDREN); the recorded `elk` after layout stays for 7f.
import { describe, expect, it } from 'vitest';
import {
  OPS,
  compareRow,
  loadSiteFile,
  opsUsed,
  replayRow,
  type SiteRow,
} from '../../../test/helpers/layered-site-replay.js';
import { hierarchyAwareClasses, isPorted } from '../../../test/helpers/layered-site-replay-ops-transform.js';

const file = loadSiteFile();
const PROVIDER_SITE = 'LayeredLayoutProvider';
const HIERARCHY_AWARE_ROW = 'site/strings/hierarchyAware';

/** The staged `ElkLayered` method a provider row reaches (named in the test title). */
function stagedMethod(row: SiteRow): string {
  return row.id.includes('include-children') ? 'doCompoundLayout' : 'doLayout';
}

describe('layered-sites.json replay', () => {
  it('has unique row ids', () => {
    expect(new Set(file.rows.map((row) => row.id)).size).toBe(file.rows.length);
  });

  it.each(Object.entries(file.rowCounts))('has the recorded %s row count', (site, count) => {
    expect(file.rows.filter((row) => row.site === site).length).toBe(count);
  });

  it('has no rows outside the recorded sites', () => {
    const counted = Object.values(file.rowCounts).reduce((sum, n) => sum + n, 0);
    expect(file.rows.length).toBe(counted);
  });

  it('uses only ops of the dispatch table', () => {
    const missing = [...opsUsed(file)].filter((op) => !OPS.has(op));
    expect(missing).toEqual([]);
  });

  describe('staged hierarchy-aware classes', () => {
    it('lists the ported classes that implement IHierarchyAwareLayoutProcessor', () => {
      const recorded = file.rows.find((row) => row.id === HIERARCHY_AWARE_ROW)!.expected.classes as string[];
      expect(hierarchyAwareClasses()).toEqual(recorded.filter(isPorted));
    });

    it('has no TS source yet for the recorded classes it leaves out (7d)', () => {
      const recorded = file.rows.find((row) => row.id === HIERARCHY_AWARE_ROW)!.expected.classes as string[];
      expect(recorded.filter((name) => !isPorted(name))).toEqual([
        'org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer',
      ]);
    });
  });

  it.each(
    file.rows.map((row) => {
      const title = row.site === PROVIDER_SITE ? `${row.id} (staged ElkLayered.${stagedMethod(row)}, 7f)` : row.id;
      return [title, row] as [string, SiteRow];
    }),
  )('%s', (_title, row) => {
    expect(compareRow(row, replayRow(row))).toEqual([]);
  });
});
