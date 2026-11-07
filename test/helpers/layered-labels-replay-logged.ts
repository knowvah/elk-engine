// SPDX-License-Identifier: EPL-2.0
// The G3 comparator for the graphs logged through `BasicProgressMonitor.logGraph`, in the shape the recorder writes
// (LayeredLabelsVectors.java `logged`): `{ tags, dot, json }`, one entry per logged DOT/JSON pair, `tags[i]` the shared tag.
// DOT is compared line by line, exactly. The Java JSON debug output is NOT valid JSON (`},,` occurs), so it is compared as
// text: the lines of a `"properties": {` block are an unordered multiset of entry lines (the trailing comma is stripped
// first: the last entry has none and the order decides which one that is), every other line is exact and in order. Both
// comparators take an optional `normalize` applied to both texts first (default identity). `compareLogged`, the G3 entry
// point, defaults to `normalizeIdentityHashes` (decision G3a, user, 2026-11-06): the Java prints identity hashes, which are
// all 1 under the oracle's `-XX:hashCode=2`, while the port prints the `identityHashCode` shim's values. A difference is
// reported as its first line number and both texts.

/** The logged graphs of a run: tags, DOT strings and JSON strings, parallel lists in log order. */
export interface Logged {
  readonly tags: readonly string[];
  readonly dot: readonly string[];
  readonly json: readonly string[];
}

/** Text rewriting applied to both sides before comparing. */
export type Normalize = (text: string) => string;
export const IDENTITY: Normalize = (text) => text;

/** The placeholder every identity-hash token becomes. */
export const HASH_PLACEHOLDER = 'H';
/** DOT node ids and edge sources: `node.hashCode()` at a line start (`DotDebugUtil.java:109,135,170,225`). */
const DOT_SOURCE_HASH = /^(\s*)\d+(?=\[| ?->)/gm;
/** DOT edge targets: `-> <hashCode>` / `-><hashCode>` (`DotDebugUtil.java:112,142,226`). */
const DOT_TARGET_HASH = /(-> ?)\d+/g;
/** JSON ids `"n"`/`"e"`/`"p"` + `hashCode()` (`JsonDebugUtil.java:102,117,118,162,178,179,425,475-479,541`); the segment and
 * hypernode graphs' `"e" + edgeId++` counters share the shape and are normalised with them. */
const JSON_ID_HASH = /("(?:id|source|target|sourcePort|targetPort)": ")[nep]\d+"/g;
/** `Object.toString()`: `<class name>@<hex hashCode>` (`JsonDebugUtil.java:611`). */
const OBJECT_TO_STRING_HASH = /([\w$]@)[0-9a-f]+\b/g;

/** Decision G3a: every identity-hash token of a DOT or JSON debug string becomes `H`. */
export const normalizeIdentityHashes: Normalize = (text) =>
  text
    .replace(DOT_SOURCE_HASH, `$1${HASH_PLACEHOLDER}`)
    .replace(DOT_TARGET_HASH, `$1${HASH_PLACEHOLDER}`)
    .replace(JSON_ID_HASH, (_match, key: string) => `${key}${HASH_PLACEHOLDER}"`)
    .replace(OBJECT_TO_STRING_HASH, `$1${HASH_PLACEHOLDER}`);

const PROPERTIES_OPEN = '"properties": {';
const BLOCK_CLOSE = '}';
const NEWLINE = '\n';
const TRAILING_COMMA = /,$/;

const show = (line: string | undefined): string => (line === undefined ? '(none)' : JSON.stringify(line));

/** Compares two DOT strings exactly; returns the first differing line (1-based), or nothing. */
export function compareDotLogged(actual: string, expected: string, normalize: Normalize = IDENTITY): string[] {
  const a = normalize(actual).split(NEWLINE);
  const e = normalize(expected).split(NEWLINE);
  const at = Array.from({ length: Math.max(a.length, e.length) }, (_, i) => i).find((i) => a[i] !== e[i]);
  return at === undefined ? [] : [`line ${String(at + 1)}: ${show(a[at])} != ${show(e[at])}`];
}

const opensProperties = (line: string | undefined): boolean => line?.trim().endsWith(PROPERTIES_OPEN) === true;

/** The entry lines after the opener at `from` up to (excluding) the closing brace, and the index after the closer. */
function readBlock(lines: readonly string[], from: number): { entries: string[]; next: number } {
  const entries: string[] = [];
  let i = from + 1;
  while (i < lines.length && !lines[i]!.trim().startsWith(BLOCK_CLOSE)) {
    entries.push(lines[i]!);
    i++;
  }
  return { entries, next: i };
}

const stripped = (entry: string): string => entry.trim().replace(TRAILING_COMMA, '');

/** The first entry of `from` that `against` does not hold as often (multiset difference), or `undefined`. */
function firstSurplus(
  from: readonly string[],
  against: readonly string[],
): { text: string; index: number } | undefined {
  const counts = new Map<string, number>();
  against.forEach((entry) => counts.set(stripped(entry), (counts.get(stripped(entry)) ?? 0) + 1));
  for (const [index, entry] of from.entries()) {
    const left = counts.get(stripped(entry)) ?? 0;
    if (left === 0) {
      return { text: entry, index };
    }
    counts.set(stripped(entry), left - 1);
  }
  return undefined;
}

function compareBlocks(a: readonly string[], e: readonly string[], aStart: number, eStart: number): string[] {
  const expectedOnly = firstSurplus(e, a);
  const actualOnly = firstSurplus(a, e);
  if (expectedOnly === undefined && actualOnly === undefined) {
    return [];
  }
  const where = String((expectedOnly === undefined ? aStart + actualOnly!.index : eStart + expectedOnly.index) + 1);
  return [`line ${where} (properties): ${show(actualOnly?.text)} != ${show(expectedOnly?.text)}`];
}

/**
 * Compares two JSON debug strings as text under the G3 rule; returns the first difference (empty when equal).
 * Line numbers are the 1-based line of the expected text (of the actual text when only the actual side has the line).
 */
export function compareJsonLogged(actual: string, expected: string, normalize: Normalize = IDENTITY): string[] {
  const a = normalize(actual).split(NEWLINE);
  const e = normalize(expected).split(NEWLINE);
  let ai = 0;
  let ei = 0;
  while (ai < a.length || ei < e.length) {
    if (opensProperties(a[ai]) && opensProperties(e[ei])) {
      const blockA = readBlock(a, ai);
      const blockE = readBlock(e, ei);
      const diff = compareBlocks(blockA.entries, blockE.entries, ai + 1, ei + 1);
      if (diff.length > 0) {
        return diff;
      }
      ai = blockA.next;
      ei = blockE.next;
    } else if (a[ai] === e[ei]) {
      ai++;
      ei++;
    } else {
      return [`line ${String(Math.min(ai, ei) + 1)}: ${show(a[ai])} != ${show(e[ei])}`];
    }
  }
  return [];
}

function compareList(
  format: string,
  actual: readonly string[],
  expected: readonly string[],
  compare: (a: string, e: string) => string[],
): string[] {
  if (actual.length !== expected.length) {
    return [`${format}: ${String(actual.length)} logged graphs, expected ${String(expected.length)}`];
  }
  return actual.flatMap((item, i) => compare(item, expected[i]!).map((diff) => `${format}[${String(i)}] ${diff}`));
}

function compareTags(actual: readonly string[], expected: readonly string[]): string[] {
  const exact = (a: string, e: string): string[] => (a === e ? [] : [`${show(a)} != ${show(e)}`]);
  return compareList('tags', actual, expected, exact);
}

/**
 * Compares the logged graphs of a run with a row's `expected.logged`: tags exactly, list lengths exactly, then each DOT and
 * JSON element (the returned strings name the format, index and first differing line; empty when equal).
 */
export function compareLogged(
  actual: Logged,
  expected: Logged,
  normalize: Normalize = normalizeIdentityHashes,
): string[] {
  return [
    ...compareTags(actual.tags, expected.tags),
    ...compareList('dot', actual.dot, expected.dot, (a, e) => compareDotLogged(a, e, normalize)),
    ...compareList('json', actual.json, expected.json, (a, e) => compareJsonLogged(a, e, normalize)),
  ];
}
