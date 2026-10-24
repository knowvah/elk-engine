// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../lang/UnsupportedOperationException.js';
import { Pattern } from './Pattern.js';

const VECTORS_URL = new URL('../../../../test/golden/refs/java/regex.json', import.meta.url);
const EXPECTED_ROWS = 5044;
const FLAGS_FUZZY = 34;

interface Row {
  readonly regex: string;
  readonly flags: number;
  readonly text: string;
  readonly found: boolean;
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { rows: Row[] }).rows;

describe('Pattern vectors', () => {
  it('replays every recorded row', () => {
    const cache = new Map<string, Pattern>();
    const mismatches: string[] = [];
    for (const row of rows) {
      const key = `${row.flags}:${row.regex}`;
      let p = cache.get(key);
      if (p === undefined) {
        p = Pattern.compile(row.regex, row.flags);
        cache.set(key, p);
      }
      if (p.matcher(row.text).find() !== row.found) {
        mismatches.push(`${key} on ${JSON.stringify(row.text)}`);
      }
    }
    expect(rows.length).toBe(EXPECTED_ROWS);
    expect(mismatches).toEqual([]);
  });
});

describe('Pattern', () => {
  it('has the Javadoc flag values', () => {
    expect(Pattern.CASE_INSENSITIVE).toBe(2);
    expect(Pattern.DOTALL).toBe(32);
    expect(FLAGS_FUZZY).toBe(Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
  });

  it('quotes plain text and rewrites embedded \\E', () => {
    expect(Pattern.quote('abc')).toBe('\\Qabc\\E');
    expect(Pattern.quote('a\\Eb')).toBe('\\Qa\\E\\\\E\\Qb\\E');
    expect(Pattern.quote('')).toBe('\\Q\\E');
  });

  it('matches text containing \\E through a quoted pattern', () => {
    const p = Pattern.compile(Pattern.quote('a\\Eb'));
    expect(p.matcher('a\\Eb').find()).toBe(true);
    expect(p.matcher('aEb').find()).toBe(false);
  });

  it('escapes regexp metacharacters in quotes', () => {
    const p = Pattern.compile(Pattern.quote('a.b(c)'));
    expect(p.matcher('xa.b(c)y').find()).toBe(true);
    expect(p.matcher('axb(c)').find()).toBe(false);
  });

  it('is case sensitive without the flag and ASCII-only with it', () => {
    expect(Pattern.compile('\\Qfoo\\E').matcher('FOO').find()).toBe(false);
    const ci = Pattern.compile('\\Qfoo\\E', Pattern.CASE_INSENSITIVE);
    expect(ci.matcher('FoO').find()).toBe(true);
    const nonAscii = Pattern.compile('\\Qé\\E', Pattern.CASE_INSENSITIVE);
    expect(nonAscii.matcher('É').find()).toBe(false);
  });

  it('treats an unterminated quote as running to the end', () => {
    expect(Pattern.compile('\\Qab').matcher('xab').find()).toBe(true);
  });

  it('exposes pattern and flags and accepts DOTALL', () => {
    const p = Pattern.compile('\\Qa\\E', Pattern.DOTALL);
    expect(p.pattern()).toBe('\\Qa\\E');
    expect(p.flags()).toBe(32);
  });

  it('throws UnsupportedOperationException for unsupported constructs', () => {
    expect(() => Pattern.compile('a.b')).toThrow(UnsupportedOperationException);
    expect(() => Pattern.compile('\\Qa\\E(')).toThrow(/Unsupported regex construct/);
    expect(() => Pattern.compile('[\\h\\v]')).toThrow(UnsupportedOperationException);
    expect(() => Pattern.compile('\\Qa\\E', 1)).toThrow(/flags: 1/);
  });
});

describe('Pattern word boundary', () => {
  it('treats a combining mark after a word character as part of the word', () => {
    const p = Pattern.compile('\\b\\Qi̇\\E\\b');
    expect(p.matcher('xx i̇ yy').find()).toBe(true);
    expect(p.matcher('xxi̇').find()).toBe(false);
  });
});
