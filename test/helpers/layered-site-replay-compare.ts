// SPDX-License-Identifier: EPL-2.0
// Value comparison of the layered site replay at the AD-4 bar: numbers (and the hex-encoded doubles the recorder
// writes) within 1e-6, everything else exactly. C4 property values are normalised first, because a TS `number` is both
// a Java `Integer` and a `Double` and an empty `EnumSet` does not know its element class.
import { TOLERANCE, decodeHex } from './layered-framework-replay.js';

const HEX_DOUBLE = /^[0-9a-f]{16}$/;

function close(actual: number, expected: number): boolean {
  return actual === expected || Math.abs(actual - expected) <= TOLERANCE;
}

function lastSegment(typeName: string): string {
  return typeName.slice(typeName.lastIndexOf('.') + 1);
}

type Obj = Record<string, unknown>;

function normalizeTagged(v: Obj): unknown {
  switch (v.t) {
    case 'int':
      return { t: 'number', v: v.v };
    case 'double':
      return { t: 'number', v: Number(v.v) };
    case 'enum':
      return { t: 'enum', c: lastSegment(v.c as string), n: v.n };
    case 'set': {
      const items = v.items as readonly string[];
      return items.length === 0 ? { t: 'set', c: null, items } : { t: 'set', c: lastSegment(v.c as string), items };
    }
    case 'list':
      return { t: 'list', c: v.c, items: (v.items as readonly unknown[]).map(normalizeC4) };
    case 'obj':
      return { t: 'obj', c: v.c, fields: mapValues(v.fields as Obj) };
    default:
      return v;
  }
}

function mapValues(o: Obj): Obj {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, normalizeC4(v)]));
}

/**
 * A C4 value (or an element/list of them) in the form both sides compare in: Java `int` and `double` are a `number`
 * tag, an enum class name is its last segment ("LNode.NodeType" is "NodeType"), an empty set has no class.
 */
export function normalizeC4(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeC4);
  }
  if (value !== null && typeof value === 'object' && typeof (value as Obj).t === 'string') {
    return normalizeTagged(value as Obj);
  }
  return value;
}

function compareNumbers(path: string, actual: unknown, expected: number, out: string[]): void {
  if (typeof actual !== 'number' || !close(actual, expected)) {
    out.push(`${path}: expected ${String(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function compareHex(path: string, actual: unknown, expected: string, out: string[]): void {
  if (typeof actual !== 'string' || !HEX_DOUBLE.test(actual)) {
    out.push(`${path}: expected double ${String(decodeHex(expected))}, got ${JSON.stringify(actual)}`);
  } else if (!close(decodeHex(actual), decodeHex(expected))) {
    out.push(`${path}: expected ${String(decodeHex(expected))}, got ${String(decodeHex(actual))}`);
  }
}

function compareArrays(path: string, actual: unknown, expected: readonly unknown[], out: string[]): void {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    out.push(`${path}: expected a list of ${String(expected.length)}, got ${JSON.stringify(actual)}`);
    return;
  }
  expected.forEach((e, i) => walk(`${path}[${String(i)}]`, (actual as unknown[])[i], e, out));
}

function compareObjects(path: string, actual: unknown, expected: Obj, out: string[]): void {
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
    out.push(`${path}: expected an object, got ${JSON.stringify(actual)}`);
    return;
  }
  const keys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  if (JSON.stringify(keys) !== JSON.stringify(actualKeys)) {
    out.push(`${path}: expected keys ${JSON.stringify(keys)}, got ${JSON.stringify(actualKeys)}`);
    return;
  }
  keys.forEach((key) => walk(`${path}.${key}`, (actual as Obj)[key], expected[key], out));
}

function walk(path: string, actual: unknown, expected: unknown, out: string[]): void {
  if (typeof expected === 'number') {
    compareNumbers(path, actual, expected, out);
  } else if (typeof expected === 'string' && HEX_DOUBLE.test(expected)) {
    compareHex(path, actual, expected, out);
  } else if (Array.isArray(expected)) {
    compareArrays(path, actual, expected, out);
  } else if (expected !== null && typeof expected === 'object') {
    compareObjects(path, actual, expected as Obj, out);
  } else if (actual !== expected) {
    out.push(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** The differences between an actual and a recorded value (empty: equal at the AD-4 bar). */
export function compareValues(path: string, actual: unknown, expected: unknown): string[] {
  const out: string[] = [];
  walk(path, actual, expected, out);
  return out;
}
