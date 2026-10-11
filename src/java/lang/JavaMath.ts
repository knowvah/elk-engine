// SPDX-License-Identifier: EPL-2.0
import { div, rem } from './Int32.js';

const INT_BITS = 32;
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;
const LONG_MAX = 9223372036854775807n;
const LONG_MIN = -9223372036854775808n;
// 2^63 as a double; every double >= this saturates to LONG_MAX.
const TWO_POW_63 = 9223372036854775808;
const HALF = 0.5;

/** Java `Math.round` semantics on a double: ties toward +Infinity, NaN -> 0 (as +0). */
function roundHalfUp(x: number): number {
  if (Number.isNaN(x)) return 0;
  const floor = Math.floor(x);
  // x - floor is exact for doubles, unlike floor(x + 0.5) which fails for 0.49999999999999994.
  return (x - floor >= HALF ? floor + 1 : floor) + 0;
}

function saturateInt(x: number): number {
  if (x >= INT_MAX) return INT_MAX;
  if (x <= INT_MIN) return INT_MIN;
  return x;
}

/**
 * `Math.round(double)` for results that fit a JS safe integer. Java returns
 * `long`; a `number` cannot hold the full range, so this throws `RangeError`
 * when the exact result lies outside the safe-integer range. Use
 * {@link roundToLong} for the full saturating `long` range.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#round(double)
 */
export function round(x: number): number {
  const r = roundHalfUp(x);
  if (!Number.isSafeInteger(r)) {
    throw new RangeError(`Math.round result for ${x} is outside the safe-integer range; use roundToLong`);
  }
  return r;
}

/**
 * `Math.round(double)` over the full `long` range: ties toward +Infinity,
 * NaN -> 0n, saturating at Long.MIN_VALUE / Long.MAX_VALUE.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#round(double)
 */
export function roundToLong(x: number): bigint {
  return d2lSaturating(roundHalfUp(x));
}

/**
 * `Math.round(float)` -> int, applied to a float widened to double (exact in
 * double arithmetic). NaN -> 0, saturating at Integer bounds.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#round(float)
 */
export function roundFloat(x: number): number {
  return saturateInt(roundHalfUp(x));
}

/**
 * Floor of the integer quotient (rounds toward negative infinity). Throws
 * `ArithmeticException` on a zero divisor; `MIN_VALUE / -1` wraps.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#floorDiv(int,int)
 */
export function floorDiv(a: number, b: number): number {
  const q = div(a, b);
  const r = rem(a, b);
  return r !== 0 && r < 0 !== b < 0 ? (q - 1) | 0 : q;
}

/**
 * `a - floorDiv(a, b) * b`; the result has the sign of the divisor. Throws
 * `ArithmeticException` on a zero divisor.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#floorMod(int,int)
 */
export function floorMod(a: number, b: number): number {
  const r = rem(a, b);
  return r !== 0 && r < 0 !== b < 0 ? (r + b) | 0 : r;
}

/**
 * `(int) x`: NaN -> 0, truncate toward zero, saturate at Integer bounds.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.3
 */
export function d2i(x: number): number {
  if (Number.isNaN(x)) return 0;
  return saturateInt(Math.trunc(x)) + 0;
}

/**
 * `(long) x`: NaN -> 0n, truncate toward zero, saturate at Long bounds.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.3
 */
export function d2l(x: number): bigint {
  if (Number.isNaN(x)) return 0n;
  return d2lSaturating(Math.trunc(x));
}

/** Converts an integral (or infinite) double to bigint, saturating at long bounds. */
function d2lSaturating(integral: number): bigint {
  if (integral >= TWO_POW_63) return LONG_MAX;
  if (integral <= -TWO_POW_63) return LONG_MIN;
  return BigInt(integral);
}

/**
 * `(int) x` for a `long`: keeps the low 32 bits as a signed int (narrowing
 * primitive conversion).
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.3
 */
export function l2i(x: bigint): number {
  return Number(BigInt.asIntN(INT_BITS, x));
}
