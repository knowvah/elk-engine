// SPDX-License-Identifier: EPL-2.0

/**
 * Standalone snippets for functions lizard did not report in the whole file.
 *
 * A snippet is `function f(p0, p1) { <body> }`: parameters are replaced by
 * placeholder names (this removes the `readonly (A | B)[]` and `new X()`
 * default-value blind spots; the parameter *count* comes from the AST), and
 * regex literals become `/x/` (the quote-in-regex blind spot). A stripped
 * snippet additionally blanks every TypeScript-only construct and every expression parenthesis with spaces, so
 * line structure and NLOC are preserved (the generic-after-`:` blind spot; lizard also truncates a function at
 * `x = (call(...) + 1)`, so expression parentheses go too).
 */

import type { FileModel, FunctionInfo, TextRange } from './inventory.js';

/** Name every snippet function carries; the snippet holds exactly one. */
export const SNIPPET_FUNCTION_NAME = 'f';
const REGEX_PLACEHOLDER = '/x/';

interface Edit extends TextRange {
  readonly replacement: (original: string) => string;
}

/** Replaces every character except newlines with a space. */
export function blank(original: string): string {
  return original.replace(/[^\n]/g, ' ');
}

/** Keeps edits inside `within`, ordered, dropping any that overlap an earlier one. */
function usableEdits(edits: readonly Edit[], within: TextRange): Edit[] {
  const inside = edits.filter((e) => e.start >= within.start && e.end <= within.end);
  inside.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Edit[] = [];
  let lastEnd = -1;
  for (const e of inside) {
    if (e.start < lastEnd) continue;
    kept.push(e);
    lastEnd = e.end;
  }
  return kept;
}

/** Applies non-overlapping, ordered `edits` to `text.slice(within)`. */
export function applyEdits(text: string, within: TextRange, edits: readonly Edit[]): string {
  let out = '';
  let cursor = within.start;
  for (const e of usableEdits(edits, within)) {
    out += text.slice(cursor, e.start) + e.replacement(text.slice(e.start, e.end));
    cursor = e.end;
  }
  return out + text.slice(cursor, within.end);
}

function editsFor(model: FileModel, strip: boolean): Edit[] {
  const edits: Edit[] = model.regexRanges.map((r) => ({ ...r, replacement: () => REGEX_PLACEHOLDER }));
  if (strip) for (const r of model.strippableRanges) edits.push({ ...r, replacement: blank });
  return edits;
}

/** `(p0, p1)`, one per line when the original parameter list was multi-line. */
export function placeholderParams(fn: FunctionInfo): string {
  const names = Array.from({ length: fn.paramCount }, (_, i) => `p${i}`);
  return fn.paramsMultiline ? `(\n  ${names.join(',\n  ')},\n)` : `(${names.join(', ')})`;
}

/** Builds the standalone lizard-parsable snippet for `fn`. */
export function buildSnippet(model: FileModel, fn: FunctionInfo, strip: boolean): string {
  const body = applyEdits(model.text, fn.body, editsFor(model, strip));
  const wrapped = fn.bodyIsBlock ? body : `{ return (${body}); }`;
  return `function ${SNIPPET_FUNCTION_NAME}${placeholderParams(fn)} ${wrapped}\n`;
}

/** Copy of the file with each private `#` replaced by `_` (same offsets). */
export function sanitizePrivateNames(model: FileModel): string {
  const chars = model.text.split('');
  for (const at of model.privateHashOffsets) chars[at] = '_';
  return chars.join('');
}
