// SPDX-License-Identifier: EPL-2.0

/** Multiplier of the 48-bit linear congruential generator. */
const MULTIPLIER = 0x5deece66dn;
/** Addend of the 48-bit linear congruential generator. */
const ADDEND = 0xbn;
/** Number of state bits. */
const STATE_BITS = 48n;
/** Mask retaining the low 48 bits. */
const MASK = (1n << STATE_BITS) - 1n;
const INT_BITS = 32;
const LONG_BITS = 64n;
const INT_MAX_PLUS_ONE = 2 ** 31;
const TWO_POW_24 = 2 ** 24;
const TWO_POW_27 = 2 ** 27;
/** 2^-53, the scale of a 53-bit random mantissa. */
const DOUBLE_UNIT = 2 ** -53;
const SEED_SPACE = 2 ** 48;

const LN2_HI = 6.93147180369123816490e-1;
const LN2_LO = 1.90821492927058770002e-10;
const LG1 = 6.666666666666735130e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;
const HI_MANTISSA_MASK = 0x000fffff;
const EXPONENT_BIAS = 1023;
const ONE_HI_WORD = 0x3ff00000;
const bitView = new DataView(new ArrayBuffer(8));

/**
 * Natural log matching `StrictMath.log` (the Javadoc of `nextGaussian`
 * specifies StrictMath). `Math.log` is allowed to differ by 1 ulp, which the
 * JVM vectors expose, so this implements the netlib fdlibm `log` algorithm
 * (public algorithm, not OpenJDK source). Domain here: finite, normal,
 * `0 < x < 1` (a polar-method radius, at least 2^-106), so subnormal, zero,
 * negative, infinite and NaN handling is unnecessary.
 */
function strictLog(x: number): number {
  bitView.setFloat64(0, x);
  const hx = bitView.getUint32(0) & HI_MANTISSA_MASK;
  let k = (bitView.getUint32(0) >>> 20) - EXPONENT_BIAS;
  const i = (hx + 0x95f64) & 0x100000;
  bitView.setUint32(0, hx | (i ^ ONE_HI_WORD));
  k += i >>> 20;
  const f = bitView.getFloat64(0) - 1.0;
  if ((HI_MANTISSA_MASK & (2 + hx)) < 3) {
    return logNearOne(f, k);
  }
  return logPolynomial(f, hx, k);
}

/** Branch for |f| < 2^-20, including f = 0 (x an exact power of two). */
function logNearOne(f: number, k: number): number {
  if (f === 0) return k * LN2_HI + k * LN2_LO;
  const r = f * f * (0.5 - 0.33333333333333333 * f);
  if (k === 0) return f - r;
  return k * LN2_HI - ((r - k * LN2_LO) - f);
}

function logPolynomial(f: number, hx: number, k: number): number {
  const s = f / (2.0 + f);
  const dk = k;
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const r = t2 + t1;
  if (((hx - 0x6147a) | (0x6b851 - hx)) > 0) {
    // Mantissa in this band (x near sqrt 2) with s < 1 implies k = -1, so
    // fdlibm's k === 0 sub-branch is unreachable for this function's domain.
    const hfsq = 0.5 * f * f;
    return dk * LN2_HI - ((hfsq - (s * (hfsq + r) + dk * LN2_LO)) - f);
  }
  if (k === 0) return f - s * (f - r);
  return dk * LN2_HI - ((s * (f - r) - dk * LN2_LO) - f);
}

/**
 * Port of `java.util.Random`: a 48-bit linear congruential generator.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Random.html
 */
export class Random {
  // State is a bigint: the 48-bit * 35-bit product (83 bits) exceeds the exact
  // range of a double, and bigint keeps the arithmetic obviously exact. Split
  // 24/24-bit number math would be faster but is harder to verify.
  #seed = 0n;
  #nextNextGaussian = 0;
  #haveNextNextGaussian = false;

  constructor(seed?: bigint | number) {
    // Intentional nondeterministic divergence: Java derives the default seed
    // from nanoTime; Math.random() is the browser-safe equivalent. ELK treats
    // randomSeed = 0 the same way (nondeterministic).
    this.setSeed(seed ?? Math.floor(Math.random() * SEED_SPACE));
  }

  /** Resets the generator and discards any cached Gaussian. */
  setSeed(seed: bigint | number): void {
    let big: bigint;
    if (typeof seed === 'bigint') {
      big = seed;
    } else if (Number.isSafeInteger(seed)) {
      big = BigInt(seed);
    } else {
      throw new RangeError(`Random seed ${seed} is not a safe integer`);
    }
    this.#seed = (big ^ MULTIPLIER) & MASK;
    this.#haveNextNextGaussian = false;
  }

  #next(bits: number): number {
    this.#seed = (this.#seed * MULTIPLIER + ADDEND) & MASK;
    return Number(BigInt.asIntN(INT_BITS, this.#seed >> (STATE_BITS - BigInt(bits))));
  }

  /** Next uniform int, or an int in `[0, bound)` when `bound` is given. */
  nextInt(bound?: number): number {
    if (bound === undefined) return this.#next(INT_BITS);
    if (!Number.isInteger(bound) || bound <= 0 || bound >= INT_MAX_PLUS_ONE) {
      throw new RangeError(`bound must be a positive 32-bit integer: ${bound}`);
    }
    if ((bound & -bound) === bound) {
      return Number((BigInt(bound) * BigInt(this.#next(31))) >> 31n);
    }
    let bits: number;
    let val: number;
    do {
      bits = this.#next(31);
      val = bits % bound;
    } while (bits - val + (bound - 1) >= INT_MAX_PLUS_ONE);
    return val;
  }

  nextLong(): bigint {
    const high = BigInt(this.#next(INT_BITS)) << 32n;
    return BigInt.asIntN(Number(LONG_BITS), high + BigInt(this.#next(INT_BITS)));
  }

  nextDouble(): number {
    return (this.#next(26) * TWO_POW_27 + this.#next(27)) * DOUBLE_UNIT;
  }

  nextFloat(): number {
    return this.#next(24) / TWO_POW_24;
  }

  nextBoolean(): boolean {
    return this.#next(1) !== 0;
  }

  nextGaussian(): number {
    if (this.#haveNextNextGaussian) {
      this.#haveNextNextGaussian = false;
      return this.#nextNextGaussian;
    }
    let v1: number;
    let v2: number;
    let s: number;
    do {
      v1 = 2 * this.nextDouble() - 1;
      v2 = 2 * this.nextDouble() - 1;
      s = v1 * v1 + v2 * v2;
    } while (s >= 1 || s === 0);
    const multiplier = Math.sqrt((-2 * strictLog(s)) / s);
    this.#nextNextGaussian = v2 * multiplier;
    this.#haveNextNextGaussian = true;
    return v1 * multiplier;
  }
}
