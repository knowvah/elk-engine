// SPDX-License-Identifier: EPL-2.0
// T16: ElkGraphJsonText.serialize against test/golden/refs/java/graph-json-text-write.json (T5). `formatted` is the
// JVM's text byte for byte (the 11 error rows only by presence); `reparse` is what the JVM made of that text:
// the number of errors of `resource.getErrors()` and, with none, the parse-only export.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildElkjWriteInput,
  ELKJ_JAVA_SCENARIOS,
  type ElkjWriteSource,
} from '../../../../test/helpers/elkj-write-cases.js';
import { exportLikeOracle } from '../../../../test/helpers/graph-json-oracle.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { ExceptionAcceptor } from '../../../xtext/formatting2/ExceptionAcceptor.js';
import type { ElkNode } from '../../ElkNode.js';
import { writeFormatted } from './formatting2/ElkGraphJsonWriter.js';
import { ElkGraphJsonText } from './ElkGraphJsonText.js';
import { ElkGraphJsonSerializationError } from './serializer/ElkGraphJsonSerializationError.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-json-text-write.json', import.meta.url));
const RECORDED_ROWS = 126;
const WRITTEN_ROWS = 115;
const FAILING_ROWS = 11;
const SYNTAX_ERROR_ROWS = 26;

interface RecordedCase {
  readonly id: string;
  readonly source: ElkjWriteSource;
  readonly formatted: string | { readonly error: { readonly cls: string } };
  readonly reparse: { readonly errors: number; readonly json: string | null };
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const written = cases.filter((c): c is RecordedCase & { formatted: string } => typeof c.formatted === 'string');
const failing = cases.filter((c) => typeof c.formatted !== 'string');
const clean = written.filter((c) => c.reparse.errors === 0);
const lossy = written.filter((c) => c.reparse.errors > 0);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

const input = (c: RecordedCase): ElkNode => buildElkjWriteInput(c.source, c.id);

describe('ElkGraphJsonText.serialize against the recorded writer rows', () => {
  it('replays 126 rows, 115 written and 11 failing; 26 written rows do not reparse', () => {
    expect([cases.length, written.length, failing.length, lossy.length]).toEqual([
      RECORDED_ROWS,
      WRITTEN_ROWS,
      FAILING_ROWS,
      SYNTAX_ERROR_ROWS,
    ]);
    expect(Object.keys(ELKJ_JAVA_SCENARIOS).length).toBe(cases.filter((c) => c.source === 'java').length);
  });

  it.each(written.map((c) => [c.id, c] as const))('%s: the text equals the recorded formatted text', (_id, c) => {
    expect(ElkGraphJsonText.serialize(input(c))).toBe(c.formatted);
  });

  it.each(written.map((c) => [c.id, c] as const))('%s: no formatting conflict (THROWING handler)', (_id, c) => {
    expect(writeFormatted(input(c), ExceptionAcceptor.THROWING)).toBe(c.formatted);
  });

  it.each(failing.map((c) => [c.id, c] as const))('%s: serialisation fails', (_id, c) => {
    expect(() => ElkGraphJsonText.serialize(input(c))).toThrow(ElkGraphJsonSerializationError);
  });
});

describe('ElkGraphJsonText.serialize: the output reloaded', () => {
  it.each(clean.map((c) => [c.id, c] as const))('%s: reloads without errors to the recorded export', (_id, c) => {
    const reloaded = ElkGraphJsonText.load(ElkGraphJsonText.serialize(input(c)));
    expect(reloaded.errors).toEqual([]);
    expect(exportLikeOracle(reloaded.root as ElkNode)).toBe(c.reparse.json);
  });

  it.each(lossy.map((c) => [c.id, c] as const))('%s: reloads with syntax errors (presence, D6)', (_id, c) => {
    const reloaded = ElkGraphJsonText.load(ElkGraphJsonText.serialize(input(c)));
    expect(reloaded.errors.length).toBeGreaterThan(0);
    expect(c.reparse.json).toBeNull();
  });
});

describe('ElkGraphJsonText.serialize: the input graph', () => {
  const TEXT =
    '{ "id": "g", "children": [ { "id": "a" }, { "id": "b" } ], "edges": [ { "id": "e", "sources": [ "a" ], "targets": [ "missing" ] } ] }';

  it('is not modified: a loaded graph keeps its unresolved reference', () => {
    const loaded = ElkGraphJsonText.load(TEXT);
    const root = loaded.root as ElkNode;
    const written = ElkGraphJsonText.serialize(root);
    const edge = root.getContainedEdges().get(0);
    expect(edge.getSources().size()).toBe(1);
    expect(edge.getTargets().size()).toBe(1);
    expect(root.getChildren().size()).toBe(2);
    expect(written).toBe(ElkGraphJsonText.serialize(root));
  });

  it('writes the copy, which drops a reference to a shape outside the tree', () => {
    const root = ElkGraphJsonText.load(TEXT).root as ElkNode;
    const reloaded = ElkGraphJsonText.load(ElkGraphJsonText.serialize(root));
    expect(reloaded.errors).toEqual([]);
    const edge = (reloaded.root as ElkNode).getContainedEdges().get(0);
    expect(edge.getSources().size()).toBe(1);
    expect(edge.getTargets().size()).toBe(0);
  });
});
