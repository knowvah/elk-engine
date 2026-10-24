// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareTo, equalsIgnoreCase, hashCode, split, trim } from './JavaString.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/hash.json', import.meta.url);
const STRING_HASH_ROWS = 229;

interface HashVectors {
  readonly stringHash: readonly (readonly [string, number])[];
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as HashVectors;

describe('JavaString.hashCode vectors', () => {
  it('replays every JVM vector', () => {
    expect(vectors.stringHash.length).toBe(STRING_HASH_ROWS);
    for (const [s, expected] of vectors.stringHash) {
      expect(hashCode(s), JSON.stringify(s)).toBe(expected);
    }
  });
});

describe('JavaString.hashCode named cases', () => {
  it('is 0 for the empty string', () => {
    expect(hashCode('')).toBe(0);
  });

  it('computes s[0]*31^(n-1) + ... + s[n-1]', () => {
    expect(hashCode('abc')).toBe(96354);
  });

  it('wraps to int32 on overflow', () => {
    expect(hashCode('Hello, World!')).toBe(1498789909);
  });
});

describe('JavaString.compareTo', () => {
  it('returns the difference of the first differing code units', () => {
    expect(compareTo('a', 'c')).toBe(-2);
    expect(compareTo('c', 'a')).toBe(2);
    expect(compareTo('ab', 'ac')).toBe(-1);
  });

  it('returns the length difference when one string is a prefix of the other', () => {
    expect(compareTo('abcd', 'ab')).toBe(2);
    expect(compareTo('ab', 'abcd')).toBe(-2);
    expect(compareTo('', 'xyz')).toBe(-3);
  });

  it('returns 0 for equal strings', () => {
    expect(compareTo('z', 'z')).toBe(0);
    expect(compareTo('', '')).toBe(0);
  });

  it('compares UTF-16 code units, not code points', () => {
    // U+FF5E (one code unit) sorts after U+1F600 (surrogate pair starting at U+D83D)
    expect(compareTo(String.fromCharCode(0xff5e), String.fromCodePoint(0x1f600))).toBe(0xff5e - 0xd83d);
  });
});

describe('JavaString.split', () => {
  it('drops trailing empty strings but keeps leading and inner ones', () => {
    expect(split('a,b,,c,,', /,/u)).toEqual(['a', 'b', '', 'c']);
    expect(split(',a', /,/u)).toEqual(['', 'a']);
    expect(split(',,', /,/u)).toEqual([]);
  });

  it('returns the input itself when nothing matches', () => {
    expect(split('abc', /,/u)).toEqual(['abc']);
    expect(split('', /,/u)).toEqual(['']);
  });

  it('accepts a multi-character pattern', () => {
    expect(split(' 1.5 ;2 ; ', /[;]/u)).toEqual([' 1.5 ', '2 ', ' ']);
    expect(split('1;;2', /;+/u)).toEqual(['1', '2']);
  });
});

describe('JavaString.trim', () => {
  it('strips code units up to U+0020 from both ends', () => {
    expect(trim('  a b \t\n')).toBe('a b');
    expect(trim('\u0000\u001fx\u0001')).toBe('x');
  });

  it('leaves Unicode whitespace above U+0020 alone, unlike JS trim', () => {
    const wide = String.fromCharCode(0xa0, 0x61, 0x2003); // NBSP, 'a', EM SPACE
    expect(trim(wide)).toBe(wide);
    expect(wide.trim()).toBe('a');
  });

  it('returns the empty string for all-whitespace and empty input', () => {
    expect(trim('   ')).toBe('');
    expect(trim('')).toBe('');
  });
});

interface EqualsRow {
  readonly a: string;
  readonly b: string;
  readonly result: boolean;
}

const CHARACTER_URL = new URL('../../../test/golden/refs/java/character.json', import.meta.url);
const equalsRows = (JSON.parse(readFileSync(CHARACTER_URL, 'utf8')) as { equalsIgnoreCase: EqualsRow[] })
  .equalsIgnoreCase;

describe('JavaString.equalsIgnoreCase', () => {
  it('replays every recorded JVM row', () => {
    const mismatches = equalsRows.filter((r) => equalsIgnoreCase(r.a, r.b) !== r.result);
    expect(equalsRows.length).toBe(47);
    expect(mismatches).toEqual([]);
  });

  it('is false for a different number of code points', () => {
    expect(equalsIgnoreCase('abc', 'ab')).toBe(false);
    expect(equalsIgnoreCase('ab', 'abc')).toBe(false);
  });
});
