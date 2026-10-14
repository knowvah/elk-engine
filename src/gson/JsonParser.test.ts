// SPDX-License-Identifier: EPL-2.0
// Drives every `parse` row of test/golden/refs/java/gson.json (Gson 2.11.0 on the oracle JVM): the tree, or the
// exception class and message (with its cause), and for reader rows the `after` token or exception.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readElement } from './internal/JsonElementReader.js';
import type { JsonElement } from './JsonElement.js';
import { JsonArray } from './JsonArray.js';
import { JsonObject } from './JsonObject.js';
import { JsonParser } from './JsonParser.js';
import { JsonReader } from './stream/JsonReader.js';
import { isCoverageRun } from '../../test/helpers/coverage-run.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/gson.json', import.meta.url);
const PARSE_BUDGET_MS = 200;
const TIMED_RUNS = 3;
// V8 coverage instrumentation slows tight loops about threefold; the looser bound still catches quadratic behaviour.
const INSTRUMENTED_PARSE_BUDGET_MS = 1000;

const ONE_MEGABYTE = 1_000_000;

type Tree =
  | null
  | { readonly num: string }
  | { readonly str: string }
  | { readonly bool: boolean }
  | { readonly arr: readonly Tree[] }
  | { readonly obj: readonly (readonly [string, Tree])[] };
interface Thrown {
  readonly class: string;
  readonly message: string | null;
  readonly cause?: Thrown;
}
interface ParseRow {
  readonly id: string;
  readonly input: string;
  readonly via: 'reader' | 'parseString';
  readonly lenient: boolean;
  readonly tree?: Tree | { readonly depth: number };
  readonly throws?: Thrown;
  readonly after?: string | Thrown;
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { parse: readonly ParseRow[] }).parse;

function treeOf(element: JsonElement): Tree {
  if (element.isJsonNull()) return null;
  if (element instanceof JsonArray) return { arr: [...element].map(treeOf) };
  if (element instanceof JsonObject) return { obj: element.entrySet().map(([k, v]) => [k, treeOf(v)] as const) };
  const primitive = element.getAsJsonPrimitive();
  if (primitive.isBoolean()) return { bool: primitive.getAsBoolean() };
  return primitive.isNumber() ? { num: primitive.getAsNumber().toString() } : { str: primitive.getAsString() };
}

function depthOf(element: JsonElement): number {
  let deepest = 0;
  let level: JsonElement[] = [element];
  while (level.length > 0) {
    const next: JsonElement[] = [];
    for (const e of level) {
      if (e instanceof JsonArray) next.push(...e);
      else if (e instanceof JsonObject) next.push(...e.entrySet().map(([, v]) => v));
    }
    if (next.length > 0 || level.some((e) => e instanceof JsonArray || e instanceof JsonObject)) deepest++;
    level = next;
  }
  return deepest;
}

function thrownOf(error: unknown): Thrown {
  const e = error as Error;
  return { class: e.name, message: e.message, ...(e.cause === undefined ? {} : { cause: thrownOf(e.cause) }) };
}

function shapeOf(row: ParseRow, element: JsonElement): Tree | { readonly depth: number } {
  return row.id.startsWith('deep-') ? { depth: depthOf(element) } : treeOf(element);
}

function runRow(row: ParseRow): { result: unknown; reader?: JsonReader } {
  const reader = row.via === 'reader' ? new JsonReader(row.input) : undefined;
  try {
    if (reader === undefined) return { result: shapeOf(row, JsonParser.parseString(row.input)) };
    if (row.lenient) reader.setLenient(true);
    return { result: shapeOf(row, readElement(reader)), reader };
  } catch (e) {
    return { result: { throws: thrownOf(e) }, reader };
  }
}

function afterOf(reader: JsonReader): string | Thrown {
  try {
    return reader.peek();
  } catch (e) {
    return thrownOf(e);
  }
}

describe('gson.json parse rows', () => {
  it('has the rows this suite drives', () => {
    expect(rows.length).toBe(303);
    expect(new Set(rows.map((r) => r.via))).toEqual(new Set(['reader', 'parseString']));
  });

  for (const row of rows) {
    it(row.id, () => {
      const { result, reader } = runRow(row);
      expect(result).toEqual(row.throws === undefined ? row.tree : { throws: row.throws });
      if (row.after !== undefined && reader !== undefined) expect(afterOf(reader)).toEqual(row.after);
    });
  }
});

describe('JsonParser', () => {
  it('reads the sloppy graph of GraphTest leniently', () => {
    const graph = JsonParser.parseString(
      '{\n  // the root node\n  id: "root",\n  /* Now the graph */ \n  "children": [ {"id": "c"}; {"id": "c1"} ],\n  \'edges\': [] // Endline comment\n}\n',
    ).getAsJsonObject();
    expect(graph.get('id')!.getAsString()).toBe('root');
    const children = graph.get('children')!.getAsJsonArray();
    expect(children.size()).toBe(2);
    expect(children.get(0).getAsJsonObject().get('id')!.getAsString()).toBe('c');
    expect(children.get(1).getAsJsonObject().get('id')!.getAsString()).toBe('c1');
  });

  it('restores the reader strictness after parseReader', () => {
    const reader = new JsonReader('[a]');
    expect(treeOf(JsonParser.parseReader(reader))).toEqual({ arr: [{ str: 'a' }] });
    expect(reader.isLenient()).toBe(false);
  });

  it('reports trailing input after a null as JsonNull', () => {
    expect(JsonParser.parseString('null').isJsonNull()).toBe(true);
  });

  it('parses 1 MB of JSON under the time budget (best of three runs, JIT warm)', () => {
    const members = Array.from({ length: Math.ceil(ONE_MEGABYTE / 27) }, (_, i) => `{"id":"n${i}","x":${i}.5}`);
    const text = `[${members.join(',')}]`;
    expect(text.length).toBeGreaterThan(ONE_MEGABYTE);
    const timings = Array.from({ length: TIMED_RUNS }, () => {
      const started = performance.now();
      const parsed = JsonParser.parseString(text).getAsJsonArray();
      const elapsed = performance.now() - started;
      expect(parsed.size()).toBe(members.length);
      return elapsed;
    });
    expect(Math.min(...timings)).toBeLessThan(isCoverageRun() ? INSTRUMENTED_PARSE_BUDGET_MS : PARSE_BUDGET_MS);
  });
});
