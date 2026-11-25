// SPDX-License-Identifier: EPL-2.0
// The dumps of test/golden/refs/java/graphviz-dot-export.json (tools/vectors/DotExportVectors.java header,
// DotExportVectorsDumps.java): G, the source ElkGraph after transform or transferLayout, and M, the target DOT model.
import type { DotEObject } from '../../src/alg/graphviz/dot/dot/DotPackage.js';
import * as DoubleToString from '../../src/java/lang/DoubleToString.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { type DumpedObject, type DumpedValue, dumpModel } from './dot-model-dump.js';
import { canonGraph } from './elkt-canon.js';

const PROPERTIES = 'properties';
const IS_SET = 'isSet';

/** The fields of G that hold a `Double.toString` coordinate or size (shapes, labels, sections, bend points). */
const NUMERIC_FIELDS: ReadonlySet<string> = new Set(['x', 'y', 'width', 'height', 'startX', 'startY', 'endX', 'endY']);
/** A finite Java double literal as `Double.toString` writes it. */
const FINITE_DOUBLE = /^-?\d+(?:\.\d+)?(?:E-?\d+)?$/u;

interface CanonProperty {
  readonly id: string;
  readonly text: string;
}

/**
 * `String.valueOf` of the values of the given properties as `Double.toString`: `canonGraph` formats only the doubles
 * of registered `DOUBLE` layout options, while the recorder's G formats every `Double` (the layouter options the
 * mimic re-declares are plain properties outside the CoreOptions-only registry).
 */
function reformatDoubles(value: unknown, doubleIds: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => reformatDoubles(v, doubleIds));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] =
      key === PROPERTIES
        ? (child as CanonProperty[]).map((p) =>
            doubleIds.has(p.id) ? { id: p.id, text: DoubleToString.toString(Number(p.text)) } : p,
          )
        : reformatDoubles(child, doubleIds);
  }
  return result;
}

/**
 * G of the recorder: `canonGraph` (properties sorted by id, doubles as `Double.toString`), with the values of
 * `doubleIds` (non-registry `Double` properties) formatted as `Double.toString` too.
 *
 * @param root the source graph
 * @param doubleIds the ids of the plain `Property<Double>` keys the graph may carry
 * @returns the dump
 */
export function dumpSource(root: ElkNode, doubleIds: ReadonlySet<string>): unknown {
  return reformatDoubles(canonGraph(root), doubleIds);
}

function toRecorderValue(value: DumpedValue | readonly string[]): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return (value as readonly DumpedObject[]).map((v) => toRecorderValue(v));
  const object = value as Record<string, unknown>;
  if ('enum' in object && 'literal' in object) return object['name'];
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(object)) {
    if (key !== IS_SET) result[key] = toRecorderValue(child as DumpedValue);
  }
  return result;
}

/**
 * M of the recorder (`ModelDump`): `dumpModel` without `isSet`, with each enum value as its `getName()`.
 *
 * @param model the target model
 * @returns the dump
 */
export function dumpTarget(model: DotEObject | null): unknown {
  return toRecorderValue(dumpModel(model));
}

/** One difference of two G dumps: the JSON path and the two values. */
export interface SourceDiff {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

const TOLERANCE = 1e-6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numericMatch(key: string, expected: unknown, actual: unknown): boolean {
  if (!NUMERIC_FIELDS.has(key) || typeof expected !== 'string' || typeof actual !== 'string') return false;
  if (!FINITE_DOUBLE.test(expected) || !FINITE_DOUBLE.test(actual)) return false;
  return Math.abs(Number(expected) - Number(actual)) <= TOLERANCE;
}

function compareArrays(expected: unknown[], actual: unknown[], path: string, out: SourceDiff[]): void {
  if (expected.length !== actual.length) {
    out.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
    return;
  }
  expected.forEach((e, i) => {
    compareAt(String(i), e, actual[i], `${path}[${String(i)}]`, out);
  });
}

function compareRecords(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  path: string,
  out: SourceDiff[],
): void {
  const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of keys) {
    compareAt(key, expected[key], actual[key], `${path}.${key}`, out);
  }
}

function compareAt(key: string, expected: unknown, actual: unknown, path: string, out: SourceDiff[]): void {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    compareArrays(expected, actual, path, out);
  } else if (isRecord(expected) && isRecord(actual)) {
    compareRecords(expected, actual, path, out);
  } else if (expected !== actual && !numericMatch(key, expected, actual)) {
    out.push({ path, expected, actual });
  }
}

/**
 * Compares two G dumps under AD-4, positionally: every finite coordinate and size within 1e-6 absolute,
 * everything else (ids, counts, order, property texts, `NaN` and infinite values) exactly.
 *
 * @param expected the recorded dump
 * @param actual the dump of the port
 * @returns the differences, empty when the dumps match
 */
export function compareSource(expected: unknown, actual: unknown): SourceDiff[] {
  const out: SourceDiff[] = [];
  compareAt('', expected, actual, '$', out);
  return out;
}
