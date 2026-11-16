// SPDX-License-Identifier: EPL-2.0
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';

/**
 * `values.stream().mapToDouble(Double::doubleValue).average().getAsDouble()`, the call of `EdgeRouter.java:313-315, 328-330`.
 *
 * The Javadoc of `DoubleStream.sum()`/`average()` allows compensated summation and discusses non-finite values; the algorithm is
 * not read from the JDK (AD-9) but matched against the JVM vectors of `test/golden/refs/java/mrtree-units.json` (group
 * `average`, 2,170 rows, bit-exact): Kahan summation whose result is `sum - compensation`, with the simple left-to-right sum used
 * instead when the compensated sum is NaN while the simple sum is not finite (an infinity absorbs the compensation term).
 *
 * @param values the stream elements, in encounter order
 * @return the arithmetic mean
 * @throws NoSuchElementException when the stream is empty (`OptionalDouble.getAsDouble()` of an empty optional)
 */
export function doubleStreamAverage(values: readonly number[]): number {
  if (values.length === 0) {
    throw new NoSuchElementException('No value present');
  }
  let simple = 0;
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    simple += value;
    const y = value - compensation;
    const t = sum + y;
    compensation = t - sum - y;
    sum = t;
  }
  const compensated = sum - compensation;
  return (Number.isNaN(compensated) && !Number.isFinite(simple) ? simple : compensated) / values.length;
}
