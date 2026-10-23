// SPDX-License-Identifier: EPL-2.0

/**
 * Partial port of ElkMath, a collection of static math helpers.
 *
 * Ported so far: `boundi` (D5), needed by `RandomGraphGenerator`. The other
 * members have no in-scope caller yet and are added when one is ported.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */

/**
 * Limit the given integer to a specific range.
 *
 * @param x an integer value
 * @param lower the lower limit
 * @param upper the upper limit
 * @returns if x is beyond the limits, return the limit, otherwise just return x
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function boundi(x: number, lower: number, upper: number): number {
  if (x <= lower) {
    return lower;
  } else if (x >= upper) {
    return upper;
  }
  return x;
}

/**
 * The public statics of Java's `ElkMath` ported so far (D5: mission 4f ports `boundi` only).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export const ElkMath = { boundi } as const;
