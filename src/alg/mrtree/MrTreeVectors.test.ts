// SPDX-License-Identifier: EPL-2.0
// Replays EVERY row of the mrtree oracle refs (mission 8a, T1/T17; recorded by tools/vectors/MrTreeVectors.java, whose header is the
// contract) through the real ported classes at the AD-4 bar (ids, counts and non-numeric values exact, doubles within 1e-6):
//   full    the RecursiveGraphLayoutEngine run with the REAL TreeLayoutProvider (MrTreeMetaDataProvider registered explicitly, TR5);
//   stops   the whole pipeline from the row's `input`, every stop compared (step name, comp, every graph, the ELK result): the importer,
//           the component split, each processor of MrTree's assembled list per component, the pack and applyLayout. This is the first
//           run of the 27 graphs the isolated replays had to skip (multi-parent in-edge order after Untreeifyer);
//   throws  the engine and the stops runner throw the recorded class, message (not the JVM's NullPointerException text) and first
//           ELK frame; a stops row with `throwsAt` also throws at that step with every earlier stop equal.
// To add a ref recorded with the same contract (e.g. mrtree-extra.json) append its file name to REF_FILES.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareStop, formatDifferences } from '../../../test/helpers/mrtree-replay-dump.js';
import { compareFull, runEngine, runStops, throwDiffs } from '../../../test/helpers/mrtree-replay-run.js';
import {
  isFullRow,
  isStopsRow,
  isThrowsRow,
  loadMrTreeRows,
  mrTreeRefPath,
  type FullRow,
  type StopsRow,
  type ThrowsRow,
} from '../../../test/helpers/mrtree-replay-rows.js';
import { registerMrTree } from '../../../test/helpers/mrtree-replay-state.js';

const HEAVY = { timeout: 60_000 } as const;

/** The ref files replayed, relative to test/golden/refs/java (the second and third only when they have been recorded). */
const REF_FILES: readonly string[] = ['mrtree.json', 'mrtree-extra.json', 'mrtree-extra2.json'];
const refPath = (name: string): string => path.join(path.dirname(mrTreeRefPath()), name);

registerMrTree();

/** The recorded row counts of the first ref: 188 rows (full 122, stops 54, throws 12). */
const FIRST_REF_COUNTS = [122, 54, 12] as const;

describe.each(REF_FILES.filter((name) => name === 'mrtree.json' || existsSync(refPath(name))))(
  'mrtree ref %s',
  (name) => {
    const rows = loadMrTreeRows(undefined, refPath(name));
    const fullRows = rows.filter(isFullRow) as readonly FullRow[];
    const stopsRows = rows.filter(isStopsRow) as readonly StopsRow[];
    const throwsRows = rows.filter(isThrowsRow) as readonly ThrowsRow[];

    if (name === 'mrtree.json') {
      it('has the recorded row counts', () => {
        expect([fullRows.length, stopsRows.length, throwsRows.length]).toEqual(FIRST_REF_COUNTS);
      });
    }

    it('replays every full row through RecursiveGraphLayoutEngine and the real provider', HEAVY, () => {
      const failures: string[] = [];
      for (const row of fullRows) {
        const result = runEngine(row.input);
        if (result.dump === null) {
          failures.push(`${row.id}: threw ${String(result.error)}`);
          continue;
        }
        const diffs = compareFull(row.expected, result.dump);
        if (diffs.length > 0) {
          failures.push(`${row.id}:\n${diffs.slice(0, 20).join('\n')}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it('replays every stops row stop by stop (step name, comp, graphs, ELK result)', HEAVY, () => {
      const failures: string[] = [];
      for (const row of stopsRows) {
        const run = runStops(row.input);
        const expected = row.expected;
        if (expected.throws === undefined) {
          if (run.error !== null) {
            failures.push(`${row.id}: threw ${String(run.error)} at ${String(run.step)}`);
          }
        } else {
          failures.push(...throwDiffs(expected.throws, run, expected.throwsAt ?? null).map((d) => `${row.id}: ${d}`));
        }
        if (run.stops.length !== expected.stops.length) {
          failures.push(`${row.id}: ${run.stops.length} stops, expected ${expected.stops.length}`);
        }
        for (let i = 0; i < Math.min(run.stops.length, expected.stops.length); i++) {
          const diffs = compareStop(expected.stops[i]!, run.stops[i]!);
          if (diffs.length > 0) {
            failures.push(
              `${row.id} stop ${i} (${expected.stops[i]!.step}):\n${formatDifferences(diffs.slice(0, 20))}`,
            );
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('throws rows: the engine throws the recorded class, message and first ELK frame', HEAVY, () => {
      const failures: string[] = [];
      for (const row of throwsRows) {
        const result = runEngine(row.input);
        failures.push(
          ...throwDiffs(row.expected.throws, { error: result.error, step: null }, null).map((d) => `${row.id}: ${d}`),
        );
      }
      expect(failures).toEqual([]);
    });

    it('throws rows: the stops runner throws the same class, message and frame', HEAVY, () => {
      const failures: string[] = [];
      for (const row of throwsRows) {
        failures.push(...throwDiffs(row.expected.throws, runStops(row.input), null).map((d) => `${row.id}: ${d}`));
      }
      expect(failures).toEqual([]);
    });
  },
);
