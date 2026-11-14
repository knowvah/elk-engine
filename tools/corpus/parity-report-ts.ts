// SPDX-License-Identifier: EPL-2.0
import { ELK_ALGORITHM_PREFIX } from './census.js';
import {
  type AlgorithmSummary,
  type CaseOutcome,
  type Category,
  SWEEP_CATEGORIES,
  type TsSweepSummary,
} from './ts-layout-classify.js';

/**
 * The TS sweep summary `ts-layout-compare.ts --out` writes (mission ts-parity-dashboard, TP3); the types are that
 * tool's own, and the text is validated here at the boundary.
 */
export const TS_CATEGORIES: readonly Category[] = SWEEP_CATEGORIES;
export type TsCategory = Category;
export type TsCaseOutcome = CaseOutcome;
export type TsAlgorithmSummary = AlgorithmSummary<Category>;
export type { TsSweepSummary };

export interface FindingAnnotation {
  caseId: string;
  issue: number;
  note: string;
}

/** The parsed TS summary plus the display-only annotations (TP5). */
export interface TsReport {
  summary: TsSweepSummary;
  annotations: readonly FindingAnnotation[];
}

export interface CommitPair {
  elkCommit: string;
  modelsCommit: string;
}

export const TS_FINDINGS_RELATIVE = 'tools/corpus/ts-findings.json';
export const MAX_NOTE_LENGTH = 160;
export const MAX_DETAIL_LENGTH = 200;
const NOT_IN_TS_SWEEP_CELL = '— (not in TS sweep)';
const NO_COMPARED_CELL = '— (no compared cases)';
const NO_DETAIL = 'no detail';
const NO_FINDINGS_LINE = 'No case differs between the TS port and the oracle.';
const UNANNOTATED = 'unannotated';
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
const PERCENT = 100;
const CATEGORY_SET: ReadonlySet<string> = new Set(TS_CATEGORIES);
const SWEEP_COLUMNS = [
  'planned',
  'ok',
  'mismatch',
  'both-throw',
  'ts-only-throw',
  'oracle-only-throw',
  'ts-aborted',
  'excluded',
] as const satisfies readonly ('planned' | TsCategory)[];

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(label: string, where: string, expected: string): never {
  throw new Error(`${label}: ${where} must be ${expected}`);
}

function field(obj: Obj, key: string, where: string, label: string): unknown {
  return key in obj ? obj[key] : fail(label, `${where}${key}`, 'present');
}

function readString(obj: Obj, key: string, where: string, label: string): string {
  const value = field(obj, key, where, label);
  return typeof value === 'string' ? value : fail(label, `${where}${key}`, 'a string');
}

function readNumber(obj: Obj, key: string, where: string, label: string): number {
  const value = field(obj, key, where, label);
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(label, `${where}${key}`, 'a number');
}

function readObj(obj: Obj, key: string, where: string, label: string): Obj {
  const value = field(obj, key, where, label);
  return isObj(value) ? value : fail(label, `${where}${key}`, 'an object');
}

function readArray(obj: Obj, key: string, where: string, label: string): unknown[] {
  const value = field(obj, key, where, label);
  return Array.isArray(value) ? value : fail(label, `${where}${key}`, 'an array');
}

const SUMMARY_LABEL = 'TS summary';

function parseOutcome(value: unknown, where: string): TsCaseOutcome {
  if (!isObj(value)) return fail(SUMMARY_LABEL, where, 'an object');
  const prefix = `${where}.`;
  const category = readString(value, 'category', prefix, SUMMARY_LABEL);
  if (!CATEGORY_SET.has(category)) fail(SUMMARY_LABEL, `${prefix}category`, `one of ${TS_CATEGORIES.join(', ')}`);
  const optionsOnly = value['optionsOnly'];
  if (optionsOnly !== undefined && typeof optionsOnly !== 'boolean') {
    fail(SUMMARY_LABEL, `${prefix}optionsOnly`, 'a boolean');
  }
  return {
    caseId: readString(value, 'caseId', prefix, SUMMARY_LABEL),
    algorithm: readString(value, 'algorithm', prefix, SUMMARY_LABEL),
    category: category as TsCategory,
    detail: readString(value, 'detail', prefix, SUMMARY_LABEL),
    tsMs: readNumber(value, 'tsMs', prefix, SUMMARY_LABEL),
    oracleMs: readNumber(value, 'oracleMs', prefix, SUMMARY_LABEL),
    ...(optionsOnly === undefined ? {} : { optionsOnly }),
  };
}

function parseOutcomes(obj: Obj, key: string): TsCaseOutcome[] {
  return readArray(obj, key, '', SUMMARY_LABEL).map((v, i) => parseOutcome(v, `${key}[${i}]`));
}

function parseAlgorithm(id: string, value: unknown): TsAlgorithmSummary {
  const where = `byAlgorithm.${id}`;
  if (!isObj(value)) return fail(SUMMARY_LABEL, where, 'an object');
  const prefix = `${where}.`;
  const raw = readObj(value, 'counts', prefix, SUMMARY_LABEL);
  const counts = Object.fromEntries(
    TS_CATEGORIES.map((c) => [c, readNumber(raw, c, `${prefix}counts.`, SUMMARY_LABEL)]),
  ) as Record<TsCategory, number>;
  const planned = readNumber(value, 'planned', prefix, SUMMARY_LABEL);
  const sum = TS_CATEGORIES.reduce((acc, c) => acc + counts[c], 0);
  if (sum !== planned) fail(SUMMARY_LABEL, `${prefix}counts`, `summing to planned (${planned}), got ${sum}`);
  return {
    planned,
    counts,
    optionsOnlyMismatches: readNumber(value, 'optionsOnlyMismatches', prefix, SUMMARY_LABEL),
    tsMs: readNumber(value, 'tsMs', prefix, SUMMARY_LABEL),
    oracleMs: readNumber(value, 'oracleMs', prefix, SUMMARY_LABEL),
  };
}

function parseTimeout(obj: Obj): number | null {
  const value = field(obj, 'timeoutMs', '', SUMMARY_LABEL);
  if (value === null) return null;
  return readNumber(obj, 'timeoutMs', '', SUMMARY_LABEL);
}

/** Throws naming both values when the TS sweep was compared against a different oracle or corpus. */
export function assertSameCommits(ts: CommitPair, oracle: CommitPair): void {
  for (const key of ['elkCommit', 'modelsCommit'] as const) {
    if (ts[key] !== oracle[key]) {
      throw new Error(`${SUMMARY_LABEL}: ${key} ${ts[key]} differs from the oracle summary's ${oracle[key]}`);
    }
  }
}

/**
 * Boundary validation of the TS sweep summary; throws on the first missing or mistyped field and when
 * an algorithm's counts do not sum to planned. With `oracle`, also requires the same elk and models commits.
 */
export function parseTsSummary(text: string, oracle?: CommitPair): TsSweepSummary {
  const value: unknown = JSON.parse(text);
  if (!isObj(value)) return fail(SUMMARY_LABEL, 'the document', 'an object');
  const byRaw = readObj(value, 'byAlgorithm', '', SUMMARY_LABEL);
  const summary: TsSweepSummary = {
    elkCommit: readString(value, 'elkCommit', '', SUMMARY_LABEL),
    modelsCommit: readString(value, 'modelsCommit', '', SUMMARY_LABEL),
    sweepDir: readString(value, 'sweepDir', '', SUMMARY_LABEL),
    node: readString(value, 'node', '', SUMMARY_LABEL),
    shards: readNumber(value, 'shards', '', SUMMARY_LABEL),
    timeoutMs: parseTimeout(value),
    wallMs: readNumber(value, 'wallMs', '', SUMMARY_LABEL),
    byAlgorithm: Object.fromEntries(Object.entries(byRaw).map(([id, v]) => [id, parseAlgorithm(id, v)])),
    findings: parseOutcomes(value, 'findings'),
    cases: parseOutcomes(value, 'cases'),
  };
  if (oracle !== undefined) assertSameCommits(summary, oracle);
  return summary;
}

const FINDINGS_LABEL = 'ts-findings.json';

function parseAnnotation(value: unknown, index: number): FindingAnnotation {
  const where = `[${index}].`;
  if (!isObj(value)) return fail(FINDINGS_LABEL, `[${index}]`, 'an object');
  const issue = readNumber(value, 'issue', where, FINDINGS_LABEL);
  if (!Number.isInteger(issue) || issue <= 0) fail(FINDINGS_LABEL, `${where}issue`, 'a positive integer');
  const note = readString(value, 'note', where, FINDINGS_LABEL);
  if (note === '' || /[\r\n]/.test(note) || note.length > MAX_NOTE_LENGTH) {
    fail(FINDINGS_LABEL, `${where}note`, `one non-empty line of at most ${MAX_NOTE_LENGTH} characters`);
  }
  return { caseId: readString(value, 'caseId', where, FINDINGS_LABEL), issue, note };
}

/** Boundary validation of ts-findings.json; rejects a duplicate caseId. */
export function parseFindings(text: string): FindingAnnotation[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) return fail(FINDINGS_LABEL, 'the document', 'an array');
  const seen = new Set<string>();
  return value.map((v, i) => {
    const annotation = parseAnnotation(v, i);
    if (seen.has(annotation.caseId)) {
      throw new Error(`${FINDINGS_LABEL}: duplicate caseId ${annotation.caseId}`);
    }
    seen.add(annotation.caseId);
    return annotation;
  });
}

function suffixOf(algorithm: string): string {
  return algorithm.startsWith(ELK_ALGORITHM_PREFIX) ? algorithm.slice(ELK_ALGORITHM_PREFIX.length) : algorithm;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function tsCells(entry: TsAlgorithmSummary): string[] {
  return [
    ...SWEEP_COLUMNS.map((c) => String(c === 'planned' ? entry.planned : entry.counts[c])),
    String(entry.optionsOnlyMismatches),
    String(Math.round(entry.tsMs)),
    String(Math.round(entry.oracleMs)),
  ];
}

/** The `TS conformant` cell: ok + both-throw out of planned minus excluded (TP4). */
export function tsConformantCell(entry: TsAlgorithmSummary | undefined): string {
  if (entry === undefined) return NOT_IN_TS_SWEEP_CELL;
  const compared = entry.planned - entry.counts.excluded;
  if (compared === 0) return NO_COMPARED_CELL;
  const conformant = entry.counts.ok + entry.counts['both-throw'];
  return `${conformant} / ${compared} (${((conformant / compared) * PERCENT).toFixed(1)}%)`;
}

export function tsHeaderLine(summary: TsSweepSummary): string {
  const timeout = summary.timeoutMs === null ? 'none' : `${summary.timeoutMs / MS_PER_SECOND} s`;
  const wall = Math.round(summary.wallMs / MS_PER_MINUTE);
  return `- TS sweep: ${summary.node}, ${summary.shards} shards, ${wall} min, timeout ${timeout}`;
}

/** Every algorithm named by the TS summary must exist in the oracle list, as for the oracle results. */
export function assertKnownAlgorithms(summary: TsSweepSummary, algorithms: readonly string[]): void {
  const known = new Set(algorithms);
  const named = [...Object.keys(summary.byAlgorithm), ...summary.findings.map((f) => f.algorithm)];
  for (const algorithm of named) {
    if (!known.has(algorithm)) {
      throw new Error(`TS summary algorithm ${algorithm} is not in the oracle algorithm list`);
    }
  }
}

function row(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function sweepTable(summary: TsSweepSummary): string[] {
  const header = ['algorithm (TS)', ...SWEEP_COLUMNS, 'options-only mismatches', 'TS ms', 'oracle ms'];
  const rows = Object.keys(summary.byAlgorithm)
    .sort(compareStrings)
    .map((id) => row([`\`${suffixOf(id)}\``, ...tsCells(summary.byAlgorithm[id] as TsAlgorithmSummary)]));
  return [row(header), row(header.map((_, i) => (i === 0 ? '---' : '---:'))), ...rows];
}

const BACKTICK = String.fromCharCode(96);

function longestBacktickRun(text: string): number {
  return Math.max(0, ...text.split(/[^\x60]+/).map((run) => run.length));
}

/** Inline code span that survives backticks, pipes and newlines inside the text. */
export function codeSpan(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  const fence = BACKTICK.repeat(longestBacktickRun(oneLine) + 1);
  const pad = oneLine.startsWith(BACKTICK) || oneLine.endsWith(BACKTICK) ? ' ' : '';
  return `${fence}${pad}${oneLine}${pad}${fence}`;
}

function plainText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/</g, '&lt;').replace(/\{/g, '&#123;');
}

function detailSpan(detail: string): string {
  const oneLine = detail.replace(/\s+/g, ' ').trim().slice(0, MAX_DETAIL_LENGTH);
  return codeSpan(oneLine === '' ? NO_DETAIL : oneLine);
}

function annotationText(annotation: FindingAnnotation | undefined): string {
  return annotation === undefined ? UNANNOTATED : `#${annotation.issue}: ${plainText(annotation.note)}`;
}

function findingLines(summary: TsSweepSummary, annotations: readonly FindingAnnotation[]): string[] {
  const byCase = new Map(annotations.map((a) => [a.caseId, a]));
  const sorted = [...summary.findings].sort(
    (a, b) => compareStrings(a.algorithm, b.algorithm) || compareStrings(a.caseId, b.caseId),
  );
  if (sorted.length === 0) return [NO_FINDINGS_LINE];
  return sorted.map(
    (f) => `- ${codeSpan(f.caseId)}: ${f.category}: ${detailSpan(f.detail)}: ${annotationText(byCase.get(f.caseId))}`,
  );
}

/** The `## TS sweep` and `## TS findings` sections (TP4), each followed by a blank line. */
export function tsSections(ts: TsReport): string[] {
  return [
    '## TS sweep',
    '',
    ...sweepTable(ts.summary),
    '',
    '## TS findings',
    '',
    ...findingLines(ts.summary, ts.annotations),
    '',
  ];
}
