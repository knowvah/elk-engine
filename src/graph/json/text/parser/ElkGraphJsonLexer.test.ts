// SPDX-License-Identifier: EPL-2.0

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveModelsDir } from '../../../../../test/corpus/corpus.js';
import { isCoverageRun } from '../../../../../test/helpers/coverage-run.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import { tokenize, tokenizeWithDiagnostics } from './ElkGraphJsonLexer.js';
import {
  ELK_GRAPH_JSON_KEYS,
  ELK_GRAPH_JSON_KEYWORDS,
  ElkGraphJsonTokenType,
  HIDDEN_TOKEN_TYPES,
} from './ElkGraphJsonTokenType.js';

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
  new URL('../../../../../test/golden/refs/java/graph-json-text-lexer.json', import.meta.url),
);
const RECORDED_ROWS = 554;
const RECORDED_ERROR_ROWS = 101;
const REALWORLD_DIR = 'realworld';
const JSON_SUFFIX = '.json';
const BUDGET_MS = 200;
const COVERAGE_BUDGET_MS = 800;
const RUNS = 3;
const SYNTHETIC_BYTES = 250_000;
const SYNTHETIC_UNIT = '{"id":"n1",\'children\':[{x:1.5,y:-2e3}], /* c */ "labels":[{"text":"a b"}]} // end\n';

function loadRows(): RecordedRow[] {
  const parsed = JSON.parse(readFileSync(LEXER_VECTORS, 'utf8')) as { tokens: RecordedRow[] };
  return parsed.tokens;
}

/** The JVM marks only `<invalid>` hidden (WS and comments sit on the default channel in the raw lexer). */
function expectedHidden(token: RecordedToken): boolean {
  return token.hidden || HIDDEN_TOKEN_TYPES.has(token.type);
}

function bestOf(text: string): number {
  const times = Array.from({ length: RUNS }, () => {
    const begin = performance.now();
    tokenize(text);
    return performance.now() - begin;
  });
  return Math.min(...times);
}

function largestJsonUnder(dir: string): string | undefined {
  let best: { file: string; size: number } | undefined;
  const pending = [dir];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.name.endsWith(JSON_SUFFIX) && (best === undefined || statSync(full).size > best.size)) {
        best = { file: full, size: statSync(full).size };
      }
    }
  }
  return best?.file;
}

describe('ElkGraphJsonLexer replays the recorded JVM lexer rows', () => {
  const rows = loadRows();

  it('has the recorded rows, including the lexer-error ones', () => {
    expect(rows.length).toBe(RECORDED_ROWS);
    expect(rows.filter((row) => row.lexError).length).toBe(RECORDED_ERROR_ROWS);
  });

  it.each(rows.map((row, index) => [`${index} ${JSON.stringify(row.input)}`, row] as const))('%s', (_label, row) => {
    const result = tokenizeWithDiagnostics(row.input);
    expect(result.tokens.map((t) => ({ type: t.type, text: t.text, line: t.line, hidden: t.hidden }))).toEqual(
      row.tokens.map((t) => ({ type: t.type, text: t.text, line: t.line, hidden: expectedHidden(t) })),
    );
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
    expect([...hiddenTypes]).toEqual([ElkGraphJsonTokenType.INVALID]);
  });
});

describe('ElkGraphJsonLexer quoted keywords', () => {
  it('lexes "id" as the quoted keyword and "idx" as a STRING', () => {
    expect(tokenize('"id"').map((t) => t.type)).toEqual([ElkGraphJsonTokenType.T__40]);
    expect(tokenize('"idx"').map((t) => t.type)).toEqual([ElkGraphJsonTokenType.RULE_STRING]);
  });

  it('produces a token type of the table for every spelling of every key', () => {
    const known = new Set<string>(Object.values(ElkGraphJsonTokenType));
    const types = ELK_GRAPH_JSON_KEYS.flatMap((key) => [`"${key}"`, `'${key}'`, key]).map(
      (spelling) => tokenize(spelling)[0]!.type,
    );
    expect(types.length).toBe(42);
    expect(types.every((type) => known.has(type))).toBe(true);
    expect(new Set(types).size).toBe(42);
  });

  it('lists the 51 keyword literals and the three hidden terminals', () => {
    expect(ELK_GRAPH_JSON_KEYWORDS.size).toBe(51);
    expect(ELK_GRAPH_JSON_KEYWORDS.has('"children"')).toBe(true);
    expect([...HIDDEN_TOKEN_TYPES]).toEqual(['RULE_WS', 'RULE_ML_COMMENT', 'RULE_SL_COMMENT']);
  });

  it('yields tokens usable as the parse runtime Token', () => {
    const token: Token = tokenize('x')[0]!;
    expect(token).toEqual({ type: "'x'", text: 'x', offset: 0, line: 1, hidden: false });
  });
});

describe('ElkGraphJsonLexer performance', () => {
  const budget = isCoverageRun() ? COVERAGE_BUDGET_MS : BUDGET_MS;

  it('tokenizes a synthetic 250 KB input without gaps', () => {
    const text = SYNTHETIC_UNIT.repeat(Math.ceil(SYNTHETIC_BYTES / SYNTHETIC_UNIT.length));
    const result = tokenizeWithDiagnostics(text);
    expect(result.tokens.map((t) => t.text).join('')).toBe(text);
    expect(result.lexError).toBe(false);
    expect(result.tokens.at(-1)!.line).toBe(text.split('\n').length - 1);
    expect(bestOf(text)).toBeLessThan(budget);
  });

  const models = resolveModelsDir();
  const skipReason = 'skip' in models ? models.skip : '';
  it.skipIf(skipReason !== '')(
    `tokenizes the largest realworld .json model in under ${BUDGET_MS} ms${skipReason === '' ? '' : ` (skipped: ${skipReason})`}`,
    () => {
      const file = largestJsonUnder(path.join((models as { dir: string }).dir, REALWORLD_DIR));
      const text = readFileSync(file!, 'utf8');
      const result = tokenizeWithDiagnostics(text);
      expect(result.tokens.map((t) => t.text).join('')).toBe(text);
      expect(bestOf(text)).toBeLessThan(budget);
    },
  );
});
