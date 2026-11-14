// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (TP7, AD-4): every transcendental `Math.*` call in `src/`
 * is listed in `math-call-sites.json`.
 *
 * Java's `Math.sin` and kin may differ from `StrictMath` (and from V8) in the
 * last bit, so each call site is on the AD-4 known-divergences list, which
 * `docs/conformance.md` (`#math-call-sites`) documents row by row. This test
 * pins the multiset of `(file, fn)` pairs: a new call, or a removed one, fails
 * until the JSON (and the conformance table) is updated.
 *
 * Scanning rules: non-test `src/**\/*.ts`; comments and `'...'` / `"..."`
 * strings are blanked first, so text inside them is not a call; the
 * lookbehind keeps `JavaMath.log(` (the `StrictMath.log` shim) and
 * `obj.Math.sin(` from matching. Line numbers are not pinned.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const LIST_PATH = join(ROOT, 'test', 'architecture', 'math-call-sites.json');
const KEY_SEPARATOR = '::';

const MATH_CALL =
  /(?<![\w$.])Math\.(sin|cos|tan|asin|acos|atan|atan2|exp|log|log10|log1p|expm1|pow|sinh|cosh|tanh|hypot|cbrt)\(/g;
/** A quoted string (kept as is) or a comment (blanked). */
const STRING_OR_COMMENT = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

interface CallSite {
  readonly file: string;
  readonly fn: string;
  readonly javaSite: string;
}

interface Comparison {
  /** Found in the source, absent from the list (or more often than listed). */
  readonly unlisted: string[];
  /** Listed, absent from the source (or less often than listed). */
  readonly stale: string[];
}

const keyOf = (file: string, fn: string): string => `${file}${KEY_SEPARATOR}${fn}`;

/** Replaces comments and strings with blanks of the same length, keeping newlines. */
function blankCommentsAndStrings(source: string): string {
  return source.replace(STRING_OR_COMMENT, (match) => match.replace(/[^\n]/g, ' '));
}

/** The `fn` of every `Math.*` call in one source file, in order of appearance. */
function scanSource(source: string): string[] {
  return [...blankCommentsAndStrings(source).matchAll(MATH_CALL)].map((m) => m[1] as string);
}

function countKeys(keys: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

/** Multiset difference of `(file, fn)` keys in both directions; one message per surplus occurrence. */
function compareCallSites(found: readonly string[], listed: readonly string[]): Comparison {
  const foundCounts = countKeys(found);
  const listedCounts = countKeys(listed);
  const surplus = (a: Map<string, number>, b: Map<string, number>): string[] =>
    [...a].flatMap(([key, n]) => {
      const extra = n - (b.get(key) ?? 0);
      return extra > 0 ? [`${key.split(KEY_SEPARATOR).join(' Math.')} x${extra}`] : [];
    });
  return { unlisted: surplus(foundCounts, listedCounts), stale: surplus(listedCounts, foundCounts) };
}

/** Recursively collect non-test .ts files under dir. */
function collectSrc(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) return collectSrc(full);
    return ent.name.endsWith('.ts') && !ent.name.endsWith('.test.ts') ? [full] : [];
  });
}

function scanTree(): string[] {
  return collectSrc(SRC).flatMap((f) => {
    const rel = relative(ROOT, f).split('\\').join('/');
    return scanSource(readFileSync(f, 'utf8')).map((fn) => keyOf(rel, fn));
  });
}

function readList(): CallSite[] {
  return JSON.parse(readFileSync(LIST_PATH, 'utf8')) as CallSite[];
}

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

describe('fitness: non-strict Math call sites (AD-4 known-divergences list)', () => {
  it('self-check: scanning ignores comments, strings, JavaMath and member access', () => {
    const sample = [
      'const a = Math.sin(x) + Math.pow(2, 3);',
      '// Math.cos(y)',
      '/* Math.tan(y)',
      '   Math.exp(y) */',
      "const s = 'Math.log(z)';",
      'const t = JavaMath.log(z) + this.Math.asin(z);',
      'const u = Math.sqrt(4) + Math.max(1, 2) + Math.PI;',
      'const v = Math.atan2(1, 2) * Math.log10(3) + Math.log(4);',
    ].join('\n');
    expect(scanSource(sample)).toEqual(['sin', 'pow', 'atan2', 'log10', 'log']);
  });

  it('self-check: an extra Math.sin( in a fixture fails and names the file and sin', () => {
    const listed = [keyOf('src/a.ts', 'cos'), keyOf('src/b.ts', 'pow')];
    const found = [
      keyOf('src/a.ts', 'cos'),
      keyOf('src/b.ts', 'pow'),
      ...scanSource('x = Math.sin(y);').map((fn) => keyOf('src/a.ts', fn)),
    ];
    expect(compareCallSites(found, listed)).toEqual({ unlisted: ['src/a.ts Math.sin x1'], stale: [] });
  });

  it('self-check: a removed call and a repeated call are both reported', () => {
    const listed = [keyOf('src/a.ts', 'cos'), keyOf('src/b.ts', 'pow'), keyOf('src/b.ts', 'pow')];
    const found = [keyOf('src/b.ts', 'pow')];
    expect(compareCallSites(found, listed)).toEqual({
      unlisted: [],
      stale: ['src/a.ts Math.cos x1', 'src/b.ts Math.pow x1'],
    });
  });

  it('lists every call site found in src/, and nothing else', () => {
    const list = readList();
    const { unlisted, stale } = compareCallSites(
      scanTree(),
      list.map((e) => keyOf(e.file, e.fn)),
    );
    expect(
      unlisted,
      'New or more frequent Math.* call in src/. Add an entry to test/architecture/math-call-sites.json ' +
        'and a row to docs/conformance.md (#math-call-sites).',
    ).toEqual([]);
    expect(
      stale,
      'Listed Math.* call is gone from src/. Remove its entry from test/architecture/math-call-sites.json ' +
        'and its row from docs/conformance.md (#math-call-sites).',
    ).toEqual([]);
  });

  it('gives every entry a repo-relative file, a Math function and a Java site, sorted by file, fn, javaSite', () => {
    const list = readList();
    for (const e of list) {
      expect(e.file).toMatch(/^src\/.+\.ts$/);
      expect(e.fn).toMatch(/^[a-z0-9]+$/);
      expect(e.javaSite).toMatch(/^org\.eclipse\.elk\.[\w.]+\/src\/.+\.java:\d+$/);
    }
    const sorted = [...list].sort(
      (a, b) => compareStrings(a.file, b.file) || compareStrings(a.fn, b.fn) || compareStrings(a.javaSite, b.javaSite),
    );
    expect(list).toEqual(sorted);
  });
});
