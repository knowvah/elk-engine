// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AbstractRule } from '../../AbstractRule.js';
import type { LexerToken, TokenSource } from './AbstractLexerBasedConverter.js';
import { IDValueConverter } from './IDValueConverter.js';
import type { ValueConverterException } from '../ValueConverterException.js';

const LEXER_REF = new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url);
const VALUE_CONVERTER_EXCEPTION = 'org.eclipse.xtext.conversion.ValueConverterException';
const STRING_PREFIX = 'str:';
const ID_RULE: AbstractRule = { getName: () => 'ID', isTerminalRule: () => true };
const KEYWORDS: ReadonlySet<string> = new Set(['node', 'graph', 'true', 'null']);
/** Inputs that are keyword tokens of the real lexer; their recorded message needs `ElkGraphLexer` (T13). */
const NEEDS_REAL_LEXER: ReadonlySet<string> = new Set(['->', '{', '.']);

interface Row {
  readonly converter: string;
  readonly op: string;
  readonly input: string | null;
  readonly output?: { readonly text: string } | string | null;
  readonly error?: { readonly cls: string; readonly msg: string };
}

const idRows = (JSON.parse(readFileSync(LEXER_REF, 'utf8')) as { converters: readonly Row[] }).converters.filter(
  (row) => row.converter === 'ID',
);

const TOKEN_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/^\s+/, 'RULE_WS'],
  [/^\^?[a-zA-Z_][a-zA-Z_0-9]*/, 'RULE_ID'],
  [/^[+-]?[0-9]+/, 'RULE_SIGNED_INT'],
  [/^[\s\S]/, 'RULE_ANY_OTHER'],
];

/** A regex tokenizer satisfying the TokenSource contract (test double for the ANTLR lexer). */
const tokenize: TokenSource = (text) => {
  const tokens: LexerToken[] = [];
  let rest = text;
  while (rest.length > 0) {
    for (const [pattern, type] of TOKEN_PATTERNS) {
      const match = pattern.exec(rest);
      if (match !== null) {
        tokens.push({ type, text: match[0] });
        rest = rest.substring(match[0].length);
        break;
      }
    }
  }
  return tokens;
};

function converter(tokenSource: TokenSource | null = tokenize): IDValueConverter {
  const result = new IDValueConverter(KEYWORDS, tokenSource);
  result.setRule(ID_RULE);
  return result;
}

function failure(fn: () => unknown): ValueConverterException {
  try {
    fn();
  } catch (e) {
    return e as ValueConverterException;
  }
  throw new Error('expected a ValueConverterException');
}

describe('IDValueConverter vectors', () => {
  it('replays the toValue rows', () => {
    const rows = idRows.filter((row) => row.op === 'toValue');
    expect(rows.length).toBe(10);
    for (const row of rows) {
      const expected = row.output === null ? null : (row.output as { text: string }).text;
      expect(converter().toValue(row.input, null), JSON.stringify(row.input)).toBe(expected);
    }
  });

  it('replays the toString rows a regex lexer can decide', () => {
    const rows = idRows.filter(
      (row) =>
        row.op === 'toString' &&
        (row.input === null || row.input.startsWith(STRING_PREFIX)) &&
        !NEEDS_REAL_LEXER.has((row.input ?? '').substring(STRING_PREFIX.length)),
    );
    expect(rows.length).toBe(20);
    for (const row of rows) {
      const value = row.input === null ? null : row.input.substring(STRING_PREFIX.length);
      if (row.error === undefined) {
        expect(converter().toString(value), JSON.stringify(row.input)).toBe(row.output);
        continue;
      }
      expect(row.error.cls).toBe(VALUE_CONVERTER_EXCEPTION);
      const e = failure(() => converter().toString(value));
      expect(e.getMessage(), JSON.stringify(row.input)).toBe(row.error.msg);
    }
  });
});

describe('IDValueConverter', () => {
  it('lists invalid characters in Java HashSet order', () => {
    expect(failure(() => converter().toString('a b')).getMessage()).toBe(
      "ID 'a b' contains invalid characters: ' ' (0x20)",
    );
    // HashMap bucket index = code & 15: '{' (0x7b) is bucket 11, '-' (0x2d) is bucket 13, whatever the insertion order.
    expect(failure(() => converter().toString('-a{')).getMessage()).toBe(
      "ID '-a{' contains invalid characters: '{' (0x7b), '-' (0x2d)",
    );
  });

  it('escapes keywords with ^', () => {
    expect(converter().toString('node')).toBe('^node');
    expect(converter().toString('nodes')).toBe('nodes');
  });

  it('rejects empty and null values', () => {
    expect(failure(() => converter().toString('')).getMessage()).toBe('ID may not be empty.');
    expect(failure(() => converter().toString(null)).getMessage()).toBe('ID may not be null.');
  });

  it('strips one leading ^ in toValue and keeps null', () => {
    expect(converter().toValue('^^a', null)).toBe('^a');
    expect(converter().toValue(null, null)).toBeNull();
  });

  it('does not lex without a token source', () => {
    expect(converter(null).toString('a b')).toBe('a b');
  });

  it('snapshots the keyword set at construction', () => {
    const keywords = new Set(['x']);
    const snapshot = new IDValueConverter(keywords);
    snapshot.setRule(ID_RULE);
    keywords.clear();
    expect(snapshot.toString('x')).toBe('^x');
  });
});
