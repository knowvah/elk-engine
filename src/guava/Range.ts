// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';

/** Endpoint types ordered by the JS `<` operator (numbers, bigints, strings by UTF-16 units). */
export type Comparable = number | bigint | string;

/**
 * An immutable closed interval `[lower..upper]`.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Range.html
 */
export class Range<C extends Comparable> {
  readonly #lower: C;
  readonly #upper: C;

  constructor(lower: C, upper: C) {
    this.#lower = lower;
    this.#upper = upper;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Range.html#lowerEndpoint() */
  lowerEndpoint(): C {
    return this.#lower;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Range.html#upperEndpoint() */
  upperEndpoint(): C {
    return this.#upper;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Range.html#contains(C) */
  contains(value: C): boolean {
    return value >= this.#lower && value <= this.#upper;
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Range.html#closed(C,C) */
export function closed(lower: number, upper: number): Range<number>;
export function closed(lower: bigint, upper: bigint): Range<bigint>;
export function closed(lower: string, upper: string): Range<string>;
export function closed(lower: Comparable, upper: Comparable): Range<Comparable> {
  if (lower > upper) {
    throw new IllegalArgumentException(`Invalid range: ${String(lower)}..${String(upper)}`);
  }
  return new Range(lower, upper);
}
