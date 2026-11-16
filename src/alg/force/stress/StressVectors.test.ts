// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/stress.json (mission 8b, T1 recording, T10 wiring) through the real StressLayoutProvider at
// the AD-4 bar (ids, counts and non-numeric values exact; numbers within 1e-6; NaN equals NaN; same-signed infinities equal):
//   full    the RecursiveGraphLayoutEngine run (force and stress options registered explicitly) against the recorded ELK dump;
//   stops   the same engine run observed stop by stop (test/helpers/force-replay-stress.ts): forcePass or microLayout, import, split, per
//           component initialize (with apsp and w), execute, labelRefresh, then recombine and applyLayout, each against the recorded
//           stop, in order;
//   throws  the class, the message and the ported file and function of the first ELK frame.
// Every field comparison also tallies raw-bit identical doubles (FD3).
import { describe, expect, it } from 'vitest';
import { UnsupportedGraphException } from '../../../core/UnsupportedGraphException.js';
import { compareJson, formatDifferences } from '../../../../test/helpers/force-replay-dump.js';
import { FORCE_COMPARE, tallyHex, type Tally } from '../../../../test/helpers/force-replay-elk.js';
import { loadForceRows, type FullRow, type StopsRow } from '../../../../test/helpers/force-replay-rows.js';
import { runForceFull, runForceThrows } from '../../../../test/helpers/force-replay-stops.js';
import { runStressStops } from '../../../../test/helpers/force-replay-stress.js';
import { throwDiffs } from '../../../../test/helpers/layered-compound-replay-sites.js';

const HEAVY = { timeout: 120_000 } as const;
const fullRows = loadForceRows('stress', 'full');
const stopsRows = loadForceRows('stress', 'stops');
const throwsRows = loadForceRows('stress', 'throws');

/** The shape of a row id `<group>/<shape>/<factor>`. */
const shapeOf = (row: { readonly id: string }): string => row.id.split('/')[1]!;
const SHAPES: readonly string[] = [...new Set(fullRows.map(shapeOf))];
const STOP_SHAPES: readonly string[] = [...new Set(stopsRows.map(shapeOf))];

/** The grand tally of the whole file, printed once at the end. */
const total: Tally = { identical: 0, within: 0, differs: 0 };
const add = (tally: Tally): void => {
  total.identical += tally.identical;
  total.within += tally.within;
  total.differs += tally.differs;
};

function fullFailures(rows: readonly FullRow[]): string[] {
  return rows.flatMap((row) => {
    const actual = runForceFull(row);
    add(tallyHex(row.expected, actual));
    const differences = compareJson(row.expected, actual, FORCE_COMPARE);
    return differences.length === 0 ? [] : [`${row.id}\n${formatDifferences(differences, 3)}`];
  });
}

function stopsFailures(rows: readonly StopsRow[]): string[] {
  return rows.flatMap((row) => {
    const stops = runStressStops(row);
    const steps = stops.map((s) => s.step).join();
    if (steps !== row.expected.steps.join()) {
      return [`${row.id}: steps ${steps} != ${row.expected.steps.join()}`];
    }
    return stops.flatMap((stop, i) => {
      const expected = row.expected.stops[i]!;
      add(tallyHex(expected, stop));
      const differences = compareJson(expected, stop, FORCE_COMPARE);
      return differences.length === 0
        ? []
        : [`${row.id} @ ${stop.step}[${String(i)}]\n${formatDifferences(differences, 3)}`];
    });
  });
}

describe('stress ref: full rows through RecursiveGraphLayoutEngine', () => {
  it('has the recorded 320 rows', () => {
    expect(fullRows).toHaveLength(320);
  });

  it.each(SHAPES)('every full row of shape %s matches the recorded ELK dump', HEAVY, (shape) => {
    expect(fullFailures(fullRows.filter((row) => shapeOf(row) === shape))).toEqual([]);
  });
});

describe('stress ref: stops rows, every stop of the engine run', () => {
  it('has the recorded 108 rows', () => {
    expect(stopsRows).toHaveLength(108);
  });

  it.each(STOP_SHAPES)('every stop of every row of shape %s equals the recorded stop', HEAVY, (shape) => {
    expect(stopsFailures(stopsRows.filter((row) => shapeOf(row) === shape))).toEqual([]);
  });
});

describe('stress ref: throws rows, class, message and first ELK frame', () => {
  it('has the recorded 3 rows', () => {
    expect(throwsRows).toHaveLength(3);
  });

  it.each(throwsRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const error = runForceThrows(row);
    expect(error).toBeInstanceOf(UnsupportedGraphException);
    expect(throwDiffs(row.expected.throws, error, { fn: 'transformEdges' })).toEqual([]);
  });
});

describe('stress ref: numeric fields of the full and stops rows', () => {
  it('every double is raw-bit identical to the oracle (the tally is printed)', () => {
    console.info(`stress.json numeric fields: ${JSON.stringify(total)}`);
    expect(total.differs).toBe(0);
    expect(total.within).toBe(0);
    expect(total.identical).toBeGreaterThan(0);
  });
});
