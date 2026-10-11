// SPDX-License-Identifier: EPL-2.0
import { ArithmeticException } from './ArithmeticException.js';

// All functions take and return Java `long` values represented as bigint
// in [-2^63, 2^63). Number operands are accepted for the right-hand side.

const BITS = 64;
const SHIFT_MASK = 63n;

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Long.html#MIN_VALUE */
export const MIN_VALUE: bigint = -(1n << 63n);

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Long.html#MAX_VALUE */
export const MAX_VALUE: bigint = (1n << 63n) - 1n;

function wrap(value: bigint): bigint {
  return BigInt.asIntN(BITS, value);
}

function shiftDistance(distance: bigint | number): bigint {
  return BigInt(distance) & SHIFT_MASK;
}

function nonZeroDivisor(divisor: bigint | number): bigint {
  const d = BigInt(divisor);
  if (d === 0n) throw new ArithmeticException('/ by zero');
  return d;
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18 */
export function add(a: bigint, b: bigint | number): bigint {
  return wrap(a + BigInt(b));
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18 */
export function sub(a: bigint, b: bigint | number): bigint {
  return wrap(a - BigInt(b));
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.1 */
export function mul(a: bigint, b: bigint | number): bigint {
  return wrap(a * BigInt(b));
}

/**
 * Division truncating toward zero; `MIN_VALUE / -1` wraps to `MIN_VALUE`.
 * Throws `ArithmeticException` on a zero divisor.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.2
 */
export function div(a: bigint, b: bigint | number): bigint {
  return wrap(a / nonZeroDivisor(b));
}

/**
 * Remainder with the sign of the dividend; `MIN_VALUE % -1` is 0.
 * Throws `ArithmeticException` on a zero divisor.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.3
 */
export function rem(a: bigint, b: bigint | number): bigint {
  return a % nonZeroDivisor(b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.15.4 */
export function neg(a: bigint): bigint {
  return wrap(-a);
}

/** Left shift; distance masked with `& 63`. @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19 */
export function shl(a: bigint, distance: bigint | number): bigint {
  return wrap(a << shiftDistance(distance));
}

/** Signed right shift; distance masked with `& 63`. @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19 */
export function shr(a: bigint, distance: bigint | number): bigint {
  return a >> shiftDistance(distance);
}

/** Unsigned right shift; distance masked with `& 63`. @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19 */
export function ushr(a: bigint, distance: bigint | number): bigint {
  return wrap(BigInt.asUintN(BITS, a) >> shiftDistance(distance));
}
