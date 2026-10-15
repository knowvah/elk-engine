// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveModelsDir } from '../../../../test/corpus/corpus.js';
import { tokenize, tokenizeWithDiagnostics } from './ElkGraphLexer.js';
import { ELK_GRAPH_KEYWORDS, ElkGraphTokenType, HIDDEN_TOKEN_TYPES } from './ElkGraphTokenType.js';

interface RecordedToken {
  readonly type: string;
  readonly text: string;
  readonly line: number;
  readonly hidden: boolean;
}

interface RecordedRow {
  readonly input: string;
  readonly tokens: readonly RecordedToken[];
  readonly lexError: boolean;
}

const LEXER_VECTORS = fileURLToPath(
  new URL('../../../../test/golden/refs/java/graph-text-lexer.json', import.meta.url),
);
const MODEL_RELATIVE_PATH = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt';
const BUDGET_MS = 200;
const RUNS = 5;
const SYNTHETIC_BYTES = 250_000;
const SYNTHETIC_UNIT =
  'graph g\n// c\nnode n1 { layout [ size: 30, 20 ] label "n" }\nedge e1: n1.p -> n2 /* x */ 1.5e-3 \'q\'\n';

function loadRows(): RecordedRow[] {
  const parsed = JSON.parse(readFileSync(LEXER_VECTORS, 'utf8')) as { tokens: RecordedRow[] };
  return parsed.tokens;
}

/** The JVM marks only `<invalid>` hidden (WS and comments sit on the default channel in the raw lexer). */
function expectedHidden(token: RecordedToken): boolean {
  return token.hidden || HIDDEN_TOKEN_TYPES.has(token.type);
}

function summary(input: string): { lexError: boolean; tokens: [string, string][] } {
  const result = tokenizeWithDiagnostics(input);
  return { lexError: result.lexError, tokens: result.tokens.map((t) => [t.type, t.text]) };
}

function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
}

function timeTokenize(text: string): number[] {
  return Array.from({ length: RUNS }, () => {
    const begin = performance.now();
    tokenize(text);
    return performance.now() - begin;
  });
}

describe('ElkGraphLexer replays the recorded JVM lexer rows', () => {
  const rows = loadRows();

  it('has the recorded rows, including the lexer-error ones', () => {
    expect(rows.length).toBe(326);
    expect(rows.filter((row) => row.lexError).length).toBe(32);
  });

  it.each(rows.map((row) => [JSON.stringify(row.input), row] as const))('%s', (_label, row) => {
    const result = tokenizeWithDiagnostics(row.input);
    expect(result.tokens.map((t) => ({ type: t.type, text: t.text, line: t.line, hidden: t.hidden }))).toEqual(
      row.tokens.map((t) => ({ type: t.type, text: t.text, line: t.line, hidden: expectedHidden(t) })),
    );
    expect(result.lexError).toBe(row.lexError);
    expect(result.tokens.map((t) => t.text).join('')).toBe(row.input);
    let offset = 0;
    for (const token of result.tokens) {
      expect(token.offset).toBe(offset);
      offset += token.text.length;
    }
  });

  it('puts only <invalid> on the hidden channel in the raw JVM rows', () => {
    const hiddenTypes = new Set(rows.flatMap((row) => row.tokens.filter((t) => t.hidden).map((t) => t.type)));
    expect([...hiddenTypes]).toEqual([ElkGraphTokenType.INVALID]);
  });
});

/**
 * Recovery boundaries found by the T9 differential fuzz (~300k inputs) against `InternalElkGraphLexer`, first pinned
 * from a scratch JVM run and now recorded rows of the lexer vectors (replayed above with lines, channels and offsets).
 */
const FUZZ_BOUNDARIES: readonly string[] = [
  'a-1',
  "'x",
  '10.',
  '+1.',
  '-1.',
  '1ex',
  '1.5ex',
  '1e+x',
  '-->',
  '/*',
  '1.0E',
  '// x\r\r\ny',
  '"\\',
  'a\rb\nc',
  '',
];

describe('ElkGraphLexer recovery boundaries from the T9 fuzz', () => {
  const inputs = new Set(loadRows().map((row) => row.input));

  it.each(FUZZ_BOUNDARIES.map((input) => [JSON.stringify(input), input] as const))(
    '%s is a recorded JVM row',
    (_label, input) => {
      expect(inputs.has(input)).toBe(true);
    },
  );
});

describe('ElkGraphTokenType', () => {
  it('lists the 26 keywords with their quoted spelling in the token type table', () => {
    const quoted = Object.values(ElkGraphTokenType).filter((v) => v.startsWith("'"));
    expect(ELK_GRAPH_KEYWORDS.size).toBe(26);
    expect(quoted.map((v) => v.slice(1, -1)).sort()).toEqual([...ELK_GRAPH_KEYWORDS].sort());
  });

  it('hides whitespace and both comment types', () => {
    expect([...HIDDEN_TOKEN_TYPES]).toEqual(['RULE_WS', 'RULE_ML_COMMENT', 'RULE_SL_COMMENT']);
  });
});

describe('ElkGraphLexer performance', () => {
  it('tokenizes a synthetic 250 KB input without gaps', () => {
    const text = SYNTHETIC_UNIT.repeat(Math.ceil(SYNTHETIC_BYTES / SYNTHETIC_UNIT.length));
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.text).join('')).toBe(text);
    expect(tokens.at(-1)!.line).toBe(text.split('\n').length - 1);
  });

  const models = resolveModelsDir();
  const skipReason = 'skip' in models ? models.skip : '';
  it.skipIf(skipReason !== '')(
    `tokenizes the 253 KB Trilateration model in under ${BUDGET_MS} ms${skipReason === '' ? '' : ` (skipped: ${skipReason})`}`,
    () => {
      const text = readFileSync(path.join((models as { dir: string }).dir, MODEL_RELATIVE_PATH), 'utf8');
      expect(timeTokenize(text).length).toBe(RUNS);
      expect(median(timeTokenize(text))).toBeLessThan(BUDGET_MS);
      expect(tokenizeWithDiagnostics(text).lexError).toBe(false);
    },
  );
});
