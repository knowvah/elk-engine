// SPDX-License-Identifier: EPL-2.0
// T16: ElkGraph -> .elkj round trip through the entry points (`ElkGraphJsonText.load` -> `serialize` -> `load`).
//
// Inputs: every curated model (test/corpus/elkj-curated.json, vendored in test/corpus/elkj-curated/) and every T3
// parse scenario (tools/vectors/elkj-parse-scenarios/) that loads without errors. No oracle round-trip data exists for
// them; the JVM writer's own limits are recorded for the T5 rows (test/golden/refs/java/graph-json-text-write.json),
// and every case must be either an equal graph or fall into one of those classes, asserted per case:
//
//   equal              the reloaded graph equals the loaded one (`canonGraph`: property order is hash-bucket order)
//   serialization-key  the writer throws: a property key loaded from a quoted unknown key keeps its quotes in the id,
//                      and the ID converter rejects them (`PropertyKeyValueConverter.xtend:60-62`; the T5 row
//                      `elkj-property-values`: "ID 'int\"' contains invalid characters")
//   serialization-value  the writer throws: a list, vector chain or junction-point value is "not allowed to have a
//                      value" (the T5 rows `java-property-value-list`, `-kvectorchain`, `java-property-known-junction`)
//   serialization-string  the writer throws: a string equal to a keyword (a quoted `"id"` read through an escape) is an
//                      invalid STRING (the T5 rows `java-id-keyword-id`, `java-id-keyword-children`)
//   empty-element      an empty port, label or edge is written `{ "" : }`
//   null-value         a null property value is written as a bare `null`
//   non-finite-number  NaN, an Infinity, a hexadecimal or the denormal `4.9E-324` is written verbatim
//   dotted-key         a known option key is written as a bare dotted suffix (`spacing.nodeNode`)
//   unescaped-quote    a string value holding a double quote is written unescaped
//   copy-failure       the writer's `EcoreUtil.copy` throws before serializing: a repeated reference (`sources: ["a", "a"]`)
//                      makes `Copier.copyReference` move the second `a` to index 1 of a one-element list
//                      (`IndexOutOfBoundsException: targetIndex=1, size=1`; the T16b1 row `link-repeated-reference`)
//   unresolved         the loaded graph has an unresolved edge endpoint, which `EcoreUtil.copy` drops (the writer
//                      serializes the copy: the reloaded graph misses that endpoint, nothing else)
//   number-clamp       the reload differs only in shape geometry the number converter cannot print: it writes an
//                      integral double as `Integer.toString(value.intValue)` (NumberValueConverter.xtend:27), so
//                      |v| > 2^31 and +-Infinity saturate to the int range and -0.0 loses its sign (a zero is
//                      omitted, and an unset double reloads as 0.0)
//   key-quoting        the reload differs only in the ids of unknown property keys: the writer quotes every key,
//                      and `PropertyKeyValueConverter.toValue` keeps the quotes of a quoted unknown key in its id
//                      (a bare unknown key `foo` becomes the id `"foo"`)
//
// The oracle layer (T16b2) replays the recorded round trip (test/golden/refs/java/graph-json-text-roundtrip.json,
// tools/vectors/ElkjRoundTripVectors.java) per case: the written text byte-equal to `formatted`, a failing row failing
// here with the mapped class and message, the reload's error count (exact when recorded 0, presence otherwise, D6) and
// its export equal to the recorded `reparse.json`, and the endpoints the copy dropped equal to the recorded export's.
//
// A reload with errors must be one of the four syntax classes (the text is searched for the class's pattern); an
// equal-looking reload with a difference outside `unresolved` is a divergence and fails the case.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../src/java/lang/IndexOutOfBoundsException.js';
import { ElkGraphJsonText } from '../../src/graph/json/text/ElkGraphJsonText.js';
import { ElkGraphJsonSerializationError } from '../../src/graph/json/text/serializer/ElkGraphJsonSerializationError.js';
import { repoRoot } from '../corpus/corpus.js';
import { canonGraph } from '../helpers/elkt-canon.js';
import { exportLikeOracle } from '../helpers/graph-json-oracle.js';
import { rawSources, rawTargets } from '../helpers/graph-json-text-linking.js';

const CURATED_LIST = path.join(repoRoot(), 'test', 'corpus', 'elkj-curated.json');
const CURATED_DIR = path.join(repoRoot(), 'test', 'corpus', 'elkj-curated');
const SCENARIO_DIR = path.join(repoRoot(), 'tools', 'vectors', 'elkj-parse-scenarios');
const ROUND_TRIP_REF = fileURLToPath(new URL('./refs/java/graph-json-text-roundtrip.json', import.meta.url));
const META = path.join(repoRoot(), 'test', 'golden', 'refs', 'elkj-parse', '_meta.json');

/** The ways a case ends; see the header. */
const Outcomes = {
  EQUAL: 'equal',
  SERIALIZATION_KEY: 'serialization-key',
  SERIALIZATION_STRING: 'serialization-string',
  SERIALIZATION_VALUE: 'serialization-value',
  EMPTY_ELEMENT: 'empty-element',
  NULL_VALUE: 'null-value',
  NON_FINITE_NUMBER: 'non-finite-number',
  DOTTED_KEY: 'dotted-key',
  UNESCAPED_QUOTE: 'unescaped-quote',
  COPY_FAILURE: 'copy-failure',
  UNRESOLVED: 'unresolved',
  NUMBER_CLAMP: 'number-clamp',
  KEY_QUOTING: 'key-quoting',
  NUMBER_CLAMP_AND_KEY_QUOTING: 'number-clamp+key-quoting',
  DIVERGENCE: 'divergence',
} as const;
type Outcome = (typeof Outcomes)[keyof typeof Outcomes];

/** The text patterns of the syntax classes, tried in this order on the written text. */
const SYNTAX_CLASSES: readonly (readonly [Outcome, RegExp])[] = [
  [Outcomes.EMPTY_ELEMENT, /\{\s*""\s*:\s*\}/],
  [Outcomes.NULL_VALUE, /:\s*null\b/],
  [Outcomes.NON_FINITE_NUMBER, /\bNaN\b|-?\bInfinity\b|\b0x[0-9a-fA-F]|4\.9E-324/],
  [Outcomes.DOTTED_KEY, /[{,\s][A-Za-z_]\w*(\.[A-Za-z_]\w*)+\s*:/],
];
/** A complete string literal; blanked before the class patterns look at the written text. */
const STRING_LITERAL = /"(?:[^"\\\n]|\\.)*"/g;
/** A string literal holding a quote that is not escaped (the writer prints the converted text without escaping). */
const UNESCAPED_QUOTE_PATTERN = /"[^"\n]*[^\\"\n]"[^\s,:}\]]/;

interface Case {
  readonly id: string;
  readonly text: string;
}

function curatedCases(): Case[] {
  const meta = JSON.parse(readFileSync(META, 'utf8')) as { files: Record<string, string> };
  const models = (JSON.parse(readFileSync(CURATED_LIST, 'utf8')) as { models: { id: string }[] }).models;
  return models.map((m) => ({
    id: `curated/${m.id}`,
    text: readFileSync(path.join(CURATED_DIR, meta.files[m.id] as string), 'utf8'),
  }));
}

function scenarioCases(): Case[] {
  return readdirSync(SCENARIO_DIR)
    .sort()
    .map((file) => ({ id: `scenario/${file}`, text: readFileSync(path.join(SCENARIO_DIR, file), 'utf8') }));
}

/** The loadable inputs (no load errors), with the graph read once. */
function loadable(): { id: string; root: ElkNode; unresolved: boolean }[] {
  return [...curatedCases(), ...scenarioCases()].flatMap((c) => {
    const loaded = ElkGraphJsonText.load(c.text);
    if (loaded.errors.length > 0 || loaded.root === null) return [];
    return [{ id: c.id, root: loaded.root, unresolved: hasUnresolvedEndpoint(loaded.root) }];
  });
}

/** Whether an edge endpoint is a proxy (read without resolving): the copy drops it. */
function hasUnresolvedEndpoint(root: ElkNode): boolean {
  const walk = (node: ElkNode): boolean =>
    [...node.getContainedEdges()].some((e) => [...rawSources(e), ...rawTargets(e)].some((s) => s.eIsProxy())) ||
    [...node.getChildren()].some(walk);
  return walk(root);
}

function syntaxClass(written: string): Outcome | null {
  const code = written.replace(STRING_LITERAL, '""');
  const found = SYNTAX_CLASSES.find(([, pattern]) => pattern.test(code));
  if (found !== undefined) return found[0];
  return UNESCAPED_QUOTE_PATTERN.test(written) ? Outcomes.UNESCAPED_QUOTE : null;
}

type Tree = unknown;
const SHAPE_KEYS: ReadonlySet<string> = new Set(['x', 'y', 'width', 'height']);
const ID_KEY = 'id';
const SOURCES_KEY = 'sources';
const TARGETS_KEY = 'targets';
const KEY_FAILURE = "'PropertyKey'";
const STRING_FAILURE = "'STRING'";
const VALUE_FAILURE = 'is not allowed to have a value';
const INT_MAX = 2 ** 31 - 1;
const INT_MIN = -(2 ** 31);

/** `canon` with `rewrite` applied to every `[key, value]` of every object, depth first. */
function rewriteTree(tree: Tree, rewrite: (key: string, value: unknown) => unknown): Tree {
  if (Array.isArray(tree)) return tree.map((t) => rewriteTree(t, rewrite));
  if (typeof tree !== 'object' || tree === null) return tree;
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [key, rewrite(key, rewriteTree(value, rewrite))]),
  );
}

/** What the number converter prints and the lexer reads back for a shape value (a `DoubleToString` text). */
function printedNumber(text: string): number {
  const n = Number(text);
  if (Math.floor(n) !== n) return n;
  return Math.max(INT_MIN, Math.min(INT_MAX, Math.trunc(n))) + 0;
}

/** Shape values as numbers: the loaded graph's through the converter, the reloaded graph's as read. */
const numbers =
  (print: boolean) =>
  (key: string, value: unknown): unknown =>
    SHAPE_KEYS.has(key) && typeof value === 'string' ? (print ? printedNumber(value) : Number(value) + 0) : value;

/** Property ids without one pair of surrounding quotes. */
const unquotedKeys = (key: string, value: unknown): unknown =>
  key === ID_KEY && typeof value === 'string' ? value.replace(/^"(.*)"$/, '$1') : value;

const withoutEndpoints = (key: string, value: unknown): unknown =>
  key === SOURCES_KEY || key === TARGETS_KEY ? [] : value;

const same = (a: Tree, b: Tree): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Names the difference between the loaded and the reloaded graph; `divergence` when no class explains it. */
function classifyDifference(before: Tree, after: Tree, unresolved: boolean): Outcome {
  if (unresolved) {
    return same(rewriteTree(before, withoutEndpoints), rewriteTree(after, withoutEndpoints)) ? Outcomes.UNRESOLVED : Outcomes.DIVERGENCE;
  }
  const numeric = same(rewriteTree(before, numbers(true)), rewriteTree(after, numbers(false)));
  if (numeric) return Outcomes.NUMBER_CLAMP;
  if (same(rewriteTree(before, unquotedKeys), rewriteTree(after, unquotedKeys))) return Outcomes.KEY_QUOTING;
  const both = same(
    rewriteTree(rewriteTree(before, numbers(true)), unquotedKeys),
    rewriteTree(rewriteTree(after, numbers(false)), unquotedKeys),
  );
  return both ? Outcomes.NUMBER_CLAMP_AND_KEY_QUOTING : Outcomes.DIVERGENCE;
}

/** The converter failures a loaded graph can reach (sections and list values cannot be loaded from `.elkj`). */
function serializationClass(message: string): Outcome {
  if (message.includes(KEY_FAILURE)) return Outcomes.SERIALIZATION_KEY;
  if (message.includes(STRING_FAILURE)) return Outcomes.SERIALIZATION_STRING;
  return message.includes(VALUE_FAILURE) ? Outcomes.SERIALIZATION_VALUE : Outcomes.DIVERGENCE;
}

/** What happened to one case: the outcome class and the observations the oracle layer compares. */
interface Run {
  readonly outcome: Outcome;
  readonly written: string | null;
  readonly failure: Error | null;
  readonly reloaded: ReturnType<typeof ElkGraphJsonText.load> | null;
}

const failed = (outcome: Outcome, failure: Error): Run => ({ outcome, written: null, failure, reloaded: null });

/** Writes and reloads the graph and names what happened; `divergence`: reload errors or differences outside the classes. */
function run(root: ElkNode, unresolved: boolean): Run {
  const before = canonGraph(root);
  let written: string;
  try {
    written = ElkGraphJsonText.serialize(root);
  } catch (e) {
    if (e instanceof ElkGraphJsonSerializationError) return failed(serializationClass(e.message), e);
    if (e instanceof IndexOutOfBoundsException) return failed(Outcomes.COPY_FAILURE, e);
    throw e;
  }
  const reloaded = ElkGraphJsonText.load(written);
  const result = (outcome: Outcome): Run => ({ outcome, written, failure: null, reloaded });
  if (reloaded.errors.length > 0 || reloaded.root === null) return result(syntaxClass(written) ?? Outcomes.DIVERGENCE);
  const after = canonGraph(reloaded.root);
  return result(same(after, before) ? Outcomes.EQUAL : classifyDifference(before, after, unresolved));
}

interface RecordedRow {
  readonly id: string;
  readonly loadErrors: number;
  readonly edgesBefore: readonly { readonly sources: readonly boolean[]; readonly targets: readonly boolean[] }[];
  readonly formatted?: string;
  readonly error?: { readonly cls: string; readonly msg: string };
  readonly reparse?: { readonly errors: number; readonly json: string | null };
}

const RECORDED = new Map(
  (JSON.parse(readFileSync(ROUND_TRIP_REF, 'utf8')) as { cases: RecordedRow[] }).cases.map((r) => [r.id, r] as const),
);

/** The Java classes of the serializer failures and the port classes they map to (T5 replays RuntimeException so). */
const JAVA_SERIALIZER_FAILURE = 'java.lang.RuntimeException';
const JAVA_INDEX_FAILURE = 'java.lang.IndexOutOfBoundsException';

/** The edges in the recorder's order: children first (recursively), then the node's contained edges. */
function edgesInModelOrder(node: ElkNode): ElkEdge[] {
  return [...[...node.getChildren()].flatMap(edgesInModelOrder), ...node.getContainedEdges()];
}

/** The number of `sources` and `targets` entries in a recorded export, by walking its edges. */
function exportedEndpoints(json: string): number {
  const walk = (tree: unknown): number => {
    if (Array.isArray(tree)) return tree.reduce((n: number, t) => n + walk(t), 0);
    if (typeof tree !== 'object' || tree === null) return 0;
    return Object.entries(tree).reduce(
      (n, [key, value]) =>
        n + (key === SOURCES_KEY || key === TARGETS_KEY ? (value as unknown[]).length : walk(value)),
      0,
    );
  };
  return walk(JSON.parse(json));
}

/** Endpoints of the loaded graph by raw count and by what the resolving iteration yields (an unresolved one stays a proxy). */
function endpointCounts(root: ElkNode): { raw: number; unresolved: number } {
  const edges = edgesInModelOrder(root);
  const raw = edges.reduce((n, e) => n + rawSources(e).length + rawTargets(e).length, 0);
  const unresolved = edges.reduce(
    (n, e) => n + [...e.getSources(), ...e.getTargets()].filter((s) => s.eIsProxy()).length,
    0,
  );
  return { raw, unresolved };
}

/** An unpaired UTF-16 surrogate (matched as a code point only when it is not part of a pair). */
const LONE_SURROGATE = /\p{Surrogate}/gu;

/**
 * The reload the recorder saw: it feeds the written text as `text.getBytes(UTF_8)` (ElkjRoundTripVectors.java, `reparse`),
 * and `String.getBytes` encodes an unpaired surrogate as the replacement byte `?` (scenario `input-lone-surrogate-escape`,
 * `{ "id": "\ud800" }`: recorded id `?`, here the surrogate itself). Every other text is reloaded as written.
 */
function reloadedAsRecorded(r: Run): NonNullable<Run['reloaded']> {
  const written = r.written as string;
  const transported = written.replace(LONE_SURROGATE, '?');
  return transported === written ? (r.reloaded as NonNullable<Run['reloaded']>) : ElkGraphJsonText.load(transported);
}

/** The recorded row of a case compared with the run: written text, failure, reload errors and export, dropped endpoints. */
function expectRecorded(row: RecordedRow, root: ElkNode, r: Run): void {
  expect(row.loadErrors).toBe(0);
  expect(edgesInModelOrder(root).map((e) => [rawSources(e).length, rawTargets(e).length])).toEqual(
    row.edgesBefore.map((e) => [e.sources.length, e.targets.length]),
  );
  if (row.error !== undefined) return expectRecordedFailure(row.error, r);
  expect(r.failure).toBeNull();
  expect(r.written).toBe(row.formatted);
  const reparse = row.reparse as NonNullable<RecordedRow['reparse']>;
  const reloaded = reloadedAsRecorded(r);
  if (reparse.errors === 0) {
    expect(reloaded.errors).toHaveLength(0);
    expect(exportLikeOracle(reloaded.root as ElkNode)).toBe(reparse.json);
  } else {
    expect(reloaded.errors.length).toBeGreaterThan(0);
    expect(reparse.json).toBeNull();
  }
}

function expectRecordedFailure(error: { cls: string; msg: string }, r: Run): void {
  expect(r.written).toBeNull();
  const failure = r.failure as Error;
  if (error.cls === JAVA_INDEX_FAILURE) {
    expect(failure).toBeInstanceOf(IndexOutOfBoundsException);
    expect(failure.message).toBe(error.msg);
  } else {
    expect(error.cls).toBe(JAVA_SERIALIZER_FAILURE);
    // the texts differ (Xtext's diagnostics name the semantic object and URI); the failure class is the same
    expect(failure).toBeInstanceOf(ElkGraphJsonSerializationError);
    expect(r.outcome).toBe(serializationClass(error.msg));
  }
}

/** An unresolved endpoint is dropped by the copy: the recorded export holds exactly the resolved endpoints. */
function expectDropsAsRecorded(row: RecordedRow, root: ElkNode): void {
  const { raw, unresolved } = endpointCounts(root);
  expect(unresolved).toBeGreaterThan(0);
  expect(exportedEndpoints((row.reparse as NonNullable<RecordedRow['reparse']>).json as string)).toBe(raw - unresolved);
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

/** The 712 KB curated model takes ~5 s to write and reload under coverage on a loaded machine (vitest default: 5 s). */
const ROUND_TRIP_TIMEOUT_MS = 60_000;

/** The loadable inputs (16 curated, 265 T3 scenarios) and where each ends up; the counts are part of the report. */
const EXPECTED_CASES = 281;
const EXPECTED_COUNTS: Readonly<Record<string, number>> = {
  [Outcomes.EQUAL]: 193,
  [Outcomes.SERIALIZATION_KEY]: 34,
  [Outcomes.SERIALIZATION_STRING]: 1,
  [Outcomes.SERIALIZATION_VALUE]: 1,
  [Outcomes.DOTTED_KEY]: 14,
  [Outcomes.EMPTY_ELEMENT]: 4,
  [Outcomes.COPY_FAILURE]: 1,
  [Outcomes.UNRESOLVED]: 27,
  [Outcomes.NUMBER_CLAMP]: 5,
  [Outcomes.KEY_QUOTING]: 1,
};

const EXPECTED_UNRESOLVED_WRITTEN = 27;

describe('ElkGraphJsonText round trip', () => {
  const cases = loadable();
  const outcomes = new Map<string, Outcome>();
  let dropsChecked = 0;

  it.each(cases.map((c) => [c.id, c] as const))('%s: reloads equal or falls into a documented class', (_id, c) => {
    const result = run(c.root, c.unresolved);
    outcomes.set(c.id, result.outcome);
    expect(result.outcome).not.toBe(Outcomes.DIVERGENCE);
    const row = RECORDED.get(c.id) as RecordedRow;
    expect(row).toBeDefined();
    expectRecorded(row, c.root, result);
    if (result.outcome === Outcomes.UNRESOLVED) {
      expectDropsAsRecorded(row, c.root);
      ++dropsChecked;
    }
  }, ROUND_TRIP_TIMEOUT_MS);

  it('classifies every case, all but the equal ones into a documented class', () => {
    const counts: Record<string, number> = {};
    for (const o of outcomes.values()) counts[o] = (counts[o] ?? 0) + 1;
    expect(cases).toHaveLength(EXPECTED_CASES);
    expect(RECORDED.size).toBe(EXPECTED_CASES);
    expect(counts).toEqual(EXPECTED_COUNTS);
    expect(dropsChecked).toBe(EXPECTED_UNRESOLVED_WRITTEN);
    expect(Object.values(EXPECTED_COUNTS).reduce((sum, n) => sum + n, 0)).toBe(EXPECTED_CASES);
  });
});
