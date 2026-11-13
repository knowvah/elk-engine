// SPDX-License-Identifier: EPL-2.0
// Replays every row of test/golden/refs/java/topdownpacking.json (mission 8c, T3 recording, T8 wiring) through the real topdownpacking
// classes at the AD-4 bar (ids, counts, list lengths and non-numeric values exact; numbers within 1e-6):
//   full       RecursiveGraphLayoutEngine against the recorded ELK dump of the root;
//   stops      p1 (grid size, the real row lists with their lengths, node bounds), p2 and end, each compared in order, plus a plain
//              TopdownpackingLayoutProvider.layout against the end stop;
//   predicted  getPredictedGraphSize against the recorded KVector;
//   throws     the class, the message, and the ported file of the first ELK frame.
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, expect, it } from 'vitest';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { compareJson, formatDifferences, TOLERANCE } from '../../../test/helpers/disco-replay-dump.js';
import { portedTop } from '../../../test/helpers/layered-compound-replay-sites.js';
import {
  loadTopdownRows,
  STEP_END,
  stopOf,
  TOPDOWN_STEPS,
  type ThrowsExpected,
} from '../../../test/helpers/topdownpacking-replay-rows.js';
import {
  runFull,
  runPredicted,
  runProvider,
  runStops,
  runThrows,
} from '../../../test/helpers/topdownpacking-replay-run.js';

const HEAVY = { timeout: 60_000 } as const;
const IOOBE_CLASS = 'java.lang.IndexOutOfBoundsException';
const IAE_CLASS = 'java.lang.IllegalArgumentException';
const UCE_CLASS = 'org.eclipse.elk.core.UnsupportedConfigurationException';

const fullRows = loadTopdownRows('full');
const stopsRows = loadTopdownRows('stops');
const predictedRows = loadTopdownRows('predicted');
const throwsRows = loadTopdownRows('throws');

/** The difference text of one comparison of `actual` with a recorded value, or `[]`. */
const diffsOf = (tag: string, expected: unknown, actual: unknown): string[] => {
  const comparison = compareJson(expected, actual, TOLERANCE);
  return comparison.differences.length === 0 ? [] : [`${tag}\n${formatDifferences(comparison, 4)}`];
};

const withoutKeys = (value: object, ...keys: string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

describe('topdownpacking ref: full rows through RecursiveGraphLayoutEngine', () => {
  it('has the recorded 296 rows', () => {
    expect(fullRows).toHaveLength(296);
  });

  it('every full row matches the recorded dump', HEAVY, () => {
    const failing = fullRows.flatMap((row) => diffsOf(row.id, withoutKeys(row.expected, 'layoutNode'), runFull(row)));
    expect(failing).toEqual([]);
  });
});

describe('topdownpacking ref: stops rows, p1 / p2 / end', () => {
  it('has the recorded 288 rows, each with the three steps in order', () => {
    expect(stopsRows).toHaveLength(288);
    expect(stopsRows.filter((row) => row.expected.steps.join() !== TOPDOWN_STEPS.join())).toEqual([]);
  });

  it('every step of every row equals the recorded stop (grid with the real row list lengths)', HEAVY, () => {
    const failing = stopsRows.flatMap((row) => {
      const run = runStops(row);
      return TOPDOWN_STEPS.flatMap((step, i) => diffsOf(`${row.id} @ ${step}`, stopOf(row, step), run[i]));
    });
    expect(failing).toEqual([]);
  });

  it('some recorded row list is longer than its column count (GridElkNode.put inserts)', () => {
    const longer = stopsRows.filter((row) => {
      const p1 = row.expected.stops[0]!;
      return 'cells' in p1 && p1.cells.some((cells) => cells.length > p1.cols);
    });
    expect(longer.length).toBeGreaterThan(0);
  });

  it('a plain TopdownpackingLayoutProvider.layout gives the end stop', HEAVY, () => {
    const failing = stopsRows.flatMap((row) =>
      diffsOf(`${row.id} provider`, withoutKeys(stopOf(row, STEP_END), 'step'), runProvider(row)),
    );
    expect(failing).toEqual([]);
  });
});

describe('topdownpacking ref: predicted rows', () => {
  it('has the recorded 296 rows', () => {
    expect(predictedRows).toHaveLength(296);
  });

  it('every predicted size equals the recorded KVector', HEAVY, () => {
    const failing = predictedRows.flatMap((row) => diffsOf(row.id, row.expected.size, runPredicted(row)));
    expect(failing).toEqual([]);
  });
});

/** The TS class each recorded Java exception class maps to. */
const MAPPED_CLASSES: Readonly<Record<string, (error: Error) => boolean>> = {
  [IOOBE_CLASS]: (error) => error.constructor === IndexOutOfBoundsException,
  [IAE_CLASS]: (error) => error.constructor === IllegalArgumentException,
  [UCE_CLASS]: (error) => error.constructor === UnsupportedConfigurationException,
};

const baseName = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');

/**
 * The differences between a recorded Java throw and the TS error: class, message (ELK texts and the JVM's `ArrayList` texts
 * alike: the port raises the recorded text), and the ported file of the first ELK frame (`src/java` shims are skipped, as the
 * recorder skips JDK frames).
 */
function throwDiffs(expected: ThrowsExpected, error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [`no Error was thrown: ${String(error)}`];
  }
  const diffs: string[] = [];
  const isMapped = MAPPED_CLASSES[expected.class];
  if (isMapped === undefined || !isMapped(error)) {
    diffs.push(`class ${error.constructor.name} does not map ${expected.class}`);
  }
  if (error.message !== expected.message) {
    diffs.push(`message ${JSON.stringify(error.message)}, expected ${JSON.stringify(expected.message)}`);
  }
  const javaClass = expected.frame.slice(0, expected.frame.indexOf('.java'));
  const top = portedTop(error.stack ?? '');
  if (top === null || !baseName(top.file).startsWith(javaClass)) {
    diffs.push(`raised in ${top?.file ?? '(no src frame)'}, expected a port of ${expected.frame}`);
  }
  return diffs;
}

describe('topdownpacking ref: throws rows, class, message and originating file', () => {
  it('has the recorded 18 rows', () => {
    expect(throwsRows).toHaveLength(18);
  });

  it.each(throwsRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(throwDiffs(row.expected.throws, runThrows(row))).toEqual([]);
  });
});
