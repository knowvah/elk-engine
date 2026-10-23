// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Token } from '../../../../xtext/parser/Token.js';
import { tokenize, tokenizeWithDiagnostics } from './GRandomLexer.js';
import { GRandomTokenType, HIDDEN_TOKEN_TYPES } from './GRandomTokenType.js';

interface RecordedToken {
  readonly type: string;
  readonly text: string;
  readonly line: number;
  readonly offset: number;
  readonly length: number;
  readonly hidden: boolean;
}

interface RecordedRow {
  readonly input: string;
  readonly tokens: readonly RecordedToken[];
  readonly lexError: boolean;
}

const LEXER_VECTORS = fileURLToPath(
  new URL('../../../../../test/golden/refs/java/grandom-lexer.json', import.meta.url),
);
const RECORDED_ROWS = 433;

function loadRows(): RecordedRow[] {
  const parsed = JSON.parse(readFileSync(LEXER_VECTORS, 'utf8')) as { tokens: RecordedRow[] };
  return parsed.tokens;
}

/** The JVM marks only `<invalid>` hidden (WS and comments sit on the default channel in the raw lexer). */
function expectedHidden(token: RecordedToken): boolean {
  return token.hidden || HIDDEN_TOKEN_TYPES.has(token.type);
}

describe('GRandomLexer replays the recorded JVM lexer rows', () => {
  const rows = loadRows();

  it('has the recorded rows', () => {
    expect(rows.length).toBe(RECORDED_ROWS);
    expect(rows.filter((row) => row.lexError).length).toBeGreaterThan(0);
  });

  it.each(rows.map((row, index) => [`${index} ${JSON.stringify(row.input)}`, row] as const))('%s', (_label, row) => {
    const result = tokenizeWithDiagnostics(row.input);
    expect(
      result.tokens.map((t) => ({
        type: t.type,
        text: t.text,
        line: t.line,
        offset: t.offset,
        length: t.text.length,
        hidden: t.hidden,
      })),
    ).toEqual(row.tokens.map((t) => ({ ...t, hidden: expectedHidden(t) })));
    expect(result.lexError).toBe(row.lexError);
    let offset = 0;
    for (const token of result.tokens) {
      expect(token.offset).toBe(offset);
      offset += token.text.length;
    }
    expect(offset).toBe(row.input.length);
  });

  it('puts only <invalid> on the hidden channel in the raw JVM rows', () => {
    const hiddenTypes = new Set(rows.flatMap((row) => row.tokens.filter((t) => t.hidden).map((t) => t.type)));
    expect([...hiddenTypes]).toEqual([GRandomTokenType.INVALID]);
  });
});

describe('GRandomLexer keywords', () => {
  it('lexes the longest multi-word keyword first', () => {
    const tokens = tokenize('cross-hierarchy relative edges = 2');
    expect(tokens.map((t) => t.type)).toEqual([
      "'cross-hierarchy relative edges'",
      GRandomTokenType.RULE_WS,
      "'='",
      GRandomTokenType.RULE_WS,
      GRandomTokenType.RULE_INT,
    ]);
    expect(tokens[0]!.text).toBe('cross-hierarchy relative edges');
  });

  it('lexes 1.5 as INT, the dot keyword and INT', () => {
    expect(tokenize('1.5').map((t) => t.type)).toEqual([GRandomTokenType.RULE_INT, "'.'", GRandomTokenType.RULE_INT]);
  });

  it('keeps a word keyword only on an exact-length match', () => {
    expect(tokenize('trees').map((t) => t.type)).toEqual(["'trees'"]);
    expect(tokenize('treesx').map((t) => t.type)).toEqual([GRandomTokenType.RULE_ID]);
  });

  it('yields tokens usable as the parse runtime Token', () => {
    const token: Token = tokenize('seed')[0]!;
    expect(token).toEqual({ type: "'seed'", text: 'seed', offset: 0, line: 1, hidden: false });
  });

  it('counts only LF as a line break', () => {
    expect(tokenize('a\r\n\nb').map((t) => t.line)).toEqual([1, 1, 3]);
  });
});
