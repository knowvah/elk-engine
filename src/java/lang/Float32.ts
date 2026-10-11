// SPDX-License-Identifier: EPL-2.0

// Float32 values are represented as JS numbers that are exactly representable
// as IEEE 754 binary32. Each binary32 operation on binary32 operands equals the
// binary64 operation rounded once to binary32 (binary64 carries more than
// 2p+2 = 50 significand bits for p = 24, so double rounding is innocuous for
// + - * / on binary32 operands), hence `Math.fround(a op b)`.

/**
 * Narrowing `double` to `float`: round to nearest, ties to even.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.3
 */
export function fromDouble(d: number): number {
  return Math.fround(d);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18.2 */
export function add(a: number, b: number): number {
  return Math.fround(a + b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18.2 */
export function sub(a: number, b: number): number {
  return Math.fround(a - b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.1 */
export function mul(a: number, b: number): number {
  return Math.fround(a * b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.2 */
export function div(a: number, b: number): number {
  return Math.fround(a / b);
}
