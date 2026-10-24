// SPDX-License-Identifier: EPL-2.0
import * as Float32 from '../../java/lang/Float32.js';
import * as Int32 from '../../java/lang/Int32.js';
import * as Int64 from '../../java/lang/Int64.js';
import * as JavaInteger from '../../java/lang/JavaInteger.js';
import type { KVector } from './KVector.js';

/**
 * Aggregate section of `ElkMath`: max, min, average, bound, clipVector and signum.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */

/** `Float.MAX_VALUE`. */
const FLOAT_MAX_VALUE = 3.4028234663852886e38;
/** `Double.MAX_VALUE`. */
const DOUBLE_MAX_VALUE = Number.MAX_VALUE;

/**
 * Determine the maximal value of the given integers.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function maxi(...values: number[]): number {
  let max = JavaInteger.MIN_VALUE;
  for (const v of values) {
    if (v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * Determine the minimal value of the given integers.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function mini(...values: number[]): number {
  let min = JavaInteger.MAX_VALUE;
  for (const v of values) {
    if (v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * Determine the average value of the given integers (truncating division).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function averagei(...values: number[]): number {
  let avg = 0;
  for (const v of values) {
    avg = Int32.add(avg, v);
  }
  return Int32.div(avg, values.length);
}

/**
 * Determine the maximal value of the given longs. The start value is `Integer.MIN_VALUE`, as in
 * the Java.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function maxl(...values: bigint[]): bigint {
  let max = BigInt(JavaInteger.MIN_VALUE);
  for (const v of values) {
    if (v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * Determine the minimal value of the given longs. The start value is `Integer.MAX_VALUE`, as in
 * the Java.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function minl(...values: bigint[]): bigint {
  let min = BigInt(JavaInteger.MAX_VALUE);
  for (const v of values) {
    if (v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * Determine the average value of the given longs (truncating division).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function averagel(...values: bigint[]): bigint {
  let avg = 0n;
  for (const v of values) {
    avg = Int64.add(avg, v);
  }
  return Int64.div(avg, values.length);
}

/**
 * Determine the maximal value of the given floats.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function maxf(...values: number[]): number {
  let max = -FLOAT_MAX_VALUE;
  for (const v of values) {
    if (v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * Determine the minimal value of the given floats.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function minf(...values: number[]): number {
  let min = FLOAT_MAX_VALUE;
  for (const v of values) {
    if (v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * Determine the average value of the given floats.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function averagef(...values: number[]): number {
  let avg = 0;
  for (const v of values) {
    avg = Float32.add(avg, v);
  }
  return Float32.div(avg, values.length);
}

/**
 * Determine the maximal value of the given doubles.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function maxd(...values: number[]): number {
  let max = -DOUBLE_MAX_VALUE;
  for (const v of values) {
    if (v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * Determine the minimal value of the given doubles.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function mind(...values: number[]): number {
  let min = DOUBLE_MAX_VALUE;
  for (const v of values) {
    if (v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * Determine the average value of the given doubles.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function averaged(...values: number[]): number {
  let avg = 0;
  for (const v of values) {
    avg += v;
  }
  return avg / values.length;
}

/**
 * Limit the given integer to a specific range.
 *
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
 * Limit the given long to a specific range.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function boundl(x: bigint, lower: bigint, upper: bigint): bigint {
  if (x <= lower) {
    return lower;
  } else if (x >= upper) {
    return upper;
  }
  return x;
}

/**
 * Limit the given float to a specific range.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function boundf(x: number, lower: number, upper: number): number {
  if (x <= lower) {
    return lower;
  } else if (x >= upper) {
    return upper;
  }
  return x;
}

/**
 * Limit the given double to a specific range.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function boundd(x: number, lower: number, upper: number): number {
  if (x <= lower) {
    return lower;
  } else if (x >= upper) {
    return upper;
  }
  return x;
}

/**
 * Clip the given vector so it fits into a rectangle of the given size centred at the origin.
 *
 * @returns the same (modified) vector
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function clipVector(v: KVector, width: number, height: number): KVector {
  const wh = width / 2;
  const hh = height / 2;
  const absx = Math.abs(v.x);
  const absy = Math.abs(v.y);
  let xscale = 1;
  let yscale = 1;
  if (absx > wh) {
    xscale = wh / absx;
  }
  if (absy > hh) {
    yscale = hh / absy;
  }
  v.scale(Math.min(xscale, yscale));
  return v;
}

/**
 * The sign of the given double: -1, 0 or 1 (0 for NaN).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java
 */
export function signum(x: number): number {
  if (x < 0) {
    return -1;
  }
  if (x > 0) {
    return 1;
  }
  return 0;
}
