// SPDX-License-Identifier: EPL-2.0
import { DECIMAL_PATTERN, HEX_PATTERN } from './JavaDouble.js';
import * as JavaString from './JavaString.js';
import { NumberFormatException } from './NumberFormatException.js';

const FLOAT_BYTES = 4;
const FRACTION_BITS = 23;
const FRACTION_MASK = (1 << FRACTION_BITS) - 1;
const EXPONENT_MASK = 0xff;
/** Weight exponent of the lowest bit of a subnormal float (`Float.MIN_VALUE` = 2^-149). */
const MIN_LSB_EXPONENT = -149;
/** Unbiased exponent of the lowest fraction bit is `field - EXPONENT_BIAS_SHIFT` (127 + 23). */
const EXPONENT_BIAS_SHIFT = 150;
/** Any value at or above 2^OVERFLOW_TOP_EXPONENT is above the overflow threshold (2^128 - 2^103). */
const OVERFLOW_TOP_EXPONENT = 129;
/** Any value below 2^UNDERFLOW_TOP_EXPONENT is below half of `Float.MIN_VALUE` (2^-150) and rounds to zero. */
const UNDERFLOW_TOP_EXPONENT = -151;
/** 10^39 exceeds the overflow threshold (about 3.4028236e38). */
const OVERFLOW_DECIMAL_EXPONENT = 39n;
/** Any value below 10^-46 is below 2^-150 (about 7.006e-46). */
const UNDERFLOW_DECIMAL_EXPONENT = -46n;
const HEX_BITS_PER_DIGIT = 4n;
const RADIX = 10n;
/** An estimate only (see floorLog10); not a transcendental call site. */
const LOG10_OF_2 = 0.3010299956639812;
const PLAIN_MIN_EXPONENT = -3;
const PLAIN_MAX_EXPONENT = 6;
/** When the shortest decimal has one digit, the closest of one or two digits is chosen. */
const MIN_CHOSEN_LENGTH = 2;
const NAN_TEXT = 'NaN';
const INFINITY_TEXT = 'Infinity';
const POSITIVE_ZERO_TEXT = '0.0';
const EMPTY_STRING_MESSAGE = 'empty String';

/** An exact positive rational. */
interface Fraction {
  readonly n: bigint;
  readonly d: bigint;
}

/** The decimal c * 10^k with c > 0. */
interface Decimal {
  readonly c: bigint;
  readonly k: number;
}

/** A positive float as the exact interval of values rounding to it. */
interface Rounding {
  readonly m: Fraction;
  readonly low: Fraction;
  readonly high: Fraction;
  readonly inclusive: boolean;
}

function bitLength(x: bigint): number {
  return x.toString(2).length;
}

function scaled(x: bigint, base: bigint, exponent: number): Fraction {
  return exponent >= 0 ? { n: x * base ** BigInt(exponent), d: 1n } : { n: x, d: base ** BigInt(-exponent) };
}

function compareFractions(a: Fraction, b: Fraction): number {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** floor(log2(x)) of a positive rational. */
function floorLog2(x: Fraction): number {
  const t = bitLength(x.n) - bitLength(x.d);
  const power = scaled(1n, 2n, t);
  return compareFractions(power, x) > 0 ? t - 1 : t;
}

/**
 * Rounds the exact positive rational x to the nearest float, ties to the even significand, with gradual underflow
 * and overflow to Infinity. The rounded significand has at most 24 bits and weight at least 2^-149, so
 * `Number(q) * 2 ** lsb` is exact in binary64; `Math.fround` only maps a carry to 2^128 onto Infinity.
 */
function roundToFloat(x: Fraction): number {
  const lsb = Math.max(floorLog2(x) - FRACTION_BITS, MIN_LSB_EXPONENT);
  const unit = scaled(1n, 2n, lsb);
  const n = x.n * unit.d;
  const d = x.d * unit.n;
  let q = n / d;
  const twiceRest = 2n * (n - q * d);
  if (twiceRest > d || (twiceRest === d && (q & 1n) === 1n)) q += 1n;
  return Math.fround(Number(q) * 2 ** lsb);
}

/** `HexSignificand BinaryExponent`: the significand times 2^exponent, exactly rounded. */
function parseHexMagnitude(body: string): number | undefined {
  const match = HEX_PATTERN.exec(body);
  if (match === null) return undefined;
  const whole = match[1] as string; // group 1 always participates
  const fraction = match[2] ?? '';
  if (whole.length + fraction.length === 0) return undefined;
  const mantissa = BigInt(`0x${whole}${fraction}`);
  if (mantissa === 0n) return 0;
  const exponent = BigInt(match[3] as string) - HEX_BITS_PER_DIGIT * BigInt(fraction.length);
  const top = BigInt(bitLength(mantissa) - 1) + exponent;
  if (top >= BigInt(OVERFLOW_TOP_EXPONENT)) return Infinity;
  if (top < BigInt(UNDERFLOW_TOP_EXPONENT)) return 0;
  return roundToFloat(scaled(mantissa, 2n, Number(exponent)));
}

/** The decimal digits * 10^exponent (digits without leading zeros, not empty), exactly rounded. */
function decimalToFloat(digits: string, exponent: bigint): number {
  const top = exponent + BigInt(digits.length - 1);
  if (top >= OVERFLOW_DECIMAL_EXPONENT) return Infinity;
  if (top < UNDERFLOW_DECIMAL_EXPONENT) return 0;
  return roundToFloat(scaled(BigInt(digits), RADIX, Number(exponent)));
}

/** A decimal floating literal: its digits times 10^exponent, exactly rounded (never via a double). */
function parseDecimalMagnitude(body: string): number | undefined {
  const match = DECIMAL_PATTERN.exec(body);
  if (match === null) return undefined;
  const whole = match[1] as string; // group 1 always participates
  const fraction = match[2] ?? '';
  if (whole.length + fraction.length === 0) return undefined;
  const digits = `${whole}${fraction}`.replace(/^0+/u, '');
  if (digits.length === 0) return 0;
  return decimalToFloat(digits, BigInt(match[3]?.slice(1) ?? '0') - BigInt(fraction.length));
}

function parseMagnitude(body: string): number | undefined {
  if (body === NAN_TEXT) return NaN;
  if (body === INFINITY_TEXT) return Infinity;
  if (body.startsWith('0x') || body.startsWith('0X')) {
    return parseHexMagnitude(body.slice(2));
  }
  return parseDecimalMagnitude(body);
}

/**
 * `Float.parseFloat(String)` (also what `Float.valueOf(String)` returns, unboxed): the `Double.valueOf(String)`
 * FloatValue grammar after `String.trim`, "rounded to type float by the usual round-to-nearest rule of IEEE 754
 * floating-point arithmetic" from the exact decimal or hexadecimal value. The Javadoc of `Float.valueOf(String)`
 * warns that this is not rounding to double and then to float; it differs, for example, on decimals just above a
 * float midpoint. Throws {@link NumberFormatException} when the string is not a FloatValue.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Float.html#parseFloat(java.lang.String)
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Float.html#valueOf(java.lang.String)
 */
export function parseFloat(s: string): number {
  const trimmed = JavaString.trim(s);
  if (trimmed.length === 0) throw new NumberFormatException(EMPTY_STRING_MESSAGE);
  const negative = trimmed.startsWith('-');
  const signed = negative || trimmed.startsWith('+');
  const magnitude = parseMagnitude(signed ? trimmed.slice(1) : trimmed);
  if (magnitude === undefined) {
    throw new NumberFormatException(`For input string: "${s}"`);
  }
  // Java yields the canonical positive NaN for "-NaN"; negation would flip its sign bit.
  return negative && !Number.isNaN(magnitude) ? -magnitude : magnitude;
}

function floatBits(magnitude: number): number {
  const view = new DataView(new ArrayBuffer(FLOAT_BYTES));
  view.setFloat32(0, magnitude);
  return view.getUint32(0);
}

/** Exact rounding interval of the positive finite float with the given raw bits, in units of 2^(exponent - 2). */
function roundingOf(bits: number): Rounding {
  const field = (bits >>> FRACTION_BITS) & EXPONENT_MASK;
  const fraction = bits & FRACTION_MASK;
  const mantissa = BigInt(field === 0 ? fraction : fraction | (1 << FRACTION_BITS));
  const exponent = field === 0 ? MIN_LSB_EXPONENT : field - EXPONENT_BIAS_SHIFT;
  const lowerGap = fraction === 0 && field > 1 ? 1n : 2n;
  const at = (units: bigint): Fraction => scaled(units, 2n, exponent - 2);
  const middle = 4n * mantissa;
  return { m: at(middle), low: at(middle - lowerGap), high: at(middle + 2n), inclusive: mantissa % 2n === 0n };
}

function inInterval(r: Rounding, x: Fraction): boolean {
  const lo = compareFractions(x, r.low);
  const hi = compareFractions(x, r.high);
  return r.inclusive ? lo >= 0 && hi <= 0 : lo > 0 && hi < 0;
}

function decimalValue(x: Decimal): Fraction {
  return scaled(x.c, RADIX, x.k);
}

/** floor(log10(m)): floor(log2(m)) * log10(2) is off by at most one for a float, and is corrected exactly. */
function floorLog10(m: Fraction): number {
  let e = Math.floor(floorLog2(m) * LOG10_OF_2);
  while (compareFractions(scaled(1n, RADIX, e), m) > 0) e--;
  while (compareFractions(scaled(1n, RADIX, e + 1), m) <= 0) e++;
  return e;
}

/** The floor and ceiling of m at scale 10^k that round to the float. */
function candidatesAt(r: Rounding, k: number): Decimal[] {
  const unit = scaled(1n, RADIX, k);
  const quotient = (r.m.n * unit.d) / (r.m.d * unit.n);
  const pair: Decimal[] = [
    { c: quotient, k },
    { c: quotient + 1n, k },
  ];
  return pair.filter((x) => x.c > 0n && inInterval(r, decimalValue(x)));
}

function distance(a: Fraction, b: Fraction): Fraction {
  const n = a.n * b.d - b.n * a.d;
  return { n: n >= 0n ? n : -n, d: a.d * b.d };
}

/** True when `a` is closer to m than `b`, or as close with the even least significant digit. */
function isCloser(r: Rounding, a: Decimal, b: Decimal): boolean {
  const order = compareFractions(distance(decimalValue(a), r.m), distance(decimalValue(b), r.m));
  return order === 0 ? a.c % 2n === 0n : order === -1;
}

/**
 * The Javadoc's selection: m is the minimal length of a decimal in R (the decimals rounding to the float); T holds
 * the decimals of R of length m (of length 1 or 2 when m = 1); the one closest to the float is chosen, the even one
 * of two. The floor and ceiling of the value at the scale of a length are the only decimals of that length that
 * can be closest, so both steps inspect just those two.
 */
function closestDecimal(r: Rounding): Decimal {
  const leading = floorLog10(r.m);
  let length = 1;
  while (candidatesAt(r, leading - length + 1).length === 0) length++;
  const [first, second] = candidatesAt(r, leading - Math.max(length, MIN_CHOSEN_LENGTH) + 1) as [Decimal, Decimal?];
  return second !== undefined && isCloser(r, second, first) ? second : first;
}

/** Strips trailing zeros: digit string and decimal exponent of the leading digit. */
function normalize(x: Decimal): { digits: string; exponent: number } {
  const text = x.c.toString().replace(/0+$/u, '');
  const trimmed = x.c.toString().length - text.length;
  return { digits: text, exponent: x.k + trimmed + text.length - 1 };
}

function plain(digits: string, exponent: number): string {
  if (exponent < 0) return `0.${'0'.repeat(-exponent - 1)}${digits}`;
  const integer = digits.slice(0, exponent + 1).padEnd(exponent + 1, '0');
  return `${integer}.${digits.slice(exponent + 1) || '0'}`;
}

function scientific(digits: string, exponent: number): string {
  return `${digits.slice(0, 1)}.${digits.slice(1) || '0'}E${exponent}`;
}

function formatDecimal(x: Decimal): string {
  const { digits, exponent } = normalize(x);
  return exponent >= PLAIN_MIN_EXPONENT && exponent <= PLAIN_MAX_EXPONENT
    ? plain(digits, exponent)
    : scientific(digits, exponent);
}

/**
 * Java's `Float.toString(float)` for an exact float value: the decimal closest to the value among the shortest
 * decimals that round to it (ties to the even digit), in plain notation for 10^-3 <= |d| < 10^7 and computerized
 * scientific notation otherwise, with at least one digit after the point.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Float.html#toString(float)
 */
export function toString(f: number): string {
  if (Number.isNaN(f)) return NAN_TEXT;
  if (!Number.isFinite(f)) return f > 0 ? INFINITY_TEXT : `-${INFINITY_TEXT}`;
  if (f === 0) return Object.is(f, -0) ? `-${POSITIVE_ZERO_TEXT}` : POSITIVE_ZERO_TEXT;
  const magnitude = Math.abs(f);
  const text = formatDecimal(closestDecimal(roundingOf(floatBits(magnitude))));
  return f < 0 ? `-${text}` : text;
}
