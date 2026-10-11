// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../java/lang/DoubleToString.js';

function nullElementMessage(index: number): string {
  return `null element at index ${index}`;
}

/**
 * Joins elements with a fixed separator. Element convention (a JS `number` cannot tell Java
 * `int` from `double`): {@link Joiner.join} renders each element as `String(element)`, i.e.
 * strings as-is and objects through their `toString()`; {@link Joiner.joinDoubles} renders
 * numbers with Java `Double.toString`. A `null` or `undefined` element throws `TypeError`
 * (Java: NullPointerException; `skipNulls`/`useForNull` are not ported).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Joiner.html
 */
export class Joiner {
  readonly #separator: string;

  constructor(separator: string) {
    this.#separator = separator;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Joiner.html#join(java.lang.Iterable) */
  join(parts: Iterable<unknown>): string {
    const rendered: string[] = [];
    for (const part of parts) {
      if (part === null || part === undefined) {
        throw new TypeError(nullElementMessage(rendered.length));
      }
      rendered.push(String(part));
    }
    return rendered.join(this.#separator);
  }

  /**
   * `join` for Java `double` elements: each number is rendered with `Double.toString`.
   *
   * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Joiner.html#join(java.lang.Iterable)
   */
  joinDoubles(parts: Iterable<number>): string {
    return [...parts].map(doubleToString).join(this.#separator);
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Joiner.html#on(java.lang.String) */
export function on(separator: string): Joiner {
  return new Joiner(separator);
}
