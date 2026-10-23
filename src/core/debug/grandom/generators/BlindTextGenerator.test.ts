// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BlindTextGenerator } from './BlindTextGenerator.js';

/** The Java blind text, spelled out independently of the implementation's constant. */
const BLIND_TEXT =
  'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore ' +
  'et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. ' +
  'Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
const CALLS = 50;
const MAX_LENGTH = 49;
/** 40 characters minus at most one trimmed blank at each end (the text has single blanks only). */
const MIN_TRIMMED_LENGTH = 38;

describe('BlindTextGenerator', () => {
  it('generates trimmed substrings of the blind text of length 38 to 49 (40 to 49 before the trim)', () => {
    const lengths = new Set<number>();
    for (let i = 0; i < CALLS; i++) {
      const text = BlindTextGenerator.generate();
      lengths.add(text.length);
      expect(BLIND_TEXT.includes(text)).toBe(true);
      expect(text).toBe(text.trim());
      expect(text.length).toBeGreaterThanOrEqual(MIN_TRIMMED_LENGTH);
      expect(text.length).toBeLessThanOrEqual(MAX_LENGTH);
    }
    // the draws are unseeded, so a single repeated length over 50 calls would mean a constant result
    expect(lengths.size).toBeGreaterThan(1);
  });
});
