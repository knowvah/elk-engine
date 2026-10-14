// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../lang/DoubleCompare.js';
import { identityHashCode } from '../lang/IdentityHashCode.js';
import * as JavaDouble from '../lang/JavaDouble.js';
import * as JavaInteger from '../lang/JavaInteger.js';
import * as JavaString from '../lang/JavaString.js';

/**
 * The key protocol of {@link JavaHashMap}: Java's `hashCode()` / `equals(Object)` pair, made
 * explicit because a JS `number` cannot tell `Integer` from `Double` hashing (decision M2).
 * `compare` is present exactly when the Java key class implements `Comparable` of itself;
 * `HashMap` "may use comparison order among keys to help break ties", and the vectors show the
 * tie order of colliding keys depends on it.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Comparable.html
 */
export interface HashStrategy<K> {
  hash(k: K): number;
  equals(a: K, b: K): boolean;
  compare?(a: K, b: K): number;
}

/**
 * `String` keys: `String.hashCode`, `String.equals`, `String.compareTo` (UTF-16 code units).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#compareTo(java.lang.String)
 */
export const STRING: HashStrategy<string> = {
  hash: (k) => JavaString.hashCode(k),
  equals: (a, b) => a === b,
  compare: (a, b) => compareCodeUnits(a, b),
};

/**
 * `Integer` keys: hash is the value; `Integer.compareTo`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#hashCode()
 */
export const INTEGER: HashStrategy<number> = {
  hash: (k) => JavaInteger.hashCode(k),
  equals: (a, b) => a === b,
  compare: (a, b) => Math.sign(a - b),
};

/**
 * `Double` keys: `Double.hashCode`; equality by `doubleToLongBits` (NaN equals NaN, `0.0 != -0.0`).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#equals(java.lang.Object)
 */
export const DOUBLE: HashStrategy<number> = {
  hash: (k) => JavaDouble.hashCode(k),
  equals: (a, b) => JavaDouble.doubleToLongBits(a) === JavaDouble.doubleToLongBits(b),
  compare: (a, b) => DoubleCompare.compare(a, b),
};

/**
 * Keys that carry their own `hashCode()` and `equals(Object)`. Not `Comparable`; spread the result
 * and add `compare` for a key class that implements `Comparable` of itself.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)
 */
export function hashable<K extends { hashCode(): number; equals(o: unknown): boolean }>(): HashStrategy<K> {
  return {
    hash: (k) => k.hashCode(),
    equals: (a, b) => a.equals(b),
  };
}

/**
 * Keys without their own `hashCode`/`equals` (the ElkGraph classes, AD-10): `Object.hashCode()` and
 * `Object.equals`, i.e. identity.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()
 */
export function identity<K extends object>(): HashStrategy<K> {
  return { hash: (k) => identityHashCode(k), equals: (a, b) => a === b };
}

function compareCodeUnits(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
