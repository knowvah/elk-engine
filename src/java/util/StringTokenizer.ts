// SPDX-License-Identifier: EPL-2.0
import { NoSuchElementException } from './NoSuchElementException.js';

/**
 * `java.util.StringTokenizer` with the members the graphviz transforms call: the two-argument constructor
 * (delimiters are not returned as tokens), `hasMoreTokens()` and `nextToken()`. A token is a maximal run of
 * characters that are not delimiters. Every delimiter in use is a single BMP character, so the delimiter test
 * is per UTF-16 code unit and a surrogate is never a delimiter.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/StringTokenizer.html
 */
export class StringTokenizer {
  private currentPosition = 0;
  private readonly str: string;
  private readonly delimiters: string;

  /**
   * A tokenizer of `str` whose delimiters are the characters of `delim`; delimiters are not returned as tokens.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/StringTokenizer.html#%3Cinit%3E(java.lang.String,java.lang.String)
   */
  constructor(str: string, delim: string) {
    this.str = str;
    this.delimiters = delim;
  }

  /** The first position at or after `position` that is not a delimiter (or the length). */
  private skipDelimiters(position: number): number {
    let p = position;
    while (p < this.str.length && this.delimiters.includes(this.str.charAt(p))) {
      p++;
    }
    return p;
  }

  /** The first position at or after `position` that is a delimiter (or the length). */
  private scanToken(position: number): number {
    let p = position;
    while (p < this.str.length && !this.delimiters.includes(this.str.charAt(p))) {
      p++;
    }
    return p;
  }

  /**
   * True when at least one token remains after the current position.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/StringTokenizer.html#hasMoreTokens()
   */
  hasMoreTokens(): boolean {
    return this.skipDelimiters(this.currentPosition) < this.str.length;
  }

  /**
   * The next token; throws {@link NoSuchElementException} when no token remains.
   *
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/StringTokenizer.html#nextToken()
   */
  nextToken(): string {
    const start = this.skipDelimiters(this.currentPosition);
    if (start >= this.str.length) {
      throw new NoSuchElementException();
    }
    this.currentPosition = this.scanToken(start);
    return this.str.substring(start, this.currentPosition);
  }
}
