// SPDX-License-Identifier: EPL-2.0
// Drives ElkGraphJson (the builders) against test/golden/refs/java/graph-json.json:
//  - every `export` row (880): the row's fixture is imported through the builder (lenient), the row's mods are applied
//    as GraphJsonVectors.java Mods.apply does, and the graph is exported with the row's flags. Rows with `seed` run
//    `new JsonExporter(new Random(1))` + `setOptions` + the Gson call `toJson` makes (the builder gains no seed API,
//    J4); all other rows go through the builder. Text is byte-identical; a Java NullPointerException is a TypeError.
//  - the `import` rows: the canonical tree <G> (test/helpers/graph-json-canon.ts) of every graph-producing row, and
//    exception class and message of every throwing row (the PARSE_PHASE rows, a JsonIOException, included).
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { Maybe } from '../../core/util/Maybe.js';
import { GsonBuilder } from '../../gson/GsonBuilder.js';
import { JsonIOException } from '../../gson/JsonIOException.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Random } from '../../java/util/Random.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import type { ElkNode } from '../ElkNode.js';
import { Property } from '../properties/Property.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import {
  EXCEPTION_CLASSES,
  TOP_LEVEL_MESSAGE,
  canonNode,
  fixtureText,
  importRows,
  simpleName,
} from '../../../test/helpers/graph-json-canon.js';
import type { ImportRow, Thrown } from '../../../test/helpers/graph-json-canon.js';
import { ElkGraphJson, ExportBuilder, ImportBuilder } from './ElkGraphJson.js';
import { JsonExporter } from './JsonExporter.js';
import { JsonImportException } from './JsonImportException.js';
import { JsonImporter } from './JsonImporter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/graph-json.json', import.meta.url);
const SEED = 1;
const SEED_MOD = 'seed';
const CLEAR_MOD = 'clear=';
const UNKNOWN_OPTION = new Property<string>('my.unknown.option');
const UNKNOWN_VALUE = 'v';
const NULL_POINTER = 'NullPointerException';
const EXPORT_ROW_COUNT = 880;
const FOREIGN_MODS = new Set(['foreignTarget', 'foreignSource']);
const UNKNOWN_ENDPOINT_IAE_COUNT = 48;

interface Flags {
  prettyPrint: boolean;
  shortLayoutOptionKeys: boolean;
  omitZeroPositions: boolean;
  omitZeroDimension: boolean;
  omitLayout: boolean;
  omitUnknownLayoutOptions: boolean;
}
interface ExportRow {
  id: string;
  input: string;
  mods: string[];
  flags: Flags;
  text?: string;
  throws?: Thrown;
}

const VECTORS = {
  import: importRows,
  export: (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { export: ExportRow[] }).export,
};

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

// ---- the recorder's mods (GraphJsonVectors.java Mods)

function preorder(root: ElkNode): ElkNode[] {
  return [root, ...[...root.getChildren()].flatMap(preorder)];
}

function edgesOf(root: ElkNode): ElkEdge[] {
  return preorder(root).flatMap((n) => [...n.getContainedEdges()]);
}

function elementsOf(root: ElkNode, kind: string): Array<ElkGraphElement | ElkEdgeSection> {
  const result: Array<ElkGraphElement | ElkEdgeSection> = [];
  for (const n of preorder(root)) {
    if (kind === 'nodes') result.push(n);
    else if (kind === 'ports') result.push(...n.getPorts());
  }
  for (const e of edgesOf(root)) {
    if (kind === 'edges') result.push(e);
    else if (kind === 'sections') result.push(...e.getSections());
  }
  return result;
}

function clear(root: ElkNode, spec: string): void {
  const [kind, indices] = spec.split('@');
  const only = new Set(
    (indices ?? '')
      .split(',')
      .filter((i) => i !== '')
      .map(Number),
  );
  elementsOf(root, kind).forEach((element, i) => {
    if (indices === undefined || only.has(i)) element.setIdentifier(null);
  });
}

function unknown(root: ElkNode): void {
  root.setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
  if (root.getChildren().size() > 0) root.getChildren().get(0).setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
  const edges = edgesOf(root);
  if (edges.length > 0) edges[0].setProperty(UNKNOWN_OPTION, UNKNOWN_VALUE);
}

function applyMod(root: ElkNode, mod: string): void {
  if (mod.startsWith(CLEAR_MOD)) clear(root, mod.slice(CLEAR_MOD.length));
  else if (mod === 'unknown') unknown(root);
  else if (mod === 'foreignTarget') edgesOf(root)[0].getTargets().set(0, ElkGraphUtil.createNode(null));
  else if (mod === 'foreignSource') edgesOf(root)[0].getSources().set(0, ElkGraphUtil.createNode(null));
  else if (mod !== SEED_MOD) throw new Error(`bad mod: ${mod}`);
}

// ---- running an export row

function withBuilder(root: ElkNode, f: Flags): string {
  return ElkGraphJson.forGraph(root)
    .prettyPrint(f.prettyPrint)
    .shortLayoutOptionKeys(f.shortLayoutOptionKeys)
    .omitZeroPositions(f.omitZeroPositions)
    .omitZeroDimension(f.omitZeroDimension)
    .omitLayout(f.omitLayout)
    .omitUnknownLayoutOptions(f.omitUnknownLayoutOptions)
    .toJson();
}

/** The calls `ExportBuilder.toJson` makes, with the J4 seeded exporter. */
function seeded(root: ElkNode, f: Flags): string {
  const exporter = new JsonExporter(new Random(SEED));
  exporter.setOptions(
    f.omitZeroPositions,
    f.omitZeroDimension,
    f.omitLayout,
    f.shortLayoutOptionKeys,
    f.omitUnknownLayoutOptions,
  );
  const builder = new GsonBuilder().disableHtmlEscaping();
  if (f.prettyPrint) builder.setPrettyPrinting();
  return builder.create().toJson(exporter.export(root));
}

function exportOutcome(row: ExportRow): { text?: string; error?: Error } {
  try {
    const root = ElkGraphJson.forGraph(fixtureText(row)).toElk();
    row.mods.forEach((mod) => applyMod(root, mod));
    return { text: row.mods.includes(SEED_MOD) ? seeded(root, row.flags) : withBuilder(root, row.flags) };
  } catch (e) {
    return { error: e as Error };
  }
}

/**
 * Known divergence (user decision 2026-10-14, docs/conformance.md): an edge endpoint unknown to the exporter is a
 * message-less IllegalArgumentException (Gson 2.8), not the oracle's NullPointerException (Gson 2.11). These are the
 * rows that record that NullPointerException: 3 fixtures x 16 flag sets.
 */
const UNKNOWN_ENDPOINT_IAE: ReadonlySet<string> = new Set(
  VECTORS.export.filter((r) => r.mods.some((m) => FOREIGN_MODS.has(m))).map((r) => r.id),
);

function expectThrown(error: Error | undefined, thrown: Thrown): void {
  const name = simpleName(thrown.class);
  expect(error?.constructor).toBe(EXCEPTION_CLASSES[name]);
  if (name !== NULL_POINTER) {
    expect(error?.message).toBe(thrown.message);
  }
}

describe('unknown export endpoints (known divergence: IllegalArgumentException)', () => {
  it('covers exactly the 48 rows that record a NullPointerException', () => {
    const rows = VECTORS.export.filter((r) => UNKNOWN_ENDPOINT_IAE.has(r.id));
    expect(rows.length).toBe(UNKNOWN_ENDPOINT_IAE_COUNT);
    expect(new Set(rows.map((r) => `${r.input}+${r.mods.join('+')}`)).size).toBe(3);
    expect(rows.map((r) => simpleName((r.throws as Thrown).class))).toEqual(rows.map(() => NULL_POINTER));
  });
});

describe('export rows (import -> mods -> export)', () => {
  it('covers all 880 recorded rows, 64 of which throw a NullPointerException', () => {
    expect(VECTORS.export.length).toBe(EXPORT_ROW_COUNT);
    const thrown = VECTORS.export.filter((r) => r.throws !== undefined);
    expect(thrown.length).toBe(64);
    expect(new Set(thrown.map((r) => simpleName((r.throws as Thrown).class)))).toEqual(new Set([NULL_POINTER]));
  });

  it.each(VECTORS.export.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    const got = exportOutcome(row);
    if (row.throws === undefined) {
      expect(got.error).toBeUndefined();
      expect(got.text).toBe(row.text);
    } else {
      if (UNKNOWN_ENDPOINT_IAE.has(row.id)) {
        expect(got.error?.constructor).toBe(IllegalArgumentException);
        expect(got.error?.message).toBe('');
      } else {
        expectThrown(got.error, row.throws);
      }
    }
  });
});

describe('import rows with a graph', () => {
  const graphRows = VECTORS.import.filter((r) => r.throws === undefined);

  it('covers the 28 graph-producing rows (105 rows, 77 of them throw)', () => {
    expect(graphRows.length).toBe(28);
  });

  it.each(graphRows.map((r) => [r.id, r] as const))('%s', (_id, row: ImportRow) => {
    const got = canonNode(ElkGraphJson.forGraph(fixtureText(row)).lenient(row.lenient).toElk());
    expect(got).toEqual(row.graph);
  });
});

describe('import rows that throw', () => {
  const throwing = VECTORS.import.filter((r) => r.throws !== undefined);

  it('includes the JsonIOException (PARSE_PHASE) rows', () => {
    expect(throwing.filter((r) => simpleName((r.throws as Thrown).class) === 'JsonIOException').length).toBe(9);
  });

  it.each(throwing.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    let error: Error | undefined;
    try {
      ElkGraphJson.forGraph(fixtureText(row)).lenient(row.lenient).toElk();
    } catch (e) {
      error = e as Error;
    }
    expectThrown(error, row.throws as Thrown);
    const cause = (row.throws as Thrown).cause;
    if (cause !== undefined) {
      expect((error?.cause as { javaName: string }).javaName).toBe(cause.class);
      expect((error?.cause as Error).message).toBe(cause.message);
    }
  });
});

describe('ImportBuilder', () => {
  const SIMPLE = '{"id":"r","children":[{"id":"a"}]}';

  it('is lenient by default and strict on request', () => {
    expect(ElkGraphJson.forGraph('{id:"r"}').toElk().getIdentifier()).toBe('r');
    expect(() => ElkGraphJson.forGraph('{id:"r"}').lenient(false).toElk()).toThrow(JsonIOException);
  });

  it('rejects a non-object top level with the Java message', () => {
    expect(() => ElkGraphJson.forGraph('[]').toElk()).toThrow(JsonImportException);
    expect(() => ElkGraphJson.forGraph('[]').toElk()).toThrow(TOP_LEVEL_MESSAGE);
  });

  it('wraps a reader failure into a JsonIOException carrying the cause', () => {
    try {
      ElkGraphJson.forGraph('').toElk();
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(JsonIOException);
      expect((e as Error).message).toBe('java.io.EOFException: End of input at line 1 column 1 path $');
    }
  });

  it('uses a passed json object without copying it', () => {
    const json = new JsonObject();
    json.addProperty('id', 'r');
    const builder = ElkGraphJson.forGraph(json);
    json.addProperty('id', 'mutated');
    expect(builder.toElk().getIdentifier()).toBe('mutated');
  });

  it('populates the remembered importer', () => {
    const maybe = new Maybe<JsonImporter>();
    expect(maybe.get()).toBeNull();
    const root = ElkGraphJson.forGraph(SIMPLE).rememberImporter(maybe).toElk();
    const importer = maybe.get();
    expect(importer).toBeInstanceOf(JsonImporter);
    expect(importer?.getInputModel()).toBeInstanceOf(JsonObject);
    expect(root.getChildren().size()).toBe(1);
  });

  it('leaves the maybe untouched when no importer is remembered', () => {
    const maybe = new Maybe<JsonImporter>();
    ElkGraphJson.forGraph(SIMPLE).toElk();
    expect(maybe.get()).toBeNull();
  });
});

describe('ElkGraphJson', () => {
  it('dispatches forGraph on the argument type and aliases the nested builders', () => {
    expect(ElkGraphJson.forGraph('{"id":"r"}')).toBeInstanceOf(ImportBuilder);
    expect(ElkGraphJson.forGraph(new JsonObject())).toBeInstanceOf(ImportBuilder);
    expect(ElkGraphJson.forGraph(ElkGraphUtil.createGraph())).toBeInstanceOf(ExportBuilder);
    expect(ElkGraphJson.ImportBuilder).toBe(ImportBuilder);
    expect(ElkGraphJson.ExportBuilder).toBe(ExportBuilder);
  });

  it('has a private constructor (utility class)', () => {
    const construct = ElkGraphJson as unknown as new () => unknown;
    expect(new construct()).toBeInstanceOf(ElkGraphJson);
  });

  it('exports with the builder defaults (compact, short keys, zeros omitted)', () => {
    const root = ElkGraphJson.forGraph('{"id":"r","width":0,"height":5.0}').toElk();
    expect(ElkGraphJson.forGraph(root).toJson()).toBe('{"id":"r","height":5.0}');
    expect(ElkGraphJson.forGraph(root).prettyPrint(true).toJson()).toBe('{\n  "id": "r",\n  "height": 5.0\n}');
  });
});
