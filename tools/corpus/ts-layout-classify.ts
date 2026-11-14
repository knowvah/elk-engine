// SPDX-License-Identifier: EPL-2.0
// The pure part of the TS-vs-oracle comparison (M5, AD-4, AD-5): row parsing, per-case classification, the identity
// neutralisation, summaries and the report. No engine import, so the sharded parent process stays light.
import { compareLayout, formatDiffs } from '../../test/golden/compare-json.js';
import { ELK_ALGORITHM_PREFIX } from './census.js';

export type Category =
  'ok' | 'mismatch' | 'both-throw' | 'ts-only-throw' | 'oracle-only-throw' | 'ts-aborted' | 'excluded';
/** What the in-process path can report: it has no child to cut short, so never `ts-aborted`. */
export type InProcessCategory = Exclude<Category, 'ts-aborted'>;
/**
 * The categories of the in-process path (`summarize`, `runComparison`, `execute`). The landed M5 test pins this key
 * set (AD-13), so the sharded path's `ts-aborted` lives in {@link SWEEP_CATEGORIES} only.
 */
export const CATEGORIES: readonly InProcessCategory[] = [
  'ok',
  'mismatch',
  'both-throw',
  'ts-only-throw',
  'oracle-only-throw',
  'excluded',
];
/** The categories of a sharded sweep (mission ts-parity-dashboard, TP2): `ts-aborted` comes just before `excluded`. */
export const SWEEP_CATEGORIES: readonly Category[] = [
  'ok',
  'mismatch',
  'both-throw',
  'ts-only-throw',
  'oracle-only-throw',
  'ts-aborted',
  'excluded',
];

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

export interface AlgorithmSummary<C extends Category = InProcessCategory> {
  readonly planned: number;
  readonly counts: Record<C, number>;
  /** Mismatches whose differences are all layout-option entries (see {@link CaseOutcome.optionsOnly}). */
  readonly optionsOnlyMismatches: number;
  readonly tsMs: number;
  readonly oracleMs: number;
}

export interface Summary<C extends Category = InProcessCategory> {
  readonly byAlgorithm: Record<string, AlgorithmSummary<C>>;
  /** Every case that is neither `ok`, `both-throw`, `excluded` nor otherwise settled, with its first differences. */
  readonly findings: readonly CaseOutcome[];
}

/** The side effects of one case, injected so the orchestration is testable without the corpus. */
export interface CaseDeps {
  readonly readOracleOutput: (caseId: string) => string;
  /** Lays the case out and returns the exported JSON text; throws what the pipeline throws. */
  readonly runTs: (row: SweepRow) => string;
}

export const VERDICT_OK = 'ok';
export const VERDICT_THROWS = 'throws';
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
const TIER_NATIVE = 'native';
const MAX_DETAIL_DIFFS = 8;
const LAYOUT_OPTIONS_PATH = /(^|\.)layoutOptions(\.|$)/;

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

/**
 * Java throwables the port raises as a JavaScript built-in: a `NullPointerException` is a `TypeError` (elkgraph-model
 * D10, AD-16b) and a `StackOverflowError` is the engine's stack-exhaustion `RangeError`. Every other class carries its
 * Java name in the port.
 */
const JAVA_TO_TS_CLASS: ReadonlyMap<string, string> = new Map([
  ['NullPointerException', 'TypeError'],
  ['StackOverflowError', 'RangeError'],
]);

/** Pure classification of one case from the oracle's verdict row and what the TS pipeline did. */
export function classify(row: SweepRow, ts: TsOutcome): { category: Category; detail: string } {
  if (row.verdict === VERDICT_THROWS) {
    const expected = simpleClassName(row.exception?.class ?? '');
    if (ts.kind === 'laid') return { category: 'oracle-only-throw', detail: `oracle threw ${expected}` };
    if (ts.name === expected || ts.name === JAVA_TO_TS_CLASS.get(expected)) {
      return { category: 'both-throw', detail: expected };
    }
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

/**
 * Classified, options-only difference (maintainer ruling on #71, item 1; the goldens test does the same). The oracle exports
 * DisCo's `debug.discoGraph` option as Java's identity `toString` (`org.eclipse.elk.alg.disco.graph.DCGraph@<hash>`; `DCGraph`
 * has no `toString`), which a TypeScript object cannot reproduce. Only the value of that one key is neutralised, on both sides,
 * and only where the oracle's value has the identity form; every other value, and the geometry, is compared in full.
 */
const IDENTITY_KEY = 'debug.discoGraph';
const IDENTITY_FORM = /^org\.eclipse\.elk\.alg\.disco\.graph\.DCGraph@[0-9a-f]+$/;
const IDENTITY_NEUTRAL = '<identity toString>';

type OptionsHolder = { layoutOptions?: Record<string, unknown>; children?: OptionsHolder[] };

/** Neutralises `debug.discoGraph` in `actual` wherever `expected` holds the identity form there (both trees are walked together). */
export function neutraliseIdentity(expected: unknown, actual: unknown): void {
  const e = expected as OptionsHolder;
  const a = actual as OptionsHolder;
  const expectedValue = e.layoutOptions?.[IDENTITY_KEY];
  if (typeof expectedValue === 'string' && IDENTITY_FORM.test(expectedValue)) {
    (e.layoutOptions as Record<string, unknown>)[IDENTITY_KEY] = IDENTITY_NEUTRAL;
    if (a.layoutOptions !== undefined && IDENTITY_KEY in a.layoutOptions)
      a.layoutOptions[IDENTITY_KEY] = IDENTITY_NEUTRAL;
  }
  const expectedChildren = e.children ?? [];
  const actualChildren = a.children ?? [];
  for (let i = 0; i < Math.min(expectedChildren.length, actualChildren.length); i++) {
    neutraliseIdentity(expectedChildren[i], actualChildren[i]);
  }
}

/** True when the TS side of the case runs at all; oracle-nondeterministic cases are `excluded` without a run. */
export function isRunnable(row: SweepRow): boolean {
  return row.verdict === VERDICT_OK || row.verdict === VERDICT_THROWS;
}

/** Compares one case end to end. Oracle-nondeterministic cases are not run (`excluded`). */
export function compareCase(row: SweepRow, deps: CaseDeps): CaseOutcome {
  const base = { caseId: row.caseId, algorithm: row.algorithm, oracleMs: row.ms };
  if (!isRunnable(row)) {
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
  const expected = lenientParse(deps.readOracleOutput(row.caseId));
  const actual = lenientParse(side.text);
  neutraliseIdentity(expected, actual);
  const result = compareLayout(expected, actual);
  const { category } = classify(row, { kind: 'laid', equal: result.ok });
  const detail = result.ok ? '' : formatDiffs(result.diffs, MAX_DETAIL_DIFFS);
  const optionsOnly = result.diffs.every((d) => LAYOUT_OPTIONS_PATH.test(d.path));
  return { ...base, category, detail, tsMs: side.ms, ...(category === 'mismatch' ? { optionsOnly } : {}) };
}

/** The outcome of a case whose TS run was cut short (`timeout`, or `exit <code|signal>`). */
export function abortedOutcome(row: SweepRow, detail: string, tsMs: number): CaseOutcome {
  return { caseId: row.caseId, algorithm: row.algorithm, category: 'ts-aborted', detail, tsMs, oracleMs: row.ms };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const REPORTED: ReadonlySet<Category> = new Set<Category>([
  'mismatch',
  'ts-only-throw',
  'oracle-only-throw',
  'ts-aborted',
]);

function emptyEntry<C extends Category>(categories: readonly C[]): Mutable<AlgorithmSummary<C>> {
  const counts = Object.fromEntries(categories.map((c) => [c, 0])) as Record<C, number>;
  return { planned: 0, counts, optionsOnlyMismatches: 0, tsMs: 0, oracleMs: 0 };
}

/** Counts `outcomes` per algorithm over `categories`; an outcome outside them is a caller error. */
function tally<C extends Category>(outcomes: readonly CaseOutcome[], categories: readonly C[]): Summary<C> {
  const known: ReadonlySet<Category> = new Set<Category>(categories);
  const byAlgorithm: Record<string, Mutable<AlgorithmSummary<C>>> = {};
  for (const o of outcomes) {
    if (!known.has(o.category)) throw new Error(`Case ${o.caseId}: category ${o.category} is not counted here`);
    const entry = (byAlgorithm[o.algorithm] ??= emptyEntry(categories));
    entry.planned += 1;
    if (o.optionsOnly === true) entry.optionsOnlyMismatches += 1;
    entry.counts[o.category as C] += 1;
    entry.tsMs += o.tsMs;
    entry.oracleMs += o.oracleMs;
  }
  return { byAlgorithm, findings: outcomes.filter((o) => REPORTED.has(o.category)) };
}

/** Counts per algorithm (sum of the categories equals `planned`) and the findings to triage: the in-process path. */
export function summarize(outcomes: readonly CaseOutcome[]): Summary {
  return tally(outcomes, CATEGORIES);
}

/** `summarize` for a sharded sweep: the counts also hold `ts-aborted`. */
export function summarizeSweep(outcomes: readonly CaseOutcome[]): Summary<Category> {
  return tally(outcomes, SWEEP_CATEGORIES);
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

/** One line per algorithm, its counts in the order of the summary's category list, then the findings count. */
export function report<C extends Category>(summary: Summary<C>): string {
  const lines = Object.entries(summary.byAlgorithm).map(([algorithm, s]) => {
    const counts = Object.entries<number>(s.counts)
      .map(([c, n]) => `${c}=${String(n)}`)
      .join(' ');
    const times = `tsMs=${String(Math.round(s.tsMs))} oracleMs=${String(s.oracleMs)}`;
    return `${algorithm}: planned=${String(s.planned)} ${counts} optionsOnlyMismatches=${String(s.optionsOnlyMismatches)} ${times}`;
  });
  return `${lines.join('\n')}\nfindings=${String(summary.findings.length)}\n`;
}

/** The summary `--out` writes (contract of mission ts-parity-dashboard, TP3): the summary plus every case. */
export interface TsSweepSummary extends Summary<Category> {
  readonly elkCommit: string;
  readonly modelsCommit: string;
  readonly sweepDir: string;
  readonly node: string;
  readonly shards: number;
  readonly timeoutMs: number | null;
  readonly wallMs: number;
  readonly cases: readonly CaseOutcome[];
}

/** The run facts a `TsSweepSummary` records besides the outcomes. */
export type SweepMeta = Omit<TsSweepSummary, 'byAlgorithm' | 'findings' | 'cases'>;

/** Assembles the `--out` document; `cases` holds every outcome sorted by case id. */
export function buildSweepSummary(outcomes: readonly CaseOutcome[], meta: SweepMeta): TsSweepSummary {
  const { byAlgorithm, findings } = summarizeSweep(outcomes);
  const cases = [...outcomes].sort((a, b) => (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0));
  return { ...meta, byAlgorithm, findings, cases };
}
