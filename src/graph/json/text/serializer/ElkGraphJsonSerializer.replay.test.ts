// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/graph-json-text-write.json (T5) through the sequencer. The oracle's `unformatted` text
// is the output of the full ElkGraphJsonFormatter (every hidden region of a string-built region access is undefined,
// so the unformatted request formats them all): the recorded spacing cannot be reproduced without the formatter
// (T16), so no row is byte-equal here. What the sequencer owns is the token sequence: the recorded text, lexed and
// stripped of whitespace and comments, must equal the concatenated tokens of the sequencer; error rows must throw.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildElkjWriteInput,
  ELKJ_JAVA_SCENARIOS,
  type ElkjWriteSource,
} from '../../../../../test/helpers/elkj-write-cases.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { tokenize } from '../parser/ElkGraphJsonLexer.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';
import { ElkGraphJsonSerializer } from './ElkGraphJsonSerializer.js';

const REF = fileURLToPath(new URL('../../../../../test/golden/refs/java/graph-json-text-write.json', import.meta.url));
const JAVA_PREFIX = 'java-';
const RECORDED_ROWS = 126;
const WRITTEN_ROWS = 115;
const FAILING_ROWS = 11;

interface RecordedCase {
  readonly id: string;
  readonly source: ElkjWriteSource;
  readonly unformatted: string | { readonly error: { readonly cls: string } };
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const written = cases.filter((c) => typeof c.unformatted === 'string');
const failing = cases.filter((c) => typeof c.unformatted !== 'string');

/** The significant lexer tokens of a text, as type and text pairs (whitespace and comments dropped). */
function significantTokens(text: string): readonly (readonly [string, string])[] {
  return tokenize(text)
    .filter((t) => !t.hidden)
    .map((t) => [t.type, t.text] as const);
}

/** The sequencer's token texts glued without whitespace, lexed like the recorded text (a value such as ` 5 ` keeps its blanks until then). */
function sequencedTokens(texts: readonly string[]): readonly (readonly [string, string])[] {
  return significantTokens(texts.join(''));
}

function sequence(c: RecordedCase): readonly string[] {
  return new ElkGraphJsonSerializer().sequence(buildElkjWriteInput(c.source, c.id)).tokens.map((t) => t.text);
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphJsonSerializer against the recorded writer vectors', () => {
  it('covers every recorded java scenario', () => {
    const recorded = cases.filter((c) => c.source === 'java').map((c) => c.id);
    expect(Object.keys(ELKJ_JAVA_SCENARIOS).sort()).toEqual(recorded.sort());
    expect(recorded.every((id) => id.startsWith(JAVA_PREFIX))).toBe(true);
  });

  it.each(written.map((c) => [c.id, c] as const))('%s: the tokens are those of the recorded text', (_id, c) => {
    expect(sequencedTokens(sequence(c))).toEqual(significantTokens(c.unformatted as string));
  });

  it.each(failing.map((c) => [c.id, c] as const))('%s: serialisation fails', (_id, c) => {
    expect(() => sequence(c)).toThrow(ElkGraphJsonSerializationError);
  });

  it('replays 126 recorded cases, 115 written and 11 failing', () => {
    expect([cases.length, written.length, failing.length]).toEqual([RECORDED_ROWS, WRITTEN_ROWS, FAILING_ROWS]);
  });
});
