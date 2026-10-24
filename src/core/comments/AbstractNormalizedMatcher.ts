// SPDX-License-Identifier: EPL-2.0
import { AbstractNormalizedMatcherNormalizationFunction } from './AbstractNormalizedMatcherNormalizationFunction.js';
import { IMatcher } from './IMatcher.js';

/**
 * Abstract base class for matchers that normalize their raw values using a configurable normalization function. The
 * raw values are expected to lie between a worst and a best raw value (in either order).
 *
 * @typeParam C - type of comments.
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/AbstractNormalizedMatcher.java
 */
export abstract class AbstractNormalizedMatcher<C, T> extends IMatcher<C, T> {
  private worstRawValue = 0;
  private bestRawValue = 1;
  private normalizationFunction: AbstractNormalizedMatcherNormalizationFunction =
    AbstractNormalizedMatcherNormalizationFunction.LINEAR;

  // ---- Configuration ----

  /**
   * Configures the worst and the best raw value.
   *
   * @param worstRawVal - the worst raw value.
   * @param bestRawVal - the best raw value.
   * @returns this object for method chaining.
   */
  protected withBounds(worstRawVal: number, bestRawVal: number): this {
    this.worstRawValue = worstRawVal;
    this.bestRawValue = bestRawVal;

    return this;
  }

  /**
   * Configures the normalization function.
   *
   * @param normalizationFunction - the function to use.
   * @returns this object for method chaining.
   * @throws TypeError if the function is null (Java: `Objects.requireNonNull` NPE).
   */
  protected withNormalizationFunction(
    normalizationFunction: AbstractNormalizedMatcherNormalizationFunction | null,
  ): this {
    if (normalizationFunction === null || normalizationFunction === undefined) {
      throw new TypeError('Normalization function cannot be null.');
    }

    this.normalizationFunction = normalizationFunction;
    return this;
  }

  // ---- Getters ----

  /** @returns the worst raw value. */
  getWorstRawValue(): number {
    return this.worstRawValue;
  }

  /** @returns the best raw value. */
  getBestRawValue(): number {
    return this.bestRawValue;
  }

  // ---- IMatcher ----

  override normalized(comment: C, element: T): number {
    const rawValue = this.raw(comment, element);

    switch (this.normalizationFunction) {
      case AbstractNormalizedMatcherNormalizationFunction.LINEAR:
        return this.normalizeLinear(rawValue);
      case AbstractNormalizedMatcherNormalizationFunction.BINARY:
        return this.normalizeBinary(rawValue);
      default:
        // Java: assert false; return 0
        return 0;
    }
  }

  // ---- Normalization Functions ----

  /**
   * Linear normalization: the worst value maps to 0, the best value to 1.
   *
   * @param raw - the raw value.
   * @returns the normalized value.
   */
  protected normalizeLinear(raw: number): number {
    if (this.worstRawValue < this.bestRawValue) {
      if (raw <= this.worstRawValue) {
        return 0;
      } else if (raw >= this.bestRawValue) {
        return 1;
      } else {
        return (raw - this.worstRawValue) / (this.bestRawValue - this.worstRawValue);
      }
    } else if (this.bestRawValue < this.worstRawValue) {
      if (raw <= this.bestRawValue) {
        return 1;
      } else if (raw >= this.worstRawValue) {
        return 0;
      } else {
        return 1 - (raw - this.bestRawValue) / (this.worstRawValue - this.bestRawValue);
      }
    } else {
      return raw === this.bestRawValue ? 1 : 0;
    }
  }

  /**
   * Binary normalization: 0 for anything at or beyond the worst value, 1 otherwise.
   *
   * @param raw - the raw value.
   * @returns the normalized value.
   */
  protected normalizeBinary(raw: number): number {
    if (this.worstRawValue < this.bestRawValue) {
      return raw <= this.worstRawValue ? 0 : 1;
    } else if (this.bestRawValue < this.worstRawValue) {
      return raw >= this.worstRawValue ? 0 : 1;
    } else {
      return raw === this.bestRawValue ? 1 : 0;
    }
  }
}
