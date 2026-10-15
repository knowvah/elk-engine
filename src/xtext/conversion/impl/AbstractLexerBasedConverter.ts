// SPDX-License-Identifier: EPL-2.0
import type { AbstractRule } from '../../AbstractRule.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { getLexerRuleName } from '../../parser/antlr/TokenTool.js';
import type { RuleSpecific } from '../IValueConverter.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { AbstractValueConverter } from './AbstractValueConverter.js';

/**
 * One lexer token as the converters see it, replacing the ANTLR `Token` plus `ITokenDefProvider`.
 * `type` is the ANTLR token-def name, e.g. `RULE_ID`.
 */
export interface LexerToken {
  readonly type: string;
  readonly text: string;
}

/**
 * Lexes `text` into all of its tokens including hidden ones, in order. An empty list stands for Java's
 * immediate EOF token (whose text never equals the escaped string). Replaces the optional
 * `@Inject(optional=true) Provider<Lexer>`; Java's `setLexerProvider` / `setTokenDefProvider` collapse into
 * the constructor argument.
 */
export type TokenSource = (text: string) => readonly LexerToken[];

/**
 * A converter that, when a lexer is available, re-lexes its output to prove the lexer reads it back as a
 * single token of the converter's own rule. `LOG.warn` in `setRule` is dropped (no logging in `src/`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/AbstractLexerBasedConverter.java
 */
export abstract class AbstractLexerBasedConverter<T> extends AbstractValueConverter<T> implements RuleSpecific {
  readonly #tokenSource: TokenSource | null;
  #rule: AbstractRule | null = null;

  protected constructor(tokenSource: TokenSource | null = null) {
    super();
    this.#tokenSource = tokenSource;
  }

  toString(value: T | null): string {
    this.assertValidValue(value);
    const result = this.toEscapedString(value as T);
    this.assertTokens(value as T, result);
    return result;
  }

  protected assertTokens(value: T, result: string): void {
    const tokens = this.getTokenSource(result);
    this.assertTokensOf(value, tokens, result);
  }

  protected assertTokensOf(value: T, tokens: readonly LexerToken[] | null, escapedString: string): void {
    if (tokens === null) return;
    const token: LexerToken | undefined = tokens[0];
    if (token === undefined || escapedString !== token.text) {
      throw this.createTokenContentMismatchException(value, escapedString, token ?? null);
    }
    if (this.getRuleName().toUpperCase() !== this.getRuleNameOf(token)) {
      throw this.createTokenTypeMismatchException(value, escapedString, token);
    }
    const reparsedValue = this.toValue(token.text, null);
    if (value !== reparsedValue) {
      throw this.createTokenContentMismatchException(value, escapedString, token);
    }
  }

  protected createTokenTypeMismatchException(
    value: T,
    _escapedString: string,
    _token: LexerToken | null,
  ): ValueConverterException {
    return new ValueConverterException(`The value '${String(value)}' is an invalid ${this.getRuleName()}`, null, null);
  }

  protected createTokenContentMismatchException(
    value: T,
    _escapedString: string,
    _token: LexerToken | null,
  ): ValueConverterException {
    return new ValueConverterException(`The value '${String(value)}' is an invalid ${this.getRuleName()}`, null, null);
  }

  protected getTokenSource(escapedValue: string): readonly LexerToken[] | null {
    const source = this.getLexer();
    return source === null ? null : source(escapedValue);
  }

  protected assertValidValue(value: T | null): void {
    if (value === null) {
      throw new ValueConverterException(`${this.getRuleName()} may not be null.`, null, null);
    }
  }

  protected getRuleName(): string {
    return this.getRule().getName();
  }

  protected toEscapedString(value: T): string {
    return String(value);
  }

  /** A lexer exists only when a token source was supplied and the rule is a terminal rule. */
  protected getLexer(): TokenSource | null {
    if (this.#tokenSource !== null && this.#rule?.isTerminalRule() === true) return this.#tokenSource;
    return null;
  }

  /** Java `getRuleName(Token)` (to be renamed `getLexerRuleName` upstream). */
  protected getRuleNameOf(token: LexerToken): string {
    return getLexerRuleName(token.type);
  }

  protected getRule(): AbstractRule {
    if (this.#rule === null) {
      throw new IllegalStateException('setRule was not called before the converter was used');
    }
    return this.#rule;
  }

  setRule(rule: AbstractRule): void {
    this.#rule = rule;
  }
}
