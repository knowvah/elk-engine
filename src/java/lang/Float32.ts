// SPDX-License-Identifier: EPL-2.0

// Float32 values are represented as JS numbers that are exactly representable
// as IEEE 754 binary32. Each binary32 operation on binary32 operands equals the
// binary64 operation rounded once to binary32 (binary64 carries more than
// 2p+2 = 50 significand bits for p = 24, so double rounding is innocuous for
// + - * / on binary32 operands), hence `Math.fround(a op b)`.
//
// A NaN result is returned as the canonical quiet NaN (`0x7ff8000000000000`
// once widened). The bit pattern a CPU generates for Inf - Inf, 0 * Inf and
// 0 / 0 is not specified by IEEE 754 or the JLS: x86-64 sets the sign bit,
// arm64 clears it. The JVM vectors (`numeric.json` `f32`) were recorded on
// arm64, every one of their 224 NaN rows is the canonical pattern, and ELK
// never inspects raw NaN bits, so the canonical form is the deterministic
// choice on every platform.

/** Rounds a binary64 result to binary32 and canonicalizes NaN (see the header). */
function round(x: number): number {
  const r = Math.fround(x);
  return Number.isNaN(r) ? NaN : r;
}

/**
 * Narrowing `double` to `float`: round to nearest, ties to even.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.3
 */
export function fromDouble(d: number): number {
  return round(d);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18.2 */
export function add(a: number, b: number): number {
  return round(a + b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.18.2 */
export function sub(a: number, b: number): number {
  return round(a - b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.1 */
export function mul(a: number, b: number): number {
  return round(a * b);
}

/** @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.17.2 */
export function div(a: number, b: number): number {
  return round(a / b);
}
