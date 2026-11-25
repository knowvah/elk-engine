// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { graphsDump } from '../../../../../test/helpers/dot-import-dump.js';
import { fakeLayout } from '../../../../../test/helpers/dot-import-layout.js';
import {
  comparableThrown,
  modelDumpM,
  serializeCopy,
  thrownBy,
  type Thrown,
} from '../../../../../test/helpers/dot-import-model.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { GraphvizModel } from '../dot/GraphvizModel.js';
import { parse } from '../parser/GraphvizDotParser.js';
import { createValueConverterService } from '../parser/GraphvizDotValueConverters.js';
import { DotImporter } from './DotImporter.js';
import { DotTransformationData } from './DotTransformationData.js';

// Replays every row of graphviz-dot-import.json (tools/vectors/DotImportVectors.java): parse the scenario, transform
// whatever the parse errors, compare the target graphs and the log, apply the recorder's fake layout, compare it,
// transferLayout, then compare the serialized and dumped DOT model (or the recorded exception at each step).
const REF_URL = new URL('../../../../../test/golden/refs/java/graphviz-dot-import.json', import.meta.url);
const SCENARIOS_URL = new URL('../../../../../tools/vectors/', import.meta.url);
const SERVICES = createValueConverterService();

interface AfterTransfer {
  readonly text: string | null;
  readonly formatted: string | null;
  readonly model: unknown;
  readonly textThrows?: Thrown;
  readonly formattedThrows?: Thrown;
}

interface ImportRow {
  readonly id: string;
  readonly input: string;
  readonly parseErrors: readonly { readonly line: number; readonly message: string }[];
  readonly parsed: boolean;
  readonly throws?: Thrown;
  readonly graphs?: unknown[];
  readonly messages?: string[];
  readonly layout?: unknown[];
  readonly transferThrows?: Thrown;
  readonly afterTransfer?: AfterTransfer;
}

interface ImportRef {
  readonly rowCounts: { readonly import: number };
  readonly rows: readonly ImportRow[];
}

/** What the port produced for one row, in the recorder's row shape. */
interface Replayed {
  parseErrors: { line: number; message: string }[];
  parsed: boolean;
  throws?: Thrown;
  graphs?: unknown[];
  messages?: string[];
  layout?: unknown[];
  transferThrows?: Thrown;
  afterTransfer?: Record<string, unknown>;
}

// The recorder's first step: the registry with CoreOptions only (G3), which also registers the ElkReflect clones
// (`getProperty(PADDING)` clones the default padding).
LayoutMetaDataService.getInstance();

const REF = JSON.parse(readFileSync(REF_URL, 'utf8')) as ImportRef;

function serialized(after: Record<string, unknown>, key: string, model: GraphvizModel, format: boolean): void {
  let text: string | null = null;
  const thrown = thrownBy(() => {
    text = serializeCopy(model, format);
  });
  after[key] = text;
  if (thrown !== null) after[`${key}Throws`] = thrown;
}

/** `Recorder.transformAndTransfer`. */
function transformAndTransfer(model: GraphvizModel, out: Replayed): void {
  const data = new DotTransformationData<GraphvizModel, ElkNode>();
  data.setSourceGraph(model);
  const importer = new DotImporter();
  const thrown = thrownBy(() => importer.transform(data));
  if (thrown !== null) out.throws = thrown;
  out.graphs = graphsDump(data.getTargetGraphs());
  out.messages = [...data.getMessages()];
  if (thrown !== null) return;
  fakeLayout(data.getTargetGraphs());
  out.layout = graphsDump(data.getTargetGraphs());
  const transferThrown = thrownBy(() => importer.transferLayout(data));
  if (transferThrown !== null) out.transferThrows = transferThrown;
  const after: Record<string, unknown> = {};
  serialized(after, 'text', model, false);
  serialized(after, 'formatted', model, true);
  after['model'] = modelDumpM(model);
  out.afterTransfer = after;
}

/** `Recorder.record`. */
function record(row: ImportRow): Replayed {
  const result = parse(readFileSync(new URL(row.input, SCENARIOS_URL), 'utf8'), SERVICES);
  const out: Replayed = {
    parseErrors: result.diagnostics.map((d) => ({ line: d.line, message: d.message })),
    parsed: result.root !== null,
  };
  if (result.root !== null) transformAndTransfer(result.root, out);
  return out;
}

const REPLAYED: ReadonlyMap<string, Replayed> = new Map(REF.rows.map((row) => [row.id, record(row)]));

/** The recorded row with every exception in its comparable form. */
function expected(row: ImportRow): Replayed {
  const out: Replayed = { parseErrors: [...row.parseErrors], parsed: row.parsed };
  if (row.throws !== undefined) out.throws = comparableThrown(row.throws);
  if (row.graphs !== undefined) out.graphs = row.graphs;
  if (row.messages !== undefined) out.messages = row.messages;
  if (row.layout !== undefined) out.layout = row.layout;
  if (row.transferThrows !== undefined) out.transferThrows = comparableThrown(row.transferThrows);
  if (row.afterTransfer !== undefined) out.afterTransfer = expectedAfter(row.afterTransfer);
  return out;
}

function expectedAfter(after: AfterTransfer): Record<string, unknown> {
  const out: Record<string, unknown> = { text: after.text, formatted: after.formatted, model: after.model };
  if (after.textThrows !== undefined) out['textThrows'] = comparableThrown(after.textThrows);
  if (after.formattedThrows !== undefined) out['formattedThrows'] = comparableThrown(after.formattedThrows);
  return out;
}

type Field = keyof Replayed;

/** Compares `fields` of every row; returns the number of rows replayed. */
function replay(fields: readonly Field[]): number {
  let count = 0;
  for (const row of REF.rows) {
    const actual = REPLAYED.get(row.id) as Replayed;
    const wanted = expected(row);
    for (const field of fields) {
      expect(actual[field], `${row.id} ${field}`).toEqual(wanted[field]);
    }
    count++;
  }
  return count;
}

const PARSE_FIELDS: readonly Field[] = ['parseErrors', 'parsed'];
const TRANSFORM_FIELDS: readonly Field[] = ['throws', 'graphs', 'messages'];
const LAYOUT_FIELDS: readonly Field[] = ['layout'];
const TRANSFER_FIELDS: readonly Field[] = ['transferThrows', 'afterTransfer'];

describe('DotImporter: replay of the recorded JVM import rows', () => {
  it('replays the recorded number of rows', () => {
    expect(REPLAYED.size).toBe(REF.rowCounts.import);
    expect(REF.rows.length).toBe(REF.rowCounts.import);
  });

  it('reports the recorded parse errors of every scenario', () => {
    expect(replay(PARSE_FIELDS)).toBe(REF.rowCounts.import);
  });

  it('builds the recorded target graphs and log messages (or throws as recorded)', () => {
    expect(replay(TRANSFORM_FIELDS)).toBe(REF.rowCounts.import);
  });

  it('dumps the recorded graphs after the fake layout', () => {
    expect(replay(LAYOUT_FIELDS)).toBe(REF.rowCounts.import);
  });

  it('transfers the layout into the recorded DOT model, text and formatted text', () => {
    expect(replay(TRANSFER_FIELDS)).toBe(REF.rowCounts.import);
  });
});
