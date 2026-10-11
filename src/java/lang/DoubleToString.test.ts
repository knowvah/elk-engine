// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toString } from './DoubleToString.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/text.json', import.meta.url);
const BITS_BYTES = 8;
const EXPECTED_ROWS = 14939;

type BitsRow = readonly [string, string];

interface TextVectors {
  readonly toString: readonly BitsRow[];
}

function fromBits(hex: string): number {
  const view = new DataView(new ArrayBuffer(BITS_BYTES));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as TextVectors;

describe('Double toString', () => {
  it('replays every JVM vector', () => {
    expect(vectors.toString.length).toBe(EXPECTED_ROWS);
    for (const [bits, expected] of vectors.toString) {
      expect(toString(fromBits(bits)), bits).toBe(expected);
    }
  });

  it.each([
    [Number.MIN_VALUE, '4.9E-324'],
    [1e23, '1.0E23'],
    [100, '100.0'],
    [0.001, '0.001'],
    [1e-4, '1.0E-4'],
    [1e7, '1.0E7'],
    [-0, '-0.0'],
    [0, '0.0'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
    [Number.NEGATIVE_INFINITY, '-Infinity'],
    [-12.3, '-12.3'],
    [0.0123, '0.0123'],
    [12300, '12300.0'],
    [Number.MAX_VALUE, '1.7976931348623157E308'],
  ])('formats %s as %s', (value, expected) => {
    expect(toString(value)).toBe(expected);
  });
});
