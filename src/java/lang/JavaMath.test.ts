// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { d2i, d2l, floorDiv, floorMod, round, roundFloat, roundToLong } from './JavaMath.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/lang.json', import.meta.url);
const BITS_BYTES = 8;
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;
const LONG_MAX = 9223372036854775807n;
const LONG_MIN = -9223372036854775808n;

type BitsRow = readonly [string, string];
type BitsIntRow = readonly [string, number];
type TripleRow = readonly [number, number, number];

interface LangVectors {
  readonly round: readonly BitsRow[];
  readonly roundFloat: readonly BitsIntRow[];
  readonly floorDiv: readonly TripleRow[];
  readonly floorMod: readonly TripleRow[];
  readonly d2i: readonly BitsIntRow[];
  readonly d2l: readonly BitsRow[];
}

function fromBits(hex: string): number {
  const view = new DataView(new ArrayBuffer(BITS_BYTES));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as LangVectors;

describe('roundToLong', () => {
  it('replays every JVM vector', () => {
    expect(vectors.round.length).toBe(52);
    for (const [bits, expected] of vectors.round) {
      expect(roundToLong(fromBits(bits)), bits).toBe(BigInt(expected));
    }
  });
});

describe('round', () => {
  it('matches the vectors where the result is a safe integer, else throws RangeError', () => {
    let safe = 0;
    let unsafe = 0;
    for (const [bits, expected] of vectors.round) {
      const x = fromBits(bits);
      const big = BigInt(expected);
      if (big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER)) {
        expect(BigInt(round(x)), bits).toBe(big);
        safe++;
      } else {
        expect(() => round(x), bits).toThrow(RangeError);
        unsafe++;
      }
    }
    expect(safe).toBeGreaterThan(0);
    expect(unsafe).toBeGreaterThan(0);
  });

  it('handles the named Java cases', () => {
    expect(round(0.49999999999999994)).toBe(0);
    expect(round(-2.5)).toBe(-2);
    expect(round(2.5)).toBe(3);
    expect(round(-0.5)).toBe(0);
    expect(Object.is(round(-0), 0)).toBe(true);
    expect(round(NaN)).toBe(0);
  });
});

describe('roundFloat', () => {
  it('replays every JVM vector', () => {
    expect(vectors.roundFloat.length).toBe(28);
    for (const [bits, expected] of vectors.roundFloat) {
      expect(roundFloat(fromBits(bits)), bits).toBe(expected);
    }
  });

  it('saturates and maps NaN to 0', () => {
    expect(roundFloat(1e20)).toBe(INT_MAX);
    expect(roundFloat(-1e20)).toBe(INT_MIN);
    expect(roundFloat(NaN)).toBe(0);
  });
});

describe('floorDiv / floorMod', () => {
  it('replays every JVM vector', () => {
    expect(vectors.floorDiv.length).toBe(72);
    expect(vectors.floorMod.length).toBe(72);
    for (const [a, b, r] of vectors.floorDiv) {
      expect(floorDiv(a, b), `floorDiv(${a}, ${b})`).toBe(r);
    }
    for (const [a, b, r] of vectors.floorMod) {
      expect(floorMod(a, b), `floorMod(${a}, ${b})`).toBe(r);
    }
  });

  it('throws RangeError on a zero divisor', () => {
    expect(() => floorDiv(1, 0)).toThrow(RangeError);
    expect(() => floorMod(1, 0)).toThrow(RangeError);
  });

  it('returns +0 rather than -0', () => {
    expect(Object.is(floorMod(-4, 2), 0)).toBe(true);
    expect(Object.is(floorDiv(0, -3), 0)).toBe(true);
  });
});

describe('d2i / d2l', () => {
  it('replays every d2i vector', () => {
    expect(vectors.d2i.length).toBe(52);
    for (const [bits, expected] of vectors.d2i) {
      expect(d2i(fromBits(bits)), bits).toBe(expected);
    }
  });

  it('replays every d2l vector', () => {
    expect(vectors.d2l.length).toBe(52);
    for (const [bits, expected] of vectors.d2l) {
      expect(d2l(fromBits(bits)), bits).toBe(BigInt(expected));
    }
  });

  it('handles the named cases', () => {
    expect(d2i(NaN)).toBe(0);
    expect(d2i(1e10)).toBe(INT_MAX);
    expect(d2i(-1e10)).toBe(INT_MIN);
    expect(d2i(-1.9)).toBe(-1);
    expect(Object.is(d2i(-0.5), 0)).toBe(true);
    expect(d2l(NaN)).toBe(0n);
    expect(d2l(1e30)).toBe(LONG_MAX);
    expect(d2l(-1e30)).toBe(LONG_MIN);
    expect(d2l(-1.9)).toBe(-1n);
  });
});

// ---- T4: numeric.json replays (l2i, log10, int divZero) ----
import { readFileSync as readNumericFile } from 'node:fs';
import { ArithmeticException } from './ArithmeticException.js';
import { l2i } from './JavaMath.js';

const NUMERIC_URL = new URL('../../../test/golden/refs/java/numeric.json', import.meta.url);
const HEX_RADIX = 16;

interface NumericVectors {
  readonly l2i: readonly (readonly [string, number])[];
  readonly log10: readonly BitsRow[];
  readonly divZero: readonly (readonly [string, number, { readonly throws: string; readonly message: string }])[];
}

const numeric = JSON.parse(readNumericFile(NUMERIC_URL, 'utf8')) as NumericVectors;

function toBitsHex(x: number): string {
  const view = new DataView(new ArrayBuffer(BITS_BYTES));
  view.setFloat64(0, x);
  return view
    .getBigUint64(0)
    .toString(HEX_RADIX)
    .padStart(BITS_BYTES * 2, '0');
}

describe('l2i', () => {
  it('replays every JVM vector', () => {
    expect(numeric.l2i.length).toBe(78);
    for (const [long, expected] of numeric.l2i) {
      expect(l2i(BigInt(long)), long).toBe(expected);
    }
  });
});

describe('Math.log10 (native)', () => {
  it('matches every JVM vector bit-for-bit, so no shim is needed', () => {
    expect(numeric.log10.length).toBe(1264);
    for (const [input, expected] of numeric.log10) {
      expect(toBitsHex(Math.log10(fromBits(input))), input).toBe(expected);
    }
  });
});

describe('floorDiv / floorMod zero divisor', () => {
  it('replays every int divZero vector as ArithmeticException("/ by zero")', () => {
    const rows = numeric.divZero.filter(([op]) => op === 'floorDiv(int)' || op === 'floorMod(int)');
    expect(rows.length).toBe(10);
    for (const [op, a, outcome] of rows) {
      const fn = op === 'floorDiv(int)' ? floorDiv : floorMod;
      expect(outcome.message).toBe('/ by zero');
      expect(() => fn(a, 0), `${op} ${a}`).toThrow(ArithmeticException);
      expect(() => fn(a, 0), `${op} ${a}`).toThrow('/ by zero');
    }
  });
});
