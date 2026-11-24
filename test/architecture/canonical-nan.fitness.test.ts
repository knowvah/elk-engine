// SPDX-License-Identifier: EPL-2.0

/**
 * Fitness function (issue #72, ruling #53): no layout comparison encodes a double by its raw NaN bits.
 *
 * The JVM gives a computed NaN either sign bit (`7ff8…` or `fff8…`), by interpreted or compiled code, so the oracle
 * cannot reproduce a NaN's raw bits against itself. Every recorder, sweep hasher and port-side helper that turns a
 * layout double into bits therefore uses `Double.doubleToLongBits` (the recorders) or `canonicalHex` of
 * `test/helpers/double-hex.ts` (the port), which write every NaN as `7ff8000000000000` and leave every other value
 * its raw bits. `docs/conformance.md` (section 2) states the rule.
 *
 * Scanning rules: `doubleToRawLongBits` in any `tools/**\/*.java`; `doubleToRawLongBits` or `setFloat64(` in any
 * `test/**\/*.ts` and any `src/**\/*.test.ts` outside `src/java/` (the shim and its JVM vector tests, where the raw
 * bits are the behaviour). A comment counts: a header that still names the raw call misstates the encoding. Files in
 * {@link ALLOWED} are exempt, each with its reason; an entry that no longer matches is stale and fails.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JAVA_PATTERN = /doubleToRawLongBits/;
const TS_PATTERN = /doubleToRawLongBits|setFloat64\(/;
const SHIM_DIR = 'src/java/';

interface Allowed {
  readonly file: string;
  readonly reason: string;
}

/** The files that may name a raw encoder. Keep each reason true: a file that stops matching must leave the list. */
const ALLOWED: readonly Allowed[] = [
  {
    file: 'tools/vectors/JavaVectors.java',
    reason: 'JDK shim vectors (hash.json, numeric.json, lang.json): doubleToRawLongBits is the behaviour under test',
  },
  {
    file: 'tools/vectors/CoreJdkVectors.java',
    reason: 'JDK shim vectors of the core mission: raw bits of JDK results, no layout output',
  },
  {
    file: 'src/core/comments/AggregatedMatchDecider.test.ts',
    reason:
      "replays stream-sum.json, a JDK vector; its encoder writes a NaN as the text 'NaN', so no sign bit is compared",
  },
  {
    file: 'test/helpers/double-hex.test.ts',
    reason: 'proves the sign fixture of the NaN tests carries the sign bit, which only the raw bits can show',
  },
  {
    file: 'test/architecture/canonical-nan.fitness.test.ts',
    reason: 'this test: it names the patterns it scans for',
  },
];

interface Offence {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** The 1-based lines of `source` that match `pattern`, comments included. */
function rawEncoderLines(source: string, pattern: RegExp): { line: number; text: string }[] {
  return source
    .split('\n')
    .flatMap((text, index) => (pattern.test(text) ? [{ line: index + 1, text: text.trim() }] : []));
}

/** Every file under `dir` (repository-relative, `/` separators) that `keep` accepts; dot directories are skipped. */
function collect(dir: string, keep: (relativePath: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      return entry.name.startsWith('.') || entry.name === 'node_modules' ? [] : collect(child, keep);
    }
    return keep(child) ? [child] : [];
  });
}

function scan(files: readonly string[], pattern: RegExp): Offence[] {
  return files.flatMap((file) =>
    rawEncoderLines(readFileSync(join(ROOT, file), 'utf8'), pattern).map((hit) => ({ file, ...hit })),
  );
}

const javaFiles = (): string[] => collect('tools', (file) => file.endsWith('.java'));
const tsFiles = (): string[] => [
  ...collect('test', (file) => file.endsWith('.ts')),
  ...collect('src', (file) => file.endsWith('.test.ts') && !file.startsWith(SHIM_DIR)),
];

const allowedFiles: ReadonlySet<string> = new Set(ALLOWED.map((entry) => entry.file));
const notAllowed = (offences: readonly Offence[]): string[] =>
  offences.filter((o) => !allowedFiles.has(o.file)).map((o) => `${o.file}:${o.line}: ${o.text}`);

describe('fitness: one canonical NaN across layout comparisons (issue #72)', () => {
  it('self-check: a raw call is found in code and in a comment, the canonical call is not', () => {
    const java = [
      'static String hex(double d) {',
      '    return String.format("%016x", Double.doubleToLongBits(d));',
      '}',
      '// Numbers: Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded',
      'long bits = Double.doubleToRawLongBits(d);',
    ].join('\n');
    expect(rawEncoderLines(java, JAVA_PATTERN).map((hit) => hit.line)).toEqual([4, 5]);
  });

  it('self-check: a DataView encoder and the raw shim call are found, canonicalHex and a decoder are not', () => {
    const ts = [
      'const a = canonicalHex(value);',
      'view.setBigUint64(0, BigInt(`0x${hex}`));',
      'view.setFloat64(0, value);',
      'const b = doubleToLongBits(value);',
      'const c = doubleToRawLongBits(value);',
    ].join('\n');
    expect(rawEncoderLines(ts, TS_PATTERN)).toEqual([
      { line: 3, text: 'view.setFloat64(0, value);' },
      { line: 5, text: 'const c = doubleToRawLongBits(value);' },
    ]);
  });

  it('self-check: an offence outside the allowlist is reported with file, line and text', () => {
    const offences: Offence[] = [
      { file: 'tools/vectors/JavaVectors.java', line: 7, text: 'allowed' },
      { file: 'tools/vectors/DiscoVectors.java', line: 1845, text: 'Double.doubleToRawLongBits(d)' },
    ];
    expect(notAllowed(offences)).toEqual(['tools/vectors/DiscoVectors.java:1845: Double.doubleToRawLongBits(d)']);
  });

  it('no recorder or sweep under tools/ names doubleToRawLongBits outside the JDK shim recorders', () => {
    expect(
      notAllowed(scan(javaFiles(), JAVA_PATTERN)),
      'encode a layout double with Double.doubleToLongBits (NaN canonical, issue #72)',
    ).toEqual([]);
  });

  it('no port-side helper or test encodes a double by raw bits', () => {
    expect(
      notAllowed(scan(tsFiles(), TS_PATTERN)),
      'encode a layout double with canonicalHex of test/helpers/double-hex.ts (NaN canonical, issue #72)',
    ).toEqual([]);
  });

  it('every allowlist entry exists, still matches and gives a reason', () => {
    const matching = new Set([...scan(javaFiles(), JAVA_PATTERN), ...scan(tsFiles(), TS_PATTERN)].map((o) => o.file));
    const scanned = new Set([...javaFiles(), ...tsFiles()]);
    expect(ALLOWED.filter((entry) => !scanned.has(entry.file)).map((entry) => entry.file)).toEqual([]);
    expect(ALLOWED.filter((entry) => !matching.has(entry.file)).map((entry) => entry.file)).toEqual([]);
    expect(ALLOWED.filter((entry) => entry.reason.trim() === '').map((entry) => entry.file)).toEqual([]);
  });
});
