// SPDX-License-Identifier: EPL-2.0
// Replays every `sites` row of test/golden/refs/java/layered-compound.json (mission 7h, T14; recorded by tools/vectors/LayeredCompoundVectors.java
// from the source-built oracle): one row per scenario Sc1..Sc16 of plans/layered-compound/unreached.md (graphs that reach branch arms no
// earlier row reaches) plus the throw rows. A test title is its row id, so `-t '<row id>$'` isolates one row. Three kinds
// (`replaySiteRow`, test/helpers/layered-compound-replay-sites.ts): run rows (layout, plans, stops, tree as a scenarios row), the logged row
// (also the DOT/JSON graphs of the logging monitor, including the root graph's crossHierarchyMap text) and throw rows (the TS run must throw
// what the oracle threw: class, message for an ELK exception, and the ported function the Java frame lies in). Numbers within 1e-6 (AD-4),
// everything else exactly.
// Arm reach: test/helpers/layered-compound-site-arms.json names, per row, the TS arms (file, line, v8 arm) the scenario exists to reach;
// `node tools/vectors/compound-site-arms.mjs` replays each row alone under v8 coverage and fails when a named arm is not taken (a coverage
// run cannot be taken from inside a test that itself may run under coverage). The tests here pin the table to the ref and to the sources.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import {
  compoundRefExists,
  loadCompoundRowsIfPresent,
  type CompoundRow,
} from '../../../test/helpers/layered-compound-replay-rows.js';
import {
  PORTED_SITES,
  isSiteLoggedRow,
  isSiteRunRow,
  isSiteThrowRow,
  replaySiteRow,
} from '../../../test/helpers/layered-compound-replay-sites.js';

/** The engine run of one row, with the coverage-instrumentation headroom of the other replay suites. */
const ROW_TIMEOUT_MS = 120_000;
const SITES_GROUP = 'sites';
const ARMS_FILE = 'test/helpers/layered-compound-site-arms.json';
const ARM_FORM = /^(if|binary-expr|cond-expr)\[\d+\]$|^fn$/;

interface ArmSpec {
  readonly file: string;
  readonly line: number;
  readonly arm: string;
}

const siteRows: readonly CompoundRow[] = loadCompoundRowsIfPresent(SITES_GROUP);
const arms = JSON.parse(readFileSync(path.join(repoRoot(), ARMS_FILE), 'utf8')) as Record<string, readonly ArmSpec[]>;
const sourceLines = (file: string): string[] => readFileSync(path.join(repoRoot(), file), 'utf8').split('\n');

describe.skipIf(!compoundRefExists())('layered-compound sites rows', () => {
  it('has unique site row ids under sites/ and one known kind each', () => {
    expect(new Set(siteRows.map((row) => row.id)).size).toBe(siteRows.length);
    expect(siteRows.every((row) => row.id.startsWith(`${SITES_GROUP}/`))).toBe(true);
    const kinds = siteRows.map((row) => [isSiteRunRow(row), isSiteLoggedRow(row), isSiteThrowRow(row)]);
    // a logged row is also a run row; a throw row is neither
    expect(kinds.every(([run, logged, thrown]) => (thrown ? !run && !logged : run))).toBe(true);
  });

  it('names a ported function for every throw row', () => {
    const thrown = siteRows.filter(isSiteThrowRow).map((row) => row.id);
    expect(thrown.length).toBeGreaterThan(0);
    expect(thrown.filter((id) => !PORTED_SITES.has(id))).toEqual([]);
    expect([...PORTED_SITES.keys()].filter((id) => !thrown.includes(id))).toEqual([]);
  });

  it('names the arms of rows that exist, in files and lines that exist, in the v8 arm forms', () => {
    const ids = new Set(siteRows.map((row) => row.id));
    expect(Object.keys(arms).filter((id) => !ids.has(id))).toEqual([]);
    const specs = Object.values(arms).flat();
    expect(specs.filter((spec) => !existsSync(path.join(repoRoot(), spec.file)))).toEqual([]);
    expect(specs.filter((spec) => !ARM_FORM.test(spec.arm))).toEqual([]);
    expect(specs.filter((spec) => sourceLines(spec.file)[spec.line - 1] === undefined)).toEqual([]);
  });

  for (const row of siteRows) {
    it(row.id, { timeout: ROW_TIMEOUT_MS }, () => {
      expect(replaySiteRow(row)).toEqual([]);
    });
  }
});
