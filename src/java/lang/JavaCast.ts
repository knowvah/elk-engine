// SPDX-License-Identifier: EPL-2.0
import { ClassCastException } from './ClassCastException.js';

/**
 * Java's checked cast `(T) value` where TypeScript has lost the static type (an erased generic reached through
 * an `unknown` boundary): null passes, a value that is not a `T` throws a {@link ClassCastException}. The JDK's
 * message is unspecified; this one names the JavaScript type and the target class.
 *
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.5
 */
export function checkCast<T>(value: unknown, isInstance: (v: unknown) => v is T, javaName: string): T | null {
  if (value === null || isInstance(value)) {
    return value;
  }
  throw new ClassCastException(`value of type ${typeof value} cannot be cast to class ${javaName}`);
}

/** `instanceof String`. */
export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/** `instanceof Integer` or `instanceof Double`: a `number` cannot tell the two boxes apart. */
export function isNumber(v: unknown): v is number {
  return typeof v === 'number';
}
