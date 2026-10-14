// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../lang/DoubleToString.js';
import { identityHashCode } from '../lang/IdentityHashCode.js';
import * as JavaDouble from '../lang/JavaDouble.js';
import * as JavaInteger from '../lang/JavaInteger.js';
import * as JavaString from '../lang/JavaString.js';

/** The Java `Boolean.hashCode()` values. */
const BOOLEAN_TRUE_HASH = 1231;
const BOOLEAN_FALSE_HASH = 1237;

const NULL_TEXT = 'null';

function hasMethod(o: object, name: 'equals' | 'hashCode'): boolean {
  return name in o && typeof (o as Record<string, unknown>)[name] === 'function';
}

/** A number is an `Integer` when it is an int32 and a `Double` otherwise: JS cannot tell them apart. */
function isInt32(a: number): boolean {
  return Number.isInteger(a) && (a | 0) === a;
}

/**
 * `Objects.equals(a, b)`: `null` equals only `null`; otherwise `a.equals(b)`, which is the value
 * `equals` when the object defines one, else identity (`Object.is`, so `NaN` equals `NaN` as for
 * `Double.equals`).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html#equals(java.lang.Object,java.lang.Object)
 */
export function equals(a: unknown, b: unknown): boolean {
  if (a === null) {
    return b === null;
  }
  if (typeof a === 'object' && hasMethod(a, 'equals')) {
    return (a as { equals(o: unknown): boolean }).equals(b);
  }
  return Object.is(a, b);
}

/**
 * `Objects.hashCode(o)`: 0 for `null`, else `o.hashCode()`. Strings, int32 numbers (`Integer`),
 * other numbers (`Double`) and booleans use the Java wrapper hashes; objects use their own
 * `hashCode()` or the identity hash.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html#hashCode(java.lang.Object)
 */
export function hashCode(o: unknown): number {
  switch (typeof o) {
    case 'string':
      return JavaString.hashCode(o);
    case 'number':
      return isInt32(o) ? JavaInteger.hashCode(o) : JavaDouble.hashCode(o);
    case 'boolean':
      return o ? BOOLEAN_TRUE_HASH : BOOLEAN_FALSE_HASH;
    default:
      if (o === null) {
        return 0;
      }
      return hasMethod(o as object, 'hashCode')
        ? (o as { hashCode(): number }).hashCode()
        : identityHashCode(o as object);
  }
}

/**
 * `Objects.toString(o)`: `"null"` for `null`, else `String.valueOf(o)`; numbers as in
 * {@link hashCode} (`Integer` or `Double` text).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html#toString(java.lang.Object)
 */
export function toString(o: unknown): string {
  if (o === null) {
    return NULL_TEXT;
  }
  if (typeof o === 'number' && !isInt32(o)) {
    return DoubleToString.toString(o);
  }
  return String(o);
}
