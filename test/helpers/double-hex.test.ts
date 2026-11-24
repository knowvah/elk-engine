// SPDX-License-Identifier: EPL-2.0
// The canonical NaN of every layout comparison (issue #72, D4): both NaN signs, payload NaNs and signalling NaNs encode alike, and
// every non-NaN value keeps its raw bits. The expected digits are the JVM's: `Double.doubleToLongBits` maps each NaN pattern below to
// 7ff8000000000000 (the `doubleToLongBits` rows of test/golden/refs/java/hash.json, replayed by src/java/lang/JavaDouble.test.ts).
import { describe, expect, it } from 'vitest';
import { doubleToRawLongBits, longBitsToDouble } from '../../src/java/lang/JavaDouble.js';
import { CANONICAL_NAN_HEX, canonicalHex, NEGATIVE_NAN } from './double-hex.js';

const fromBits = (hex: string): number => longBitsToDouble(BigInt(`0x${hex}`));

describe('canonicalHex', () => {
  it('names the canonical NaN of Double.doubleToLongBits', () => {
    expect(CANONICAL_NAN_HEX).toBe('7ff8000000000000');
  });

  it.each([
    ['the positive quiet NaN', '7ff8000000000000'],
    ['the negative quiet NaN', 'fff8000000000000'],
    ['a payload NaN', '7ff8dead0000beef'],
    ['a signalling NaN', '7ff0000000000001'],
    ['the all-ones NaN', 'ffffffffffffffff'],
  ])('encodes %s as the canonical NaN', (_name, bits) => {
    const value = fromBits(bits);
    expect(Number.isNaN(value)).toBe(true);
    expect(canonicalHex(value)).toBe(CANONICAL_NAN_HEX);
  });

  it.each([
    ['0.0', 0.0, '0000000000000000'],
    ['-0.0', -0.0, '8000000000000000'],
    ['Infinity', Infinity, '7ff0000000000000'],
    ['-Infinity', -Infinity, 'fff0000000000000'],
    ['Double.MIN_VALUE', Number.MIN_VALUE, '0000000000000001'],
    ['1.5', 1.5, '3ff8000000000000'],
  ])('keeps the raw bits of %s', (_name, value, bits) => {
    expect(canonicalHex(value)).toBe(bits);
  });

  it('has a sign fixture whose raw bits differ from the canonical NaN, so the sign tests exercise the sign bit', () => {
    expect(BigInt.asUintN(64, doubleToRawLongBits(NEGATIVE_NAN)).toString(16)).toBe('fff8000000000000');
    expect(canonicalHex(NEGATIVE_NAN)).toBe(CANONICAL_NAN_HEX);
    expect(canonicalHex(-NaN)).toBe(CANONICAL_NAN_HEX);
  });

  it('gives the bits a decoder turns back into the same value', () => {
    for (const value of [0.1, -2.5e-300, 1.7976931348623157e308, -0.0]) {
      expect(Object.is(fromBits(canonicalHex(value)), value)).toBe(true);
    }
  });
});
