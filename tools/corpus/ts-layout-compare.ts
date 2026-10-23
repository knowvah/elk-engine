// SPDX-License-Identifier: EPL-2.0
// Local TS-vs-oracle comparison of the core layouts (fixed, box, random) over the corpus sweep (M5, AD-4, AD-5).
// Reads the oracle sweep (`results.jsonl`, `run-a/`), lays every case out with the TS engine through the same
// pipeline as the oracle harness (import, overlay, engine, export) and classifies the result. Nothing from the sweep
// is committed; the JSON summary goes to the path given by `--out`.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../src/core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { loadManifest, repoRoot, resolveModelsDir } from '../../test/corpus/corpus.js';
import { compareLayout, formatDiffs } from '../../test/golden/compare-json.js';
import { applyOverlay } from '../../test/helpers/graph-overlay.js';
import { exportLikeOracle } from '../../test/helpers/graph-json-oracle.js';
import {
  type Census,
  COMMITTED_CENSUS_RELATIVE,
  DEFAULT_ORACLE_RELATIVE,
  ELK_ALGORITHM_PREFIX,
  ELK_COMMIT_RELATIVE,
  ORACLE_DIR_ENV,
  caseOutputName,
} from './census.js';

export type Category = 'ok' | 'mismatch' | 'both-throw' | 'ts-only-throw' | 'oracle-only-throw' | 'excluded';
export const CATEGORIES: readonly Category[] = [
  'ok',
  'mismatch',
  'both-throw',
  'ts-only-throw',
  'oracle-only-throw',
  'excluded',
];
export const DEFAULT_ALGORITHMS: readonly string[] = ['fixed', 'box', 'random'];

/** One line of the sweep's `results.jsonl` (the fields this tool reads). */
export interface SweepRow {
  readonly caseId: string;
  readonly tier: string;
  readonly algorithm: string;
  readonly variant: string;
  readonly modelId: string;
  readonly verdict: string;
  readonly ms: number;
  readonly exception?: { readonly class: string; readonly message: string | null };
}

/** What the TS pipeline did with one case: it threw (error name) or produced an output, equal or not. */
export type TsOutcome = { readonly kind: 'threw'; readonly name: string } | { readonly kind: 'laid'; equal: boolean };

export interface CaseOutcome {
  readonly caseId: string;
  readonly algorithm: string;
  readonly category: Category;
  readonly detail: string;
  readonly tsMs: number;
  readonly oracleMs: number;
  /** For a `mismatch` of two laid-out graphs: every difference is under a `layoutOptions` object (no geometry). */
  readonly optionsOnly?: boolean;
}

export interface AlgorithmSummary {
  readonly planned: number;
  readonly counts: Record<Category, number>;
  /** Mismatches whose differences are all layout-option entries (see {@link CaseOutcome.optionsOnly}). */
  readonly optionsOnlyMismatches: number;
  readonly tsMs: number;
  readonly oracleMs: number;
}

export interface Summary {
  readonly byAlgorithm: Record<string, AlgorithmSummary>;
  /** Every case that is neither `ok`, `both-throw` nor `excluded`, with its first differences. */
  readonly findings: readonly CaseOutcome[];
}

/** The side effects of one case, injected so the orchestration is testable without the corpus. */
export interface CaseDeps {
  readonly readOracleOutput: (caseId: string) => string;
  /** Lays the case out and returns the exported JSON text; throws what the pipeline throws. */
  readonly runTs: (row: SweepRow) => string;
}

export interface Options {
  readonly out: string | undefined;
  readonly sweepDir: string | undefined;
  readonly algorithms: readonly string[];
  readonly filter: string | undefined;
}

const VERDICT_OK = 'ok';
const VERDICT_THROWS = 'throws';
const NAN_MARKER = '@@marker:NaN';
const POSITIVE_INFINITY_MARKER = '@@marker:+Infinity';
const NEGATIVE_INFINITY_MARKER = '@@marker:-Infinity';
const BARE_NUMBER_TOKEN = /-?Infinity|NaN/y;
const MARKERS = new Map<string, number>([
  [NAN_MARKER, Number.NaN],
  [POSITIVE_INFINITY_MARKER, Number.POSITIVE_INFINITY],
  [NEGATIVE_INFINITY_MARKER, Number.NEGATIVE_INFINITY],
]);
const TOKEN_MARKERS = new Map<string, string>([
  ['NaN', NAN_MARKER],
  ['Infinity', POSITIVE_INFINITY_MARKER],
  ['-Infinity', NEGATIVE_INFINITY_MARKER],
]);
const QUOTE = '"';
const ESCAPE = '\\';
const RESULTS_FILE = 'results.jsonl';
const RUN_A_DIR = 'run-a';
const SWEEP_DIR = 'sweep';
const GENERATED_PREFIX = 'generated/';
const GENERATED_DIR_RELATIVE = path.join('test', 'corpus', 'generated');
const TIER_NATIVE = 'native';
const ELKT_SOURCE = 'elkt';
const MAX_DETAIL_DIFFS = 8;
const LAYOUT_OPTIONS_PATH = /(^|\.)layoutOptions(\.|$)/;
const FLAG_VALUES: readonly string[] = ['--out', '--sweep-dir', '--algorithms', '--filter'];

/** Position just past the string literal that starts at `start` (a double quote). */
function skipString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length && text[i] !== QUOTE) i += text[i] === ESCAPE ? 2 : 1;
  return i + 1;
}

/** Replaces the bare `NaN` / `Infinity` tokens Gson writes in lenient mode by marker strings. */
function markBareNumbers(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === QUOTE) {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    BARE_NUMBER_TOKEN.lastIndex = i;
    const token = BARE_NUMBER_TOKEN.exec(text)?.[0];
    const marker = token === undefined ? undefined : TOKEN_MARKERS.get(token);
    out += marker === undefined ? (text[i] as string) : `${QUOTE}${marker}${QUOTE}`;
    i += marker === undefined ? 1 : (token as string).length;
  }
  return out;
}

/**
 * JSON.parse that also accepts the bare `NaN` / `Infinity` / `-Infinity` the oracle's Gson writes for non-finite
 * numbers (the exporter is lenient); they become the corresponding numbers.
 */
export function lenientParse(text: string): unknown {
  return JSON.parse(markBareNumbers(text), (_key, value: unknown) =>
    typeof value === 'string' && MARKERS.has(value) ? MARKERS.get(value) : value,
  );
}

/** `java.lang.IllegalStateException` becomes `IllegalStateException`. */
export function simpleClassName(qualified: string): string {
  return qualified.slice(qualified.lastIndexOf('.') + 1);
}

/** Pure classification of one case from the oracle's verdict row and what the TS pipeline did. */
export function classify(row: SweepRow, ts: TsOutcome): { category: Category; detail: string } {
  if (row.verdict === VERDICT_THROWS) {
    const expected = simpleClassName(row.exception?.class ?? '');
    if (ts.kind === 'laid') return { category: 'oracle-only-throw', detail: `oracle threw ${expected}` };
    if (ts.name === expected) return { category: 'both-throw', detail: expected };
    return { category: 'mismatch', detail: `oracle threw ${expected}, TS threw ${ts.name}` };
  }
  if (row.verdict !== VERDICT_OK) return { category: 'excluded', detail: row.verdict };
  if (ts.kind === 'threw') return { category: 'ts-only-throw', detail: `TS threw ${ts.name}` };
  return { category: ts.equal ? 'ok' : 'mismatch', detail: '' };
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}

function nowMs(): number {
  return performance.now();
}

/** Runs the TS side of a case, timing it; a throw becomes the outcome. */
function tsSide(row: SweepRow, deps: CaseDeps): { text: string | null; threw: string | null; ms: number } {
  const start = nowMs();
  try {
    const text = deps.runTs(row);
    return { text, threw: null, ms: nowMs() - start };
  } catch (err) {
    return { text: null, threw: errorName(err), ms: nowMs() - start };
  }
}

/** Compares one case end to end. Oracle-nondeterministic cases are not run (`excluded`). */
export function compareCase(row: SweepRow, deps: CaseDeps): CaseOutcome {
  const base = { caseId: row.caseId, algorithm: row.algorithm, oracleMs: row.ms };
  if (row.verdict !== VERDICT_OK && row.verdict !== VERDICT_THROWS) {
    return { ...base, category: 'excluded', detail: row.verdict, tsMs: 0 };
  }
  const side = tsSide(row, deps);
  if (side.text === null) {
    const { category, detail } = classify(row, { kind: 'threw', name: side.threw ?? '' });
    return { ...base, category, detail, tsMs: side.ms };
  }
  if (row.verdict === VERDICT_THROWS) {
    const { category, detail } = classify(row, { kind: 'laid', equal: false });
    return { ...base, category, detail, tsMs: side.ms };
  }
  const result = compareLayout(lenientParse(deps.readOracleOutput(row.caseId)), lenientParse(side.text));
  const { category } = classify(row, { kind: 'laid', equal: result.ok });
  const detail = result.ok ? '' : formatDiffs(result.diffs, MAX_DETAIL_DIFFS);
  const optionsOnly = result.diffs.every((d) => LAYOUT_OPTIONS_PATH.test(d.path));
  return { ...base, category, detail, tsMs: side.ms, ...(category === 'mismatch' ? { optionsOnly } : {}) };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function emptyCounts(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

const REPORTED: ReadonlySet<Category> = new Set<Category>(['mismatch', 'ts-only-throw', 'oracle-only-throw']);

/** Counts per algorithm (sum of the categories equals `planned`) and the findings to triage. */
export function summarize(outcomes: readonly CaseOutcome[]): Summary {
  const byAlgorithm: Record<string, Mutable<AlgorithmSummary>> = {};
  for (const o of outcomes) {
    const entry = (byAlgorithm[o.algorithm] ??= {
      planned: 0,
      counts: emptyCounts(),
      optionsOnlyMismatches: 0,
      tsMs: 0,
      oracleMs: 0,
    });
    entry.planned += 1;
    if (o.optionsOnly === true) entry.optionsOnlyMismatches += 1;
    entry.counts[o.category] += 1;
    entry.tsMs += o.tsMs;
    entry.oracleMs += o.oracleMs;
  }
  return { byAlgorithm, findings: outcomes.filter((o) => REPORTED.has(o.category)) };
}

export function parseArgs(argv: readonly string[]): Options {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] as string;
    if (!FLAG_VALUES.includes(flag)) throw new Error(`Unknown argument ${flag}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`${flag} requires a value`);
    values.set(flag, value);
  }
  const algorithms = values.get('--algorithms')?.split(',') ?? DEFAULT_ALGORITHMS;
  return { out: values.get('--out'), sweepDir: values.get('--sweep-dir'), algorithms, filter: values.get('--filter') };
}

function isRow(value: unknown): value is SweepRow {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return ['caseId', 'tier', 'algorithm', 'variant', 'modelId', 'verdict'].every((k) => typeof r[k] === 'string');
}

/** Parses `results.jsonl` text, keeping the rows of `algorithms` (short names) whose id contains `filter`. */
export function selectRows(jsonl: string, algorithms: readonly string[], filter: string | undefined): SweepRow[] {
  const wanted = new Set(algorithms.map((a) => `${ELK_ALGORITHM_PREFIX}${a}`));
  const rows: SweepRow[] = [];
  for (const line of jsonl.split('\n')) {
    if (line === '') continue;
    const parsed: unknown = JSON.parse(line);
    if (!isRow(parsed)) throw new Error(`Malformed sweep row: ${line.slice(0, 120)}`);
    if (wanted.has(parsed.algorithm) && (filter === undefined || parsed.caseId.includes(filter))) rows.push(parsed);
  }
  return rows;
}

/** The overlay algorithm: native cases keep the model's own, every other tier retargets. */
export function overlayAlgorithm(row: SweepRow): string | null {
  return row.tier === TIER_NATIVE ? null : row.algorithm;
}

function loadElk(source: string, text: string): ElkNode {
  if (source !== ELKT_SOURCE) return ElkGraphJson.forGraph(text).toElk();
  const loaded = ElkGraphText.load(text);
  if (loaded.root === null || loaded.errors.length > 0) {
    throw new Error(`elkt load failed: ${loaded.errors[0]?.message ?? 'no root'}`);
  }
  return loaded.root;
}

/** Mirrors `tools/oracle/harness/CaseRunner.java`: read, overlay, lay out, export. */
export function layoutToJson(graphText: string, source: string, row: SweepRow): string {
  const graph = loadElk(source, graphText);
  applyOverlay(graph, overlayAlgorithm(row), row.variant);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return exportLikeOracle(graph);
}

/** The sweep directory: `--sweep-dir`, else `<ELK_ORACLE_DIR or ../elk-oracle>/sweep/<elk sha>-<models sha>`. */
export function resolveSweepDir(root: string, override: string | undefined, oracleEnv: string | undefined): string {
  if (override !== undefined) return path.resolve(override);
  const oracle =
    oracleEnv !== undefined && oracleEnv !== '' ? path.resolve(oracleEnv) : path.resolve(root, DEFAULT_ORACLE_RELATIVE);
  const elkCommit = readFileSync(path.join(root, ELK_COMMIT_RELATIVE), 'utf8').trim();
  return path.join(oracle, SWEEP_DIR, `${elkCommit}-${loadManifest().commit}`);
}

/** The directories a comparison reads: the repo root (census, generated inputs), the models and the sweep. */
export interface Dirs {
  readonly root: string;
  readonly modelsDir: string;
  readonly sweepDir: string;
}

/** The input file of a case and its source format (`json` or `elkt`). */
export function inputOf(
  row: SweepRow,
  dirs: Dirs,
  sources: ReadonlyMap<string, string>,
): { file: string; source: string } {
  if (row.modelId.startsWith(GENERATED_PREFIX)) {
    const name = row.modelId.slice(GENERATED_PREFIX.length);
    return { file: path.join(dirs.root, GENERATED_DIR_RELATIVE, `${name}.json`), source: 'json' };
  }
  const source = sources.get(row.modelId) ?? 'json';
  return { file: path.join(dirs.modelsDir, `${row.modelId}.${source}`), source };
}

export function liveDeps(dirs: Dirs): CaseDeps {
  const census = JSON.parse(readFileSync(path.join(dirs.root, COMMITTED_CENSUS_RELATIVE), 'utf8')) as Census;
  const sources = new Map(census.models.map((m) => [m.id, m.source as string]));
  return {
    readOracleOutput: (caseId) => readFileSync(path.join(dirs.sweepDir, RUN_A_DIR, caseOutputName(caseId)), 'utf8'),
    runTs: (row) => {
      const { file, source } = inputOf(row, dirs, sources);
      return layoutToJson(readFileSync(file, 'utf8'), source, row);
    },
  };
}

export function report(summary: Summary): string {
  const lines = Object.entries(summary.byAlgorithm).map(([algorithm, s]) => {
    const counts = CATEGORIES.map((c) => `${c}=${String(s.counts[c])}`).join(' ');
    const times = `tsMs=${String(Math.round(s.tsMs))} oracleMs=${String(s.oracleMs)}`;
    return `${algorithm}: planned=${String(s.planned)} ${counts} optionsOnlyMismatches=${String(s.optionsOnlyMismatches)} ${times}`;
  });
  return `${lines.join('\n')}\nfindings=${String(summary.findings.length)}\n`;
}

/** Compares every selected sweep row of `dirs.sweepDir` and returns the summary. */
export function runComparison(opts: Options, dirs: Dirs): Summary {
  const jsonl = readFileSync(path.join(dirs.sweepDir, RESULTS_FILE), 'utf8');
  const deps = liveDeps(dirs);
  return summarize(selectRows(jsonl, opts.algorithms, opts.filter).map((row) => compareCase(row, deps)));
}

/** What `execute` needs from the process: the models directory, the oracle directory variable and the sinks. */
export interface Io {
  readonly modelsDir: string;
  readonly oracleEnv: string | undefined;
  readonly stdout: (text: string) => void;
  readonly writeFile: (file: string, text: string) => void;
}

/** Runs the comparison for `argv`; the exit code is 0 without findings, 1 with findings. */
export function execute(argv: readonly string[], root: string, io: Io): number {
  const opts = parseArgs(argv);
  const sweepDir = resolveSweepDir(root, opts.sweepDir, io.oracleEnv);
  const summary = runComparison(opts, { root, modelsDir: io.modelsDir, sweepDir });
  if (opts.out !== undefined) io.writeFile(opts.out, `${JSON.stringify(summary, null, 2)}\n`);
  io.stdout(report(summary));
  return summary.findings.length === 0 ? 0 : 1;
}

/* v8 ignore start -- process wiring: environment, stdio and exit code */
function main(argv: readonly string[]): number {
  const resolved = resolveModelsDir();
  if ('skip' in resolved) throw new Error(resolved.skip);
  return execute(argv, repoRoot(), {
    modelsDir: resolved.dir,
    oracleEnv: process.env[ORACLE_DIR_ENV],
    stdout: (text) => process.stdout.write(text),
    writeFile: (file, text) => writeFileSync(file, text),
  });
}

const entry = process.argv[1];
if (entry !== undefined && pathToFileURL(realpathSync(entry)).href === import.meta.url) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`ts-layout-compare: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exitCode = 2;
  }
}
/* v8 ignore stop */
