// SPDX-License-Identifier: EPL-2.0
import { add, mul } from './Int32.js';

const HASH_MULTIPLIER = 31;

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
