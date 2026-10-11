// SPDX-License-Identifier: EPL-2.0
import { compare } from '../java/lang/DoubleCompare.js';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';

function checkTolerance(tolerance: number): void {
  // `!(tolerance >= 0)` also rejects NaN.
  if (!(tolerance >= 0)) {
    throw new IllegalArgumentException(`tolerance (${tolerance}) must be >= 0`);
  }
}

/**
 * `Math.abs(a - b) <= tolerance || Double.valueOf(a).equals(Double.valueOf(b))`:
 * all NaNs are equal, positive and negative zero are equal. Throws
 * {@link IllegalArgumentException} if `tolerance` is negative or NaN. Not transitive.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/math/DoubleMath.html#fuzzyEquals(double,double,double)
 */
export function fuzzyEquals(a: number, b: number, tolerance: number): boolean {
  checkTolerance(tolerance);
  // `a === b` covers equal infinities (where a - b is NaN); the NaN pair mirrors Double.equals.
  return Math.abs(a - b) <= tolerance || a === b || (Number.isNaN(a) && Number.isNaN(b));
}

/**
 * `fuzzyEquals(a, b, tolerance) ? 0 : Double.compare(a, b)`. Not a total order and not
 * transitive: never use it as a sort comparator.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/math/DoubleMath.html#fuzzyCompare(double,double,double)
 */
export function fuzzyCompare(a: number, b: number, tolerance: number): -1 | 0 | 1 {
  return fuzzyEquals(a, b, tolerance) ? 0 : compare(a, b);
}
