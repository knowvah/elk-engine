// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { StringBuilder } from '../../../java/lang/StringBuilder.js';
import { JavaStringConverter } from '../../util/JavaStringConverter.js';

/**
 * The members of the enclosing `STRINGValueConverter` that its inner `Implementation` class reaches (the
 * Java inner class captures the outer instance).
 */
export interface StringLiteralOwner {
  getInvalidEscapeSequenceMessage(): string;
  getStringNotClosedMessage(): string;
  isHexSequence(input: string, off: number, chars: number): boolean;
}

const BACKSLASH = '\\';
const INVALID_UNICODE_MESSAGE = 'Invalid unicode';
const LITERAL_QUOTE_LENGTH = 2;

/**
 * Converts a string literal (including its quotes) and records the first problem. The package-private
 * fields `errorMessage`, `errorIndex`, `errorLength` and `nextIndex` are public.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/STRINGValueConverter.java:70-158
 */
export class Implementation extends JavaStringConverter {
  errorMessage: string | null = null;
  errorIndex = -1;
  errorLength = -1;
  nextIndex = 1;

  readonly #owner: StringLiteralOwner;

  constructor(owner: StringLiteralOwner) {
    super();
    this.#owner = owner;
  }

  /** Java's one-argument overload `convertFromJavaString(String literal)`. */
  override convertFromJavaString(literal: string): string {
    const idx = literal.indexOf(BACKSLASH);
    if (idx < 0 && literal.length > 1 && literal.charAt(0) === literal.charAt(literal.length - 1)) {
      return literal.substring(1, literal.length - 1);
    }
    return this.convertFromJavaStringFrom(literal, true, 1, new StringBuilder());
  }

  protected override convertFromJavaStringFrom(
    string: string,
    useUnicode: boolean,
    startIndex: number,
    result: StringBuilder,
  ): string {
    const length = string.length;
    let index = startIndex;
    while (index < length - 1) {
      index = this.unescapeCharAndAppendTo(string, useUnicode, index, result);
      this.nextIndex = index;
    }
    if (this.nextIndex < length) {
      this.appendUnclosedTail(string, length, result);
    } else if (this.nextIndex === length) {
      this.errorMessage = this.#owner.getStringNotClosedMessage();
    }
    return result.toString();
  }

  private appendUnclosedTail(string: string, length: number, result: StringBuilder): void {
    if (this.nextIndex !== length - 1) {
      throw new IllegalStateException();
    }
    const next = string.charAt(this.nextIndex);
    if (string.charAt(0) === next) return;
    result.append(next);
    if (this.errorMessage === null) {
      if (next === BACKSLASH) {
        this.errorMessage = this.#owner.getInvalidEscapeSequenceMessage();
        this.errorIndex = this.nextIndex;
        this.errorLength = 1;
      } else {
        this.errorMessage = this.#owner.getStringNotClosedMessage();
      }
    } else {
      this.errorMessage = this.#owner.getStringNotClosedMessage();
      this.errorIndex = -1;
      this.errorLength = -1;
    }
  }

  protected override isHexSequence(input: string, off: number, chars: number): boolean {
    // keep chance to use overridden methods by funneling it through STRINGValueConverter
    return this.#owner.isHexSequence(input, off, chars);
  }

  protected override handleInvalidUnicodeEscapeSequence(_string: string, index: number, result: StringBuilder): number {
    result.append('u');
    this.errorMessage = INVALID_UNICODE_MESSAGE;
    this.errorIndex = index - LITERAL_QUOTE_LENGTH;
    this.errorLength = LITERAL_QUOTE_LENGTH;
    return index;
  }

  protected override doUnescapeCharAndAppendTo(
    string: string,
    useUnicode: boolean,
    index: number,
    result: StringBuilder,
  ): number {
    if (string.length === index) {
      if (this.errorMessage === null) {
        this.errorMessage = this.#owner.getInvalidEscapeSequenceMessage();
        this.errorIndex = index - 1;
        this.errorLength = 1;
      }
      return index;
    }
    return super.doUnescapeCharAndAppendTo(string, useUnicode, index, result);
  }

  protected override handleUnknownEscapeSequence(
    _string: string,
    c: number,
    _useUnicode: boolean,
    index: number,
    result: StringBuilder,
  ): number {
    if (this.errorMessage === null) {
      this.errorMessage = this.#owner.getInvalidEscapeSequenceMessage();
      this.errorIndex = index - LITERAL_QUOTE_LENGTH;
      this.errorLength = LITERAL_QUOTE_LENGTH;
    }
    result.appendChar(c);
    return index;
  }
}
