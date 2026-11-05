// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-pipeline.json (mission 7f, F3, F4): groups `full`, `models`, `scenarios`,
// `sites`. A `models`/`scenarios`/`sites` row is 7e's `RoutingRow`; a `full` row carries `target: null`, `steps: null`,
// `prefix: null` and `expected: { layout, plans }`. The 7b `loadRows` closes its group list and the 7e loader knows
// `calls`, so this loader checks the rows itself (the 7e precedent) and accepts any number of ref files.
import { readFileSync } from 'node:fs';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import type { HexQuad } from './layered-framework-replay.js';
import type { PhaseInput } from './layered-phase-replay-rows.js';
import type { RoutingRow } from './layered-routing-replay-rows.js';
import { ENUM_TYPES, type EnumClass } from './layered-site-replay-registry.js';

/** `expected` of a terminal `componentsSplit` row: the component list in list order. */
export interface ComponentsExpected {
  readonly components: readonly {
    readonly nodes: readonly string[];
    /** `PortSide` names in ordinal order, or `null` when the component has no `EXT_PORT_CONNECTIONS`. */
    readonly extPortConnections: readonly string[] | null;
    /** (top, right, bottom, left) as hex doubles. */
    readonly padding: HexQuad;
  }[];
}

/**
 * A `models`/`scenarios`/`sites` row, typed as 7e's `RoutingRow` (the earlier tests narrow with `isStopRow` and pass it
 * to the 7e helpers). The `expected` of a terminal `componentsSplit` row is a `ComponentsExpected` instead of a routing
 * dump: tell them apart with `isComponentsRow` before reading `expected.geometry`.
 */
export type PipelineStopRow = RoutingRow;

/** The row groups of the pipeline ref file. */
export const PIPELINE_ROW_GROUPS = ['full', 'models', 'scenarios', 'sites'] as const;
export type PipelineRowGroup = (typeof PIPELINE_ROW_GROUPS)[number];

/** The group whose rows lay a whole graph out through the engine. */
export const FULL_GROUP = 'full';

/** The ordered plan members per hierarchy level, keyed by level path (F4). */
export type PlanMap = Readonly<Record<string, readonly string[]>>;

/** A `full` row (F4): the exported ELK JSON of the whole layout and the plan of each hierarchy level. */
export interface FullRow {
  readonly id: string;
  readonly group: typeof FULL_GROUP;
  readonly input: PhaseInput;
  readonly target: null;
  readonly options: Readonly<Record<string, unknown>>;
  readonly steps: null;
  readonly prefix: null;
  readonly expected: { readonly layout: unknown; readonly plans: PlanMap };
}

export type PipelineRow = FullRow | PipelineStopRow;

/**
 * Registers the enum-valued option types the pipeline rows use beyond the 7a registry (`ENUM_TYPES` closes its list;
 * the registry object is typed read-only but is a plain mutable record). Idempotent; runs when this module is
 * evaluated, so importing the loader suffices. Today 7f adds none beyond `EdgeRouting`, which 7e registers the same way.
 */
export function registerPipelineEnums(): void {
  (ENUM_TYPES as Record<string, EnumClass>).EdgeRouting ??= EdgeRouting as unknown as EnumClass;
}

registerPipelineEnums();

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function isPlanMap(value: unknown): boolean {
  return (
    isObject(value) && Object.values(value).every((l) => Array.isArray(l) && l.every((m) => typeof m === 'string'))
  );
}

function checkFull(id: string, row: Obj): void {
  if (row.target !== null || row.steps !== null || row.prefix !== null) {
    reject(id, 'a full row has target, steps and prefix null');
  }
  const expected = row.expected as Obj;
  if (!('layout' in expected) || expected.layout === null || typeof expected.layout !== 'object') {
    reject(id, 'a full row needs expected.layout');
  }
  if (!isPlanMap(expected.plans)) {
    reject(id, 'a full row needs expected.plans, a map of level path to member name list');
  }
}

function checkStop(id: string, row: Obj): void {
  if ((row.steps === null) === (row.prefix === null)) {
    reject(id, 'exactly one of steps and prefix must be set');
  }
  const expected = row.expected as Obj;
  if (Array.isArray(expected.components)) {
    return;
  }
  const geometry = expected.geometry;
  if (!isObject(geometry) || !isObject(geometry.nodes) || !isObject(geometry.edges)) {
    reject(id, 'expected.geometry (nodes and edges maps) or expected.components is missing');
  }
}

function checkRow(raw: unknown, index: number): PipelineRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`layered-pipeline row ${String(index)} is malformed`);
  }
  if (!(PIPELINE_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === FULL_GROUP) {
    checkFull(raw.id, raw);
  } else {
    checkStop(raw.id, raw);
  }
  return raw as unknown as PipelineRow;
}

/** The rows of one or more pipeline ref files, concatenated in order; a malformed row is rejected by name. */
export function loadPipelineRows(...files: readonly string[]): PipelineRow[] {
  return files.flatMap((file) => {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
      throw new Error(`${file}: no "rows" array`);
    }
    return parsed.rows.map((row, i) => checkRow(row, i));
  });
}

export const isFullRow = (row: PipelineRow): row is FullRow => row.group === FULL_GROUP;
export const isStopRow = (row: PipelineRow): row is PipelineStopRow => row.group !== FULL_GROUP;

/** A stop row whose `expected` is the component list of a terminal `componentsSplit` (not a routing dump). */
export const isComponentsRow = (row: PipelineRow): row is PipelineStopRow & { readonly expected: ComponentsExpected } =>
  row.group !== FULL_GROUP && 'components' in row.expected;
