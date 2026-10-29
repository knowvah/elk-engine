// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hashCode, MAX_VALUE, MIN_VALUE, reverse, sameValueOfBox, valueOf } from './JavaInteger.js';
import { NumberFormatException } from './NumberFormatException.js';

const HASH_URL = new URL('../../../test/golden/refs/java/hash.json', import.meta.url);
const TEXT_URL = new URL('../../../test/golden/refs/java/text.json', import.meta.url);
const REVERSE_ROWS = 36;
const VALUE_OF_ROWS = 33;

interface Throws {
  readonly throws: string;
  readonly message: string;
}
type ValueOfRow = readonly [string, number | Throws];

const hashVectors = JSON.parse(readFileSync(HASH_URL, 'utf8')) as {
  readonly integerReverse: readonly (readonly [number, number])[];
};
const textVectors = JSON.parse(readFileSync(TEXT_URL, 'utf8')) as {
  readonly integerValueOf: readonly ValueOfRow[];
};

describe('JavaInteger vectors', () => {
  it('replays every reverse vector', () => {
    expect(hashVectors.integerReverse.length).toBe(REVERSE_ROWS);
    for (const [i, expected] of hashVectors.integerReverse) {
      expect(reverse(i), `reverse(${i})`).toBe(expected);
    }
  });

  it('replays every valueOf vector', () => {
    expect(textVectors.integerValueOf.length).toBe(VALUE_OF_ROWS);
    for (const [input, expected] of textVectors.integerValueOf) {
      if (typeof expected === 'number') {
        expect(valueOf(input), JSON.stringify(input)).toBe(expected);
        continue;
      }
      expect(expected.throws).toBe('NumberFormatException');
      let caught: unknown;
      try {
        valueOf(input);
      } catch (e) {
        caught = e;
      }
      expect(caught, JSON.stringify(input)).toBeInstanceOf(NumberFormatException);
      expect((caught as NumberFormatException).message).toBe(expected.message);
    }
  });
});

describe('JavaInteger named cases', () => {
  it('exposes the int range', () => {
    expect(MIN_VALUE).toBe(-2147483648);
    expect(MAX_VALUE).toBe(2147483647);
  });

  it('sameValueOfBox is value equality inside the valueOf cache and false outside it', () => {
    // Integer.valueOf(int) Javadoc: values in -128..127 inclusive are always cached.
    expect(sameValueOfBox(-128, -128)).toBe(true);
    expect(sameValueOfBox(127, 127)).toBe(true);
    expect(sameValueOfBox(0, 0)).toBe(true);
    expect(sameValueOfBox(-129, -129)).toBe(false);
    expect(sameValueOfBox(128, 128)).toBe(false);
    expect(sameValueOfBox(5, 6)).toBe(false);
  });

  it('hashCode is the value itself', () => {
    expect(hashCode(-42)).toBe(-42);
  });

  it('maps digits from a later Nd block by offset from its zero', () => {
    expect(valueOf('\u{1D7D8}\u{1D7DF}')).toBe(7); // MATHEMATICAL DOUBLE-STRUCK 0, 7
  });

  it('rejects a non-digit with the JVM message', () => {
    expect(() => valueOf('x')).toThrow(new NumberFormatException('For input string: "x"'));
  });
});
