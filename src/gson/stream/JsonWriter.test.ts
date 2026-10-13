// SPDX-License-Identifier: EPL-2.0
// Drives the `write` rows of test/golden/refs/java/gson.json (Gson 2.11.0 on the oracle JVM, T1): the rows go through
// `new GsonBuilder().disableHtmlEscaping()[.setPrettyPrinting()].create().toJson(JsonElement)`, built here as a
// JsonWriter with indent "  " (pretty) and serializeNulls false. Rows whose numTypes include a Java number kind the
// TS model lacks (UNMODELLED_NUMBER_TYPES) are skipped; graph.json never builds them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDouble } from '../../java/lang/JavaDouble.js';
import { Streams } from '../internal/Streams.js';
import { JsonArray } from '../JsonArray.js';
import type { JsonElement } from '../JsonElement.js';
import { JsonNull } from '../JsonNull.js';
import { JsonObject } from '../JsonObject.js';
import { JsonPrimitive } from '../JsonPrimitive.js';
import { LazilyParsedNumber } from '../LazilyParsedNumber.js';
import { JsonWriter } from './JsonWriter.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/gson.json', import.meta.url);
const UNMODELLED_NUMBER_TYPES: ReadonlySet<string> = new Set([
  'Long',
  'Float',
  'Short',
  'Byte',
  'BigDecimal',
  'BigInteger',
]);
const PRETTY_INDENT = '  ';
const INTEGER_TEXT = /^-?\d+$/;
const SKIPPED_ROWS = 14;
const DRIVEN_ROWS = 124;

type Tree =
  | null
  | { readonly num: string }
  | { readonly str: string }
  | { readonly bool: boolean }
  | { readonly arr: readonly Tree[] }
  | { readonly obj: readonly (readonly [string, Tree])[] };
interface WriteRow {
  readonly id: string;
  readonly tree: Tree;
  readonly numTypes: readonly string[];
  readonly pretty: boolean;
  readonly text: string;
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { write: readonly WriteRow[] }).write;
const skipped = rows.filter((row) => row.numTypes.some((t) => UNMODELLED_NUMBER_TYPES.has(t)));
const driven = rows.filter((row) => !skipped.includes(row));

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

function toJson(element: JsonElement, pretty: boolean): string {
  const writer = new JsonWriter();
  writer.setSerializeNulls(false);
  if (pretty) writer.setIndent(PRETTY_INDENT);
  Streams.write(element, writer);
  return writer.toString();
}

describe('gson.json write rows', () => {
  it('skips only rows with unmodelled number kinds (Long, Float, Short, Byte, BigDecimal, BigInteger)', () => {
    expect(skipped).toHaveLength(SKIPPED_ROWS);
    expect(driven).toHaveLength(DRIVEN_ROWS);
  });

  it.each(driven.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    expect(toJson(build(row.tree, row.numTypes), row.pretty)).toBe(row.text);
  });
});

describe('JsonWriter', () => {
  it('keeps null object members when nulls are serialized (the default)', () => {
    const writer = new JsonWriter();
    writer.beginObject().name('a').nullValue().name('b').booleanValue(false).endObject();
    expect(writer.toString()).toBe('{"a":null,"b":false}');
  });

  it('writes a null array element even when nulls are not serialized', () => {
    const writer = new JsonWriter();
    writer.setSerializeNulls(false);
    writer.beginArray().nullValue().endArray();
    expect(writer.toString()).toBe('[null]');
  });

  it('writes a string value with escapes and a raw number text', () => {
    const writer = new JsonWriter();
    writer.beginArray().value('a" ').numberValue('1e400').endArray();
    expect(writer.toString()).toBe('["a\\"\\u2028",1e400]');
  });
});
