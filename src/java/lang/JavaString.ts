// SPDX-License-Identifier: EPL-2.0
import { add, mul } from './Int32.js';
import { toLowerCase, toUpperCase } from './JavaCharacter.js';

const HASH_MULTIPLIER = 31;

/** Largest code point stored in a single UTF-16 code unit. */
const MAX_BMP = 0xffff;

/** Code units up to and including this one are stripped by `String.trim`. */
const TRIM_LIMIT = 0x20;

/**
 * `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]` over UTF-16 code units, in
 * int32 wrapping arithmetic.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#hashCode()
 */
export function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = add(mul(HASH_MULTIPLIER, h), s.charCodeAt(i));
  }
  return h;
}

/**
 * `String.compareTo`: the difference of the first differing UTF-16 code units, else the difference of
 * the lengths.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#compareTo(java.lang.String)
 */
export function compareTo(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  for (let k = 0; k < limit; k++) {
    const c1 = a.charCodeAt(k);
    const c2 = b.charCodeAt(k);
    if (c1 !== c2) {
      return c1 - c2;
    }
  }
  return a.length - b.length;
}

/**
 * `String.split(regex)` for a regex without a zero-width match: when the input contains a match,
 * trailing empty strings are removed (leading and inner ones are kept); when it contains none, the
 * result is the input itself. JS `split` differs only in keeping the trailing empty strings.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#split(java.lang.String)
 */
export function split(input: string, pattern: RegExp): string[] {
  const parts = input.split(pattern);
  if (parts.length === 1) {
    return parts;
  }
  let size = parts.length;
  while (size > 0 && parts[size - 1] === '') {
    size--;
  }
  return parts.slice(0, size);
}

/**
 * `String.trim`: strips code units up to U+0020 from both ends (JS `trim` also strips Unicode
 * whitespace above U+0020 and leaves control characters below it).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#trim()
 */
export function trim(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) <= TRIM_LIMIT) {
    start++;
  }
  while (end > start && s.charCodeAt(end - 1) <= TRIM_LIMIT) {
    end--;
  }
  return s.slice(start, end);
}

/** True when both code points are equal after `toUpperCase`, or after `toLowerCase` of that. */
function sameIgnoringCase(c1: number, c2: number): boolean {
  if (c1 === c2) {
    return true;
  }
  const u1 = toUpperCase(c1);
  const u2 = toUpperCase(c2);
  return u1 === u2 || toLowerCase(u1) === toLowerCase(u2);
}

/**
 * `String.equalsIgnoreCase`: the strings have the same number of code points and each pair is the
 * same, or equal after `Character.toUpperCase`, or equal after `Character.toLowerCase` of that.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#equalsIgnoreCase(java.lang.String)
 */
export function equalsIgnoreCase(a: string, b: string): boolean {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const c1 = a.codePointAt(i)!;
    const c2 = b.codePointAt(j)!;
    if (!sameIgnoringCase(c1, c2)) {
      return false;
    }
    i += c1 > MAX_BMP ? 2 : 1;
    j += c2 > MAX_BMP ? 2 : 1;
  }
  return i === a.length && j === b.length;
}
