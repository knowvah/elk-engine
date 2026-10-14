// SPDX-License-Identifier: EPL-2.0
// Drives the `import` rows of test/golden/refs/java/graph-json.json (ELK on the oracle JVM, isolated CoreOptions-only
// LayoutMetaDataService) that this task can decide: the canonical tree <G> (GraphJsonVectors.java header) is built in
// TS from `new JsonImporter().transform(json)`, the json read as ElkGraphJson.ImportBuilder.toElk does (lenient or
// strict reader, `readElement`, top-level object check; ElkGraphJson itself is T15).
// Skipped by named filter: rows whose fixture has edges (EDGE_PHASE, T14: transformEdges is not wired yet) and rows
// the Gson reader rejects (PARSE_PHASE, a JsonIOException before the importer runs: T7/T10/T15).
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../core/data/LayoutOptionData.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IndividualSpacings } from '../../core/util/IndividualSpacings.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { JsonPrimitive } from '../../gson/JsonPrimitive.js';
import { readElement } from '../../gson/internal/JsonElementReader.js';
import { JsonReader } from '../../gson/stream/JsonReader.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import { NumberFormatException } from '../../java/lang/NumberFormatException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import type { ElkLabel } from '../ElkLabel.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkShape } from '../ElkShape.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { JsonImportException } from './JsonImportException.js';
import { JsonImporter } from './JsonImporter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/graph-json.json', import.meta.url);
const SCENARIOS_URL = new URL('../../../tools/vectors/graph-json-scenarios/', import.meta.url);
const PARSE_ERROR_CLASS = 'JsonIOException';
const TOP_LEVEL_MESSAGE = 'Top-level element of the graph must be a json object.';
const EDGES_KEY = /["']?\bedges\b["']?\s*:/;
const DOUBLE_OPTION_TYPE = 'DOUBLE';

/** Java exception simple name -> the port's class (a Java NPE is a TypeError, D10). */
const EXCEPTION_CLASSES: Readonly<Record<string, new (...a: never[]) => Error>> = {
  IllegalStateException,
  IllegalArgumentException,
  NumberFormatException,
  UnsupportedOperationException,
  JsonImportException,
  NullPointerException: TypeError,
};

interface Thrown {
  readonly class: string;
  readonly message: string | null;
}

interface ImportRow {
  readonly id: string;
  readonly input: string;
  readonly lenient: boolean;
  readonly graph?: unknown;
  readonly throws?: Thrown;
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { import: ImportRow[] }).import;

function simpleName(javaClass: string): string {
  return javaClass.slice(javaClass.lastIndexOf('.') + 1);
}

function fixtureText(row: ImportRow): string {
  return readFileSync(new URL(row.input, SCENARIOS_URL), 'utf8');
}

const isParsePhase = (row: ImportRow): boolean =>
  row.throws !== undefined && simpleName(row.throws.class) === PARSE_ERROR_CLASS;
const isEdgePhase = (row: ImportRow): boolean => EDGES_KEY.test(fixtureText(row));
const decidable = rows.filter((r) => !isParsePhase(r) && !isEdgePhase(r));

/** ElkGraphJson.ImportBuilder.toElk without the builder: reader, top-level check, importer. */
function toElk(text: string, lenient: boolean): ElkNode {
  const reader = new JsonReader(text);
  reader.setLenient(lenient);
  const json = readElement(reader);
  if (!(json instanceof JsonObject)) throw new JsonImportException(TOP_LEVEL_MESSAGE);
  return new JsonImporter().transform(json);
}

// ---- the canonical tree <G>

function valueText(key: { getId(): string }, value: unknown): string {
  const data = key instanceof LayoutOptionData ? key : null;
  if (typeof value === 'number' && data?.getType()?.name() === DOUBLE_OPTION_TYPE) {
    return DoubleToString.toString(value);
  }
  return String(value);
}

function props(holder: IPropertyHolder): unknown[] {
  return [...holder.getAllProperties()].map(([key, value]) => ({ id: key.getId(), text: valueText(key, value) }));
}

function shape(s: ElkShape): Record<string, string> {
  return {
    x: DoubleToString.toString(s.getX()),
    y: DoubleToString.toString(s.getY()),
    width: DoubleToString.toString(s.getWidth()),
    height: DoubleToString.toString(s.getHeight()),
  };
}

function labels(list: Iterable<ElkLabel>): unknown[] {
  return [...list].map((l) => ({
    identifier: l.getIdentifier(),
    text: l.getText(),
    ...shape(l),
    properties: props(l),
    labels: labels(l.getLabels()),
  }));
}

function canonNode(n: ElkNode): unknown {
  return {
    identifier: n.getIdentifier(),
    ...shape(n),
    properties: props(n),
    labels: labels(n.getLabels()),
    ports: [...n.getPorts()].map((p) => ({
      identifier: p.getIdentifier(),
      ...shape(p),
      properties: props(p),
      labels: labels(p.getLabels()),
    })),
    children: [...n.getChildren()].map(canonNode),
    edges: [...n.getContainedEdges()].map(() => {
      throw new Error('edge rows are T14');
    }),
  };
}

function outcome(row: ImportRow): { graph?: unknown; error?: Error } {
  try {
    return { graph: canonNode(toElk(fixtureText(row), row.lenient)) };
  } catch (e) {
    return { error: e as Error };
  }
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function expectRow(row: ImportRow): void {
  const got = outcome(row);
  if (row.throws === undefined) {
    expect(got.error).toBeUndefined();
    expect(got.graph).toEqual(row.graph);
    return;
  }
  const javaName = simpleName(row.throws.class);
  expect(got.error?.constructor).toBe(EXCEPTION_CLASSES[javaName]);
  if (javaName !== 'NullPointerException') {
    expect(got.error?.message).toBe(row.throws.message);
  }
}

describe('import rows without edges', () => {
  const edgePhase = rows.filter((r) => !isParsePhase(r) && isEdgePhase(r));
  const parsePhase = rows.filter(isParsePhase);

  it('partitions the recorded rows into decided, EDGE_PHASE and PARSE_PHASE', () => {
    expect(rows.length).toBe(105);
    expect(decidable.length + edgePhase.length + parsePhase.length).toBe(rows.length);
    expect(decidable.length).toBeGreaterThan(40);
    expect(new Set(parsePhase.map((r) => simpleName((r.throws as Thrown).class)))).toEqual(
      new Set([PARSE_ERROR_CLASS]),
    );
  });

  it.each(decidable.map((r) => [r.id, r] as const))('%s', (_id, row) => {
    expectRow(row);
  });

  it('includes the duplicate-id rows (J5)', () => {
    const ids = new Set(decidable.map((r) => r.id));
    for (const id of ['err-duplicate-equal-nodes', 'err-duplicate-equal-numeric-nodes']) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

// ---- behaviours outside the rows

function importJson(text: string): { importer: JsonImporter; root: ElkNode } {
  const importer = new JsonImporter();
  const json = readElement(new JsonReader(text)) as JsonObject;
  return { importer, root: importer.transform(json) };
}

describe('option values', () => {
  it('hands parseValue the raw literal text (J2): 10 vs 10.0', () => {
    const parse = vi.spyOn(LayoutOptionData.prototype, 'parseValue');
    const integer = importJson('{"id":"r","layoutOptions":{"org.eclipse.elk.priority":10}}').root;
    const decimal = importJson('{"id":"r","layoutOptions":{"org.eclipse.elk.priority":10.0}}').root;
    expect(parse.mock.calls).toEqual([['10'], ['10.0']]);
    expect(integer.getProperty(CoreOptions.PRIORITY)).toBe(10);
    // Integer.valueOf("10.0") fails, parseValue returns null and the option is not set
    expect(decimal.hasProperty(CoreOptions.PRIORITY)).toBe(false);
    parse.mockRestore();
  });

  it('lets layoutOptions win over the legacy properties', () => {
    const both = importJson(
      '{"id":"r","layoutOptions":{"org.eclipse.elk.direction":"RIGHT"},"properties":{"org.eclipse.elk.direction":"LEFT"}}',
    ).root;
    const legacy = importJson('{"id":"r","properties":{"org.eclipse.elk.direction":"LEFT"}}').root;
    expect(String(both.getProperty(CoreOptions.DIRECTION))).toBe('RIGHT');
    expect(String(legacy.getProperty(CoreOptions.DIRECTION))).toBe('LEFT');
  });

  it('skips unknown keys and values that parse to null', () => {
    const root = importJson('{"id":"r","layoutOptions":{"no.such.option":"1","org.eclipse.elk.priority":"abc"}}').root;
    expect([...root.getAllProperties()]).toEqual([]);
  });

  it('keeps one IndividualSpacings object across the individual options', () => {
    const root = importJson(
      '{"id":"r","individualSpacings":{"org.eclipse.elk.spacing.nodeNode":11.0,"org.eclipse.elk.spacing.edgeNode":4}}',
    ).root;
    const spacings: IndividualSpacings = root.getProperty(CoreOptions.SPACING_INDIVIDUAL);
    expect(spacings.toString()).toBe('org.eclipse.elk.spacing.nodeNode:11.0;,;org.eclipse.elk.spacing.edgeNode:4.0');
  });
});

describe('shape layout', () => {
  it('maps absent and non-finite coordinates to 0.0', () => {
    const json = new JsonObject();
    json.addProperty('id', 'r');
    json.add('x', JsonPrimitive.ofDouble(Number.POSITIVE_INFINITY));
    json.add('y', JsonPrimitive.ofDouble(Number.NaN));
    json.add('width', JsonPrimitive.ofDouble(-Infinity));
    const node = new JsonImporter().transform(json);
    expect([node.getX(), node.getY(), node.getWidth(), node.getHeight()]).toEqual([0, 0, 0, 0]);
  });
});

describe('state (consumed by JsonImporterEdges / JsonImporterLayoutTransfer)', () => {
  const GRAPH =
    '{"id":"r","children":[{"id":1,"ports":[{"id":"p","labels":[{"text":"pl"}]}],"labels":[{"id":"l","text":"t"}]}]}';

  it('registers nodes, ports and labels in the maps and keeps the input model', () => {
    const importer = new JsonImporter();
    const json = readElement(new JsonReader(GRAPH)) as JsonObject;
    const root = importer.transform(json);
    const child = [...root.getChildren()][0] as ElkNode;
    const port = [...child.getPorts()][0];
    expect(importer.getInputModel()).toBe(json);
    expect(importer.nodeIdMap.get('r')).toBe(root);
    expect(importer.nodeIdMap.get(1)).toBe(child);
    expect(importer.nodeIdMap.get('1')).toBeUndefined();
    expect(importer.portIdMap.get('p')).toBe(port);
    expect(importer.nodeJsonMap.get(child)).toBe(json.get('children')?.getAsJsonArray().get(0));
    expect(importer.portJsonMap.size).toBe(1);
    expect(importer.labelJsonMap.size).toBe(2);
    expect(child.getLabels().get(0).getIdentifier()).toBe('l');
    expect((port?.getLabels().get(0) as ElkLabel).getIdentifier()).toBeNull();
  });

  it('clears every map on the next transform', () => {
    const importer = new JsonImporter();
    importer.transform(readElement(new JsonReader(GRAPH)) as JsonObject);
    const second = readElement(new JsonReader('{"id":"x"}')) as JsonObject;
    const root = importer.transform(second);
    expect(importer.getInputModel()).toBe(second);
    expect(importer.nodeIdMap.keys()).toEqual(['x']);
    expect(importer.portIdMap.size).toBe(0);
    expect(importer.portJsonMap.size).toBe(0);
    expect(importer.labelJsonMap.size).toBe(0);
    expect(importer.nodeIdMap.get('x')).toBe(root);
  });

  it('finds shapes by id, nodes first, and rejects unknown ones', () => {
    const { importer, root } = importJson(GRAPH);
    const child = [...root.getChildren()][0] as ElkNode;
    expect(importer.shapeById('r')).toBe(root);
    expect(importer.shapeById('p')).toBe([...child.getPorts()][0]);
    const error = captured(() => importer.shapeById('zzz'));
    expect(error).toBeInstanceOf(JsonImportException);
    expect(error.message).toBe('Referenced shape does not exist: zzz');
    expect(captured(() => importer.shapeById(99)).message).toBe('Referenced shape does not exist: 99');
  });

  it('dispatches idByElement over node, port and edge section', () => {
    const { importer, root } = importJson(GRAPH);
    const child = [...root.getChildren()][0] as ElkNode;
    const edge = ElkGraphUtil.createEdge(root);
    const section = ElkGraphUtil.createEdgeSection(edge);
    importer.edgeSectionIdMap.put('s', section);
    expect(importer.idByElement(root)).toBe('r');
    expect(importer.idByElement(child)).toBe(1);
    expect(importer.idByElement([...child.getPorts()][0])).toBe('p');
    expect(importer.idByElement(section)).toBe('s');
    expect(importer.idByElement(ElkGraphUtil.createNode(null))).toBeUndefined();
    const error = captured(() => importer.idByElement(null));
    expect(error).toBeInstanceOf(IllegalArgumentException);
    expect(error.message).toBe('Unhandled parameter types: [null]');
  });

  it('registers edges with their original parent, and edge sections', () => {
    const { importer, root } = importJson(GRAPH);
    const edge: ElkEdge = ElkGraphUtil.createEdge(root);
    const section: ElkEdgeSection = ElkGraphUtil.createEdgeSection(edge);
    const jsonEdge = readElement(new JsonReader('{"id":7}')) as JsonObject;
    const jsonSection = readElement(new JsonReader('{"id":"s"}')) as JsonObject;
    expect(importer.registerEdge(edge, jsonEdge)).toBe(edge);
    expect(importer.registerEdgeSection(section, jsonSection)).toBe(section);
    expect(importer.edgeIdMap.get(7)).toBe(edge);
    expect(importer.edgeJsonMap.get(edge)).toBe(jsonEdge);
    expect(importer.edgeOriginalParentMap.get(edge)).toBe(root);
    expect(importer.edgeSectionIdMap.get('s')).toBe(section);
    expect(importer.edgeSectionJsonMap.get(section)).toBe(jsonSection);
  });

  it('exposes label text and element parents through the maps', () => {
    const { importer, root } = importJson(GRAPH);
    const child = [...root.getChildren()][0] as ElkGraphElement;
    const label = [...importer.labelJsonMap.keys()].find((l) => l.getText() === 't') as ElkLabel;
    expect(label.getParent()).toBe(child);
    expect(label.getText()).toBe('t');
  });
});

function captured(f: () => unknown): Error {
  try {
    f();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}
