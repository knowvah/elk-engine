// SPDX-License-Identifier: EPL-2.0
import { JavaStringConverter } from './JavaStringConverter.js';

/*
 * The static members of Xtext's `Strings` that the ElkGraph text support reaches. Consumers
 * `import * as Strings from '.../util/Strings.js'`. The rest of the class is not ported.
 */

const CONVERTER = new JavaStringConverter();

/** @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:27 */
export const EMPTY_ARRAY: readonly string[] = [];

/**
 * `String.valueOf(Object)`: `null` (and `undefined`) give the text `null`.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:39-41
 */
export function notNull(o: unknown): string {
  return o === null || o === undefined ? 'null' : String(o);
}

/** @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:96-98 */
export function isEmpty(s: string | null | undefined): s is null | undefined | '' {
  return s === null || s === undefined || s === '';
}

/**
 * Resolve Java control character sequences with to the actual character value.
 * Optionally handle unicode escape sequences, too.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:132-134
 */
export function convertFromJavaString(string: string, useUnicode: boolean): string {
  return CONVERTER.convertFromJavaString(string, useUnicode);
}

/**
 * Escapes control characters with a preceding backslash. With `useUnicode` (the default, as in the
 * one-argument Java overload) special chars are encoded as unicode escape sequences.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:142-154
 */
export function convertToJavaString(input: string, useUnicode = true): string {
  return CONVERTER.convertToJavaString(input, useUnicode);
}

/** @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:156-158 */
export function toHex(i: number): number {
  return CONVERTER.toHex(i);
}

/**
 * Splits `value` around the (non-regular-expression) `delimiter`; trailing empty segments are dropped,
 * interior ones are kept. One function serves both Java overloads `split(String, String)` (181-208) and
 * `split(String, char)` (231-258), whose behaviour is identical.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:181-208
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java:231-258
 */
export function split(value: string, delimiter: string): string[] {
  const result: string[] = [];
  let lastIndex = 0;
  let index = value.indexOf(delimiter, lastIndex);
  let pendingEmptyStrings = 0;
  while (index !== -1) {
    const addMe = value.substring(lastIndex, index);
    if (addMe.length === 0) {
      pendingEmptyStrings++;
    } else {
      while (pendingEmptyStrings > 0) {
        result.push('');
        pendingEmptyStrings--;
      }
      result.push(addMe);
    }
    lastIndex = index + delimiter.length;
    index = value.indexOf(delimiter, lastIndex);
  }
  if (lastIndex !== value.length) {
    while (pendingEmptyStrings > 0) {
      result.push('');
      pendingEmptyStrings--;
    }
    result.push(value.substring(lastIndex));
  }
  return result;
}
