// SPDX-License-Identifier: EPL-2.0
// Mission 4c / Phase 4 sweep (T17, D2 as amended 2026-10-16): the port's `.elkj` behaviour against the source-built
// oracle's output (written by tools/oracle/elkj-sweep.sh with the CoreOptions-only registry, D4, into
// $ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/). The sweep covers the graphs of $ELK_MODELS_DIR up to a size cap
// plus a stratified sample of the larger ones (selection.tsv: the oracle's serializer needs minutes per graph), and all
// of tier 2. One `it` per indicator:
//   tier1-parse-equal     the oracle's own `.elkj` conversion of each selected graph (`convert/`) parses to the same ELK
//                         JSON export in the port (within 1e-6); where the oracle rejects it (`ElkTextException`) the port
//                         reports a load error; where the export fails at an unresolved reference (NPE) the port's export
//                         throws the mapped message-less IllegalArgumentException (docs/conformance.md)
//   tier1-validate-equal  `validate(root)` issues equal the oracle's exactly (sorted by line, severity, code, message);
//                         where the oracle reports a syntax issue the port reports one (D6, presence)
//   tier2-parse-equal     the same as tier1-parse-equal for ELK JSON read through the `.elkj` language (every realworld
//                         `.json` and the repo's ELK JSON), inputs read from the models dir / the repo
//   writer-byte-exact     `serialize(graph)` equals the oracle's formatted text byte for byte; where the oracle fails the
//                         port throws `ElkGraphJsonSerializationError` (presence)
//   reparse-equal         the port's own text read again gives what the oracle's reparse of its text gave: errors by
//                         presence, otherwise the same ELK JSON export
// Each indicator logs `elkj sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k> nondeterministic=<m>` and fails with
// the per-model report. Skipped with a message when the models dir or the sweep dir is absent (CI has neither).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import {
  ElkGraphJsonText,
  type ElkJsonTextDiagnosticKind,
  type ElkJsonTextIssue,
  type ElkJsonTextLoadResult,
} from '../../src/graph/json/text/ElkGraphJsonText.js';
import { ElkGraphJsonSerializationError } from '../../src/graph/json/text/serializer/ElkGraphJsonSerializationError.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';
import { isCoverageRun } from '../helpers/coverage-run.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const ELKT = '.elkt';
const ELKJ = '.elkj';
const JSON_EXT = '.json';
const ID_SEPARATOR = '/';
const ID_REPLACEMENT = '__';
const STATUS_OK = 'ok';
const STATUS_NONDETERMINISTIC = 'nondeterministic';
const KIND_CONVERT = 'convert';
const KIND_PARSE = 'parse';
const KIND_VALIDATE = 'validate';
const KIND_PARSE_ELKJ = 'parse-elkj';
const KIND_WRITE = 'write';
const READER_REJECTS = 'ElkTextException';
const UNRESOLVED_EXPORT = 'java.lang.NullPointerException';
const MAPPED_UNRESOLVED_EXPORT = 'IllegalArgumentException';
const SYNTAX_CODE_PREFIX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';
const CODE_CONVERSION = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range';
const REALWORLD = 'realworld';
const SWEEP_SCRIPT = 'tools/oracle/elkj-sweep.sh';
const SWEEP_DIR_ENV = 'ELKJ_SWEEP_DIR';
const ORACLE_DIR_ENV = 'ELK_ORACLE_DIR';
const DEFAULT_ORACLE_RELATIVE_PATH = '../elk-oracle';
const TEST_TIMEOUT_MS = isCoverageRun() ? 360_000 : 120_000;
const TS_SWEEP_BUDGET_MS = 120_000;

interface ResultRow {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly exception?: { readonly class: string; readonly message: string | null };
  readonly runs: number;
}

interface Verdict {
  readonly total: number;
  readonly ok: number;
  readonly deferred: number;
  readonly diffs: readonly string[];
}

interface OracleIssue {
  readonly severity: string;
  readonly message: string;
  readonly line: number;
  readonly code: string | null;
}

interface OracleReparse {
  readonly errors: number;
  readonly json: string | null;
  readonly throws?: unknown;
}

interface OracleWrite {
  readonly text?: string;
  readonly reparse?: OracleReparse;
  readonly error?: { readonly class: string; readonly message: string | null };
}

/** The sweep dir: `ELKJ_SWEEP_DIR`, else `$ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>`. */
function sweepDir(modelsCommit: string): string {
  const override = process.env[SWEEP_DIR_ENV];
  if (override !== undefined && override !== '') return path.resolve(override);
  const oracle = process.env[ORACLE_DIR_ENV] ?? path.resolve(repoRoot(), DEFAULT_ORACLE_RELATIVE_PATH);
  const elkCommit = readFileSync(path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT'), 'utf8').trim();
  return path.join(oracle, 'sweep', `elkj-${elkCommit}-${modelsCommit}`);
}

function modelsCommitOf(): string {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot(), 'test', 'corpus', 'manifest.json'), 'utf8')) as {
    commit: string;
  };
  return manifest.commit;
}

const models = resolveModelsDir();
const dir = sweepDir(modelsCommitOf());
const skipReason =
  'skip' in models
    ? models.skip
    : existsSync(path.join(dir, 'results.jsonl'))
      ? undefined
      : `no oracle sweep at ${dir}; run ${SWEEP_SCRIPT}`;

const stem = (id: string): string => id.split(ID_SEPARATOR).join(ID_REPLACEMENT);
const oracleOutput = <T>(kind: string, id: string): T =>
  JSON.parse(readFileSync(path.join(dir, kind, stem(id) + JSON_EXT), 'utf8')) as T;
const convertedText = (id: string): string => readFileSync(path.join(dir, KIND_CONVERT, stem(id) + ELKJ), 'utf8');
const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function readResults(): Map<string, Map<string, ResultRow>> {
  const byKind = new Map<string, Map<string, ResultRow>>();
  for (const line of readFileSync(path.join(dir, 'results.jsonl'), 'utf8').split('\n')) {
    if (line === '') continue;
    const row = JSON.parse(line) as ResultRow;
    byKind.set(row.kind, (byKind.get(row.kind) ?? new Map()).set(row.id, row));
  }
  return byKind;
}

/** The settled rows of a kind (a nondeterministic case is reported separately and excluded, D5). */
function settled(rows: Map<string, ResultRow> | undefined): ResultRow[] {
  return [...(rows?.values() ?? [])].filter((r) => r.status !== STATUS_NONDETERMINISTIC);
}

function verdict(total: number, diffs: string[]): Verdict {
  return { total, ok: total - diffs.length, deferred: 0, diffs };
}

function report(indicator: string, v: Verdict, nondeterministic: number): void {
  console.log(
    `elkj sweep: ${indicator}=${v.ok}/${v.total} deferred=${v.deferred} diffs=${v.diffs.length}` +
      ` nondeterministic=${nondeterministic}`,
  );
}

/** Logs how many rows of an indicator were compared value for value and how many by presence only (D6). */
function logCompared(indicator: string, rows: readonly ResultRow[], exact: (row: ResultRow) => boolean): void {
  const exactRows = rows.filter(exact).length;
  console.log(`elkj sweep: ${indicator} exact=${String(exactRows)} presence-only=${String(rows.length - exactRows)}`);
}

function expectNoDiffs(v: Verdict): void {
  expect(v.diffs.join('\n\n')).toBe('');
}

const failed = (id: string, why: string): string => `${id}\n${why}`;

/** Runs `check` over the rows; each defined result is a diff of that id. */
function verdictOf(rows: readonly ResultRow[], check: (row: ResultRow) => string | undefined): Verdict {
  const diffs = rows.flatMap((r) => {
    const why = check(r);
    return why === undefined ? [] : [failed(r.id, why)];
  });
  return verdict(rows.length, diffs);
}

// ---- parse (tier 1 and tier 2)

function exportOutcome(result: ElkJsonTextLoadResult): { json?: unknown; threw?: string } {
  try {
    return { json: JSON.parse(exportLikeOracle(result.root as ElkNode)) };
  } catch (e) {
    return { threw: e instanceof Error ? e.constructor.name : String(e) };
  }
}

/** The oracle read the input but its export failed at an unresolved reference (NPE): the port's mapped exception. */
function unresolvedExportDiff(result: ElkJsonTextLoadResult): string | undefined {
  if (result.errors.length > 0 || result.root === null) {
    return `oracle read it but the port reports: ${result.errors.map((e) => e.message).join('; ')}`;
  }
  const outcome = exportOutcome(result);
  return outcome.threw === MAPPED_UNRESOLVED_EXPORT ? undefined : `oracle NPE at an unresolved reference, port: ${outcome.threw ?? 'exported'}`;
}

function rejectedDiff(result: ElkJsonTextLoadResult): string | undefined {
  return result.errors.length > 0 || result.root === null ? undefined : 'oracle rejected the input but the port loaded it without errors';
}

function parseDiff(row: ResultRow, input: string, kind: string): string | undefined {
  const result = ElkGraphJsonText.load(input);
  if (row.status === STATUS_OK) {
    if (result.errors.length > 0 || result.root === null) {
      return `oracle parsed it but the port reports: ${result.errors.map((e) => e.message).join('; ')}`;
    }
    const outcome = exportOutcome(result);
    if (outcome.threw !== undefined) return `oracle exported it but the port's export threw ${outcome.threw}`;
    const { ok, diffs } = compareLayout(oracleOutput<unknown>(kind, row.id), outcome.json);
    return ok ? undefined : formatDiffs(diffs);
  }
  const thrown = row.exception?.class;
  if (thrown === READER_REJECTS) return rejectedDiff(result);
  if (thrown === UNRESOLVED_EXPORT) return unresolvedExportDiff(result);
  return `oracle ${row.status}: ${thrown ?? 'no exception'} (${row.exception?.message ?? ''})`;
}

/** A tier-2 input is a realworld model or a repo file; the id is its path below the models dir or the repo root. */
function tier2Text(modelsDir: string, id: string): string {
  const base = id.startsWith(`${REALWORLD}/`) ? modelsDir : repoRoot();
  return readFileSync(path.join(base, id), 'utf8');
}

// ---- validate

const issueRank = (a: OracleIssue, b: OracleIssue): number =>
  a.line - b.line || text(a.severity, b.severity) || text(a.code ?? '', b.code ?? '') || text(a.message, b.message);

const CODE_BY_KIND: Readonly<Record<ElkJsonTextDiagnosticKind, string>> = {
  syntax: SYNTAX_CODE_PREFIX,
  conversion: CODE_CONVERSION,
  linking: 'org.eclipse.xtext.diagnostics.Diagnostic.Linking',
};

/** The port's issues: the load diagnostics alone when there is no model, else the validator's, sorted. */
function portIssues(input: string): ElkJsonTextIssue[] {
  const loaded = ElkGraphJsonText.load(input);
  if (loaded.root === null) {
    return loaded.errors.map((e) => ({ severity: e.severity, message: e.message, line: e.line, code: CODE_BY_KIND[e.kind] }));
  }
  return [...ElkGraphJsonText.validate(loaded.root)].sort(issueRank);
}

const describeIssues = (issues: readonly OracleIssue[]): string =>
  issues.map((i) => `  ${i.severity} L${String(i.line)} [${i.code ?? '-'}] ${i.message}`).join('\n') || '  (none)';

const isSyntax = (i: OracleIssue): boolean => i.code?.startsWith(SYNTAX_CODE_PREFIX) === true;

/** Whether the oracle's validation of this row reports a syntax issue, so the port is held to presence only. */
const validateIsPresenceOnly = (row: ResultRow): boolean =>
  row.status === STATUS_OK && oracleOutput<{ issues: OracleIssue[] }>(KIND_VALIDATE, row.id).issues.some(isSyntax);

function validateDiff(row: ResultRow): string | undefined {
  if (row.status !== STATUS_OK) return `oracle validation ${row.status}`;
  const expected = oracleOutput<{ issues: OracleIssue[] }>(KIND_VALIDATE, row.id).issues;
  const actual = portIssues(convertedText(row.id));
  if (expected.some(isSyntax)) {
    return actual.some(isSyntax) ? undefined : `oracle reports a syntax issue, the port none:\n${describeIssues(actual)}`;
  }
  const sorted = [...expected].sort(issueRank);
  if (JSON.stringify(actual) === JSON.stringify(sorted)) return undefined;
  return `oracle:\n${describeIssues(sorted)}\nport:\n${describeIssues(actual)}`;
}

// ---- writer and reparse (one TS serialization per input, shared by both indicators)

interface TsWrite {
  readonly text: string | null;
  readonly failure: string | null;
}

function readInput(modelsDir: string, id: string): ElkNode {
  const source = readFileSync(path.join(modelsDir, id), 'utf8');
  if (!id.endsWith(ELKT)) return ElkGraphJson.forGraph(source).toElk();
  const result = ElkGraphText.load(source);
  expect(result.errors).toEqual([]);
  return result.root as ElkNode;
}

function tsWrite(modelsDir: string, id: string): TsWrite {
  try {
    return { text: ElkGraphJsonText.serialize(readInput(modelsDir, id)), failure: null };
  } catch (e) {
    return { text: null, failure: e instanceof Error ? e.constructor.name : String(e) };
  }
}

function firstDifference(expected: string, actual: string): string {
  let at = 0;
  while (at < actual.length && actual[at] === expected[at]) at++;
  return `first difference at offset ${String(at)}:\noracle: ${JSON.stringify(expected.slice(at, at + 80))}\nport:   ${JSON.stringify(actual.slice(at, at + 80))}`;
}

function writerDiff(row: ResultRow, ts: TsWrite): string | undefined {
  const oracle = oracleOutput<OracleWrite>(KIND_WRITE, row.id);
  if (row.status !== STATUS_OK || oracle.text === undefined) {
    if (ts.failure === null) return `oracle failed (${oracle.error?.class ?? row.status}) but the port wrote text`;
    return ts.failure === ElkGraphJsonSerializationError.name ? undefined : `oracle failed, the port threw ${ts.failure}`;
  }
  if (ts.text === null) return `oracle wrote ${String(oracle.text.length)} chars but the port failed: ${ts.failure}`;
  return ts.text === oracle.text ? undefined : firstDifference(oracle.text, ts.text);
}

/** The errors of reading the text, linking included (the oracle runs `EcoreUtil.resolveAll` before counting). */
function reparseErrors(reload: ElkJsonTextLoadResult): number {
  if (reload.root !== null) reload.resource.resolveLazyCrossReferences(null);
  return reload.resource.getErrors().size();
}

function reparseDiff(row: ResultRow, ts: TsWrite): string | undefined {
  const oracle = oracleOutput<OracleWrite>(KIND_WRITE, row.id);
  const expected = oracle.reparse as OracleReparse;
  const reload = ElkGraphJsonText.load(ts.text as string);
  const errors = reparseErrors(reload);
  if (expected.errors > 0 || expected.throws !== undefined) {
    return errors > 0 || reload.root === null ? undefined : 'the oracle cannot read its text but the port reads its own';
  }
  if (errors > 0 || reload.root === null) {
    return expected.json === null ? undefined : `the port cannot read its own text: ${reload.errors[0]?.message ?? 'no model'}`;
  }
  if (expected.json === null) return 'the oracle read its text to no model but the port reads one';
  const { ok, diffs } = compareLayout(JSON.parse(expected.json), JSON.parse(exportLikeOracle(reload.root)));
  return ok ? undefined : formatDiffs(diffs);
}

// ---- the tests

describe('elkj sweep vs the oracle', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const modelsDir = (models as { dir: string }).dir;
  const results = readResults();
  const writes = new Map<string, TsWrite>();
  const started = performance.now();
  const nondeterministic = (kind: string): number =>
    [...(results.get(kind)?.values() ?? [])].filter((r) => r.status === STATUS_NONDETERMINISTIC).length;
  const tsWriteOf = (row: ResultRow): TsWrite => {
    if (!writes.has(row.id)) writes.set(row.id, tsWrite(modelsDir, row.id));
    return writes.get(row.id) as TsWrite;
  };

  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  afterAll(() => {
    const seconds = (performance.now() - started) / 1000;
    console.log(`elkj sweep: ts-time=${seconds.toFixed(1)}s (budget ${String(TS_SWEEP_BUDGET_MS / 1000)}s)`);
  });

  it('the sweep covers the selection, the converted files and all of tier 2', () => {
    const selection = readFileSync(path.join(dir, 'selection.tsv'), 'utf8').split('\n').filter(Boolean);
    const converted = [...(results.get(KIND_CONVERT)?.values() ?? [])].filter((r) => r.status === STATUS_OK).length;
    console.log(
      `elkj sweep: selection=${String(selection.length)} (small ${String(selection.filter((l) => l.split('\t')[2] === 'small').length)}, ` +
        `sample ${String(selection.filter((l) => l.split('\t')[2] === 'sample').length)}) converted=${String(converted)} ` +
        `twice=${String(selection.filter((l) => l.split('\t')[3] === '1').length)}`,
    );
    expect(results.get(KIND_CONVERT)?.size).toBe(selection.length);
    expect(results.get(KIND_WRITE)?.size).toBe(selection.length);
    expect(results.get(KIND_PARSE)?.size).toBe(converted);
    expect(results.get(KIND_VALIDATE)?.size).toBe(converted);
    expect([...(results.get(KIND_PARSE_ELKJ)?.keys() ?? [])].filter((id) => id.startsWith(`${REALWORLD}/`))).toHaveLength(550);
  });

  it('no case is nondeterministic (D12 seeds the identifier generator)', () => {
    const rows = [...results.values()].flatMap((r) => [...r.values()]);
    const twice = rows.filter((r) => r.runs === 2).length;
    const unstable = rows.filter((r) => r.status === STATUS_NONDETERMINISTIC).map((r) => `${r.kind} ${r.id}`);
    console.log(`elkj sweep: determinism double-run cases=${String(twice)} nondeterministic=${String(unstable.length)}`);
    expect(unstable).toEqual([]);
  });

  it('tier1-parse-equal', () => {
    const v = verdictOf(settled(results.get(KIND_PARSE)), (row) => parseDiff(row, convertedText(row.id), KIND_PARSE));
    report('tier1-parse-equal', v, nondeterministic(KIND_PARSE));
    logCompared('tier1-parse-equal', settled(results.get(KIND_PARSE)), (r) => r.status === STATUS_OK);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('tier1-validate-equal', () => {
    const v = verdictOf(settled(results.get(KIND_VALIDATE)), validateDiff);
    report('tier1-validate-equal', v, nondeterministic(KIND_VALIDATE));
    logCompared('tier1-validate-equal', settled(results.get(KIND_VALIDATE)), (r) => !validateIsPresenceOnly(r));
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('tier2-parse-equal', () => {
    const v = verdictOf(settled(results.get(KIND_PARSE_ELKJ)), (row) =>
      parseDiff(row, tier2Text(modelsDir, row.id), KIND_PARSE_ELKJ),
    );
    report('tier2-parse-equal', v, nondeterministic(KIND_PARSE_ELKJ));
    logCompared('tier2-parse-equal', settled(results.get(KIND_PARSE_ELKJ)), (r) => r.status === STATUS_OK);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('writer-byte-exact', () => {
    const v = verdictOf(settled(results.get(KIND_WRITE)), (row) => writerDiff(row, tsWriteOf(row)));
    report('writer-byte-exact', v, nondeterministic(KIND_WRITE));
    logCompared('writer-byte-exact', settled(results.get(KIND_WRITE)), (r) => oracleOutput<OracleWrite>(KIND_WRITE, r.id).text !== undefined);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('reparse-equal', () => {
    // a writer failure is the writer indicator's business: such rows are not reloaded
    const rows = settled(results.get(KIND_WRITE)).filter((r) => tsWriteOf(r).text !== null);
    const v = verdictOf(rows, (row) => reparseDiff(row, tsWriteOf(row)));
    report('reparse-equal', v, nondeterministic(KIND_WRITE));
    logCompared('reparse-equal', rows, (r) => (oracleOutput<OracleWrite>(KIND_WRITE, r.id).reparse as OracleReparse).errors === 0);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('the port sweep stays within its time budget', () => {
    expect(performance.now() - started).toBeLessThan(TS_SWEEP_BUDGET_MS);
  });
});
