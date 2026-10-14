// SPDX-License-Identifier: EPL-2.0
// Drives the `write` rows of test/golden/refs/java/gson.json through GsonBuilder settings and the `via: reader`
// `parse` rows through `getAdapter(JsonElement).read` (Gson 2.11.0 on the oracle JVM, T1).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDouble } from '../java/lang/JavaDouble.js';
import { Gson } from './Gson.js';
import { GsonBuilder } from './GsonBuilder.js';
import { JsonArray } from './JsonArray.js';
import { JsonElement } from './JsonElement.js';
import { JsonNull } from './JsonNull.js';
import { JsonObject } from './JsonObject.js';
import { JsonPrimitive } from './JsonPrimitive.js';
import { LazilyParsedNumber } from './LazilyParsedNumber.js';
import { JsonReader } from './stream/JsonReader.js';
import { JsonWriter } from './stream/JsonWriter.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/gson.json', import.meta.url);
const UNMODELLED_NUMBER_TYPES: ReadonlySet<string> = new Set([
  'Long',
  'Float',
  'Short',
  'Byte',
  'BigDecimal',
  'BigInteger',
]);
const INTEGER_TEXT = /^-?\d+$/;

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
interface WriteRow {
  readonly id: string;
  readonly tree: Tree;
  readonly numTypes: readonly string[];
  readonly pretty: boolean;
  readonly htmlSafe?: boolean;
  readonly text: string;
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

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as {
  write: readonly WriteRow[];
  parse: readonly ParseRow[];
};
const writeRows = vectors.write.filter((row) => !row.numTypes.some((t) => UNMODELLED_NUMBER_TYPES.has(t)));
const readerRows = vectors.parse.filter((row) => row.via === 'reader' && !row.id.startsWith('deep-'));

function numberOf(text: string, numTypes: readonly string[]): JsonPrimitive {
  if (numTypes.includes('LazilyParsedNumber')) return new JsonPrimitive(new LazilyParsedNumber(text));
  if (numTypes.includes('Integer') && INTEGER_TEXT.test(text)) return JsonPrimitive.ofInt(Number(text));
  return JsonPrimitive.ofDouble(parseDouble(text));
}

function build(tree: Tree, numTypes: readonly string[]): JsonElement {
  if (tree === null) return JsonNull.INSTANCE;
  if ('num' in tree) return numberOf(tree.num, numTypes);
  if ('str' in tree) return new JsonPrimitive(tree.str);
  if ('bool' in tree) return new JsonPrimitive(tree.bool);
  if ('arr' in tree) {
    const array = new JsonArray();
    for (const item of tree.arr) array.add(build(item, numTypes));
    return array;
  }
  const object = new JsonObject();
  for (const [name, member] of tree.obj) object.add(name, build(member, numTypes));
  return object;
}

function treeOf(element: JsonElement): Tree {
  if (element.isJsonNull()) return null;
  if (element instanceof JsonArray) return { arr: [...element].map(treeOf) };
  if (element instanceof JsonObject) return { obj: element.entrySet().map(([k, v]) => [k, treeOf(v)] as const) };
  const primitive = element.getAsJsonPrimitive();
  if (primitive.isBoolean()) return { bool: primitive.getAsBoolean() };
  return primitive.isNumber() ? { num: primitive.getAsNumber().toString() } : { str: primitive.getAsString() };
}

function thrownOf(error: unknown): Thrown {
  const e = error as Error;
  return { class: e.name, message: e.message, ...(e.cause === undefined ? {} : { cause: thrownOf(e.cause) }) };
}

function builderFor(row: WriteRow): GsonBuilder {
  const builder = new GsonBuilder();
  if (row.htmlSafe !== true) builder.disableHtmlEscaping();
  return row.pretty ? builder.setPrettyPrinting() : builder;
}

function readRow(row: ParseRow): { result: unknown; reader: JsonReader } {
  const reader = new JsonReader(row.input);
  if (row.lenient) reader.setLenient(true);
  try {
    return { result: treeOf(new Gson().getAdapter(JsonElement).read(reader)), reader };
  } catch (e) {
    return { result: { throws: thrownOf(e) }, reader };
  }
}

describe('Gson write rows (GsonBuilder settings)', () => {
  it('drives the rows without unmodelled number kinds', () => {
    expect(writeRows).toHaveLength(192);
  });

  it.each(writeRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(builderFor(row).create().toJson(build(row.tree, row.numTypes))).toBe(row.text);
    if (row.htmlSafe === true && !row.pretty) expect(new Gson().toJson(build(row.tree, row.numTypes))).toBe(row.text);
  });
});

describe('Gson.getAdapter(JsonElement) read rows', () => {
  it('drives the non-deep reader rows', () => {
    expect(readerRows.length).toBeGreaterThan(0);
  });

  it.each(readerRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const { result, reader } = readRow(row);
    expect(result).toEqual(row.throws === undefined ? row.tree : { throws: row.throws });
    if (row.after !== undefined) {
      try {
        expect(reader.peek()).toEqual(row.after);
      } catch (e) {
        expect(thrownOf(e)).toEqual(row.after);
      }
    }
  });
});

describe('Gson', () => {
  it('writes through the adapter with the supplied writer settings', () => {
    const adapter = new Gson().getAdapter(JsonElement);
    const object = new JsonObject();
    object.add('a', JsonPrimitive.ofInt(1));
    const writer = new JsonWriter();
    adapter.write(writer, object);
    expect(writer.toString()).toBe('{"a":1}');
    expect(new Gson().toJson(object)).toBe('{"a":1}');
  });

  it('drops null members and writes compactly by default', () => {
    const object = new JsonObject();
    object.add('n', JsonNull.INSTANCE);
    expect(new Gson().toJson(object)).toBe('{}');
    expect(new GsonBuilder().create().toJson(object)).toBe('{}');
  });
});
