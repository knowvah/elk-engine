// SPDX-License-Identifier: EPL-2.0
// JUnit 4 `Assert.assertEquals(String message, double expected, double actual, double delta)` for the ported layout
// suites (mission 7f, T12a). Equal under `Double.compare`, or within `delta`.
import { compare } from '../../src/java/lang/DoubleCompare.js';
import { toString as doubleToString } from '../../src/java/lang/DoubleToString.js';

/** Throws the JUnit failure message unless `actual` equals `expected` (`Double.compare` or `|difference| <= delta`). */
export function assertEqualsWithin(message: string, expected: number, actual: number, delta: number): void {
  if (compare(expected, actual) === 0 || Math.abs(expected - actual) <= delta) {
    return;
  }
  throw new Error(`${message} expected:<${doubleToString(expected)}> but was:<${doubleToString(actual)}>`);
}
