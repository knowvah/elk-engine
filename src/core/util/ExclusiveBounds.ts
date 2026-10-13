// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import * as JavaDouble from '../../java/lang/JavaDouble.js';

/**
 * Lower bound that does not include the limit.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ExclusiveBounds.java
 */
class ExclusiveLowerBound implements Comparable<number> {
  private readonly exclusiveLowerBound: number;

  /** Create an exclusive lower bound. */
  constructor(exclusiveLowerBound: number) {
    this.exclusiveLowerBound = exclusiveLowerBound;
  }

  compareTo(x: number): number {
    if (this.exclusiveLowerBound < x) {
      return -1;
    }
    return 1;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof ExclusiveLowerBound) {
      return this.exclusiveLowerBound === obj.exclusiveLowerBound;
    }
    return false;
  }

  hashCode(): number {
    return JavaDouble.hashCode(this.exclusiveLowerBound);
  }

  toString(): string {
    return `${DoubleToString.toString(this.exclusiveLowerBound)} (exclusive)`;
  }
}

/**
 * Upper bound that does not include the limit.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ExclusiveBounds.java
 */
class ExclusiveUpperBound implements Comparable<number> {
  private readonly exclusiveUpperBound: number;

  /** Create an exclusive upper bound. */
  constructor(exclusiveUpperBound: number) {
    this.exclusiveUpperBound = exclusiveUpperBound;
  }

  compareTo(x: number): number {
    if (this.exclusiveUpperBound > x) {
      return 1;
    }
    return -1;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof ExclusiveUpperBound) {
      return this.exclusiveUpperBound === obj.exclusiveUpperBound;
    }
    return false;
  }

  hashCode(): number {
    return JavaDouble.hashCode(this.exclusiveUpperBound);
  }

  toString(): string {
    return `${DoubleToString.toString(this.exclusiveUpperBound)} (exclusive)`;
  }
}

/**
 * Utility {@link Comparable} implementations that can be used to specify exclusive upper and lower
 * bounds for layout options. For instance, a layout option whose values may be in the range (0, 1)
 * could be specified with the lower bound `greaterThan(0)` and the upper bound `lessThan(1)`.
 *
 * For inclusive bounds, you can simply use the numbers themselves as lower and upper bounds.
 *
 * The nested classes are `static readonly` members (C3). The Java `Number` parameter of
 * `compareTo` is a `number`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ExclusiveBounds.java
 */
export class ExclusiveBounds {
  static readonly ExclusiveLowerBound: typeof ExclusiveLowerBound = ExclusiveLowerBound;
  static readonly ExclusiveUpperBound: typeof ExclusiveUpperBound = ExclusiveUpperBound;

  // Hidden constructor to avoid instantiation.
  private constructor() {}

  /**
   * Create a lower bound that does not include the limit.
   *
   * @param exclusiveLowerBound the lower bound
   * @returns a comparable that excludes the given lower bound
   */
  static greaterThan(exclusiveLowerBound: number): Comparable<number> {
    return new ExclusiveLowerBound(exclusiveLowerBound);
  }

  /**
   * Create an upper bound that does not include the limit.
   *
   * @param exclusiveUpperBound the upper bound
   * @returns a comparable that excludes the given upper bound
   */
  static lessThan(exclusiveUpperBound: number): Comparable<number> {
    return new ExclusiveUpperBound(exclusiveUpperBound);
  }
}
