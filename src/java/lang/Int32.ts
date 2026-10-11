// SPDX-License-Identifier: EPL-2.0

// All functions take and return int32 values represented as JS numbers.

function requireNonZero(divisor: number): void {
  if (divisor === 0) throw new RangeError('/ by zero');
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18 */
export function add(a: number, b: number): number {
  return (a + b) | 0;
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18 */
export function sub(a: number, b: number): number {
  return (a - b) | 0;
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.1 */
export function mul(a: number, b: number): number {
  return Math.imul(a, b);
}

/**
 * Integer division truncating toward zero; `MIN_VALUE / -1` wraps to
 * `MIN_VALUE`. Throws `RangeError` (the `ArithmeticException` analog) on a
 * zero divisor.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.2
 */
export function div(a: number, b: number): number {
  requireNonZero(b);
  return Math.trunc(a / b) | 0;
}

/**
 * Remainder whose sign follows the dividend. Throws `RangeError` on a zero
 * divisor.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.3
 */
export function rem(a: number, b: number): number {
  requireNonZero(b);
  return (a % b) | 0;
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.15.4 */
export function neg(a: number): number {
  return -a | 0;
}

/** Left shift; the count is masked to 5 bits. @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19 */
export function shl(a: number, n: number): number {
  return a << n;
}

/** Arithmetic right shift; the count is masked to 5 bits. @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19 */
export function shr(a: number, n: number): number {
  return a >> n;
}

/**
 * Logical right shift; the count is masked to 5 bits. The result is
 * re-wrapped to signed int32 (the JVM vectors expect `ushr(-1, 0) === -1`).
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19
 */
export function ushr(a: number, n: number): number {
  return (a >>> n) | 0;
}
