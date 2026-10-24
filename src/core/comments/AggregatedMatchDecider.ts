// SPDX-License-Identifier: EPL-2.0
import { compare } from '../../java/lang/DoubleCompare.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import type { IDecider, MatcherClass } from './IDecider.js';

/** Java `ToDoubleFunction<Collection<Double>>`. */
export type Aggregator = (values: readonly number[]) => number;

/**
 * Java `Collectors.summingDouble`/`averagingDouble` scheme, derived from the recorded vectors
 * (`test/golden/refs/java/stream-sum.json`, AD-9; the Javadoc leaves it unspecified):
 * Kahan compensated summation (`tmp = v - c; n = sum + tmp; c = (n - sum) - tmp`), result `sum - c`
 * (one vector row pins the final `- c`), and when that result is NaN while the simple running sum is infinite, the
 * simple sum is returned (19 rows pin this: any infinite or overflowing input).
 */
function compensatedSum(values: readonly number[]): number {
  let sum = 0;
  let compensation = 0;
  let simpleSum = 0;
  for (const value of values) {
    simpleSum += value;
    const corrected = value - compensation;
    const next = sum + corrected;
    compensation = next - sum - corrected;
    sum = next;
  }
  const result = sum - compensation;
  return Number.isNaN(result) && !Number.isFinite(simpleSum) && !Number.isNaN(simpleSum) ? simpleSum : result;
}

/**
 * Selects the attachment target with the best aggregated heuristic result. The matcher results are first aggregated
 * using a configurable aggregation function. Then, the attachment target with the highest result is selected, provided
 * that it is at least as high as or higher than a configurable lower bound.
 *
 * @typeParam T - type of attachment targets.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/AggregatedMatchDecider.java
 */
export class AggregatedMatchDecider<T> implements IDecider<T> {
  private aggregator: Aggregator = AggregatedMatchDecider.max;
  private lowerBoundary = 0.0;
  private includeLowerBoundary = false;

  /**
   * Configures the attachment decider to use the given function to aggregate heuristic results.
   *
   * @param f - the aggregator to use; its values must not be negative.
   * @returns this object for method chaining.
   * @throws TypeError if the function is null (Java: `Objects.requireNonNull` NPE, D10).
   */
  withAggregator(f: Aggregator): this {
    if ((f as Aggregator | null) === null) {
      throw new TypeError('Aggregator cannot be null.');
    }
    this.aggregator = f;
    return this;
  }

  /**
   * Configures the lower boundary imposed on attachability decisions.
   *
   * @param lower - the lower boundary, `>= 0`.
   * @returns this object for method chaining.
   * @throws IllegalArgumentException if the lower boundary is `< 0`.
   */
  withLowerAttachmentBoundary(lower: number): this {
    if (lower < 0) {
      throw new IllegalArgumentException('Lower boundary must be >= 0.');
    }
    this.lowerBoundary = lower;
    return this;
  }

  /**
   * Configures whether an aggregate exactly equal to the lower boundary is accepted.
   *
   * @param include - true if the lower boundary should be included.
   * @returns this object for method chaining.
   */
  withLowerBoundaryIncluded(include: boolean): this {
    this.includeLowerBoundary = include;
    return this;
  }

  /** @inheritdoc */
  makeAttachmentDecision(normalizedHeuristics: Map<T, Map<MatcherClass<T>, number>>): T | null {
    let max = Number.NEGATIVE_INFINITY;
    let maxTarget: T | null = null;

    // AD-10/P2: Java's identity-hashed HashMap iterates in hash order; Map insertion order (candidate order) here.
    for (const [target, results] of normalizedHeuristics) {
      const aggregate = this.aggregator([...results.values()]);
      if (aggregate < 0) {
        throw new IllegalStateException('The aggregator provided a value < 0.');
      }

      if (aggregate > max) {
        max = aggregate;
        maxTarget = target;
      }
    }

    if (this.includeLowerBoundary) {
      return max >= this.lowerBoundary ? maxTarget : null;
    }
    return max > this.lowerBoundary ? maxTarget : null;
  }

  /** Aggregator that returns the maximum heuristic result (`Collections.max`: `Double.compareTo` order). */
  static max(values: readonly number[]): number {
    if (values.length === 0) {
      throw new NoSuchElementException();
    }
    let best = values[0] as number;
    for (const value of values) {
      if (compare(value, best) > 0) {
        best = value;
      }
    }
    return best;
  }

  /** Aggregator that returns the minimum heuristic result (`Collections.min`: `Double.compareTo` order). */
  static min(values: readonly number[]): number {
    if (values.length === 0) {
      throw new NoSuchElementException();
    }
    let best = values[0] as number;
    for (const value of values) {
      if (compare(value, best) < 0) {
        best = value;
      }
    }
    return best;
  }

  /** Aggregator that returns the average over all heuristic results (0 for an empty collection). */
  static avg(values: readonly number[]): number {
    return values.length === 0 ? 0 : compensatedSum(values) / values.length;
  }

  /** Aggregator that returns the sum of all heuristic results. */
  static sum(values: readonly number[]): number {
    return compensatedSum(values);
  }
}
