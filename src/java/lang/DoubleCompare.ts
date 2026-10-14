// SPDX-License-Identifier: EPL-2.0

/**
 * Total ordering of doubles: -0.0 < 0.0, NaN equals itself and is greater
 * than every other value including +Infinity.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#compare(double,double)
 */
export function compare(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return compareTies(a, b);
}

/** Equal, unordered (NaN), or a zero pair: resolved via the total order. */
function compareTies(a: number, b: number): -1 | 0 | 1 {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN || bNaN) return aNaN === bNaN ? 0 : aNaN ? 1 : -1;
  if (a === 0 && b === 0) {
    const aNeg = Object.is(a, -0);
    const bNeg = Object.is(b, -0);
    return aNeg === bNeg ? 0 : aNeg ? -1 : 1;
  }
  return 0;
}
