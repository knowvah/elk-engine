// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compare } from './DoubleCompare.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/lang.json', import.meta.url);
const BITS_BYTES = 8;

interface LangVectors {
  readonly doubleCompare: readonly (readonly [string, string, number])[];
}

function fromBits(hex: string): number {
  const view = new DataView(new ArrayBuffer(BITS_BYTES));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as LangVectors;

describe('compare', () => {
  it('replays every JVM vector', () => {
    expect(vectors.doubleCompare.length).toBe(1024);
    for (const [a, b, expected] of vectors.doubleCompare) {
      expect(compare(fromBits(a), fromBits(b)), `${a} vs ${b}`).toBe(expected);
    }
  });

  it('orders -0.0 before 0.0', () => {
    expect(compare(-0, 0)).toBe(-1);
    expect(compare(0, -0)).toBe(1);
  });

  it('treats NaN as greatest and equal to itself', () => {
    expect(compare(NaN, Infinity)).toBe(1);
    expect(compare(Infinity, NaN)).toBe(-1);
    expect(compare(NaN, NaN)).toBe(0);
  });

  it('compares ordinary values and equal zeros', () => {
    expect(compare(1, 2)).toBe(-1);
    expect(compare(2, 1)).toBe(1);
    expect(compare(3, 3)).toBe(0);
    expect(compare(-0, -0)).toBe(0);
    expect(compare(0, 0)).toBe(0);
  });

  it('decodes the vector bit encoding', () => {
    expect(Object.is(fromBits('8000000000000000'), -0)).toBe(true);
  });
});
