// SPDX-License-Identifier: EPL-2.0
// Generic replay of test/golden/refs/java/layered-sites.json (mission 7a, T10 recorded, T11a replays; L4, X5, X6): the
// TS twin of the step interpreter of tools/vectors/LayeredSiteVectors.java. A row is { id, site, input, steps,
// expected }: `input` (the prepared ELK graph as raw ELK JSON, or null) is imported and bound to the name "elk" (null:
// a new LGraph bound to "g0"); each step is dispatched by `op` through one table (OPS; the Java signature of every
// op is a comment on its entry), its result is collected under the step's label `as` in the recorder's encoding, and
// a thrown error becomes { exception: { class, message } }. `compareRow` compares the outcome with `expected`: numbers
// within 1e-6 (AD-4), everything else exactly, whole-graph labels with the T1 comparators.
import { readFileSync } from 'node:fs';
import { ElkLayered } from '../../src/alg/layered/ElkLayered.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';
import { compareLGraphDump, importInput, registerLayered, type LGraphDump } from './layered-framework-replay.js';
import { Args, type Op } from './layered-site-replay-args.js';
import { compareValues, normalizeC4 } from './layered-site-replay-compare.js';
import { Ctx, ELK_ROOT, FIRST_GRAPH, ReplayBug, exceptionOf } from './layered-site-replay-context.js';
import {
  CONSTRUCTION_OPS,
  EDGE_OPS,
  GEOMETRY_OPS,
  GRAPH_OPS,
  NODE_OPS,
  PORT_OPS,
  PROPERTY_OPS,
  SHARED_OPS,
} from './layered-site-replay-ops-core.js';
import { STATE_OPS } from './layered-site-replay-ops-state.js';
import { ELK_OPS, ENUM_OPS, TRANSFORM_OPS, isPorted } from './layered-site-replay-ops-transform.js';
import { ADAPTER_OPS, SPACING_OPS, TARJAN_OPS, UTIL_OPS } from './layered-site-replay-ops-util.js';

export { decodeHex } from './layered-framework-replay.js';

const VECTORS_URL = new URL('../golden/refs/java/layered-sites.json', import.meta.url);

/** One interpreted step of a row. */
export interface SiteStep {
  readonly op: string;
  readonly on: string | null;
  readonly args: readonly unknown[];
  readonly as?: string;
}

/** A row of layered-sites.json. */
export interface SiteRow {
  readonly id: string;
  readonly site: string;
  readonly input: unknown;
  readonly steps: readonly SiteStep[];
  readonly expected: Readonly<Record<string, unknown>>;
}

export interface SiteFile {
  readonly jdk: string;
  readonly oracle: string;
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly rows: readonly SiteRow[];
}

let cached: SiteFile | null = null;

/** Loads `layered-sites.json` once. */
export function loadSiteFile(): SiteFile {
  cached ??= JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as SiteFile;
  return cached;
}

function buildOps(): ReadonlyMap<string, Op> {
  const table = new Map<string, Op>();
  const sections = [
    CONSTRUCTION_OPS,
    GEOMETRY_OPS,
    PROPERTY_OPS,
    STATE_OPS,
    GRAPH_OPS,
    NODE_OPS,
    SHARED_OPS,
    PORT_OPS,
    EDGE_OPS,
    UTIL_OPS,
    SPACING_OPS,
    TARJAN_OPS,
    ADAPTER_OPS,
    TRANSFORM_OPS,
    ELK_OPS,
    ENUM_OPS,
  ];
  for (const section of sections) {
    for (const [name, op] of Object.entries(section)) {
      if (table.has(name)) {
        throw new ReplayBug(`duplicate op ${name}`);
      }
      table.set(name, op);
    }
  }
  return table;
}

/** The dispatch table: exactly one entry per op the recorder documents. */
export const OPS: ReadonlyMap<string, Op> = buildOps();

/** What a replayed row produced: the value per label, the op that produced it, and unlabeled steps that threw. */
export interface RowOutcome {
  readonly values: Readonly<Record<string, unknown>>;
  readonly ops: Readonly<Record<string, string>>;
  readonly unlabeledErrors: readonly string[];
  /** ElkLayered methods the provider reached (the staged driver of 7f), in call order. */
  readonly stagedCalls: readonly string[];
}

const STAGED_METHODS = ['doLayout', 'doCompoundLayout'] as const;

/** Runs `fn` while recording which staged `ElkLayered` driver methods are entered. */
function observeStagedCalls<T>(fn: () => T): { result: T; calls: string[] } {
  const calls: string[] = [];
  const prototype = ElkLayered.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const originals = STAGED_METHODS.map((name) => prototype[name]!);
  STAGED_METHODS.forEach((name, i) => {
    prototype[name] = function (this: unknown, ...args: unknown[]): unknown {
      calls.push(name);
      return originals[i]!.apply(this, args);
    };
  });
  try {
    return { result: fn(), calls };
  } finally {
    STAGED_METHODS.forEach((name, i) => {
      prototype[name] = originals[i]!;
    });
  }
}

function startContext(row: SiteRow): Ctx {
  const ctx = new Ctx(row.expected);
  registerLayered(); // the recorder's main initialises the metadata service (it registers the ElkReflect clones)
  if (row.input === null) {
    ctx.bind(new LGraph(), FIRST_GRAPH);
  } else {
    ctx.bind(importInput({ id: row.id, group: 'transform', input: row.input, options: {} }), ELK_ROOT);
  }
  return ctx;
}

type Collected = { values: Record<string, unknown>; ops: Record<string, string>; unlabeledErrors: string[] };

/** The op of a step; an unknown op, or a `new<Class>` op without the label that names its element, is a replay bug. */
function opOf(row: SiteRow, step: SiteStep): Op {
  const op = OPS.get(step.op);
  if (op === undefined) {
    throw new ReplayBug(`${row.id}: unknown op ${step.op}`);
  }
  if (step.op.startsWith('new') && step.as === undefined) {
    throw new ReplayBug(`${row.id}: ${step.op} needs a label (it names the element)`);
  }
  return op;
}

/** Runs one step: its result (or the error it throws) is collected under its label; an unlabeled throw is listed. */
function runStep(ctx: Ctx, row: SiteRow, step: SiteStep, out: Collected): void {
  const op = opOf(row, step);
  const as = step.as ?? null;
  try {
    const value = ctx.result(step.op, op(new Args(ctx, step.on, step.args, as)), as);
    if (as !== null) {
      out.values[as] = value;
    }
  } catch (e) {
    if (e instanceof ReplayBug) {
      throw new ReplayBug(`${row.id} step ${step.op} on ${String(step.on)}: ${e.message}`);
    }
    if (as === null) {
      out.unlabeledErrors.push(`${step.op} on ${String(step.on)} threw ${JSON.stringify(exceptionOf(e))}`);
    } else {
      out.values[as] = exceptionOf(e);
    }
  }
  if (as !== null) {
    out.ops[as] = step.op;
  }
}

function interpret(row: SiteRow): Omit<RowOutcome, 'stagedCalls'> {
  const ctx = startContext(row);
  const out: Collected = { values: {}, ops: {}, unlabeledErrors: [] };
  for (const step of row.steps) {
    runStep(ctx, row, step, out);
  }
  return out;
}

/** Replays a row's steps on the TS port. */
export function replayRow(row: SiteRow): RowOutcome {
  const { result, calls } = observeStagedCalls(() => interpret(row));
  return { ...result, stagedCalls: calls };
}

// ---------------------------------------------------------------------------------------------------------------
// Comparison

const C4_OPS: ReadonlySet<string> = new Set([
  'getProperty',
  'LGraphUtil.getIndividualOrInherited',
  'Spacings.getIndividualOrDefault',
]);
const PROVIDER_SITE = 'LayeredLayoutProvider';
const HIERARCHY_AWARE_ROW = 'site/strings/hierarchyAware';
const STAGED_DRIVER_MESSAGE = 'mission 7f';

function expectedException(expected: unknown): { class: string; message: string | null } | null {
  const e = (expected as { exception?: { class: string; message: string | null } } | null)?.exception;
  return e === undefined || Object.keys(expected as object).length !== 1 ? null : e;
}

const NULL_POINTER_EXCEPTION = 'NullPointerException';

/**
 * Every recorded exception is compared by class and message exactly, with one exemption: a recorded
 * `NullPointerException` matches the port's `TypeError` (see `exceptionOf`) by class only, because the JDK 21 helpful
 * message (or the `Objects.requireNonNull` text) is not reproducible (AD-16 keeps the Java exception chain, AD-16b
 * and elkgraph-model D10 (plans/elkgraph-model/decisions.md, NPE -> TypeError) give JVM-raised errors no shims;
 * docs/conformance.md, "Exception class where Java dereferences null", is the 6b precedent). Returns null when the
 * strict comparison applies.
 */
function compareNullPointer(label: string, actual: unknown, expected: unknown): string[] | null {
  const e = expectedException(expected);
  if (e?.class !== NULL_POINTER_EXCEPTION) {
    return null;
  }
  return expectedException(actual)?.class === NULL_POINTER_EXCEPTION
    ? []
    : [`${label}: expected a ${NULL_POINTER_EXCEPTION}, got ${JSON.stringify(actual)}`];
}

function normalizeState(value: unknown): unknown {
  const state = value as { properties?: Record<string, unknown> } | null;
  if (state === null || typeof state !== 'object' || state.properties === undefined) {
    return value;
  }
  const properties = Object.fromEntries(Object.entries(state.properties).map(([k, v]) => [k, normalizeC4(v)]));
  return { ...state, properties };
}

function compareLabel(label: string, op: string, actual: unknown, expected: unknown): string[] {
  const exception = compareNullPointer(label, actual, expected);
  if (exception !== null) {
    return exception;
  }
  if (expectedException(expected) !== null || expectedException(actual) !== null) {
    return compareValues(label, actual, expected);
  }
  if (op === 'dumpLGraph') {
    return compareLGraphDump(actual as LGraphDump, expected as LGraphDump).map((d) => `${label}: ${d}`);
  } else if (op === 'exportElk') {
    const elk = compareLayout(expected, actual);
    return elk.ok ? [] : [`${label}: ${formatDiffs(elk.diffs)}`];
  } else if (C4_OPS.has(op)) {
    return compareValues(label, normalizeC4(actual), normalizeC4(expected));
  } else if (op === 'state') {
    return compareValues(label, normalizeState(actual), normalizeState(expected));
  }
  return compareValues(label, actual, expected);
}

function compareLabels(row: SiteRow, outcome: RowOutcome, skip: ReadonlySet<string>): string[] {
  const diffs: string[] = [];
  const expectedLabels = Object.keys(row.expected).sort();
  const actualLabels = Object.keys(outcome.values).sort();
  if (JSON.stringify(expectedLabels) !== JSON.stringify(actualLabels)) {
    diffs.push(`labels: expected ${JSON.stringify(expectedLabels)}, got ${JSON.stringify(actualLabels)}`);
  }
  for (const label of expectedLabels) {
    if (!skip.has(label) && label in outcome.values) {
      diffs.push(...compareLabel(label, outcome.ops[label]!, outcome.values[label], row.expected[label]));
    }
  }
  return diffs;
}

/** Provider rows (X6): `ElkLayered` is staged (7f), so `layout` must throw naming 7f at the driver method the row selects. */
function compareProvider(row: SiteRow, outcome: RowOutcome): string[] {
  const root = importInput({ id: row.id, group: 'transform', input: row.input, options: {} });
  const compound = root.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN;
  const method = compound ? 'doCompoundLayout' : 'doLayout';
  const thrown = expectedException(outcome.values.layout);
  const diffs: string[] = [];
  if (thrown?.class !== 'UnsupportedOperationException' || !(thrown.message ?? '').includes(STAGED_DRIVER_MESSAGE)) {
    diffs.push(
      `layout: expected UnsupportedOperationException naming 7f, got ${JSON.stringify(outcome.values.layout)}`,
    );
  }
  if (JSON.stringify(outcome.stagedCalls) !== JSON.stringify([method])) {
    diffs.push(`staged calls: expected [${method}], got ${JSON.stringify(outcome.stagedCalls)}`);
  }
  return diffs;
}

/** The Java classes of the recorded `classes` that the TS port has not ported yet are staged (7d-7f). */
function stagedHierarchyAware(row: SiteRow): SiteRow {
  const classes = (row.expected.classes as readonly string[]).filter(isPorted);
  return { ...row, expected: { ...row.expected, classes } };
}

/** Compares a row's outcome with its recorded `expected`; returns the differences (empty: the row matches). */
export function compareRow(row: SiteRow, outcome: RowOutcome): string[] {
  const diffs = outcome.unlabeledErrors.map((e) => `unlabeled step: ${e}`);
  if (row.site === PROVIDER_SITE) {
    // the recorded `elk` after layout stays for 7f, when the driver exists
    return [...diffs, ...compareProvider(row, outcome), ...compareLabels(row, outcome, new Set(['layout', 'elk']))];
  }
  const compared = row.id === HIERARCHY_AWARE_ROW ? stagedHierarchyAware(row) : row;
  return [...diffs, ...compareLabels(compared, outcome, new Set())];
}

/** The ops a row's steps use. */
export function opsUsed(file: SiteFile): ReadonlySet<string> {
  return new Set(file.rows.flatMap((row) => row.steps.map((step) => step.op)));
}
