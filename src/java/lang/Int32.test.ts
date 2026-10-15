// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { add, div, mul, neg, rem, shl, shr, sub, ushr } from './Int32.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/lang.json', import.meta.url);
const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

interface Row {
  readonly op: string;
  readonly a: number;
  readonly b: number;
  readonly r: number;
}
interface LangVectors {
  readonly i32: readonly Row[];
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as LangVectors;

const OPS: Readonly<Record<string, (a: number, b: number) => number>> = {
  add,
  sub,
  mul,
  div,
  rem,
  neg: (a) => neg(a),
  shl,
  shr,
  ushr,
};

describe('Int32 vectors', () => {
  it('replays every JVM vector', () => {
    expect(vectors.i32.length).toBe(558);
    for (const row of vectors.i32) {
      const fn = OPS[row.op];
      if (fn === undefined) throw new Error(`unknown op ${row.op}`);
      expect(fn(row.a, row.b), `${row.op}(${row.a}, ${row.b})`).toBe(row.r);
    }
  });
});

describe('Int32 named cases', () => {
  it('wraps add/sub/mul on overflow', () => {
    expect(add(INT_MAX, 1)).toBe(INT_MIN);
    expect(sub(INT_MIN, 1)).toBe(INT_MAX);
    expect(mul(INT_MAX, INT_MAX)).toBe(1);
  });

  it('div truncates toward zero and wraps MIN / -1', () => {
    expect(div(-7, 2)).toBe(-3);
    expect(div(7, -2)).toBe(-3);
    expect(div(INT_MIN, -1)).toBe(INT_MIN);
  });

  it('rem follows the sign of the dividend', () => {
    expect(rem(-7, 2)).toBe(-1);
    expect(rem(7, -2)).toBe(1);
    expect(Object.is(rem(-4, 2), 0)).toBe(true);
    expect(rem(INT_MIN, -1)).toBe(0);
  });

  it('div and rem throw ArithmeticException on a zero divisor', () => {
    expect(() => div(1, 0)).toThrow(ArithmeticException);
    expect(() => rem(1, 0)).toThrow(ArithmeticException);
  });

  it('neg wraps MIN_VALUE and returns +0 for 0', () => {
    expect(neg(INT_MIN)).toBe(INT_MIN);
    expect(Object.is(neg(0), 0)).toBe(true);
  });

  it('masks shift counts to 5 bits and keeps ushr signed', () => {
    expect(shl(1, 32)).toBe(1);
    expect(shr(-8, 33)).toBe(-4);
    expect(ushr(-1, 0)).toBe(-1);
    expect(ushr(-1, -1)).toBe(1);
  });
});

// ---- T4: numeric.json int divZero replay ----
import { ArithmeticException } from './ArithmeticException.js';

describe('Int32 zero divisor vectors', () => {
  it('replays every int divZero vector as ArithmeticException("/ by zero")', () => {
    const url = new URL('../../../test/golden/refs/java/numeric.json', import.meta.url);
    const rows = (
      JSON.parse(readFileSync(url, 'utf8')) as {
        divZero: readonly (readonly [string, number, { readonly message: string }])[];
      }
    ).divZero.filter(([op]) => op === 'int/' || op === 'int%');
    expect(rows.length).toBe(10);
    for (const [op, a, outcome] of rows) {
      const fn = op === 'int/' ? div : rem;
      expect(outcome.message).toBe('/ by zero');
      expect(() => fn(a, 0), `${op} ${a}`).toThrow(ArithmeticException);
      expect(() => fn(a, 0), `${op} ${a}`).toThrow('/ by zero');
    }
  });
});
