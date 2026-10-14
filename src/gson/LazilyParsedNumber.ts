// SPDX-License-Identifier: EPL-2.0
import { parseDouble } from '../java/lang/JavaDouble.js';

/** The part of `java.lang.Number` that graph.json and the writer use: the double value and the text. */
export interface JavaNumber {
  doubleValue(): number;
  toString(): string;
}

/**
 * A number kept as its source text (J2); converted on demand: `doubleValue` is `Double.parseDouble`.
 * (`intValue`/`longValue` are not ported: nothing in graph.json calls them.)
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/internal/LazilyParsedNumber.html
 */
export class LazilyParsedNumber implements JavaNumber {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  doubleValue(): number {
    return parseDouble(this.value);
  }

  toString(): string {
    return this.value;
  }
}
