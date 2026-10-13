// SPDX-License-Identifier: EPL-2.0
// Drives the `primitive`, `equality`, `objectOps` and `arrayOps` rows of test/golden/refs/java/gson.json
// (Gson 2.11.0 on the oracle JVM, T1). The `parse` and `write` sections belong to the reader and writer.
// Members nothing in graph.json (or the planned reader/writer) calls are not ported, so rows that need them are
// left out by named filters below: the ops in UNPORTED_PRIMITIVE_OPS, the Java `Long`/`Float` number types, and
// the mutating/pure array and object ops in the *_OPS handler tables.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toString as doubleToString } from '../java/lang/DoubleToString.js';
import { parseDouble } from '../java/lang/JavaDouble.js';
import { JsonArray } from './JsonArray.js';
import { JsonElement } from './JsonElement.js';
import { JsonNull } from './JsonNull.js';
import { JsonObject } from './JsonObject.js';
import { JsonPrimitive } from './JsonPrimitive.js';
import { LazilyParsedNumber } from './LazilyParsedNumber.js';

const VECTORS_URL = new URL('../../test/golden/refs/java/gson.json', import.meta.url);
const UNPORTED_NUMBER_TYPES: ReadonlySet<string> = new Set(['Long', 'Float']);
const UNPORTED_PRIMITIVE_OPS: ReadonlySet<string> = new Set(['getAsInt', 'getAsLong', 'getAsNumberIntValue']);
const NULL_POINTER = 'NullPointerException';

type Tree =
  | null
  | { readonly num: string }
  | { readonly str: string }
  | { readonly bool: boolean }
  | { readonly arr: readonly Tree[] }
  | { readonly obj: readonly (readonly [string, Tree])[] };
type Arg = Tree | { readonly javaNull: true };
interface Thrown {
  readonly class: string;
  readonly message: string | null;
}
interface PrimitiveRow {
  readonly id: string;
  readonly op: string;
  readonly value: Tree;
  readonly valueType?: string;
  readonly result?: string;
  readonly throws?: Thrown;
}
interface EqualityRow {
  readonly id: string;
  readonly a: Tree;
  readonly b: Tree;
  readonly aTypes: readonly string[];
  readonly bTypes: readonly string[];
  readonly equals: boolean;
  readonly hashCodesEqual: boolean;
}
interface OpsRow {
  readonly id: string;
  readonly ops: readonly (readonly [string, string | number | null, Arg?])[];
  readonly results: readonly (Record<string, unknown> | null)[];
  readonly tree: Tree;
  readonly keys?: readonly string[];
  readonly equalsTo?: Tree;
  readonly equals?: boolean;
  readonly hashCodesEqual?: boolean;
}
interface GsonVectors {
  readonly primitive: readonly PrimitiveRow[];
  readonly equality: readonly EqualityRow[];
  readonly objectOps: readonly OpsRow[];
  readonly arrayOps: readonly OpsRow[];
}

const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as GsonVectors;

function numberPrimitive(text: string, type: string): JsonPrimitive {
  if (type === 'Double') return JsonPrimitive.ofDouble(parseDouble(text));
  if (type === 'Integer') return JsonPrimitive.ofInt(Number(text));
  return new JsonPrimitive(new LazilyParsedNumber(text));
}

/** A recorded tree as Gson elements; every number leaf takes `numType` (a parsed literal by default). */
function decode(tree: Tree, numType = 'LazilyParsedNumber'): JsonElement {
  if (tree === null) return JsonNull.INSTANCE;
  if ('num' in tree) return numberPrimitive(tree.num, numType);
  if ('str' in tree) return new JsonPrimitive(tree.str);
  if ('bool' in tree) return new JsonPrimitive(tree.bool);
  if ('arr' in tree) {
    const array = new JsonArray();
    for (const item of tree.arr) array.add(decode(item, numType));
    return array;
  }
  const object = new JsonObject();
  for (const [name, item] of tree.obj) object.add(name, decode(item, numType));
  return object;
}

function encode(element: JsonElement): Tree {
  if (element.isJsonNull()) return null;
  if (element instanceof JsonArray) return { arr: [...element].map(encode) };
  if (element instanceof JsonObject) return { obj: element.entrySet().map(([name, item]) => [name, encode(item)]) };
  const primitive = element.getAsJsonPrimitive();
  if (primitive.isBoolean()) return { bool: primitive.getAsBoolean() };
  return primitive.isNumber() ? { num: primitive.getAsNumber().toString() } : { str: primitive.getAsString() };
}

/** The Java class a thrown TS error stands for (D10 maps `NullPointerException` to `TypeError`). */
function javaThrown(error: unknown): Thrown {
  const e = error as Error;
  return { class: e instanceof TypeError ? NULL_POINTER : e.name, message: e.message };
}

function expectThrown(actual: unknown, expected: Thrown): void {
  expect(javaThrown(actual)).toEqual({ class: expected.class, message: expected.message ?? '' });
}

function attempt<T>(action: () => T): { readonly value: T } | { readonly error: unknown } {
  try {
    return { value: action() };
  } catch (error) {
    return { error };
  }
}

const PRIMITIVE_OPS = new Map<string, (e: JsonElement) => string>([
  ['getAsString', (e) => e.getAsString()],
  ['getAsDouble', (e) => doubleToString(e.getAsDouble())],
  ['getAsBoolean', (e) => String(e.getAsBoolean())],
  ['toString', (e) => e.toString()],
  ['isNumber', (e) => String(e.getAsJsonPrimitive().isNumber())],
  ['isString', (e) => String(e.getAsJsonPrimitive().isString())],
  ['isBoolean', (e) => String(e.getAsJsonPrimitive().isBoolean())],
  ['isJsonPrimitive', (e) => String(e.isJsonPrimitive())],
  ['isJsonNull', (e) => String(e.isJsonNull())],
  ['isJsonObject', (e) => String(e.isJsonObject())],
  ['isJsonArray', (e) => String(e.isJsonArray())],
  ['getAsJsonObject', (e) => e.getAsJsonObject().toString()],
  ['getAsJsonArray', (e) => e.getAsJsonArray().toString()],
]);

const isPortedPrimitive = (row: PrimitiveRow): boolean =>
  !UNPORTED_PRIMITIVE_OPS.has(row.op) && !UNPORTED_NUMBER_TYPES.has(row.valueType ?? '');
const hasUnportedType = (types: readonly string[]): boolean => types.some((t) => UNPORTED_NUMBER_TYPES.has(t));

describe('gson.json primitive rows', () => {
  const rows = vectors.primitive.filter((row) => row.op !== 'construct');
  const driven = rows.filter(isPortedPrimitive);

  it('leaves out only the unported ops and the Long-typed rows', () => {
    const left = rows.filter((row) => !isPortedPrimitive(row));
    expect(left.length).toBe(316);
    expect(left.filter((row) => UNPORTED_PRIMITIVE_OPS.has(row.op)).length).toBe(303);
    const byType = left.filter((row) => !UNPORTED_PRIMITIVE_OPS.has(row.op));
    expect(byType.length).toBe(13);
    expect(byType.every((row) => row.valueType === 'Long')).toBe(true);
  });

  it('covers every ported op', () => {
    expect(new Set(driven.map((row) => row.op))).toEqual(new Set(PRIMITIVE_OPS.keys()));
  });

  it.each(driven.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const element = decode(row.value, row.valueType);
    const outcome = attempt(() => (PRIMITIVE_OPS.get(row.op) as (e: JsonElement) => string)(element));
    if (row.throws === undefined) expect(outcome).toEqual({ value: row.result });
    else expectThrown((outcome as { error: unknown }).error, row.throws);
  });

  it.each(vectors.primitive.filter((row) => row.op === 'construct').map((row) => [row.id, row] as const))(
    '%s',
    (_id, row) => {
      const outcome = attempt(() => new JsonPrimitive(null as unknown as string));
      expectThrown((outcome as { error: unknown }).error, row.throws as Thrown);
    },
  );
});

describe('gson.json equality rows', () => {
  const supported = (row: EqualityRow): boolean => !hasUnportedType([...row.aTypes, ...row.bTypes]);
  const rows = vectors.equality.filter(supported);

  it('leaves out exactly the Long and Float rows', () => {
    expect(vectors.equality.filter((row) => !supported(row)).map((row) => row.id)).toEqual([
      'int-1-vs-long-1',
      'float-1.5-vs-double-1.5',
    ]);
  });

  it.each(rows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const a = decode(row.a, row.aTypes[0]);
    const b = decode(row.b, row.bTypes[0]);
    expect(a.equals(b)).toBe(row.equals);
    expect(b.equals(a)).toBe(row.equals);
    expect(a.hashCode() === b.hashCode()).toBe(row.hashCodesEqual);
  });
});

type Handler<T> = (target: T, key: string | number | null, arg: Arg | undefined) => unknown;

function text(arg: Arg | undefined): string | null {
  return arg !== undefined && arg !== null && 'str' in arg ? arg.str : null;
}

function numberText(arg: Arg | undefined): string {
  return (arg as { num: string }).num;
}

const OBJECT_OPS = new Map<string, Handler<JsonObject>>([
  ['add', (o, k, a) => o.add(k as string, decode(a as Tree))],
  ['addNullKey', (o, _k, a) => o.add(null as unknown as string, decode(a as Tree))],
  ['addJavaNull', (o, k) => o.add(k as string, null)],
  ['addPropertyString', (o, k, a) => o.addProperty(k as string, text(a))],
  ['addPropertyBoolean', (o, k, a) => o.addProperty(k as string, (a as { bool: boolean }).bool)],
  ['addPropertyDouble', (o, k, a) => o.addPropertyDouble(k as string, parseDouble(numberText(a)))],
  ['addPropertyInt', (o, k, a) => o.addPropertyInt(k as string, Number(numberText(a)))],
  ['remove', (o, k) => o.remove(k as string)],
  ['has', (o, k) => o.has(k as string)],
  ['get', (o, k) => o.get(k as string)],
  ['size', (o) => o.size()],
]);

const ARRAY_OPS = new Map<string, Handler<JsonArray>>([
  ['add', (r, _i, a) => r.add(decode(a as Tree))],
  ['addJavaNull', (r) => r.add(null)],
  ['get', (r, i) => r.get(i as number)],
  ['size', (r) => r.size()],
  ['elementAsObject', (r, i) => r.get(i as number).getAsJsonObject()],
  ['elementAsArray', (r, i) => r.get(i as number).getAsJsonArray()],
  ['elementAsString', (r, i) => r.get(i as number).getAsString()],
  ['elementAsDouble', (r, i) => r.get(i as number).getAsDouble()],
]);

/** Ops of members that are not ported and do not change the target: replay goes on without them. */
const UNPORTED_PURE_OPS: ReadonlySet<string> = new Set([
  'keySet',
  'isEmpty',
  'deepCopy',
  'getAsJsonObject',
  'getAsJsonArray',
  'getAsJsonPrimitive',
]);

/** The recorder's `enc`: void, Java null, a tree, or a scalar; a double result prints as `Double.toString`. */
function encodeResult(op: string, result: unknown): unknown {
  if (result === undefined) return { void: true };
  if (result === null) return { javaNull: true };
  if (result instanceof JsonElement) return encode(result);
  if (typeof result === 'boolean') return { bool: result };
  if (typeof result === 'number') return { num: op.endsWith('AsDouble') ? doubleToString(result) : String(result) };
  return { str: String(result) };
}

interface Replay {
  /** Recorded results by op index, for the ops that were replayed. */
  readonly compared: readonly (readonly [unknown, unknown])[];
  /** Whether every op was replayed or skipped as pure, so the final tree is comparable. */
  readonly complete: boolean;
  readonly skipped: number;
}

function expectedResult(r: Record<string, unknown> | null): unknown {
  const throws = (r?.['throws'] ?? undefined) as Thrown | undefined;
  return throws === undefined ? r : { throws: { class: throws.class, message: throws.message ?? '' } };
}

function replay<T>(target: T, row: OpsRow, handlers: Map<string, Handler<T>>): Replay {
  const compared: (readonly [unknown, unknown])[] = [];
  let skipped = 0;
  for (const [index, [name, key, arg]] of row.ops.entries()) {
    const handler = handlers.get(name);
    if (handler === undefined && !UNPORTED_PURE_OPS.has(name)) return { compared, complete: false, skipped };
    if (handler === undefined) {
      skipped++;
      continue;
    }
    const outcome = attempt(() => handler(target, key, arg));
    const actual = 'error' in outcome ? { throws: javaThrown(outcome.error) } : encodeResult(name, outcome.value);
    compared.push([actual, expectedResult(row.results[index] as Record<string, unknown> | null)]);
  }
  return { compared, complete: true, skipped };
}

function expectReplay(result: Replay): void {
  for (const [actual, expected] of result.compared) expect(actual).toEqual(expected);
}

describe('gson.json objectOps rows', () => {
  it.each(vectors.objectOps.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const target = new JsonObject();
    const result = replay(target, row, OBJECT_OPS);
    expectReplay(result);
    if (!result.complete) return;
    expect(encode(target)).toEqual(row.tree);
    expect(target.entrySet().map(([name]) => name)).toEqual(row.keys);
    if (row.equalsTo !== undefined) {
      const other = decode(row.equalsTo);
      expect(target.equals(other)).toBe(row.equals);
      expect(target.hashCode() === other.hashCode()).toBe(row.hashCodesEqual);
    }
  });

  it('replays every op of every row: the unported object ops are all pure', () => {
    expect(vectors.objectOps.every((row) => replay(new JsonObject(), row, OBJECT_OPS).complete)).toBe(true);
  });
});

describe('gson.json arrayOps rows', () => {
  it.each(vectors.arrayOps.map((row) => [row.id, row] as const))('%s', (_id, row) => {
    const target = new JsonArray();
    const result = replay(target, row, ARRAY_OPS);
    expectReplay(result);
    if (result.complete) expect(encode(target)).toEqual(row.tree);
  });

  it('replays a prefix of every row up to the first unported mutating op', () => {
    const counts = vectors.arrayOps.map((row) => replay(new JsonArray(), row, ARRAY_OPS).compared.length);
    expect(counts).toEqual([1, 5, 0, 2, 0]);
  });
});
