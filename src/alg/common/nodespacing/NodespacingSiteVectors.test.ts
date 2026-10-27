// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/nodespacing-sites.json (mission 6c, D1-D7; recorded by
// tools/vectors/NodespacingSiteVectors.java from the source-built oracle before any TS consumer): numbers within 1e-6
// (AD-4); ids, enum names and element counts exactly. This replay is the authority (D1) for the literals that the
// unit tests re-anchor to a row id.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLayoutMetaData } from '../../../../test/helpers/node-context-fixtures.js';
import {
  decodeExpected,
  groupOf,
  replayRow,
  type SiteFile,
  type SiteRow,
} from '../../../../test/helpers/nodespacing-site-replay.js';

const VECTORS_URL = new URL('../../../../test/golden/refs/java/nodespacing-sites.json', import.meta.url);
const TOLERANCE = 1e-6;

const file = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as SiteFile;

/** Numbers within the AD-4 tolerance, everything else exactly; walks both values in step. */
function expectSame(actual: unknown, expected: unknown, path = 'result'): void {
  if (typeof expected === 'number') {
    expect(typeof actual, path).toBe('number');
    expect(Math.abs((actual as number) - expected), path).toBeLessThanOrEqual(TOLERANCE);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, path).toBe(expected.length);
    expected.forEach((value, i) => expectSame((actual as unknown[])[i], value, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === 'object') {
    expect(Object.keys(actual as object).sort(), path).toEqual(Object.keys(expected).sort());
    for (const [key, value] of Object.entries(expected)) {
      expectSame((actual as Record<string, unknown>)[key], value, `${path}.${key}`);
    }
  } else {
    expect(actual, path).toBe(expected);
  }
}

beforeAll(loadLayoutMetaData);

describe('nodespacing-sites.json replay', () => {
  it('has unique row ids', () => {
    expect(new Set(file.rows.map((row) => row.id)).size).toBe(file.rows.length);
  });

  it.each(Object.entries(file.rowCounts))('has the recorded %s row count', (group, count) => {
    expect(file.rows.filter((row) => groupOf(row) === group).length).toBe(count);
  });

  it('has no rows outside the recorded groups', () => {
    const counted = Object.values(file.rowCounts).reduce((sum, n) => sum + n, 0);
    expect(file.rows.length).toBe(counted);
  });

  it.each(file.rows.map((row) => [row.id, row] as [string, SiteRow]))('%s', (_id, row) => {
    expectSame(replayRow(row), decodeExpected(row.expected));
  });
});
