// SPDX-License-Identifier: EPL-2.0
import { equalsIgnoreCase } from './JavaString.js';

const TRUE_TEXT = 'true';

/**
 * `Boolean.valueOf(String)`: true when the argument is not null and equal, ignoring case, to `"true"`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Boolean.html#valueOf(java.lang.String)
 */
export function valueOf(s: string | null): boolean {
  return s !== null && equalsIgnoreCase(s, TRUE_TEXT);
}
