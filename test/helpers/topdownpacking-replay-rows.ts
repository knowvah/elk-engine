// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/topdownpacking.json (mission 8c, T3 recording by tools/vectors/TopdownPackingVectors.java, whose header is
// the contract of this file; T8): { id, group, input, expected } in the groups
//   full       expected = { layoutNode, graph, nodes, edges }, the ELK dump of the root after RecursiveGraphLayoutEngine;
//   stops      expected = { layoutNode, steps: ["p1", "p2", "end"], stops }, the provider driven step by step on the root;
//   predicted  expected = { layoutNode, size: [hexX, hexY] }, TopdownpackingLayoutProvider.getPredictedGraphSize(root);
//   throws     expected = { layoutNode, throws } (engine rows) or { layoutNode, setup, call, throws } (direct GridElkNode / phase rows).
// Doubles are 16-hex raw bit strings (`Hex`, the vertiflex codec). The file is parsed and validated ONCE per path (`loadTopdownRows`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, isHex, type Hex, type HexPoint } from './vertiflex-replay-rows.js';

export { decodeHex, encodeHex, isHex };
export type { Hex, HexPoint };

/** The steps of a stops row in execution order. */
export const STEP_P1 = 'p1';
export const STEP_P2 = 'p2';
export const STEP_END = 'end';
export const TOPDOWN_STEPS = [STEP_P1, STEP_P2, STEP_END] as const;
export type TopdownStep = (typeof TOPDOWN_STEPS)[number];

export const TOPDOWN_ROW_GROUPS = ['full', 'stops', 'predicted', 'throws'] as const;
export type TopdownRowGroup = (typeof TOPDOWN_ROW_GROUPS)[number];

/** The layout node of every row (the recorder's ROOT_ID). */
export const ROOT_LAYOUT = 'root';

/** A box of an ELK dump: id and the four doubles as hex. */
export interface BoxEntry {
  readonly id: string;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
}
export interface SectionEntry {
  readonly start: HexPoint;
  readonly end: HexPoint;
  readonly bends: readonly HexPoint[];
}
export interface EdgeEntry {
  readonly id: string;
  readonly sections: readonly SectionEntry[];
  readonly junctions: readonly HexPoint[] | null;
}
/** The recorder's ELK dump (`dumpBody`): the top node, every descendant depth first, contained edges after a node's children. */
export interface ElkDump {
  readonly graph: BoxEntry;
  readonly nodes: readonly BoxEntry[];
  readonly edges: readonly EdgeEntry[];
}
/** The p1 / p2 stop: the root box, the grid size, the real row lists (`cells[i].length` is the list size), the node dump. */
export interface GridStop {
  readonly step: typeof STEP_P1 | typeof STEP_P2;
  readonly graph: BoxEntry;
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly (readonly (string | null)[])[];
  readonly nodes: readonly BoxEntry[];
}
export interface EndStop extends ElkDump {
  readonly step: typeof STEP_END;
}
export type Stop = GridStop | EndStop;

export interface ThrowsExpected {
  readonly class: string;
  readonly message: string | null;
  readonly frame: string;
}
/** The direct call names of the throws rows. */
export const CALL_NAMES = ['put', 'get', 'getRow', 'getColumn', 'p2'] as const;
export type CallName = (typeof CALL_NAMES)[number];
export interface DirectSetup {
  /** `null`: `setGridSize` is never called (the grid is uninitialised); then `rows` is `null` too. */
  readonly cols: number | null;
  readonly rows: number | null;
  /** `[col, row, childId]`, each put in order before the call. */
  readonly puts: readonly (readonly [number, number, string])[];
}
export interface DirectCall {
  readonly name: CallName;
  readonly args: readonly number[];
}

interface RowBase {
  readonly id: string;
  /** The prepared graph as ELK JSON (the root of the graph). */
  readonly input: Readonly<Record<string, unknown>>;
}
export interface FullRow extends RowBase {
  readonly group: 'full';
  readonly expected: { readonly layoutNode: string } & ElkDump;
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly expected: {
    readonly layoutNode: string;
    readonly steps: readonly TopdownStep[];
    readonly stops: readonly Stop[];
  };
}
export interface PredictedRow extends RowBase {
  readonly group: 'predicted';
  readonly expected: { readonly layoutNode: string; readonly size: HexPoint };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly expected: {
    readonly layoutNode: string;
    readonly throws: ThrowsExpected;
    readonly setup?: DirectSetup;
    readonly call?: DirectCall;
  };
}
export type TopdownRow = FullRow | StopsRow | PredictedRow | ThrowsRow;

/** The path of the topdownpacking ref. */
export const topdownRefPath = (): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'topdownpacking.json');

export const topdownRefExists = (file: string = topdownRefPath()): boolean => existsSync(file);

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function checkStops(id: string, expected: Obj): void {
  const { steps, stops } = expected;
  const wellFormed =
    Array.isArray(steps) &&
    Array.isArray(stops) &&
    steps.length === TOPDOWN_STEPS.length &&
    stops.length === TOPDOWN_STEPS.length &&
    steps.every((step, i) => step === TOPDOWN_STEPS[i]) &&
    stops.every((stop, i) => isObject(stop) && stop.step === steps[i]);
  if (!wellFormed) {
    reject(id, `a stops row needs expected.steps = ${TOPDOWN_STEPS.join(', ')} and stops[i].step = steps[i]`);
  }
}

function checkThrows(id: string, expected: Obj): void {
  if (!isObject(expected.throws)) {
    reject(id, 'a throws row needs expected.throws');
  }
  const direct = expected.setup !== undefined || expected.call !== undefined;
  if (direct && (!isObject(expected.setup) || !isObject(expected.call))) {
    reject(id, 'a direct throws row needs both expected.setup and expected.call');
  }
  if (direct && !(CALL_NAMES as readonly unknown[]).includes((expected.call as Obj).name)) {
    reject(id, `unknown call ${JSON.stringify((expected.call as Obj).name)}`);
  }
}

const GROUP_CHECKS: Readonly<Record<TopdownRowGroup, (id: string, expected: Obj) => void>> = {
  full: (id, expected) => {
    if (!isObject(expected.graph)) reject(id, 'a full row needs expected.graph');
  },
  stops: checkStops,
  predicted: (id, expected) => {
    if (!Array.isArray(expected.size) || expected.size.length !== 2) reject(id, 'a predicted row needs expected.size');
  },
  throws: checkThrows,
};

function checkRow(raw: unknown, index: number): TopdownRow {
  if (
    !isObject(raw) ||
    typeof raw.id !== 'string' ||
    !isObject(raw.input) ||
    !isObject(raw.expected) ||
    typeof raw.expected.layoutNode !== 'string'
  ) {
    throw new Error(`topdownpacking row ${String(index)} is malformed`);
  }
  if (!(TOPDOWN_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  GROUP_CHECKS[raw.group as TopdownRowGroup](raw.id, raw.expected);
  return raw as unknown as TopdownRow;
}

/** The first difference between the header's `rowCounts` and the rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly TopdownRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of TOPDOWN_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids, the `rowCounts` header. */
export function parseTopdownFile(file: string): TopdownRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  const rows = parsed.rows.map((row, i) => checkRow(row, i));
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error(`${path.basename(file)}: duplicate row ids`);
  }
  const difference = rowCountsDifference(parsed.rowCounts, rows);
  if (difference !== null) {
    throw new Error(`${path.basename(file)}: ${difference}`);
  }
  return rows;
}

const cache = new Map<string, readonly TopdownRow[]>();

/** The rows of the topdownpacking ref in file order, optionally of one group; validated, cached per path. */
export function loadTopdownRows(group: 'full', file?: string): readonly FullRow[];
export function loadTopdownRows(group: 'stops', file?: string): readonly StopsRow[];
export function loadTopdownRows(group: 'predicted', file?: string): readonly PredictedRow[];
export function loadTopdownRows(group: 'throws', file?: string): readonly ThrowsRow[];
export function loadTopdownRows(group?: TopdownRowGroup, file?: string): readonly TopdownRow[];
export function loadTopdownRows(group?: TopdownRowGroup, file: string = topdownRefPath()): readonly TopdownRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseTopdownFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** The stop of a stops row for one step. */
export function stopOf(row: StopsRow, step: TopdownStep): Stop {
  const stop = row.expected.stops[TOPDOWN_STEPS.indexOf(step)];
  if (stop === undefined || stop.step !== step) {
    reject(row.id, `has no ${step} stop`);
  }
  return stop;
}
