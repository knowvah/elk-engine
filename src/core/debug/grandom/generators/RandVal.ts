// SPDX-License-Identifier: EPL-2.0
import { l2i, roundToLong } from '../../../../java/lang/JavaMath.js';
import type { Random } from '../../../../java/util/Random.js';

interface RandValInit {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly stddv: number;
  readonly exact: number;
  readonly useMinMax: boolean;
  readonly useExact: boolean;
}

/** `new RandVal(0, 0, 0, 0, 0, false, false)`. */
const NIL: RandValInit = { min: 0, max: 0, mean: 0, stddv: 0, exact: 0, useMinMax: false, useExact: false };

/**
 * A random value description: exact, uniformly distributed between a minimum and a maximum, or
 * normally distributed. `allNil()` has both flags off and is therefore `gaussian(0, 0)`: every
 * `val` consumes one `nextGaussian` and yields 0.
 *
 * Nested class of `GeneratorOptions` in Java; a sibling file here (translation rule 6.4).
 * Java `assert max >= min` in `val` is disabled in the JVM by default and omitted here (no
 * dev-assert helper exists yet; assertions are not executed in the recorded vectors).
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/GeneratorOptions.java
 */
export class RandVal {
  private min_: number;
  private max_: number;
  private mean: number;
  private stddv: number;
  private exact_: number;
  private readonly useMinMax: boolean;
  private readonly useExact: boolean;

  /**
   * Java takes seven positional parameters; a single record keeps the constructor within the
   * parameter-count limit (the seven fields and their assignment order are unchanged).
   */
  private constructor(init: RandValInit) {
    this.min_ = init.min;
    this.max_ = init.max;
    this.mean = init.mean;
    this.stddv = init.stddv;
    this.exact_ = init.exact;
    this.useMinMax = init.useMinMax;
    this.useExact = init.useExact;
  }

  static allNil(): RandVal {
    return new RandVal(NIL);
  }

  static minMax(min: number, max: number): RandVal {
    return new RandVal({ ...NIL, min, max, useMinMax: true });
  }

  static exact(exact: number): RandVal {
    return new RandVal({ ...NIL, exact, useExact: true });
  }

  static gaussian(mean: number, stddv: number): RandVal {
    return new RandVal({ ...NIL, mean, stddv });
  }

  val(r: Random): number {
    let result = 0;
    if (this.useExact) {
      result = this.exact_;
    } else if (this.useMinMax) {
      result = r.nextDouble() * (this.max_ - this.min_) + this.min_;
    } else {
      result = r.nextGaussian() * this.stddv + this.mean;
    }
    return result < 0 ? 0 : result;
  }

  /** `(int) Math.round(val(r))`: the `long` result keeps its low 32 bits (rule 1.5). */
  intVal(r: Random): number {
    return l2i(roundToLong(this.val(r)));
  }

  /** `(int) Math.round(exact)`. */
  defaultInt(): number {
    return l2i(roundToLong(this.exact_));
  }

  /** `(float) val(r)`. */
  floatVal(r: Random): number {
    return Math.fround(this.val(r));
  }

  setMean(d: number): void {
    this.mean = d;
  }

  setStddv(d: number): void {
    this.stddv = d;
  }

  /** Java parameter is `int`; callers pass int values. */
  setMin(m: number): void {
    this.min_ = m;
  }

  /** Java parameter is `int`; callers pass int values. */
  setMax(m: number): void {
    this.max_ = m;
  }

  min(): number {
    return this.min_;
  }

  max(): number {
    return this.max_;
  }

  defaultVal(): number {
    return this.exact_;
  }
}
