// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-compound.json (mission 7h, T2; recorded by tools/vectors/LayeredCompoundVectors.java, T1):
// the row shape of 7f2 / 7g (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`) in the groups `full`,
// `models`, `scenarios`, `sites`; target, steps and prefix are null on every recorded row. Every row is run as the recorder runs it
// (layered-compound-replay-run.ts); what differs is `expected`:
//   full       `{ layout, plans }`, `plans` keyed by level path, nested levels included;
//   models     `{ stop: { index, levelPath, processor, className }, tree }` (H2): one hierarchical stop of the run, the whole `LGraph`
//              tree at that moment;
//   scenarios  `{ layout, plans, stops, tree }`: a full row plus the number of stops and the tree at the last one.
// The landed loaders reject these shapes (a stop row without `geometry`), so this module validates the file itself, once per path.
// The ref is read lazily: when it is absent the dependent suites skip with a message naming T1 (the landed skip-message form).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';
import { registerLoopsEnums } from './layered-loops-replay-rows.js';
import type { FullRow, PlanMap } from './layered-pipeline-replay-rows.js';
import type { PhaseInput } from './layered-phase-replay-rows.js';

export type { FullRow, PlanMap };

/** The four row groups of the compound ref (`rowCounts` keys, in header order). */
export const COMPOUND_ROW_GROUPS = ['full', 'models', 'scenarios', 'sites'] as const;
export type CompoundRowGroup = (typeof COMPOUND_ROW_GROUPS)[number];

export const FULL_GROUP = 'full';
export const MODELS_GROUP = 'models';
export const SCENARIOS_GROUP = 'scenarios';

/**
 * Where a `models` row stops: the n-th hierarchical stop (0-based; `expected.stop.index` numbers only the stops the recorder's header
 * lists, not every finished notification), the level path of the graph it ran on and the processor's names.
 */
export interface CompoundStop {
  readonly index: number;
  readonly levelPath: string;
  /** The positional name as in `plans` (a member name, `P3_NODE_ORDERING/LAYER_SWEEP`, `CompoundGraphPreprocessor`, ...). */
  readonly processor: string;
  /** `getClass().getSimpleName()` of the processor (e.g. `LayerSweepCrossingMinimizer`). */
  readonly className: string;
}

/** The options of a row: option id to a C4 value, or `null` (removes the property on the root). */
export type CompoundOptions = Readonly<Record<string, unknown>>;

/** A `models` row (H2): `expected.tree` is the whole-tree dump documented in layered-compound-replay-dump.ts. */
export interface CompoundModelsRow {
  readonly id: string;
  readonly group: typeof MODELS_GROUP;
  readonly input: PhaseInput;
  readonly target: null;
  readonly options: CompoundOptions;
  readonly steps: null;
  readonly prefix: null;
  readonly expected: { readonly stop: CompoundStop; readonly tree: unknown };
}

/** A `scenarios` row: the full row's `layout` and `plans`, the number of stops and the tree at the last stop. */
export interface CompoundScenarioRow {
  readonly id: string;
  readonly group: typeof SCENARIOS_GROUP;
  readonly input: PhaseInput;
  readonly target: null;
  readonly options: CompoundOptions;
  readonly steps: null;
  readonly prefix: null;
  readonly expected: {
    readonly layout: unknown;
    readonly plans: PlanMap;
    readonly stops: number;
    readonly tree: unknown;
  };
}

/** A `sites` row (T14 appends them; the ref holds none today): `expected` is opaque to this module. */
export interface CompoundSiteRow {
  readonly id: string;
  readonly group: 'sites';
  readonly input: PhaseInput;
  readonly target: string | null;
  readonly options: CompoundOptions;
  readonly steps: unknown;
  readonly prefix: unknown;
  readonly expected: Readonly<Record<string, unknown>>;
}

export type CompoundRow = FullRow | CompoundModelsRow | CompoundScenarioRow | CompoundSiteRow;

export const isCompoundFullRow = (row: CompoundRow): row is FullRow => row.group === FULL_GROUP;
export const isCompoundModelsRow = (row: CompoundRow): row is CompoundModelsRow => row.group === MODELS_GROUP;
export const isCompoundScenarioRow = (row: CompoundRow): row is CompoundScenarioRow => row.group === SCENARIOS_GROUP;

/** Registers the enum types the compound rows' options use (the loops set already holds every layered enum); idempotent. */
export function registerCompoundEnums(): void {
  registerLoopsEnums();
}

registerCompoundEnums();

// ------------------------------------------------------------------------------------------------------------
// the lazy loader

/** The path of the compound ref (absent until T1's recording has run). */
export const compoundRefPath = (): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-compound.json');

/** Why the dependent suites are skipped; names the task that produces the ref. */
export const compoundSkipMessage = (file: string = compoundRefPath()): string =>
  `${path.basename(file)} is absent: T1 (tools/vectors/LayeredCompoundVectors.java recording) has not landed`;

export const compoundRefExists = (file: string = compoundRefPath()): boolean => existsSync(file);

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function checkFull(id: string, row: Obj): void {
  if (row.target !== null || row.steps !== null || row.prefix !== null) {
    reject(id, 'a full row has target, steps and prefix null');
  }
  const expected = row.expected as Obj;
  if (!isObject(expected.layout)) {
    reject(id, 'a full row needs expected.layout');
  }
  const plans = expected.plans;
  const isPlans =
    isObject(plans) && Object.values(plans).every((l) => Array.isArray(l) && l.every((m) => typeof m === 'string'));
  if (!isPlans) {
    reject(id, 'a full row needs expected.plans, a map of level path to member name list');
  }
}

function checkModels(id: string, row: Obj): void {
  if (row.target !== null || row.steps !== null || row.prefix !== null) {
    reject(id, 'a models row has target, steps and prefix null');
  }
  const expected = row.expected as Obj;
  const stop = expected.stop;
  const wellFormed =
    isObject(stop) &&
    Number.isInteger(stop.index) &&
    (stop.index as number) >= 0 &&
    typeof stop.levelPath === 'string' &&
    typeof stop.processor === 'string' &&
    typeof stop.className === 'string';
  if (!wellFormed) {
    reject(id, 'a models row needs expected.stop = { index, levelPath, processor, className }');
  }
  checkTree(id, expected.tree);
}

function checkTree(id: string, tree: unknown): void {
  if (!isObject(tree) || !Array.isArray(tree.graphs) || !('crossHierarchyMap' in tree)) {
    reject(id, 'a tree needs the whole-tree dump: graphs and crossHierarchyMap');
  }
}

function checkScenario(id: string, row: Obj): void {
  checkFull(id, row);
  const expected = row.expected as Obj;
  if (!Number.isInteger(expected.stops) || (expected.stops as number) < 1) {
    reject(id, 'a scenarios row needs expected.stops, the number of stops (at least 1)');
  }
  checkTree(id, expected.tree);
}

function checkRow(raw: unknown, index: number): CompoundRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`layered-compound row ${String(index)} is malformed`);
  }
  if (!(COMPOUND_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === FULL_GROUP) {
    checkFull(raw.id, raw);
  } else if (raw.group === MODELS_GROUP) {
    checkModels(raw.id, raw);
  } else if (raw.group === SCENARIOS_GROUP) {
    checkScenario(raw.id, raw);
  }
  return raw as unknown as CompoundRow;
}

/** The first difference between the header's `rowCounts` and the loaded rows, or `null` when equal. */
export function compoundRowCountsDifference(header: unknown, rows: readonly CompoundRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of COMPOUND_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name) and the `rowCounts` header. */
export function parseCompoundFile(file: string): CompoundRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  const rows = parsed.rows.map((row, i) => checkRow(row, i));
  const difference = compoundRowCountsDifference(parsed.rowCounts, rows);
  if (difference !== null) {
    throw new Error(`${path.basename(file)}: ${difference}`);
  }
  return rows;
}

const cache = new Map<string, readonly CompoundRow[]>();

/**
 * The rows of the compound ref in file order, optionally of one group; validated, cached per path.
 *
 * @throws Error naming T1 when the file is absent, and naming the row when one is malformed
 */
export function loadCompoundRows(group?: CompoundRowGroup, file: string = compoundRefPath()): readonly CompoundRow[] {
  if (!compoundRefExists(file)) {
    throw new Error(compoundSkipMessage(file));
  }
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseCompoundFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** `loadCompoundRows`, or `[]` when the file is absent (collection-time listing for a suite that is then skipped). */
export function loadCompoundRowsIfPresent(
  group?: CompoundRowGroup,
  file: string = compoundRefPath(),
): readonly CompoundRow[] {
  return compoundRefExists(file) ? loadCompoundRows(group, file) : [];
}

/** `describe` when the ref exists; otherwise a describe holding one skipped test whose title is `compoundSkipMessage`. */
export function describeCompound(title: string, body: () => void, file: string = compoundRefPath()): void {
  if (compoundRefExists(file)) {
    describe(title, body);
    return;
  }
  describe(title, () => {
    it.skip(compoundSkipMessage(file), () => undefined);
  });
}

/** The family of a row: the second segment of its id (`full/<family>/…`, `models/<model>/…`). */
export const compoundFamilyOf = (row: CompoundRow): string => row.id.split('/')[1] ?? '';
