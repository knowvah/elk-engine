// SPDX-License-Identifier: EPL-2.0
import { SyntaxFailure } from './SyntaxFailure.js';
import type { Token } from './Token.js';

/** Type of the token that `TokenCursor` answers once the input is exhausted. */
export const EOF_TOKEN_TYPE = '<EOF>';
const EOF_TOKEN_TEXT = '<EOF>';

/**
 * The token stream without hidden tokens, with Xtext's `la(k)` and the error-position helpers.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export class TokenCursor<T extends Token = Token> {
  readonly #tokens: T[];
  readonly #eof: Token;
  #pos = 0;

  constructor(all: readonly T[]) {
    this.#tokens = all.filter((t) => !t.hidden);
    const last = all[all.length - 1];
    this.#eof =
      last === undefined
        ? { type: EOF_TOKEN_TYPE, text: EOF_TOKEN_TEXT, offset: 0, line: 1, hidden: false }
        : {
            type: EOF_TOKEN_TYPE,
            text: EOF_TOKEN_TEXT,
            offset: last.offset + last.text.length,
            line: endLine(last),
            hidden: false,
          };
  }

  /** The `k`-th next non-hidden token (1-based), or the EOF token. */
  peek(k = 1): T | Token {
    return this.#tokens[this.#pos + k - 1] ?? this.#eof;
  }

  type(k = 1): string {
    return this.peek(k).type;
  }

  next(): T | Token {
    const token = this.peek();
    if (this.#pos < this.#tokens.length) {
      this.#pos++;
    }
    return token;
  }

  position(): number {
    return this.#pos;
  }

  /** Whether the `k`-th next token starts exactly where its predecessor ended (no hidden token between). */
  adjacent(k = 1): boolean {
    const previous = this.#tokens[this.#pos + k - 2];
    return previous !== undefined && this.peek(k).offset === previous.offset + previous.text.length;
  }

  /**
   * Line of the offset a node starting at token index `start` has: its first token, or, for a node without any
   * token, the end of the previous token (`CompositeNode.getTotalOffset` of an empty composite; line 1 at file
   * start).
   */
  lineFrom(start: number): number {
    const first = this.#tokens[start];
    if (this.#pos > start && first !== undefined) {
      return first.line;
    }
    const previous = this.#tokens[start - 1];
    return previous === undefined ? 1 : endLine(previous);
  }

  /** The syntax error for an unexpected next token. */
  mismatch(expected: string): SyntaxFailure {
    const found = this.peek();
    return new SyntaxFailure(`mismatched input '${found.text}' expecting ${expected}`, found.line);
  }

  expect(type: string): T | Token {
    if (this.type() !== type) {
      throw this.mismatch(type);
    }
    return this.next();
  }

  accept(type: string): T | Token | null {
    return this.type() === type ? this.next() : null;
  }
}

function endLine(token: Token): number {
  let line = token.line;
  for (let i = token.text.indexOf('\n'); i !== -1; i = token.text.indexOf('\n', i + 1)) {
    line++;
  }
  return line;
}
