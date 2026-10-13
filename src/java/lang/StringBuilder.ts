// SPDX-License-Identifier: EPL-2.0

/** The text Java's `String.valueOf(Object)` produces for a `null` reference. */
const NULL_TEXT = 'null';

/**
 * A mutable sequence of UTF-16 code units. Only the members the port uses are present. Java's
 * `append` overloads are split by argument type because TypeScript cannot overload by type:
 * `append(String)` is {@link StringBuilder.append}, `append(char)` is {@link StringBuilder.appendChar}
 * and `append(Object)` is {@link StringBuilder.appendObject}.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html
 */
export class StringBuilder {
  #content = '';

  /**
   * Appends the string; `null` appends the four characters `null`.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html#append(java.lang.String)
   */
  append(value: string | null): this {
    this.#content += value ?? NULL_TEXT;
    return this;
  }

  /**
   * Appends the character with the given UTF-16 code unit.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html#append(char)
   */
  appendChar(codeUnit: number): this {
    this.#content += String.fromCharCode(codeUnit);
    return this;
  }

  /**
   * Appends `String.valueOf(value)`: `null` and `undefined` give `null`, anything else its
   * `toString()`.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html#append(java.lang.Object)
   */
  appendObject(value: unknown): this {
    this.#content += value === null || value === undefined ? NULL_TEXT : String(value);
    return this;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html#toString() */
  toString(): string {
    return this.#content;
  }
}
