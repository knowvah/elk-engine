// SPDX-License-Identifier: EPL-2.0
// Replays test/golden/refs/java/graph-text-write.json (T5): the serializer's token stream, rendered through
// ElkGraphFormatter, must equal the recorded `formatted` and `unformatted` text byte for byte.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildWriteInput, JAVA_SCENARIOS } from '../../../../test/helpers/elkt-write-cases.js';
import '../../impl/ElkGraphFactoryImpl.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphSerializationError } from '../serializer/ElkGraphSerializationError.js';
import { ElkGraphSerializer } from '../serializer/ElkGraphSerializer.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-text-write.json', import.meta.url));
const JAVA_PREFIX = 'java-';

type RecordedText = string | { readonly error: { readonly cls: string } };

interface RecordedCase {
  readonly id: string;
  readonly source: 'elkt' | 'json' | 'java';
  readonly formatted: RecordedText;
  readonly unformatted: RecordedText;
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RecordedCase[] }).cases;

function build(c: RecordedCase): ElkNode {
  return buildWriteInput(c.source, c.id);
}

import { ExceptionAcceptor } from '../../../xtext/formatting2/ExceptionAcceptor.js';
import { FormatterRequest } from '../../../xtext/formatting2/FormatterRequest.js';
import { ElkGraphFormatter } from './ElkGraphFormatter.js';

/** Test-local `serializeFormatted(root) = render(formatter.format(sequence(root)))` (T22 owns the entry point). */
function serializeFormatted(root: ElkNode, undefinedOnly = false): string {
  const access = new ElkGraphSerializer().sequence(root).regionAccess;
  const request = new FormatterRequest()
    .setTextRegionAccess(access)
    .setExceptionHandler(ExceptionAcceptor.THROWING)
    .setFormatUndefinedHiddenRegionsOnly(undefinedOnly);
  return access.getRewriter().renderToString(new ElkGraphFormatter().formatRequest(request));
}

function byId(id: string): RecordedCase {
  return cases.find((c) => c.id === id) as RecordedCase;
}

describe('ElkGraphFormatter against the recorded writer vectors', () => {
  const written = cases.filter((c) => typeof c.formatted === 'string');
  const failing = cases.filter((c) => typeof c.formatted !== 'string');

  it('covers every recorded java scenario', () => {
    const recorded = cases.filter((c) => c.source === 'java').map((c) => c.id);
    expect(Object.keys(JAVA_SCENARIOS).sort()).toEqual(recorded.sort());
    expect(recorded.every((id) => id.startsWith(JAVA_PREFIX))).toBe(true);
  });

  it('replays 113 recorded cases, 106 written and 7 failing', () => {
    expect([cases.length, written.length, failing.length]).toEqual([113, 106, 7]);
  });

  it.each(written.map((c) => [c.id, c] as const))('%s: formatted text is byte-exact', (_id, c) => {
    expect(serializeFormatted(build(c))).toBe(c.formatted);
  });

  it.each(written.map((c) => [c.id, c] as const))(
    '%s: unformatted text (undefined hidden regions only) is byte-exact',
    (_id, c) => {
      expect(serializeFormatted(build(c), true)).toBe(c.unformatted);
    },
  );

  it.each(failing.map((c) => [c.id, c] as const))('%s: serialisation fails', (_id, c) => {
    expect(() => serializeFormatted(build(c))).toThrow(ElkGraphSerializationError);
  });
});

/** Branch coverage: each snippet is a literal piece of the recorded text of the named row. */
const BRANCH_SNIPPETS: ReadonlyArray<readonly [string, string, string]> = [
  ['root and node keyword spacing, nested indentation', 'container-nested-3', 'node a {\n\tnode b {\n\t\tnode c {'],
  ['shape layout, propCount 1 (size only): one line', 'shape-size-only', '\tlayout [ size: 30, 40 ]\n'],
  ['shape layout, propCount 1 (position only): one line', 'shape-position-only', 'layout [ position: '],
  ['shape layout, propCount 2: multiple lines with indent', 'shape-both', 'layout [\n\t\tposition: '],
  ['labels inside a port and an edge', 'label-in-port-edge', 'label '],
  ['single section without keyword', 'section-single-everything', 'layout ['],
  ['named section, empty brackets', 'section-multi-empty', 'section s1 []\n'],
  ['named section with properties', 'section-multi-props-only', ' [\n'],
  ['edge without sections', 'edge-plain', 'edge '],
  ['last property gets new_lines, others new_line', 'props-node-2', ': '],
];

describe('ElkGraphFormatter branches', () => {
  it.each(BRANCH_SNIPPETS.map((r) => [...r] as [string, string, string]))('%s (%s)', (_what, id, snippet) => {
    const c = byId(id);
    expect(c.formatted).toContain(snippet);
    expect(serializeFormatted(build(c))).toContain(snippet);
  });

  it('keeps the formatted output of a property list: new_line between entries, new_lines after the last', () => {
    const c = byId('props-root-3');
    const text = serializeFormatted(build(c));
    expect(text).toBe(c.formatted);
    expect(text.split('\n').length).toBeGreaterThan(3);
  });

  it('formats a graph without properties, shapes or edges as a single line', () => {
    expect(serializeFormatted(build(byId('container-root-id')))).toBe(byId('container-root-id').formatted);
  });

  it('does nothing for an object that is neither a graph element nor a resource', () => {
    const calls: unknown[] = [];
    new ElkGraphFormatter().format(42, { format: (o: unknown) => calls.push(o) } as never);
    expect(calls).toEqual([]);
  });
});
