// SPDX-License-Identifier: EPL-2.0
import { NumberFormatException } from './NumberFormatException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#MIN_VALUE */
export const MIN_VALUE = -2147483648;
/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#MAX_VALUE */
export const MAX_VALUE = 2147483647;

const RADIX = 10;
const INT_BITS = 32;
const ND = /^\p{Nd}$/u;

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#hashCode(int) */
export function hashCode(i: number): number {
  return i;
}

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#reverse(int) */
export function reverse(i: number): number {
  let result = 0;
  let rest = i;
  for (let bit = 0; bit < INT_BITS; bit++) {
    result = (result << 1) | (rest & 1);
    rest >>>= 1;
  }
  return result;
}

/**
 * `Character.digit(cp, 10)` for a code point. Every `Nd` run (a single block of
 * ten, or contiguous blocks such as the 50 mathematical digits) starts at a
 * zero and counts 0-9 repeatedly, so the value is the distance from the run's
 * first code point modulo ten. Returns -1 for non-digits.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Character.html#digit(char,int)
 */
function digitOf(cp: number): number {
  if (!ND.test(String.fromCodePoint(cp))) return -1;
  let distance = 0;
  while (ND.test(String.fromCodePoint(cp - distance - 1))) distance++;
  return distance % RADIX;
}

function fail(s: string): NumberFormatException {
  return new NumberFormatException(`For input string: "${s}"`);
}

/**
 * Parses per `Integer.parseInt(String)`: optional leading `+`/`-`, then one or
 * more decimal digits (any Unicode `Nd`), value within int range.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(java.lang.String)
 */
export function valueOf(s: string): number {
  const first = s.charAt(0);
  const negative = first === '-';
  const digits = Array.from(first === '-' || first === '+' ? s.slice(1) : s);
  if (digits.length === 0) throw fail(s);
  let value = 0;
  for (const ch of digits) {
    const d = digitOf(ch.codePointAt(0) as number);
    if (d < 0) throw fail(s);
    value = value * RADIX + (negative ? -d : d);
    if (value < MIN_VALUE || value > MAX_VALUE) throw fail(s);
  }
  return value + 0;
}
