// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/node-micro-layout.json (mission 6b, NS1-NS6; recorded by
// tools/vectors/NodeMicroLayoutVectors.java before any TS consumer): numbers within 1e-6 (AD-4); identifiers, element
// counts and exceptions exactly.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  decodeExpected,
  replayRow,
  type ReplayFile,
  type ReplayGroup,
  type ReplayResult,
  type ReplayRow,
} from '../../../test/helpers/node-micro-layout-replay.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/node-micro-layout.json', import.meta.url);
const TOLERANCE = 1e-6;
const GROUPS: readonly ReplayGroup[] = ['corpus', 'curated', 'variants', 'sweep'];

const file = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as ReplayFile;

function expectClose(actual: readonly number[], expected: readonly number[]): void {
  expect(actual.length).toBe(expected.length);
  expected.forEach((value, i) => {
    expect(Math.abs((actual[i] as number) - value)).toBeLessThanOrEqual(TOLERANCE);
  });
}

const nodeNumbers = (n: {
  x: number;
  y: number;
  w: number;
  h: number;
  margins: readonly number[];
  padding: readonly number[];
}) => [n.x, n.y, n.w, n.h, ...n.margins, ...n.padding];

function expectSame(actual: ReplayResult, expected: ReplayResult): void {
  if ('throws' in expected) {
    expect(actual).toEqual(expected);
    return;
  }
  if ('throws' in actual) {
    expect(actual).toEqual(expected);
    return;
  }
  expect(actual.nodes.map((n) => n.id)).toEqual(expected.nodes.map((n) => n.id));
  expect(actual.ports.map((p) => p.id)).toEqual(expected.ports.map((p) => p.id));
  expect(actual.labels.map((l) => l.id)).toEqual(expected.labels.map((l) => l.id));
  expected.nodes.forEach((n, i) => expectClose(nodeNumbers(actual.nodes[i] as typeof n), nodeNumbers(n)));
  expected.ports.forEach((p, i) => {
    const a = actual.ports[i] as typeof p;
    expectClose([a.x, a.y], [p.x, p.y]);
  });
  expected.labels.forEach((l, i) => {
    const a = actual.labels[i] as typeof l;
    expectClose([a.x, a.y, a.w, a.h], [l.x, l.y, l.w, l.h]);
  });
}

describe('node-micro-layout.json replay', () => {
  it.each(GROUPS)('has the recorded %s row count', (group) => {
    expect(file.rows.filter((row) => row.group === group).length).toBe(file.rowCounts[group]);
  });

  it('has the expected total of 326 rows with 23 throwing', () => {
    expect(file.rows.length).toBe(326);
    expect(file.rows.filter((row) => 'throws' in row.expected).length).toBe(23);
  });

  it.each(file.rows.map((row) => [row.id, row] as [string, ReplayRow]))('%s', (_id, row) => {
    expectSame(replayRow(row.input), decodeExpected(row.expected));
  });
});
