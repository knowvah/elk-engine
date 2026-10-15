// SPDX-License-Identifier: EPL-2.0
// G7 / Phase 4 sweep: the port's `.elkt` behaviour over every model of $ELK_MODELS_DIR (898 `.elkt`, 550 realworld
// `.json`) against the source-built oracle's output (written by tools/oracle/elkt-sweep.sh with the CoreOptions-only
// registry, G3, into $ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/). One `it` per indicator:
//   parse-equal     /898    `exportLikeOracle(load(elkt).root)` equals the oracle's parse within 1e-6; where the oracle
//                           throws the port reports at least one error (presence, D8 #1)
//   validate-equal  /898    `validate(root)` issues equal the oracle's exactly (order, severity, message, line, code),
//                           models that depend on a mission-5 algorithm (G3) deferred
//   writer          /1448   `serialize` equals the oracle text byte for byte; failures match by presence
//   reparse-equal   /1448   `load(serialize(g))` equals `g` (`canonGraph`); where it cannot (lossy in the oracle too) it
//                           equals the oracle's own reparse of the same text
//   d3              /550    realworld `.json` and `.elkt` give equal graphs except for port positions (D3 as amended
//                           by D3a, plans/conformance-corpus/decisions.md; `canonGraphWithoutPortPositions`), and in
//                           both graphs no port position can change a layout (`portsWithLayoutRelevantPosition`)
// Each indicator logs `elkt sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k>` and fails with the per-model report.
// Skipped with a message when the models dir or the sweep dir is absent (CI has neither).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphText, type ElkTextIssue } from '../../src/graph/text/ElkGraphText.js';
import { compareLayout, formatDiffs, type Diff } from '../golden/compare-json.js';
import { isCoverageRun } from '../helpers/coverage-run.js';
import { canonGraph, canonGraphWithoutPortPositions, portsWithLayoutRelevantPosition } from '../helpers/elkt-canon.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { repoRoot, resolveModelsDir } from './corpus.js';

const ELKT = '.elkt';
const JSON_EXT = '.json';
const REALWORLD = 'realworld';
const ID_SEPARATOR = '/';
const ID_REPLACEMENT = '__';
const STATUS_OK = 'ok';
const STATUS_NONDETERMINISTIC = 'nondeterministic';
const KIND_PARSE = 'parse';
const KIND_PARSE_JSON = 'parse-json';
const KIND_VALIDATE = 'validate';
const KIND_WRITE = 'write';
const SWEEP_SCRIPT = 'tools/oracle/elkt-sweep.sh';
const SWEEP_DIR_ENV = 'ELKT_SWEEP_DIR';
const ORACLE_DIR_ENV = 'ELK_ORACLE_DIR';
const DEFAULT_ORACLE_RELATIVE_PATH = '../elk-oracle';
const TEST_TIMEOUT_MS = isCoverageRun() ? 360_000 : 120_000;
const LARGEST_MODEL = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt';
const LARGEST_BUDGET_MS = isCoverageRun() ? 3000 : 1000;
/** A diff path in the port positions, which D3a excludes from the `.json` vs `.elkt` comparison. */
const PORT_POSITION_PATH = /ports\[[^\]]*\]\.[xy]$/;
/** The algorithms the TS registry lacks until mission 5 (`MISSION5_ALGORITHMS`, G3): a model naming one is deferred. */
const MISSION5_ALGORITHM_VALUE = /\balgorithm\s*:\s*"?(?:[\w]+\.)*(?:fixed|box|random)\b/;

interface ResultRow {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
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

/** The sweep dir: `ELKT_SWEEP_DIR`, else `$ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>`. */
function sweepDir(modelsCommit: string): string {
  const override = process.env[SWEEP_DIR_ENV];
  if (override !== undefined && override !== '') return path.resolve(override);
  const oracle = process.env[ORACLE_DIR_ENV] ?? path.resolve(repoRoot(), DEFAULT_ORACLE_RELATIVE_PATH);
  const elkCommit = readFileSync(path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT'), 'utf8').trim();
  return path.join(oracle, 'sweep', `elkt-${elkCommit}-${modelsCommit}`);
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

const outputName = (id: string): string => id.split(ID_SEPARATOR).join(ID_REPLACEMENT) + JSON_EXT;
const oracleOutput = <T>(kind: string, id: string): T =>
  JSON.parse(readFileSync(path.join(dir, kind, outputName(id)), 'utf8')) as T;

function readResults(): Map<string, Map<string, ResultRow>> {
  const byKind = new Map<string, Map<string, ResultRow>>();
  for (const line of readFileSync(path.join(dir, 'results.jsonl'), 'utf8').split('\n')) {
    if (line === '') continue;
    const row = JSON.parse(line) as ResultRow;
    byKind.set(row.kind, (byKind.get(row.kind) ?? new Map()).set(row.id, row));
  }
  return byKind;
}

const readModel = (modelsDir: string, relative: string): string => readFileSync(path.join(modelsDir, relative), 'utf8');

function loadClean(text: string): ElkNode {
  const result = ElkGraphText.load(text);
  expect(result.errors).toEqual([]);
  return result.root as ElkNode;
}

const OUTCOME_EXACT = 'exact';
const OUTCOME_LOSSY = 'lossy';
const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The settled rows of a kind (a nondeterministic case is reported separately and excluded, D5). */
function settled(rows: Map<string, ResultRow> | undefined): ResultRow[] {
  return [...(rows?.values() ?? [])].filter((r) => r.status !== STATUS_NONDETERMINISTIC);
}

function verdict(total: number, deferred: number, diffs: string[]): Verdict {
  return { total, ok: total - deferred - diffs.length, deferred, diffs };
}

function report(indicator: string, v: Verdict, nondeterministic: number): void {
  console.log(
    `elkt sweep: ${indicator}=${v.ok}/${v.total} deferred=${v.deferred} diffs=${v.diffs.length}` +
      ` nondeterministic=${nondeterministic}`,
  );
}

function expectNoDiffs(v: Verdict): void {
  expect(v.diffs.join('\n\n')).toBe('');
}

// ---- parse

function parseDiff(modelsDir: string, row: ResultRow): string | undefined {
  const result = ElkGraphText.load(readModel(modelsDir, row.id + ELKT));
  if (row.status !== STATUS_OK) {
    return result.errors.length > 0 ? undefined : `oracle ${row.status} but the port loaded without errors`;
  }
  if (result.errors.length > 0 || result.root === null) {
    return `oracle parsed it but the port reports: ${result.errors.map((e) => e.message).join('; ')}`;
  }
  const expected = oracleOutput<unknown>(KIND_PARSE, row.id);
  const { ok, diffs } = compareLayout(expected, JSON.parse(exportLikeOracle(result.root)));
  return ok ? undefined : formatDiffs(diffs);
}

function parseVerdict(modelsDir: string, rows: ResultRow[]): Verdict {
  const diffs = rows.flatMap((r) => {
    const d = parseDiff(modelsDir, r);
    return d === undefined ? [] : [`${r.id}\n${d}`];
  });
  return verdict(rows.length, 0, diffs);
}

// ---- validate

const toOracleShape = (i: ElkTextIssue): OracleIssue => ({
  severity: i.severity,
  message: i.message,
  line: i.line,
  code: i.code,
});

const issueKey = (i: OracleIssue): string => `${i.line}|${i.severity}|${i.code ?? ''}|${i.message}`;

const sortedKeys = (issues: readonly OracleIssue[]): string[] => issues.map(issueKey).sort(text);

function describeIssues(issues: readonly OracleIssue[]): string {
  return issues.map((i) => `  ${i.severity} L${i.line} [${i.code ?? '-'}] ${i.message}`).join('\n') || '  (none)';
}

function validateDiff(modelsDir: string, row: ResultRow): string | undefined {
  const result = ElkGraphText.load(readModel(modelsDir, row.id + ELKT));
  if (result.root === null) return 'the port produced no model';
  const actual = ElkGraphText.validate(result.root).map(toOracleShape);
  const expected = oracleOutput<{ issues: OracleIssue[] }>(KIND_VALIDATE, row.id).issues;
  if (JSON.stringify(actual) === JSON.stringify(expected)) return undefined;
  const orderOnly = JSON.stringify(sortedKeys(actual)) === JSON.stringify(sortedKeys(expected));
  return `${orderOnly ? 'same issues, different order' : 'different issues'}\noracle:\n${describeIssues(expected)}\nport:\n${describeIssues(actual)}`;
}

function validateVerdict(modelsDir: string, rows: ResultRow[]): Verdict {
  const deferredIds: string[] = [];
  const diffs: string[] = [];
  for (const row of rows) {
    if (MISSION5_ALGORITHM_VALUE.test(readModel(modelsDir, row.id + ELKT))) {
      deferredIds.push(row.id);
      continue;
    }
    const d = row.status === STATUS_OK ? validateDiff(modelsDir, row) : `oracle validation ${row.status}`;
    if (d !== undefined) diffs.push(`${row.id}\n${d}`);
  }
  return verdict(rows.length, deferredIds.length, diffs);
}

// ---- writer and reparse (one TS serialization per input, shared by both indicators)

interface TsWrite {
  readonly graph: ElkNode | null;
  readonly text: string | null;
  readonly failure: string | null;
}

function readInput(modelsDir: string, id: string): ElkNode {
  const source = readModel(modelsDir, id);
  return id.endsWith(ELKT) ? loadClean(source) : ElkGraphJson.forGraph(source).toElk();
}

function tsWrite(modelsDir: string, id: string): TsWrite {
  let graph: ElkNode | null = null;
  try {
    graph = readInput(modelsDir, id);
    return { graph, text: ElkGraphText.serialize(graph), failure: null };
  } catch (e) {
    return { graph, text: null, failure: e instanceof Error ? e.constructor.name : String(e) };
  }
}

function writerDiff(row: ResultRow, ts: TsWrite): string | undefined {
  const oracle = oracleOutput<OracleWrite>(KIND_WRITE, row.id);
  if (row.status !== STATUS_OK || oracle.text === undefined) {
    return ts.failure === null ? `oracle failed (${oracle.error?.class ?? row.status}) but the port wrote text` : undefined;
  }
  if (ts.text === null) return `oracle wrote ${String(oracle.text.length)} chars but the port failed: ${ts.failure}`;
  if (ts.text === oracle.text) return undefined;
  let at = 0;
  while (at < ts.text.length && ts.text[at] === oracle.text[at]) at++;
  return `first difference at offset ${String(at)}:\noracle: ${JSON.stringify(oracle.text.slice(at, at + 80))}\nport:   ${JSON.stringify(ts.text.slice(at, at + 80))}`;
}

function writerVerdict(rows: ResultRow[], writes: Map<string, TsWrite>): Verdict {
  const diffs = rows.flatMap((r) => {
    const d = writerDiff(r, writes.get(r.id) as TsWrite);
    return d === undefined ? [] : [`${r.id}\n${d}`];
  });
  return verdict(rows.length, 0, diffs);
}

/** Whether the oracle's reparse of its own text differs from its own original parse (a lossy writer, upstream). */
function oracleLossy(row: ResultRow, reparse: OracleReparse): boolean {
  if (reparse.json === null) return true;
  const kind = row.id.endsWith(ELKT) ? KIND_PARSE : KIND_PARSE_JSON;
  const id = row.id.endsWith(ELKT) ? row.id.slice(0, -ELKT.length) : row.id.slice(0, -JSON_EXT.length);
  return !compareLayout(oracleOutput<unknown>(kind, id), JSON.parse(reparse.json)).ok;
}

/** The reload differs from the source graph: it must then equal the oracle's own reparse (lossy there too). */
function lossyDiff(row: ResultRow, reload: ReturnType<typeof ElkGraphText.load>): string | undefined {
  const reparse = oracleOutput<OracleWrite>(KIND_WRITE, row.id).reparse as OracleReparse;
  const oracleFailed = reparse.errors > 0 || reparse.throws !== undefined || reparse.json === null;
  if (reload.errors.length > 0 || reload.root === null) {
    return oracleFailed ? undefined : `the port cannot read its own text (${reload.errors[0]?.message ?? 'no model'})`;
  }
  if (oracleFailed) return 'the port reloads the text the oracle cannot';
  if (!oracleLossy(row, reparse)) return 'the reload differs from the source but the oracle round trip is lossless';
  const { ok, diffs } = compareLayout(JSON.parse(reparse.json as string), JSON.parse(exportLikeOracle(reload.root)));
  return ok ? undefined : formatDiffs(diffs);
}

/** 'exact' (the reload equals the source), 'lossy' (equals the oracle's reparse), else the diff report. */
function reparseOutcome(row: ResultRow, ts: TsWrite): string {
  const reload = ElkGraphText.load(ts.text as string);
  const same =
    reload.errors.length === 0 &&
    reload.root !== null &&
    JSON.stringify(canonGraph(reload.root)) === JSON.stringify(canonGraph(ts.graph as ElkNode));
  return same ? OUTCOME_EXACT : (lossyDiff(row, reload) ?? OUTCOME_LOSSY);
}

function reparseVerdict(rows: ResultRow[], writes: Map<string, TsWrite>): Verdict & { lossy: number; lossyIds: string[] } {
  // a writer failure is the writer indicator's business: such rows are not reloaded
  const written = rows.filter((r) => (writes.get(r.id) as TsWrite).text !== null);
  const outcomes = written.map((r) => [r.id, reparseOutcome(r, writes.get(r.id) as TsWrite)] as const);
  const diffs = outcomes.filter(([, o]) => o !== OUTCOME_EXACT && o !== OUTCOME_LOSSY).map(([id, o]) => `${id}\n${o}`);
  const lossyIds = outcomes.filter(([, o]) => o === OUTCOME_LOSSY).map(([id]) => id);
  return { ...verdict(rows.length, 0, diffs), lossy: lossyIds.length, lossyIds };
}

// ---- D3

function d3Ids(modelsDir: string): string[] {
  const root = path.join(modelsDir, REALWORLD);
  return (readdirSync(root, { recursive: true, encoding: 'utf8' }) as string[])
    .filter((f) => f.endsWith(ELKT) && existsSync(path.join(root, f.slice(0, -ELKT.length) + JSON_EXT)))
    .map((f) => `${REALWORLD}/${f.slice(0, -ELKT.length)}`)
    .sort(text);
}

const outsidePortPositions = (diffs: readonly Diff[]): Diff[] => diffs.filter((d) => !PORT_POSITION_PATH.test(d.path));

/** The verdict of one pair: 'equal' (equal except port positions, D3a) or a diff report with the oracle's view. */
function d3Verdict(modelsDir: string, id: string): string {
  const fromJson = ElkGraphJson.forGraph(readModel(modelsDir, id + JSON_EXT)).toElk();
  const fromText = loadClean(readModel(modelsDir, id + ELKT));
  const relevant = [...portsWithLayoutRelevantPosition(fromJson), ...portsWithLayoutRelevantPosition(fromText)];
  if (relevant.length > 0) {
    return `port positions could change the layout, so D3a cannot exclude them:\n${relevant.slice(0, 5).join('\n')}`;
  }
  if (
    JSON.stringify(canonGraphWithoutPortPositions(fromJson)) === JSON.stringify(canonGraphWithoutPortPositions(fromText))
  ) {
    return 'equal';
  }
  const oracle = outsidePortPositions(
    compareLayout(oracleOutput<unknown>(KIND_PARSE_JSON, id), oracleOutput<unknown>(KIND_PARSE, id)).diffs,
  );
  return `the port's .json and .elkt differ beyond port positions; oracle: ${oracle.length === 0 ? 'equal' : formatDiffs(oracle, 3)}`;
}

function d3Result(modelsDir: string, ids: string[]): Verdict {
  const verdicts = ids.map((id) => [id, d3Verdict(modelsDir, id)] as const);
  const equal = verdicts.filter(([, v]) => v === 'equal').length;
  const diffs = verdicts.filter(([, v]) => v !== 'equal').map(([id, v]) => `${id}\n${v}`);
  return { total: ids.length, ok: equal, deferred: 0, diffs };
}

// ---- the tests

describe('elkt sweep vs the oracle', () => {
  if (skipReason !== undefined) {
    it.skip(`skipped: ${skipReason}`, () => undefined);
    return;
  }
  const modelsDir = (models as { dir: string }).dir;
  const results = readResults();
  const writes = new Map<string, TsWrite>();
  const nondeterministic = (kind: string): number =>
    [...(results.get(kind)?.values() ?? [])].filter((r) => r.status === STATUS_NONDETERMINISTIC).length;

  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('the sweep covers 898 .elkt and 550 realworld .json inputs', () => {
    expect([KIND_PARSE, KIND_VALIDATE, KIND_PARSE_JSON].map((k) => results.get(k)?.size)).toEqual([898, 898, 550]);
    expect(results.get(KIND_WRITE)?.size).toBe(898 + 550);
  });

  it(`parses and links the largest model (${LARGEST_MODEL}) quickly`, () => {
    const source = readModel(modelsDir, LARGEST_MODEL);
    const start = performance.now();
    const result = ElkGraphText.load(source);
    const ms = performance.now() - start;
    expect(result.errors).toEqual([]);
    expect(source.length).toBeGreaterThan(250_000);
    expect(ms).toBeLessThan(LARGEST_BUDGET_MS);
  });

  it('parse-equal', () => {
    const v = parseVerdict(modelsDir, settled(results.get(KIND_PARSE)));
    report('parse-equal', v, nondeterministic(KIND_PARSE));
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('validate-equal', () => {
    const v = validateVerdict(modelsDir, settled(results.get(KIND_VALIDATE)));
    report('validate-equal', v, nondeterministic(KIND_VALIDATE));
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('writer byte-exact', () => {
    const rows = settled(results.get(KIND_WRITE));
    for (const row of rows) writes.set(row.id, tsWrite(modelsDir, row.id));
    const v = writerVerdict(rows, writes);
    report('writer-byte-exact', v, nondeterministic(KIND_WRITE));
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('reparse-equal', () => {
    const rows = settled(results.get(KIND_WRITE));
    for (const row of rows) if (!writes.has(row.id)) writes.set(row.id, tsWrite(modelsDir, row.id));
    const v = reparseVerdict(rows, writes);
    report('reparse-equal', v, nondeterministic(KIND_WRITE));
    console.log(`elkt sweep: reparse-equal exact=${v.ok - v.lossy} lossy-like-the-oracle=${v.lossy} ${v.lossyIds.join(',')}`);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);

  it('d3 realworld .json equals .elkt except for port positions (D3a)', () => {
    const v = d3Result(modelsDir, d3Ids(modelsDir));
    report('d3', v, 0);
    expectNoDiffs(v);
  }, TEST_TIMEOUT_MS);
});
