// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { AbstractRule } from '../../AbstractRule.js';
import { AbstractLexerBasedConverter, type LexerToken, type TokenSource } from './AbstractLexerBasedConverter.js';
import { ValueConverterException } from '../ValueConverterException.js';

const TERMINAL: AbstractRule = { getName: () => 'THING', isTerminalRule: () => true };
const PARSER_RULE: AbstractRule = { getName: () => 'Thing', isTerminalRule: () => false };

/** Escapes by upper-casing; reads a value back by lower-casing. */
class Shouting extends AbstractLexerBasedConverter<string> {
  constructor(tokenSource: TokenSource | null) {
    super(tokenSource);
  }

  toValue(string: string | null): string | null {
    return string === null ? null : string.toLowerCase();
  }

  protected override toEscapedString(value: string): string {
    return value.toUpperCase();
  }
}

const single =
  (type: string): TokenSource =>
  (text) => [{ type, text }];

function make(tokenSource: TokenSource | null, rule: AbstractRule | null = TERMINAL): Shouting {
  const converter = new Shouting(tokenSource);
  if (rule !== null) converter.setRule(rule);
  return converter;
}

function message(fn: () => unknown): string | null {
  try {
    fn();
  } catch (e) {
    return (e as ValueConverterException).getMessage();
  }
  return 'did not throw';
}

describe('AbstractLexerBasedConverter', () => {
  it('returns the escaped string when no lexer is available', () => {
    expect(make(null).toString('abc')).toBe('ABC');
  });

  it('does not lex for a parser rule', () => {
    const lexed: string[] = [];
    const converter = make((text) => {
      lexed.push(text);
      return [];
    }, PARSER_RULE);
    expect(converter.toString('abc')).toBe('ABC');
    expect(lexed).toEqual([]);
  });

  it('accepts a single token of the converter rule that reads back to the value', () => {
    expect(make(single('RULE_THING')).toString('abc')).toBe('ABC');
  });

  it('rejects null values with the rule name', () => {
    expect(message(() => make(null).toString(null))).toBe('THING may not be null.');
  });

  it('reports a content mismatch when the first token text differs', () => {
    expect(message(() => make((text) => [{ type: 'RULE_THING', text: text.slice(1) }]).toString('abc'))).toBe(
      "The value 'abc' is an invalid THING",
    );
  });

  it('treats an empty token list as EOF, a content mismatch', () => {
    expect(message(() => make(() => []).toString('abc'))).toBe("The value 'abc' is an invalid THING");
  });

  it('reports a type mismatch when the token belongs to another rule', () => {
    expect(message(() => make(single('RULE_OTHER')).toString('abc'))).toBe("The value 'abc' is an invalid THING");
  });

  it('compares the rule name with the SUPER_ prefix stripped', () => {
    expect(make(single('SUPER_2_THING')).toString('abc')).toBe('ABC');
  });

  it('reports a content mismatch when the re-parsed value differs', () => {
    class Lossy extends Shouting {
      override toValue(): string | null {
        return 'other';
      }
    }
    const lossy = new Lossy(single('RULE_THING'));
    lossy.setRule(TERMINAL);
    expect(message(() => lossy.toString('abc'))).toBe("The value 'abc' is an invalid THING");
  });

  it('only inspects the first token', () => {
    const tokens: LexerToken[] = [
      { type: 'RULE_THING', text: 'ABC' },
      { type: 'RULE_OTHER', text: 'tail' },
    ];
    expect(make(() => tokens).toString('abc')).toBe('ABC');
  });

  it('fails loudly when used before setRule', () => {
    expect(() => make(null, null).toString(null)).toThrow('setRule was not called');
  });
});
