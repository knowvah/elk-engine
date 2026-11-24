// SPDX-License-Identifier: EPL-2.0
// Replays EVERY row of test/golden/refs/java/radial-extra.json (issue #66, mission tree-recorder-gaps D3; recorded by the second
// plan of tools/vectors/RadialVectors.java, whose header is the contract) through the real RadialLayoutProvider at the AD-4 bar
// (ids, counts and non-numeric values exact, doubles within 1e-6): `full` rows through RecursiveGraphLayoutEngine, `stops` rows
// step by step with the recorder's stop semantics, `throws` rows by class, message, first ELK frame and step. The rows reach
// what radial.json does not: the `tau < maxAlpha - minAlpha` arm of EadesRadial (RADIUS -1), the `sorter != null` arms of
// RadialCompaction, a node at exactly angle 0 in the polar comparator, and exactly touching boxes in
// AbstractRadiusExtensionCompaction.overlap.
import { describe, expect, it } from 'vitest';
import {
  compareStop,
  formatDiffs,
  importRadialInput,
  registerRadial,
} from '../../../test/helpers/radial-replay-dump.js';
import { runEngine, runStops, throwDiffs, type RadialRun } from '../../../test/helpers/radial-replay-run.js';
import {
  fixedSectionsOf,
  loadRadialRows,
  radialExtraRefPath,
  stopsOf,
  type RadialFullRow,
  type RadialStopsRow,
  type RadialThrowsRow,
} from '../../../test/helpers/radial-replay-rows.js';

const HEAVY = { timeout: 60_000 } as const;
const REF = radialExtraRefPath();

registerRadial();

const fullRows = loadRadialRows('full', REF) as readonly RadialFullRow[];
const stopsRows = loadRadialRows('stops', REF) as readonly RadialStopsRow[];
const throwsRows = loadRadialRows('throws', REF) as readonly RadialThrowsRow[];

const fixedAware = (row: RadialStopsRow | RadialThrowsRow, index: number) => {
  const stops = stopsOf(row);
  return { ...stops[index], ...(index === 0 ? {} : fixedSectionsOf(stops)) };
};

/** The differences of one stop run to the recorded stops (empty when they are the recorded stops). */
function stopRunDiffs(row: RadialStopsRow | RadialThrowsRow, run: RadialRun): string[] {
  const expected = stopsOf(row);
  const out: string[] = [];
  if (run.stops.length !== expected.length) {
    out.push(`stop count ${String(run.stops.length)}, expected ${String(expected.length)}`);
  }
  for (let i = 0; i < Math.min(run.stops.length, expected.length); i++) {
    const diffs = compareStop(fixedAware(row, i) as never, run.stops[i] as never);
    if (diffs.length > 0) {
      out.push(`stop ${String(i)} (${String(expected[i]?.step)}):\n${formatDiffs(diffs)}`);
    }
  }
  return out;
}

describe('radial extra vectors: row counts', () => {
  it('has the recorded row counts', () => {
    expect([fullRows.length, stopsRows.length, throwsRows.length]).toEqual([5, 2, 0]);
  });
});

describe('radial extra vectors: stops rows through the real RadialLayoutProvider', () => {
  it('replays every stops row stop by stop, with the recorded step names', HEAVY, () => {
    const failures: string[] = [];
    for (const row of stopsRows) {
      const run = runStops(importRadialInput(row));
      if (run.error !== null) {
        failures.push(`${row.id}: threw ${String(run.error)}`);
      }
      failures.push(...stopRunDiffs(row, run).map((diff) => `${row.id}: ${diff}`));
      expect(run.stops.map((s) => s.step)).toEqual(stopsOf(row).map((s) => s.step));
    }
    expect(failures).toEqual([]);
  });
});

describe('radial extra vectors: full rows through the RecursiveGraphLayoutEngine', () => {
  it('replays every full row', HEAVY, () => {
    const failures: string[] = [];
    for (const row of fullRows) {
      const result = runEngine(importRadialInput(row));
      if (result.dump === null) {
        failures.push(`${row.id}: threw ${String(result.error)}`);
        continue;
      }
      const diffs = compareStop(row.expected, result.dump);
      if (diffs.length > 0) {
        failures.push(`${row.id}:\n${formatDiffs(diffs)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('radial extra vectors: throws rows', () => {
  it('replays every throws row: class, message, first ELK frame, step, prior stops', () => {
    for (const row of throwsRows) {
      const run = runStops(importRadialInput(row));
      expect(throwDiffs(row.expected.throws, run)).toEqual([]);
      expect(stopRunDiffs(row, run)).toEqual([]);
    }
  });
});
