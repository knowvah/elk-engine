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

// fdlibm e_log constants (netlib), in the file's own 32-bit-word idiom.
const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const TWO_54 = 18014398509481984;
const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;
const HI_MANTISSA_MASK = 0x000fffff;
const MIN_NORMAL_HI = 0x00100000;
const INFINITY_HI = 0x7ff00000;
const ONE_HI = 0x3ff00000;
const EXPONENT_BIAS = 1023;
const EXPONENT_SHIFT = 20;
const SUBNORMAL_SCALE_BITS = 54;
const SQRT2_BAND_ADD = 0x95f64;
const SQRT2_BAND_BIT = 0x100000;
const NEAR_ONE_ADD = 2;
const NEAR_ONE_LIMIT = 3;
const BAND_LO = 0x6147a;
const BAND_HI = 0x6b851;
const THIRD = 0.33333333333333333;
/** Scratch for reading and writing the 32-bit words of a double; never holds state between calls. */
const bitView = new DataView(new ArrayBuffer(8));

/** High 32 bits of a double, as a signed int. */
function highWord(x: number): number {
  bitView.setFloat64(0, x);
  return bitView.getInt32(0);
}

/** `x` with its high 32 bits replaced (low word kept). */
function withHighWord(x: number, hi: number): number {
  bitView.setFloat64(0, x);
  bitView.setUint32(0, hi >>> 0);
  return bitView.getFloat64(0);
}

/** Outcome of the special-value and subnormal screening of `log`. */
type LogScreen = { readonly done: number } | { readonly x: number; readonly hx: number; readonly k: number };

/** NaN, negative, +-0, subnormal scaling by 2^54 and +Infinity handling. */
function screenLog(x: number): LogScreen {
  let hx = highWord(x);
  let k = 0;
  if (hx < MIN_NORMAL_HI) {
    if (x === 0) return { done: -Infinity };
    if (hx < 0) return { done: NaN };
    k -= SUBNORMAL_SCALE_BITS;
    x *= TWO_54;
    hx = highWord(x);
  }
  if (hx >= INFINITY_HI) return { done: x + x };
  return { x, hx, k };
}

/** Branch for |f| < 2^-20, including f = 0 (x an exact power of two). */
function logNearOne(f: number, k: number): number {
  if (f === 0) return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
  const r = f * f * (HALF - THIRD * f);
  if (k === 0) return f - r;
  return k * LN2_HI - (r - k * LN2_LO - f);
}

function logPolynomial(f: number, hx: number, k: number): number {
  const s = f / (2.0 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const r = t2 + t1;
  if (((hx - BAND_LO) | (BAND_HI - hx)) > 0) {
    const hfsq = HALF * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + r));
    return k * LN2_HI - (hfsq - (s * (hfsq + r) + k * LN2_LO) - f);
  }
  if (k === 0) return f - s * (f - r);
  return k * LN2_HI - (s * (f - r) - k * LN2_LO - f);
}

/**
 * Natural logarithm, bit-for-bit equal to `StrictMath.log` (V8's `Math.log` is
 * allowed to differ by one ulp). The netlib fdlibm `e_log` algorithm over the
 * whole domain: NaN and negatives give NaN, +-0 gives -Infinity, +Infinity
 * gives +Infinity, subnormals are scaled by 2^54. Public algorithm; no
 * OpenJDK source was read.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StrictMath.html#log(double)
 * @see https://www.netlib.org/fdlibm/e_log.c
 */
export function log(x: number): number {
  const screen = screenLog(x);
  if ('done' in screen) return screen.done;
  const hx = screen.hx & HI_MANTISSA_MASK;
  let k = screen.k + (screen.hx >> EXPONENT_SHIFT) - EXPONENT_BIAS;
  const i = (hx + SQRT2_BAND_ADD) & SQRT2_BAND_BIT;
  const f = withHighWord(screen.x, hx | (i ^ ONE_HI)) - 1.0;
  k += i >>> EXPONENT_SHIFT;
  if ((HI_MANTISSA_MASK & (NEAR_ONE_ADD + hx)) < NEAR_ONE_LIMIT) return logNearOne(f, k);
  return logPolynomial(f, hx, k);
}

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
