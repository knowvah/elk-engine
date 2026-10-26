// SPDX-License-Identifier: EPL-2.0
import * as DoubleMath from '../../../../guava/DoubleMath.js';

/** Epsilon for double compares. */
const TOLERANCE = 0.0001;

/**
 * Internal class for tolerance affected double comparisons (Java `CompareFuzzy`, a static-only class).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CompareFuzzy.java
 */
export class CompareFuzzy {
  /** Epsilon for double compares. */
  static readonly TOLERANCE: number = TOLERANCE;

  private constructor() {}

  static eq(d1: number, d2: number): boolean {
    return DoubleMath.fuzzyEquals(d1, d2, TOLERANCE);
  }

  static gt(d1: number, d2: number): boolean {
    return DoubleMath.fuzzyCompare(d1, d2, TOLERANCE) > 0;
  }

  static lt(d1: number, d2: number): boolean {
    return DoubleMath.fuzzyCompare(d1, d2, TOLERANCE) < 0;
  }

  static ge(d1: number, d2: number): boolean {
    return DoubleMath.fuzzyCompare(d1, d2, TOLERANCE) >= 0;
  }

  static le(d1: number, d2: number): boolean {
    return DoubleMath.fuzzyCompare(d1, d2, TOLERANCE) <= 0;
  }
}
