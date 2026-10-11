// SPDX-License-Identifier: EPL-2.0

const BITS_BYTES = 8;
const FRACTION_BITS = 52n;
const FRACTION_MASK = (1n << FRACTION_BITS) - 1n;
const EXPONENT_MASK = 0x7ffn;
const SUBNORMAL_EXPONENT = -1074n;
const EXPONENT_BIAS_SHIFT = 1075n;
const RADIX = 10n;
const PLAIN_MIN_EXPONENT = -3;
const PLAIN_MAX_EXPONENT = 6;
const SHORT_LENGTH = 1;
const EXTENDED_LENGTH = 2;
const NAN_TEXT = 'NaN';
const INFINITY_TEXT = 'Infinity';
const POSITIVE_ZERO_TEXT = '0.0';

/** An exact non-negative-denominator rational. */
interface Fraction {
  readonly n: bigint;
  readonly d: bigint;
}

/** The decimal c * 10^k with c > 0. */
interface Decimal {
  readonly c: bigint;
  readonly k: number;
}

/** A positive double as an exact interval of values rounding to it, in units of 2^q. */
interface Rounding {
  readonly m: Fraction;
  readonly low: Fraction;
  readonly high: Fraction;
  readonly inclusive: boolean;
}

function pow(base: bigint, exponent: number): bigint {
  return base ** BigInt(exponent);
}

function scaled(x: bigint, base: bigint, exponent: number): Fraction {
  return exponent >= 0 ? { n: x * pow(base, exponent), d: 1n } : { n: x, d: pow(base, -exponent) };
}

function compareFractions(a: Fraction, b: Fraction): number {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left < right ? -1 : left > right ? 1 : 0;
}

function distance(a: Fraction, b: Fraction): Fraction {
  const n = a.n * b.d - b.n * a.d;
  const magnitude = n < 0n ? -n : n;
  return { n: magnitude, d: a.d * b.d };
}

function decimalValue(x: Decimal): Fraction {
  return scaled(x.c, RADIX, x.k);
}

/** Exact rounding interval of the positive finite double with the given raw bits. */
function roundingOf(bits: bigint): Rounding {
  const field = (bits >> FRACTION_BITS) & EXPONENT_MASK;
  const fraction = bits & FRACTION_MASK;
  const mantissa = field === 0n ? fraction : fraction | (1n << FRACTION_BITS);
  const exponent = field === 0n ? SUBNORMAL_EXPONENT : field - EXPONENT_BIAS_SHIFT;
  const unitExponent = Number(exponent) - 2;
  const lowerGap = fraction === 0n && field > 1n ? 1n : 2n;
  const at = (units: bigint): Fraction => scaled(units, 2n, unitExponent);
  const middle = 4n * mantissa;
  return {
    m: at(middle),
    low: at(middle - lowerGap),
    high: at(middle + 2n),
    inclusive: mantissa % 2n === 0n,
  };
}

function inInterval(r: Rounding, x: Fraction): boolean {
  const lo = compareFractions(x, r.low);
  const hi = compareFractions(x, r.high);
  if (r.inclusive) return lo >= 0 && hi <= 0;
  return lo > 0 && hi < 0;
}

/** Shortest round-trip digits and decimal exponent as reported by JS (length hint only). */
function shortestHint(magnitude: number): { digits: string; exponent: number } {
  const [mantissa = '', exponent = '0'] = magnitude.toExponential().split('e');
  return { digits: mantissa.replace('.', ''), exponent: Number(exponent) };
}

/** Floor and ceiling significands at scale 10^k for the exact value m. */
function neighbours(m: Fraction, k: number): readonly Decimal[] {
  const unit = scaled(1n, RADIX, k);
  const quotient = (m.n * unit.d) / (m.d * unit.n);
  return [
    { c: quotient, k },
    { c: quotient + 1n, k },
  ];
}

/** Returns true when `a` is a better pick than `b` for the exact value m. */
function isCloser(r: Rounding, a: Decimal, b: Decimal): boolean {
  const order = compareFractions(distance(decimalValue(a), r.m), distance(decimalValue(b), r.m));
  return order !== 0 ? order < 0 : a.k === b.k && a.c % 2n === 0n && b.c % 2n !== 0n;
}

/** The T-set element closest to m, seeded with the JS round-trip decimal (always in R). */
function closestDecimal(r: Rounding, digits: string, exponent: number): Decimal {
  const length = digits.length === SHORT_LENGTH ? EXTENDED_LENGTH : digits.length;
  const limit = pow(RADIX, length);
  const topK = exponent - length + 1;
  let best: Decimal = { c: BigInt(digits), k: exponent - digits.length + 1 };
  for (const k of [topK, topK - 1]) {
    for (const candidate of neighbours(r.m, k)) {
      const fits = candidate.c > 0n && candidate.c <= limit;
      if (fits && inInterval(r, decimalValue(candidate)) && isCloser(r, candidate, best)) {
        best = candidate;
      }
    }
  }
  return best;
}

/** Strips trailing zeros: digit string and decimal exponent of the leading digit. */
function normalize(x: Decimal): { digits: string; exponent: number } {
  const text = x.c.toString().replace(/0+$/, '');
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

function rawBits(magnitude: number): bigint {
  const view = new DataView(new ArrayBuffer(BITS_BYTES));
  view.setFloat64(0, magnitude);
  return view.getBigUint64(0);
}

/**
 * Java's `Double.toString(double)`: the decimal closest to the value among the
 * shortest decimals that round to it (ties to the even significand), in plain
 * notation for 10^-3 <= |v| < 10^7 and computerized scientific notation otherwise.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#toString(double)
 */
export function toString(value: number): string {
  if (Number.isNaN(value)) return NAN_TEXT;
  if (!Number.isFinite(value)) return value > 0 ? INFINITY_TEXT : `-${INFINITY_TEXT}`;
  if (value === 0) return Object.is(value, -0) ? `-${POSITIVE_ZERO_TEXT}` : POSITIVE_ZERO_TEXT;
  const magnitude = Math.abs(value);
  const { digits, exponent } = shortestHint(magnitude);
  const chosen = closestDecimal(roundingOf(rawBits(magnitude)), digits, exponent);
  const text = formatDecimal(chosen);
  return value < 0 ? `-${text}` : text;
}
