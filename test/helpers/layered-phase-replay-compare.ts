// SPDX-License-Identifier: EPL-2.0
// Comparison of a replayed phase dump with a recorded `expected` at the AD-4 bar: ids, counts, strings and booleans
// exactly, hex-encoded doubles (inside `changed` property values) within 1e-6. `changed` is compared as a set keyed by
// path, because the recorder's element order is not part of the contract.
import { compareLGraphDump, type LGraphDump } from './layered-framework-replay.js';
import { compareValues, normalizeC4 } from './layered-site-replay-compare.js';
import { ignoredProperties, type ChangedEntry, type EdgeExpected, type Expected } from './layered-phase-replay-dump.js';

/** One difference, located by the `expected` member (and element path) it concerns. */
export interface Diff {
  readonly where: string;
  readonly message: string;
}

const diff = (where: string, message: string): Diff => ({ where, message });

function compareLists(where: string, actual: readonly unknown[], expected: readonly unknown[]): Diff[] {
  const same =
    actual.length === expected.length &&
    actual.every((value, i) => JSON.stringify(value) === JSON.stringify(expected[i]));
  return same ? [] : [diff(where, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)];
}

function compareEdge(actual: EdgeExpected | undefined, expected: EdgeExpected): Diff[] {
  const where = `edges ${expected.path}`;
  if (actual === undefined) {
    return [diff(where, 'missing')];
  }
  return compareLists(
    where,
    [actual.src, actual.tgt, actual.reversed],
    [expected.src, expected.tgt, expected.reversed],
  );
}

function compareEdges(actual: readonly EdgeExpected[], expected: readonly EdgeExpected[]): Diff[] {
  const byPath = new Map(actual.map((edge) => [edge.path, edge]));
  const known = new Set(expected.map((edge) => edge.path));
  const extra = actual.filter((edge) => !known.has(edge.path)).map((edge) => diff(`edges ${edge.path}`, 'unexpected'));
  return [...expected.flatMap((edge) => compareEdge(byPath.get(edge.path), edge)), ...extra];
}

function normalizeProps(props: ChangedEntry['props']): unknown {
  return Object.fromEntries(Object.entries(props).map(([id, value]) => [id, normalizeC4(value)]));
}

function compareEntry(actual: ChangedEntry | undefined, expected: ChangedEntry): Diff[] {
  const where = `changed ${expected.path}`;
  if (actual === undefined) {
    return [diff(where, `missing, expected ${JSON.stringify(expected.props)}`)];
  }
  return compareValues(where, normalizeProps(actual.props), normalizeProps(expected.props)).map((m) => diff(where, m));
}

function compareChanged(actual: readonly ChangedEntry[], expected: readonly ChangedEntry[]): Diff[] {
  const byPath = new Map(actual.map((entry) => [entry.path, entry]));
  const known = new Set(expected.map((entry) => entry.path));
  const extra = actual
    .filter((entry) => !known.has(entry.path))
    .map((entry) => diff(`changed ${entry.path}`, `unexpected ${JSON.stringify(entry.props)}`));
  return [...expected.flatMap((entry) => compareEntry(byPath.get(entry.path), entry)), ...extra];
}

/** The differences between a replayed and a recorded phase dump (`[]`: equal). The full `dump` is not compared here. */
export function compareExpected(actual: Expected, expected: Expected): Diff[] {
  return [
    ...compareLists('layers', actual.layers, expected.layers),
    ...compareLists('layerless', actual.layerless, expected.layerless),
    ...compareLists('hidden', actual.hidden, expected.hidden),
    ...compareEdges(actual.edges, expected.edges),
    ...compareChanged(actual.changed, expected.changed),
  ];
}

type Obj = Record<string, unknown>;

const simpleClassName = (name: string): string => name.slice(name.lastIndexOf('.') + 1);

/** An element encoding of the 7a C4 header: `{ref}` (an element with a path) or `{class}` (one without). */
function isElementEncoding(value: unknown): value is Obj {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === 1 && (keys[0] === 'ref' || keys[0] === 'class');
}

function elementItems(value: unknown): readonly unknown[] | null {
  const items = Array.isArray(value)
    ? value
    : value !== null && typeof value === 'object' && (value as Obj).t === 'list'
      ? ((value as Obj).items as unknown[])
      : null;
  return items?.every(isElementEncoding) === true ? items : null;
}

function elementEncoding(value: Obj): Obj {
  return 'class' in value ? { class: simpleClassName(value.class as string) } : value;
}

/**
 * A property value in the form both dumps compare in: a collection of elements (the recorder's bare array, the
 * dumper's tagged list) is one `elements` value, a `{class}` encoding is its simple class name, and tagged C4 values
 * are normalised as `compareExpected` does.
 */
function comparableValue(value: unknown): unknown {
  const items = elementItems(value);
  if (items !== null) {
    return { t: 'elements', items: items.map((item) => elementEncoding(item as Obj)) };
  }
  return isElementEncoding(value) ? elementEncoding(value) : normalizeC4(value);
}

/** Every property map of a dump with its C4 values normalised; the graph-level ignored ids (see B2) dropped. */
function comparable(dump: LGraphDump): LGraphDump {
  const normalise = (node: unknown, graphLevel: boolean): unknown => {
    if (Array.isArray(node)) {
      return node.map((child) => normalise(child, false));
    }
    if (node === null || typeof node !== 'object') {
      return node;
    }
    return Object.fromEntries(
      Object.entries(node as Obj).map(([key, value]) => [
        key,
        key === 'properties' ? properties(value, graphLevel) : normalise(value, false),
      ]),
    );
  };
  const properties = (value: unknown, graphLevel: boolean): unknown =>
    Object.fromEntries(
      Object.entries(value as Obj)
        .filter(([id]) => !(graphLevel && ignoredProperties().has(id)))
        .map(([id, v]) => [id, comparableValue(v)]),
    );
  return {
    graphs: dump.graphs.map((graph) => normalise(graph, true) as LGraphDump['graphs'][number]),
  };
}

/**
 * The 7a whole-graph comparison, when the row stores a full `dump` (step rows under 10 nodes); `[]` otherwise. Property
 * values are normalised (`comparableValue`), and the graph-level `processors`, `random` and `spacings`
 * (runtime objects whose recorded encodings cannot match a TS dump) are ignored.
 */
export function compareFullDump(actual: Expected, expected: Expected): Diff[] {
  if (expected.dump === undefined) {
    return [];
  }
  if (actual.dump === undefined) {
    return [diff('dump', 'the replay produced no full dump')];
  }
  return compareLGraphDump(comparable(actual.dump), comparable(expected.dump)).map((message) => diff('dump', message));
}
