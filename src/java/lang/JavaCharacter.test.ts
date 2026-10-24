// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTER_TABLES, isLowerCase, isUpperCase, isWhitespace, toLowerCase, toUpperCase } from './JavaCharacter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/character.json', import.meta.url);
const BOUNDARY_URL = new URL('../../../test/golden/refs/java/regex-boundary.json', import.meta.url);
const UNIT_COUNT = 0x10000;
const REPLAY_BUDGET_MS = 1000;

type Pairs = readonly (readonly [number, number])[];

interface CharacterVectors {
  readonly isUpperCase: Pairs;
  readonly isLowerCase: Pairs;
  readonly isWhitespace: Pairs;
  readonly toUpperCase: Pairs;
  readonly toLowerCase: Pairs;
}

interface SupplementaryVectors {
  readonly supplementaryToUpperCase: Pairs;
  readonly supplementaryToLowerCase: Pairs;
}

const supplementary = JSON.parse(readFileSync(BOUNDARY_URL, 'utf8')) as SupplementaryVectors;
const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as CharacterVectors;

function inRanges(ranges: Pairs, c: number): boolean {
  return ranges.some(([s, e]) => c >= s && c <= e);
}

describe('JavaCharacter tables', () => {
  it('equal the recorded vectors', () => {
    expect(CHARACTER_TABLES.upperCase).toEqual(vectors.isUpperCase.flat());
    expect(CHARACTER_TABLES.lowerCase).toEqual(vectors.isLowerCase.flat());
    expect(CHARACTER_TABLES.whitespace).toEqual(vectors.isWhitespace.flat());
    expect(CHARACTER_TABLES.toUpperCase).toEqual(vectors.toUpperCase.flat());
    expect(CHARACTER_TABLES.toLowerCase).toEqual(vectors.toLowerCase.flat());
    expect(CHARACTER_TABLES.supplementaryToUpperCase).toEqual(supplementary.supplementaryToUpperCase.flat());
    expect(CHARACTER_TABLES.supplementaryToLowerCase).toEqual(supplementary.supplementaryToLowerCase.flat());
  });
});

describe('JavaCharacter replay', () => {
  it('matches every predicate over all 65,536 units in under 1 s', () => {
    const upper = new Uint8Array(UNIT_COUNT);
    const lower = new Uint8Array(UNIT_COUNT);
    const space = new Uint8Array(UNIT_COUNT);
    for (const [s, e] of vectors.isUpperCase) upper.fill(1, s, e + 1);
    for (const [s, e] of vectors.isLowerCase) lower.fill(1, s, e + 1);
    for (const [s, e] of vectors.isWhitespace) space.fill(1, s, e + 1);

    const start = performance.now();
    let bad = 0;
    for (let c = 0; c < UNIT_COUNT; c++) {
      if (isUpperCase(c) !== (upper[c] === 1)) bad++;
      if (isLowerCase(c) !== (lower[c] === 1)) bad++;
      if (isWhitespace(c) !== (space[c] === 1)) bad++;
    }
    const elapsed = performance.now() - start;

    expect(bad).toBe(0);
    expect(elapsed).toBeLessThan(REPLAY_BUDGET_MS);
  });

  it('maps every recorded unit and leaves all others unchanged', () => {
    const up = new Map(vectors.toUpperCase);
    const low = new Map(vectors.toLowerCase);
    let bad = 0;
    for (let c = 0; c < UNIT_COUNT; c++) {
      if (toUpperCase(c) !== (up.get(c) ?? c)) bad++;
      if (toLowerCase(c) !== (low.get(c) ?? c)) bad++;
    }
    expect(bad).toBe(0);
  });

  it('spot checks known units against the vector ranges', () => {
    expect(inRanges(vectors.isUpperCase, 0x41)).toBe(true);
    expect(isUpperCase(0x41)).toBe(true);
    expect(isLowerCase(0x41)).toBe(false);
    expect(isWhitespace(0xa0)).toBe(false);
    expect(isWhitespace(0x20)).toBe(true);
    expect(toUpperCase(0x61)).toBe(0x41);
    expect(toLowerCase(0x41)).toBe(0x61);
  });

  it('maps every recorded supplementary code point and leaves others unchanged', () => {
    for (const [c, m] of supplementary.supplementaryToUpperCase) expect(toUpperCase(c)).toBe(m);
    for (const [c, m] of supplementary.supplementaryToLowerCase) expect(toLowerCase(c)).toBe(m);
    expect(toLowerCase(0x10400)).toBe(0x10428);
    expect(toUpperCase(0x10428)).toBe(0x10400);
    expect(toUpperCase(0x1f600)).toBe(0x1f600);
    expect(toLowerCase(0x10ffff)).toBe(0x10ffff);
  });
});
