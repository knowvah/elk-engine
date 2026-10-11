// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hashCode } from './JavaString.js';

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
