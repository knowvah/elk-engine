// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Strings.html#isNullOrEmpty(java.lang.String) */
export function isNullOrEmpty(string: string | null | undefined): boolean {
  return string === null || string === undefined || string.length === 0;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Strings.html#repeat(java.lang.String,int) */
export function repeat(string: string, count: number): string {
  if (count < 0) {
    throw new IllegalArgumentException(`invalid count: ${count}`);
  }
  return string.repeat(count);
}
