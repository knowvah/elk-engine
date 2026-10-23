// SPDX-License-Identifier: EPL-2.0
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GRandomText, type GRandomIssue } from './GRandomText.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/grandom-validate.json', import.meta.url));
const CORPUS_DIR = fileURLToPath(new URL('../../../../test/corpus/generated/', import.meta.url));
const ROW_COUNT = 23;
const CORPUS_COUNT = 9;
const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';

interface RefCase {
  readonly id: string;
  readonly input: string;
  readonly issues: readonly GRandomIssue[];
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RefCase[] }).cases;

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The recorder's order: line, offset, severity, code (null as ''), message. */
function sorted(issues: readonly GRandomIssue[]): GRandomIssue[] {
  return [...issues].sort(
    (a, b) =>
      a.line - b.line ||
      a.offset - b.offset ||
      text(a.severity, b.severity) ||
      text(a.code ?? '', b.code ?? '') ||
      text(a.message, b.message),
  );
}

/** A parser (syntax) message: Syntax code, and not the text of a conversion failure of this input. */
const isParserIssue = (i: GRandomIssue, input: string): boolean =>
  i.code === CODE_SYNTAX && i.feature === null && !isConversion(i, input);

/** Conversion failures span an `INT` or `INT '.' INT` text: digits, dots and spaces only. */
const isConversion = (i: GRandomIssue, input: string): boolean =>
  /^[0-9][0-9. ]*$/.test(input.slice(i.offset, i.offset + i.length)) && i.length > 1;

describe('replaying grandom-validate.json', () => {
  it('has the 23 recorded rows', () => {
    expect(cases).toHaveLength(ROW_COUNT);
  });

  /*
   * Rows without a recorded parser (syntax) issue: all issues exact, all seven fields.
   * Rows with one: at least one TS syntax issue; check issues exact; conversion issues exact unless a syntax
   * error precedes them in the text (the TS parser stops at the first syntax error, the JVM recovers).
   */
  it.each(cases.map((c) => [c.id, c] as const))('%s', (_id, row) => {
    const actual = sorted(GRandomText.validate(row.input));
    const recordedSyntax = row.issues.filter((i) => isParserIssue(i, row.input));
    if (recordedSyntax.length === 0) {
      expect(actual).toEqual(row.issues);
      return;
    }
    const actualSyntax = actual.filter((i) => i.code === CODE_SYNTAX && i.feature === null);
    expect(actualSyntax.length).toBeGreaterThan(0);
    const firstSyntax = Math.min(...actualSyntax.map((i) => i.offset));
    const comparable = (i: GRandomIssue): boolean => i.feature !== null || i.offset < firstSyntax;
    expect(actual.filter((i) => i.feature !== null)).toEqual(row.issues.filter((i) => i.feature !== null));
    expect(actual.filter((i) => i.feature === null && comparable(i) && isConversion(i, row.input))).toEqual(
      row.issues.filter((i) => i.feature === null && comparable(i) && isConversion(i, row.input)),
    );
  });

  it('classifies 20 rows as exact and 3 as presence-only for the syntax issue', () => {
    const presence = cases.filter((c) => c.issues.some((i) => isParserIssue(i, c.input)));
    expect(presence.map((c) => c.id)).toEqual([
      'duplicate-member-validator-error-recovery',
      'syntax-error-only',
      'syntax-error-with-validator-error',
    ]);
  });
});

describe('GRandomText', () => {
  it('parses and validates the corpus inputs without issues', () => {
    const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.elkr'));
    expect(files).toHaveLength(CORPUS_COUNT);
    for (const file of files) {
      const input = readFileSync(CORPUS_DIR + file, 'utf8');
      const parsed = GRandomText.parse(input);
      expect([file, parsed.syntaxErrors, parsed.conversionErrors]).toEqual([file, [], []]);
      expect([file, GRandomText.validate(input)]).toEqual([file, []]);
    }
  });

  it('yields the three check errors in ERRORS order, before sorting', () => {
    const issues = GRandomText.validate('generate 1 graphs { maxDegree = 2 maxWidth = 3 partitionFraction = 0.5 }');
    expect(issues.map((i) => [i.feature, i.message, i.offset, i.length, i.code])).toEqual([
      ['mD', 'maxDegree only defined on trees.', 20, 9, null],
      ['mW', 'maxWidth only defined on trees.', 34, 8, null],
      ['pF', 'Partition Fraction only defined on bipartite graphs.', 47, 17, null],
    ]);
  });

  it('lists resource errors before check issues', () => {
    const issues = GRandomText.validate('generate 1 graphs { maxDegree = 3 nodes 3 }');
    expect(issues.map((i) => i.feature)).toEqual([null, 'mD']);
  });
});
