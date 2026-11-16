// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/layered-compound.json (mission 7h, T9; recorded by tools/vectors/LayeredCompoundVectors.java
// from the source-built oracle) through the real driver, with no spy and no injected factory: `RecursiveGraphLayoutEngine` ->
// `LayeredLayoutProvider` -> `ElkLayered.doCompoundLayout` -> CompoundGraphPreprocessor / hierarchicalLayout /
// HierarchicalNodeResizingProcessor / CompoundGraphPostprocessor.
//   full       the export at AD-4 and the plans of every level, nested levels included (`replayFull`);
//   models     the whole LGraph tree at the recorded hierarchical stop (`runToStop`);
//   scenarios  layout, plans, number of stops and the tree after the postprocessor (`replayScenario`);
//   sites      run, logged and throws rows (`replaySiteRow`, layered-compound-replay-sites.ts): the group is replayed by
//              src/alg/layered/LayeredCompoundSites.test.ts under its scenario titles and here by row id, like every other group.
// Numbers within 1e-6 (AD-4), everything else exactly. A test title is its row id, so `-t '<row id>$'` isolates one row.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMPOUND_ROW_GROUPS,
  compoundRefExists,
  compoundRefPath,
  compoundRowCountsDifference,
  isCompoundFullRow,
  isCompoundModelsRow,
  isCompoundScenarioRow,
  loadCompoundRowsIfPresent,
  type CompoundRow,
  type CompoundRowGroup,
} from '../../../test/helpers/layered-compound-replay-rows.js';
import { replayFull, runToStop, replayScenario } from '../../../test/helpers/layered-compound-replay-stops.js';
import { replaySiteRow } from '../../../test/helpers/layered-compound-replay-sites.js';

/** The engine run of one row, with the coverage-instrumentation headroom of the other replay suites. */
const ROW_TIMEOUT_MS = 120_000;

const rows = loadCompoundRowsIfPresent();
const byGroup = (group: CompoundRowGroup): readonly CompoundRow[] => rows.filter((row) => row.group === group);

function replayRow(row: CompoundRow): string[] {
  if (isCompoundFullRow(row)) {
    return replayFull(row).diffs;
  }
  if (isCompoundModelsRow(row)) {
    return runToStop(row).diffs;
  }
  if (isCompoundScenarioRow(row)) {
    return replayScenario(row).diffs;
  }
  return replaySiteRow(row);
}

describe.skipIf(!compoundRefExists())('layered-compound rows', () => {
  it('has unique row ids', () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('has the recorded row counts per group', () => {
    const header = JSON.parse(readFileSync(compoundRefPath(), 'utf8')) as { rowCounts: unknown };
    expect(compoundRowCountsDifference(header.rowCounts, rows)).toBeNull();
    expect(COMPOUND_ROW_GROUPS.map((group) => byGroup(group).length).reduce((sum, n) => sum + n, 0)).toBe(rows.length);
  });
});

describe.each(
  COMPOUND_ROW_GROUPS.filter((group) => group !== 'sites').map((group) => [group, byGroup(group)] as const),
)('%s rows', (_group, groupRows) => {
  for (const row of groupRows) {
    it(row.id, { timeout: ROW_TIMEOUT_MS }, () => {
      expect(replayRow(row)).toEqual([]);
    });
  }
});

describe.skipIf(!compoundRefExists())('sites rows', () => {
  for (const row of byGroup('sites')) {
    it(row.id, { timeout: ROW_TIMEOUT_MS }, () => {
      expect(replayRow(row)).toEqual([]);
    });
  }
});
