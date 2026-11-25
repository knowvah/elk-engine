// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dumpModel, type DumpedObject } from '../../../../../test/helpers/dot-model-dump.js';
import { parse, type DotParseDiagnostic, type DotParseResult } from './GraphvizDotParser.js';
import { createValueConverterService } from './GraphvizDotValueConverters.js';

const PARSE_REF = new URL('../../../../../test/golden/refs/java/graphviz-dot-parse.json', import.meta.url);
const SYNTAX = 'syntax';
const SERVICES = createValueConverterService();

interface RecordedDiagnostic {
  readonly kind: 'syntax' | 'conversion';
  readonly line: number;
  readonly offset: number;
  readonly length: number;
  readonly message: string;
}

interface RecordedCase {
  readonly id: string;
  readonly source: 'scenario' | 'fixture';
  readonly input: string;
  readonly hasSyntaxErrors: boolean;
  readonly contents: number;
  readonly diagnostics: readonly RecordedDiagnostic[];
  readonly model: DumpedObject | null;
}

interface ParseRef {
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly cases: readonly RecordedCase[];
}

const REF = JSON.parse(readFileSync(PARSE_REF, 'utf8')) as ParseRef;
const RESULTS: ReadonlyMap<string, DotParseResult> = new Map(REF.cases.map((c) => [c.id, parse(c.input, SERVICES)]));

function resultOf(c: RecordedCase): DotParseResult {
  return RESULTS.get(c.id) as DotParseResult;
}

/** D4: syntax errors by presence and line (in node order); value-conversion diagnostics exactly. */
function d4(diagnostics: readonly (RecordedDiagnostic | DotParseDiagnostic)[]): unknown[] {
  return diagnostics.map((d) =>
    d.kind === SYNTAX ? { kind: d.kind, line: d.line } : { kind: d.kind, message: d.message, line: d.line },
  );
}

/** Every recorded field of a diagnostic, beyond the D4 bar. */
function full(diagnostics: readonly (RecordedDiagnostic | DotParseDiagnostic)[]): unknown[] {
  return diagnostics.map((d) => ({
    kind: d.kind,
    line: d.line,
    offset: d.offset,
    length: d.length,
    message: d.message,
  }));
}

/** Replays every case against `check`; returns the number of cases replayed per source. */
function replay(check: (c: RecordedCase, result: DotParseResult) => void): Record<string, number> {
  const replayed: Record<string, number> = {};
  for (const c of REF.cases) {
    check(c, resultOf(c));
    replayed[c.source] = (replayed[c.source] ?? 0) + 1;
  }
  return replayed;
}

function checkModel(c: RecordedCase, result: DotParseResult): void {
  expect(dumpModel(result.root), c.id).toEqual(c.model);
  expect(result.root === null ? 0 : 1, c.id).toBe(c.contents);
}

function checkDiagnostics(c: RecordedCase, result: DotParseResult): void {
  expect(d4(result.diagnostics), c.id).toEqual(d4(c.diagnostics));
  expect(
    result.diagnostics.some((d) => d.kind === SYNTAX),
    c.id,
  ).toBe(c.hasSyntaxErrors);
}

function checkFullDiagnostics(c: RecordedCase, result: DotParseResult): void {
  expect(full(result.diagnostics), c.id).toEqual(full(c.diagnostics));
}

describe('GraphvizDotParser: replay of the recorded JVM parse cases', () => {
  it('builds the recorded model of every case, partial models after recovery included', () => {
    expect(replay(checkModel)).toEqual(REF.rowCounts);
  });

  it('reports the recorded diagnostics of every case (D4: syntax by presence and line)', () => {
    expect(replay(checkDiagnostics)).toEqual(REF.rowCounts);
  });

  it('reports the recorded message, offset and length of every diagnostic too', () => {
    expect(replay(checkFullDiagnostics)).toEqual(REF.rowCounts);
  });
});
