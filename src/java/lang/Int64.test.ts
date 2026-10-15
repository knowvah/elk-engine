// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ArithmeticException } from './ArithmeticException.js';
import * as Int64 from './Int64.js';
import { RuntimeException } from './RuntimeException.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/numeric.json', import.meta.url);
const DIV_ZERO_MESSAGE = '/ by zero';
const LONG_DIV = 'long/';
const LONG_REM = 'long%';

type Row = readonly [op: string, a: string, b: string, result: string];
type DivZeroRow = readonly [op: string, a: string | number, expected: { throws: string; message: string }];
interface NumericVectors {
  readonly i64: readonly Row[];
  readonly divZero: readonly DivZeroRow[];
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as NumericVectors;

const OPS: Readonly<Record<string, (a: bigint, b: bigint) => bigint>> = {
  add: Int64.add,
  sub: Int64.sub,
  mul: Int64.mul,
  div: Int64.div,
  rem: Int64.rem,
  neg: (a) => Int64.neg(a),
  shl: Int64.shl,
  shr: Int64.shr,
  ushr: Int64.ushr,
};

describe('Int64 vectors', () => {
  it('replays every i64 JVM vector', () => {
    expect(vectors.i64.length).toBe(4056);
    for (const [op, a, b, result] of vectors.i64) {
      const fn = OPS[op];
      if (fn === undefined) throw new Error(`unknown op ${op}`);
      expect(fn(BigInt(a), BigInt(b)), `${op}(${a}, ${b})`).toBe(BigInt(result));
    }
  });

  it('replays the long divZero vectors', () => {
    const rows = vectors.divZero.filter(([op]) => op === LONG_DIV || op === LONG_REM);
    expect(rows.length).toBeGreaterThan(0);
    for (const [op, a, expected] of rows) {
      const fn = op === LONG_DIV ? Int64.div : Int64.rem;
      expect(expected.throws).toBe('ArithmeticException');
      expect(() => fn(BigInt(a), 0n), `${op}(${a})`).toThrow(expected.message);
    }
  });
});

describe('Int64 named cases', () => {
  it('exposes MIN_VALUE and MAX_VALUE', () => {
    expect(Int64.MIN_VALUE).toBe(-(2n ** 63n));
    expect(Int64.MAX_VALUE).toBe(2n ** 63n - 1n);
  });

  it('wraps add/sub/mul/neg on overflow', () => {
    expect(Int64.add(Int64.MAX_VALUE, 1n)).toBe(Int64.MIN_VALUE);
    expect(Int64.sub(Int64.MIN_VALUE, 1n)).toBe(Int64.MAX_VALUE);
    expect(Int64.mul(Int64.MAX_VALUE, 2n)).toBe(-2n);
    expect(Int64.neg(Int64.MIN_VALUE)).toBe(Int64.MIN_VALUE);
  });

  it('accepts number operands', () => {
    expect(Int64.add(1n, 2)).toBe(3n);
    expect(Int64.shl(1n, 62)).toBe(1n << 62n);
  });

  it('masks shift distances to 6 bits', () => {
    expect(Int64.shl(3n, 64)).toBe(3n);
    expect(Int64.shl(3n, 65)).toBe(6n);
    expect(Int64.shl(3n, -1)).toBe(Int64.shl(3n, 63));
    expect(Int64.shr(-8n, 65)).toBe(-4n);
    expect(Int64.shr(Int64.MIN_VALUE, -1)).toBe(-1n);
    expect(Int64.ushr(-1n, 64)).toBe(-1n);
    expect(Int64.ushr(-1n, 65)).toBe(Int64.MAX_VALUE);
    expect(Int64.ushr(-1n, -1)).toBe(1n);
    expect(Int64.shl(1n, 63)).toBe(Int64.MIN_VALUE);
  });

  it('div truncates toward zero and wraps MIN / -1', () => {
    expect(Int64.div(-7n, 2n)).toBe(-3n);
    expect(Int64.div(Int64.MIN_VALUE, -1n)).toBe(Int64.MIN_VALUE);
  });

  it('rem follows the dividend sign and MIN % -1 is 0', () => {
    expect(Int64.rem(-7n, 2n)).toBe(-1n);
    expect(Int64.rem(7n, -2n)).toBe(1n);
    expect(Int64.rem(Int64.MIN_VALUE, -1n)).toBe(0n);
  });

  it('div and rem throw ArithmeticException on zero divisor', () => {
    for (const fn of [Int64.div, Int64.rem]) {
      let caught: unknown;
      try {
        fn(5n, 0n);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ArithmeticException);
      expect(caught).toBeInstanceOf(RuntimeException);
      expect((caught as Error).message).toBe(DIV_ZERO_MESSAGE);
    }
  });
});
