// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Token } from '../../../../xtext/parser/Token.js';
import { tokenize, tokenizeWithDiagnostics } from './GraphvizDotLexer.js';
import { GraphvizDotTokenType, HIDDEN_TOKEN_TYPES } from './GraphvizDotTokenType.js';

const LEXER_REF = new URL('../../../../../test/golden/refs/java/graphviz-dot-lexer.json', import.meta.url);
/** The channel of the token Xtext's lexer emits for a failed rule (`Token.HIDDEN_CHANNEL`). */
const ERROR_CHANNEL = 99;
const DEFAULT_CHANNEL = 0;
const LF = '\n';

interface RecordedToken {
  readonly type: string;
  readonly text: string;
  readonly line: number;
  readonly column: number;
  readonly start: number;
  readonly stop: number;
  readonly channel: number;
  readonly grammarHidden: boolean;
}

interface TokenRow {
  readonly id: string;
  readonly family: string;
  readonly input: string;
  readonly tokens: readonly RecordedToken[];
  readonly lexError: boolean;
}

interface LexerRef {
  readonly hiddenTokens: readonly string[];
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly tokens: readonly TokenRow[];
}

const REF = JSON.parse(readFileSync(LEXER_REF, 'utf8')) as LexerRef;
const CONVERTER_FAMILY = 'conv';
const TOKEN_FAMILY_COUNTS = Object.fromEntries(
  Object.entries(REF.rowCounts).filter(([family]) => family !== CONVERTER_FAMILY),
);

/** ANTLR's `getCharPositionInLine`: code units since the last `\n` (only `\n` starts a line in `ANTLRStringStream`). */
function column(input: string, offset: number): number {
  // `lastIndexOf` with a negative position still inspects index 0
  return offset === 0 ? 0 : offset - (input.lastIndexOf(LF, offset - 1) + 1);
}

/** A token as the recorder describes it: the raw lexer's channel, the grammar's hidden set. */
function describeToken(input: string, token: Token): RecordedToken {
  return {
    type: token.type,
    text: token.text,
    line: token.line,
    column: column(input, token.offset),
    start: token.offset,
    stop: token.offset + token.text.length - 1,
    channel: token.type === GraphvizDotTokenType.INVALID ? ERROR_CHANNEL : DEFAULT_CHANNEL,
    grammarHidden: HIDDEN_TOKEN_TYPES.has(token.type),
  };
}

/** Replays every token row; returns the number of rows replayed per family. */
function replayAll(): Record<string, number> {
  const replayed: Record<string, number> = {};
  for (const row of REF.tokens) {
    const result = tokenizeWithDiagnostics(row.input);
    expect(
      result.tokens.map((t) => describeToken(row.input, t)),
      row.id,
    ).toEqual(row.tokens);
    expect(result.lexError, row.id).toBe(row.lexError);
    for (const token of result.tokens) {
      // the parser skips error tokens and the grammar's hidden tokens alike
      expect(token.hidden, row.id).toBe(
        token.type === GraphvizDotTokenType.INVALID || HIDDEN_TOKEN_TYPES.has(token.type),
      );
    }
    replayed[row.family] = (replayed[row.family] ?? 0) + 1;
  }
  return replayed;
}

function concatenates(): void {
  for (const row of REF.tokens) {
    expect(
      tokenize(row.input)
        .map((t) => t.text)
        .join(''),
      row.id,
    ).toBe(row.input);
  }
}

describe('GraphvizDotLexer: replay of the recorded JVM token rows', () => {
  it('reproduces type, text, position and channel of every token row, all families', () => {
    expect(replayAll()).toEqual(TOKEN_FAMILY_COUNTS);
  });

  it('names the hidden terminals the grammar declares', () => {
    expect([...HIDDEN_TOKEN_TYPES]).toEqual(REF.hiddenTokens);
  });

  it('covers the whole input with its tokens', () => {
    concatenates();
  });
});
