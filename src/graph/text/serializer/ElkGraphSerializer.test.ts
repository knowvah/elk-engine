// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/graph-text-write.json (T5) through the sequencer. The oracle's `unformatted` text is
// the output of the full ElkGraphFormatter (see the T12 finding: every hidden region of a string-built region
// access is undefined), so it cannot be reproduced without the formatter (T21/T22). What the sequencer owns is
// the token sequence: the recorded text, lexed and stripped of whitespace, must equal the concatenated tokens of
// the sequencer; error rows must throw the class recorded. As the recorder, the input is `EcoreUtil.copy`'d first
// (the repeated-reference rows fail there, F3).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildWriteInput, JAVA_SCENARIOS, recordedErrorClass } from '../../../../test/helpers/elkt-write-cases.js';
import { ElkGraphFactory } from '../../ElkGraphFactory.js';
import '../../impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../ElkNode.js';
import { copyGraph } from '../../util/ElkGraphCopy.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { ElkGraphSerializer } from './ElkGraphSerializer.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-text-write.json', import.meta.url));
const JAVA_PREFIX = 'java-';

interface RecordedCase {
  readonly id: string;
  readonly source: 'elkt' | 'json' | 'java';
  readonly unformatted: string | { readonly error: { readonly cls: string } };
}

type RecordedError = { readonly error: { readonly cls: string } };

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RecordedCase[] }).cases;

/** The recorder's input: `EcoreUtil.copy(root)` of the scenario graph (ElktWriteVectors.serialize). */
function build(c: RecordedCase): ElkNode {
  return copyGraph(buildWriteInput(c.source, c.id));
}

/** The recorded text without whitespace and comments, token texts joined. */
function significantText(text: string): string {
  return tokenize(text)
    .filter((t) => !t.hidden)
    .map((t) => t.text)
    .join('');
}

describe('ElkGraphSerializer against the recorded writer vectors', () => {
  it('covers every recorded java scenario', () => {
    const recorded = cases.filter((c) => c.source === 'java').map((c) => c.id);
    expect(Object.keys(JAVA_SCENARIOS).sort()).toEqual(recorded.sort());
    expect(recorded.every((id) => id.startsWith(JAVA_PREFIX))).toBe(true);
  });

  const written = cases.filter((c) => typeof c.unformatted === 'string');
  const failing = cases.filter((c) => typeof c.unformatted !== 'string');

  it.each(written.map((c) => [c.id, c] as const))('%s: the tokens are those of the recorded text', (_id, c) => {
    const stream = new ElkGraphSerializer().sequence(build(c));
    expect(stream.tokens.map((t) => t.text).join('')).toBe(significantText(c.unformatted as string));
  });

  it.each(failing.map((c) => [c.id, c] as const))('%s: serialisation fails', (_id, c) => {
    const cls = (c.unformatted as RecordedError).error.cls;
    expect(() => new ElkGraphSerializer().sequence(build(c))).toThrow(recordedErrorClass(cls));
  });

  it('replays 116 recorded cases, 106 written and 10 failing', () => {
    expect([cases.length, written.length, failing.length]).toEqual([116, 106, 10]);
  });
});

describe('ElkGraphSerializer.serializeToRegions', () => {
  it('holds the token texts without whitespace', () => {
    const root = ElkGraphFactory.eINSTANCE.createElkNode();
    root.setIdentifier('g');
    const regions = new ElkGraphSerializer().serializeToRegions(root);
    expect(regions.regionForDocument().getText()).toBe('graphg');
  });
});
