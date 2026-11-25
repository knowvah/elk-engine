// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { URI } from '../../../emf/common/util/URI.js';
import { ResourceImpl } from '../../../emf/ecore/resource/impl/ResourceImpl.js';
import { dumpModel, type DumpedObject } from '../../../../test/helpers/dot-model-dump.js';
import { dotWriteModels } from '../../../../test/helpers/dot-write-models.js';
import type { GraphvizModel } from './dot/GraphvizModel.js';
import { GraphvizDot, type DotDiagnostic } from './GraphvizDot.js';

const REFS = '../../../../test/golden/refs/java/';
const read = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(REFS + name, import.meta.url)), 'utf8'));

const SYNTAX = 'syntax';
const OUTPUT_URI = 'output.graphviz_dot';
const PARSED_PREFIX = 'parsed/';

interface RecordedCase {
  readonly id: string;
  readonly source: 'scenario' | 'fixture';
  readonly input: string;
  readonly hasSyntaxErrors: boolean;
  readonly diagnostics: readonly DotDiagnostic[];
  readonly model: DumpedObject | null;
}

interface ParseRef {
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly cases: readonly RecordedCase[];
}

type Form = string | { readonly error: { readonly cls: string; readonly msg: string | null } };

interface WriteRow {
  readonly id: string;
  readonly source: 'scenario' | 'fixture' | 'built';
  readonly detached: { readonly formatted: Form; readonly unformatted: Form; readonly save: Form };
}

const PARSE = read('graphviz-dot-parse.json') as ParseRef;
const WRITE_ROWS = (read('graphviz-dot-write.json') as { rows: readonly WriteRow[] }).rows;
const INPUTS: ReadonlyMap<string, string> = new Map(PARSE.cases.map((c) => [c.id, c.input]));
const PARSED_ROWS = WRITE_ROWS.filter((row) => row.source !== 'built');
const NULL_ROWS = WRITE_ROWS.filter((row) => row.id.startsWith('built/null/'));
const BUILT = dotWriteModels();
const SYNTAX_CASES = PARSE.cases.filter((c) => c.hasSyntaxErrors);
const JAVA_PACKAGE = 'java.lang.';

/** D4: syntax errors by presence and line; value-conversion diagnostics exactly. */
function d4(diagnostics: readonly DotDiagnostic[]): unknown[] {
  return diagnostics.map((d) =>
    d.kind === SYNTAX ? { kind: d.kind, line: d.line } : { kind: d.kind, message: d.message, line: d.line },
  );
}

/** A write row's id is the parse case's id, behind the `parsed/` prefix for scenarios. */
function sourceText(row: WriteRow): string {
  const text = INPUTS.get(row.source === 'scenario' ? row.id.substring(PARSED_PREFIX.length) : row.id);
  if (text === undefined) throw new Error(`no parse case for ${row.id}`);
  return text;
}

function loadedModel(row: WriteRow): GraphvizModel {
  const model = GraphvizDot.load(sourceText(row)).model;
  if (model === null) throw new Error(`no model for ${row.id}`);
  return model;
}

/** `DotWriteVectors.copy`: the model as the only content of a fresh resource, as the exporter hands it over. */
function detached(model: GraphvizModel): GraphvizModel {
  new ResourceImpl(URI.createURI(OUTPUT_URI)).getContents().add(model);
  return model;
}

function builtModel(row: WriteRow): GraphvizModel {
  const build = BUILT.get(row.id);
  if (build === undefined) throw new Error(`no built model ${row.id}`);
  return detached(build());
}

function thrown(run: () => unknown): { cls: string; msg: string | null } {
  try {
    run();
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    return { cls: JAVA_PACKAGE + e.constructor.name, msg: e.message === '' ? null : e.message };
  }
  throw new Error('did not throw');
}

describe('GraphvizDot.load: the recorded parse cases', () => {
  it('has the recorded 61 scenarios and 14 fixtures', () => {
    expect(PARSE.rowCounts).toEqual({ scenario: 61, fixture: 14 });
    expect(PARSE.cases).toHaveLength(75);
  });

  it.each(PARSE.cases.map((c) => [c.id, c] as const))('%s: model and errors', (_id, c) => {
    const { model, errors } = GraphvizDot.load(c.input);
    expect(dumpModel(model)).toEqual(c.model);
    expect(d4(errors)).toEqual(d4(c.diagnostics));
  });

  it.each(SYNTAX_CASES.map((c) => [c.id, c] as const))('%s: does not throw and reports errors', (_id, c) => {
    const { errors } = GraphvizDot.load(c.input);
    expect(errors.some((e) => e.kind === SYNTAX)).toBe(true);
  });
});

describe('GraphvizDot.serialize: the round trip of the recorded write rows', () => {
  it('covers the 41 parsed and fixture rows', () => {
    expect(PARSED_ROWS).toHaveLength(41);
  });

  it.each(PARSED_ROWS.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const { formatted, unformatted, save } = row.detached;
    expect({
      formatted: GraphvizDot.serialize(detached(loadedModel(row)), { format: true }),
      unformatted: GraphvizDot.serialize(detached(loadedModel(row)), { format: false }),
      save: GraphvizDot.serialize(detached(loadedModel(row))),
    }).toEqual({ formatted, unformatted, save });
  });
});

describe('GraphvizDot.serialize: the recorded exceptions of built models', () => {
  it.each(NULL_ROWS.filter((row) => typeof row.detached.formatted !== 'string').map((row) => [row.id, row] as const))(
    '%s throws as ISerializer does',
    (_id, row) => {
      const recorded = row.detached.formatted;
      expect({ error: thrown(() => GraphvizDot.serialize(builtModel(row), { format: true })) }).toEqual(recorded);
    },
  );
});
