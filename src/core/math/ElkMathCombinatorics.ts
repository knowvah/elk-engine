// SPDX-License-Identifier: EPL-2.0
import * as Float32 from '../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import * as Int32 from '../../java/lang/Int32.js';
import * as Int64 from '../../java/lang/Int64.js';

/**
 * Combinatorics section of `ElkMath`: factorials, binomial coefficients and integer powers.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */

/** table of precomputed factorial values. */
export const FACT_TABLE: readonly bigint[] = [
  1n,
  1n,
  2n,
  6n,
  24n,
  120n,
  720n,
  5040n,
  40320n,
  362880n,
  3628800n,
  39916800n,
  479001600n,
  6227020800n,
  87178291200n,
  1307674368000n,
  20922789888000n,
  355687428096000n,
  6402373705728000n,
  121645100408832000n,
  2432902008176640000n,
];

/**
 * The factorial of an integer x as long value. This method always returns the exact value for x
 * between 0 and 20.
 *
 * @throws IllegalArgumentException if x<0 or x>20
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function factl(x: number): bigint {
  // IllegalArgumentException when x not between 0 and 20
  if (x < 0 || x >= FACT_TABLE.length) {
    throw new IllegalArgumentException(`The input must be between 0 and ${FACT_TABLE.length}`);
  }
  // return the appropriate value from FACT_TABLE with index x
  return FACT_TABLE[x]!;
}

/**
 * The factorial of an integer x as double value. If x>26 then the result is Infinity. Exact for
 * small input values, Stirling's approximation for large ones.
 *
 * @throws IllegalArgumentException if x<0
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function factd(x: number): number {
  // IllegalArgumentException when x < 0
  if (x < 0) {
    throw new IllegalArgumentException('The input must be positive');
  } else if (x < FACT_TABLE.length) {
    return Number(FACT_TABLE[x]!);
  } else {
    return Math.sqrt(2.0 * Math.PI * x) * (powf(x, x) / powd(Math.E, x));
  }
}

/**
 * The binomial coefficient of integers n and k as long value. Exact, but may take very long for
 * large input values.
 *
 * @throws IllegalArgumentException if n < 0 or k < 0 or k > n
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function binomiall(n: number, k: number): bigint {
  if (n < 0 || k < 0) {
    throw new IllegalArgumentException('k and n must be positive');
  } else if (k > n) {
    throw new IllegalArgumentException('k must be smaller than n');
  } else if (k === 0 || k === n) {
    return 1n;
  } else if (n === 0) {
    return 0n;
  } else if (n < FACT_TABLE.length) {
    return Int64.div(factl(n), Int64.mul(factl(k), factl(n - k)));
  } else {
    return Int64.add(binomiall(n - 1, k - 1), binomiall(n - 1, k));
  }
}

/**
 * The binomial coefficient of integers n and k as double value. Exact for small input values,
 * an approximation for large ones.
 *
 * @throws IllegalArgumentException if n < 0 or k < 0 or k > n
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function binomiald(n: number, k: number): number {
  if (n < 0 || k < 0) {
    throw new IllegalArgumentException('k and n must be positive');
  } else if (k > n) {
    throw new IllegalArgumentException('k must be smaller than n');
  } else if (k === 0 || k === n) {
    return 1;
  } else if (n === 0) {
    return 0;
  } else {
    return factd(n) / (factd(k) * factd(n - k));
  }
}

/**
 * The first argument raised to the power of the second argument.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function powd(a: number, b: number): number {
  let result = 1.0;
  let base = a;
  let exp = b >= 0 ? b : -b;
  while (exp > 0) {
    if (Int32.rem(exp, 2) === 0) {
      base *= base;
      exp = Int32.div(exp, 2);
    } else {
      result *= base;
      exp -= 1;
    }
  }
  if (b < 0) {
    return 1.0 / result;
  } else {
    return result;
  }
}

/**
 * The first argument raised to the power of the second argument, computed in `float` arithmetic.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function powf(a: number, b: number): number {
  let result = 1.0;
  let base = Float32.fromDouble(a);
  let exp = b >= 0 ? b : -b;
  while (exp > 0) {
    if (Int32.rem(exp, 2) === 0) {
      base = Float32.mul(base, base);
      exp = Int32.div(exp, 2);
    } else {
      result = Float32.mul(result, base);
      exp -= 1;
    }
  }
  if (b < 0) {
    return Float32.div(1.0, result);
  } else {
    return result;
  }
}
