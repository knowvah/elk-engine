// SPDX-License-Identifier: EPL-2.0

/** Pure limit checks and report formatting; no I/O. */

import type { Measured } from './measure.js';

/** Thresholds from `rules/code-principles.md` (a violation is strictly greater). */
export const LIMITS = { nloc: 30, ccn: 10, params: 5, fileLines: 500 } as const;

export interface FunctionViolation {
  readonly measured: Measured;
  /** One entry per exceeded metric, e.g. `NLOC 35 > 30`. */
  readonly reasons: readonly string[];
}

export interface FileViolation {
  readonly file: string;
  readonly lines: number;
}

/** Number of lines in `text`, counting a final unterminated line. */
export function countLines(text: string): number {
  if (text === '') return 0;
  const newlines = text.split('\n').length - 1;
  return text.endsWith('\n') ? newlines : newlines + 1;
}

function reasonsFor(m: Measured): string[] {
  const reasons: string[] = [];
  if (m.nloc > LIMITS.nloc) reasons.push(`NLOC ${m.nloc} > ${LIMITS.nloc}`);
  if (m.ccn > LIMITS.ccn) reasons.push(`CCN ${m.ccn} > ${LIMITS.ccn}`);
  if (m.params > LIMITS.params) reasons.push(`params ${m.params} > ${LIMITS.params}`);
  return reasons;
}

/** Functions over any limit, ordered by file then line. */
export function findFunctionViolations(measured: readonly Measured[]): FunctionViolation[] {
  const found = measured.map((m) => ({ measured: m, reasons: reasonsFor(m) })).filter((v) => v.reasons.length > 0);
  return found.sort(
    (a, b) => a.measured.file.localeCompare(b.measured.file) || a.measured.fn.startLine - b.measured.fn.startLine,
  );
}

/** Files longer than the limit; `lineCounts` maps file to its line count. */
export function findFileViolations(lineCounts: ReadonlyMap<string, number>): FileViolation[] {
  return [...lineCounts]
    .filter(([, lines]) => lines > LIMITS.fileLines)
    .map(([file, lines]) => ({ file, lines }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function formatViolation(v: FunctionViolation): string {
  const { file, fn, method } = v.measured;
  return `${file}:${fn.startLine}  ${fn.name}  ${v.reasons.join(', ')}  [${method}]`;
}

export function formatMeasured(m: Measured): string {
  return `${m.file}:${m.fn.startLine}  ${m.fn.name}  NLOC ${m.nloc}, CCN ${m.ccn}, params ${m.params}`;
}

export function formatFileViolation(v: FileViolation): string {
  return `${v.file}  ${v.lines} lines > ${LIMITS.fileLines}`;
}

export interface Summary {
  readonly files: number;
  readonly inventory: number;
  readonly direct: number;
  readonly snippet: number;
  readonly snippetStripped: number;
  readonly ast: number;
}

export function summarize(files: number, measured: readonly Measured[]): Summary {
  const count = (method: Measured['method']) => measured.filter((m) => m.method === method).length;
  return {
    files,
    inventory: measured.length,
    direct: count('direct'),
    snippet: count('snippet'),
    snippetStripped: count('snippet-stripped'),
    ast: count('ast'),
  };
}

export function formatSummary(s: Summary): string {
  return (
    `files: ${s.files}  functions: ${s.inventory}  measured directly: ${s.direct}  ` +
    `via snippet: ${s.snippet}  via stripped snippet: ${s.snippetStripped}  via AST only: ${s.ast}`
  );
}
