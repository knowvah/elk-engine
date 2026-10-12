// SPDX-License-Identifier: EPL-2.0
import * as JavaString from './JavaString.js';
import { NumberFormatException } from './NumberFormatException.js';

const DOUBLE_BYTES = 8;
const HALF_WORD_SHIFT = 32n;
const INT_BITS = 32;
const LONG_BITS = 64;
const CANONICAL_NAN_BITS = 0x7ff8000000000000n;
const MANTISSA_PRECISION = 53;
const MAX_EXPONENT = 1023n;
const MIN_NORMAL_EXPONENT = -1022n;
const SUBNORMAL_KEEP_OFFSET = 1075n;
/** Anything with leading-bit exponent below this rounds to zero. */
const UNDERFLOW_EXPONENT = -1076n;
const HEX_BITS_PER_DIGIT = 4n;
const EMPTY_STRING_MESSAGE = 'empty String';
const MULTIPLE_POINTS_MESSAGE = 'multiple points';

const DECIMAL_PATTERN = /^([0-9]*)(?:\.([0-9]*))?([eE][+-]?[0-9]+)?[fFdD]?$/u;
const HEX_PATTERN = /^([0-9a-fA-F]*)(?:\.([0-9a-fA-F]*))?[pP]([+-]?[0-9]+)[fFdD]?$/u;
const SIGNIFICAND_RUN = /^[0-9.]*/u;

const scratch = new DataView(new ArrayBuffer(DOUBLE_BYTES));

/**
 * Raw IEEE 754 bit pattern of a double as a signed 64-bit integer.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#doubleToRawLongBits(double)
 */
export function doubleToRawLongBits(v: number): bigint {
  scratch.setFloat64(0, v);
  return scratch.getBigInt64(0);
}

/**
 * Bit pattern of a double with every NaN collapsed to 0x7ff8000000000000.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#doubleToLongBits(double)
 */
export function doubleToLongBits(v: number): bigint {
  return Number.isNaN(v) ? CANONICAL_NAN_BITS : doubleToRawLongBits(v);
}

/**
 * Double with the given 64-bit pattern (wrapped to 64 bits).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#longBitsToDouble(long)
 */
export function longBitsToDouble(bits: bigint): number {
  scratch.setBigInt64(0, BigInt.asIntN(LONG_BITS, bits));
  return scratch.getFloat64(0);
}

/**
 * `(int)(bits ^ (bits >>> 32))` over {@link doubleToLongBits}.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#hashCode(double)
 */
export function hashCode(v: number): number {
  const bits = BigInt.asUintN(LONG_BITS, doubleToLongBits(v));
  return Number(BigInt.asIntN(INT_BITS, bits ^ (bits >> HALF_WORD_SHIFT)));
}

function bitLength(m: bigint): bigint {
  return BigInt(m.toString(2).length);
}

/**
 * Rounds `m * 2^e2` (m > 0) to the nearest binary64, ties to even, handling
 * subnormals and overflow. The final scaling is exact: the rounded mantissa
 * has at most 53 bits and its lowest-bit weight is at least 2^-1074, so
 * `Number(m) * 2**q` is representable (or overflows to Infinity).
 */
function scaleToDouble(m: bigint, e2: bigint): number {
  const bl = bitLength(m);
  const top = bl - 1n + e2;
  if (top > MAX_EXPONENT) return Infinity;
  if (top < UNDERFLOW_EXPONENT) return 0;
  const keep = top >= MIN_NORMAL_EXPONENT ? BigInt(MANTISSA_PRECISION) : top + SUBNORMAL_KEEP_OFFSET;
  const drop = bl - keep;
  if (drop <= 0n) return Number(m) * 2 ** Number(e2);
  const half = 1n << (drop - 1n);
  const rest = m & ((1n << drop) - 1n);
  let rounded = m >> drop;
  if (rest > half || (rest === half && (rounded & 1n) === 1n)) rounded += 1n;
  return rounded === 0n ? 0 : Number(rounded) * 2 ** Number(e2 + drop);
}

function parseHexMagnitude(body: string): number | undefined {
  const match = HEX_PATTERN.exec(body);
  if (match === null) return undefined;
  const whole = match[1] as string; // group 1 always participates
  const fraction = match[2] ?? '';
  if (whole.length + fraction.length === 0) return undefined;
  const mantissa = BigInt(`0x${whole}${fraction}`);
  if (mantissa === 0n) return 0;
  const exponent = BigInt(match[3] as string) - HEX_BITS_PER_DIGIT * BigInt(fraction.length);
  return scaleToDouble(mantissa, exponent);
}

type DecimalOutcome = number | 'multiple-points' | undefined;

function parseDecimalMagnitude(body: string): DecimalOutcome {
  // `*` always matches, so exec never returns null.
  const run = (SIGNIFICAND_RUN.exec(body) as RegExpExecArray)[0];
  if (run.indexOf('.') !== run.lastIndexOf('.')) return 'multiple-points';
  const match = DECIMAL_PATTERN.exec(body);
  if (match === null) return undefined;
  const whole = match[1] as string; // group 1 always participates
  const fraction = match[2] ?? '';
  if (whole.length + fraction.length === 0) return undefined;
  return Number(`${whole || '0'}.${fraction || '0'}${match[3] ?? ''}`);
}

function parseMagnitude(body: string): DecimalOutcome {
  if (body === 'NaN') return NaN;
  if (body === 'Infinity') return Infinity;
  if (body.startsWith('0x') || body.startsWith('0X')) {
    return parseHexMagnitude(body.slice(2));
  }
  return parseDecimalMagnitude(body);
}

/**
 * Parses a string per the `Double.valueOf(String)` FloatValue grammar after
 * `String.trim`; throws {@link NumberFormatException} on any grammar failure.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#parseDouble(java.lang.String)
 */
export function parseDouble(s: string): number {
  const trimmed = JavaString.trim(s);
  if (trimmed.length === 0) throw new NumberFormatException(EMPTY_STRING_MESSAGE);
  const negative = trimmed.startsWith('-');
  const signed = negative || trimmed.startsWith('+');
  const magnitude = parseMagnitude(signed ? trimmed.slice(1) : trimmed);
  if (magnitude === 'multiple-points') {
    throw new NumberFormatException(MULTIPLE_POINTS_MESSAGE);
  }
  if (magnitude === undefined) {
    throw new NumberFormatException(`For input string: "${s}"`);
  }
  // Java yields the canonical positive NaN for "-NaN"; V8 negation would flip its sign bit.
  return negative && !Number.isNaN(magnitude) ? -magnitude : magnitude;
}
