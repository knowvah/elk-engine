// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";

/**
 * Splits on a literal, non-empty separator, keeping empty segments (Guava's default).
 * `split` is eager and returns a re-iterable `readonly string[]`.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Splitter.html
 */
export class Splitter {
  readonly #separator: string;

  constructor(separator: string) {
    this.#separator = separator;
  }

  /** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Splitter.html#split(java.lang.CharSequence) */
  split(sequence: string): Iterable<string> & readonly string[] {
    return sequence.split(this.#separator);
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/base/Splitter.html#on(java.lang.String) */
export function on(separator: string): Splitter {
  if (separator.length === 0) {
    throw new IllegalArgumentException("The separator may not be the empty string.");
  }
  return new Splitter(separator);
}
