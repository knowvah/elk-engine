// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/disco.json (mission 8b, T2 recording by tools/vectors/DiscoVectors.java, whose header is the contract of
// this file; T7): { id, group, input, expected } in the groups
//   full    expected = an ELK dump of the root { layoutNode, graph, nodes, ports, labels, edges, debug };
//   stops   expected = { layoutNode, steps, stops }, the seven steps split, import, cellSizes, polys, pack, applyToDCGraph, applyLayout;
//   throws  expected = { layoutNode, throws: { class, message, frame } }.
// Doubles are 16-hex raw bit strings (`Hex`); `decodeHex` / `encodeHex` / `isHex` are those of the vertiflex helper (one codec). The file is
// parsed and validated ONCE per path (`loadDiscoRows`), and the typed stop accessors (`stopOf`) read the row without copying it.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, isHex, type Hex, type HexPoint } from './vertiflex-replay-rows.js';

export { decodeHex, encodeHex, isHex };
export type { Hex, HexPoint };

/** The steps of a stops row in execution order. */
export const STEP_SPLIT = 'split';
export const STEP_IMPORT = 'import';
export const STEP_CELL_SIZES = 'cellSizes';
export const STEP_POLYS = 'polys';
export const STEP_PACK = 'pack';
export const STEP_APPLY_TO_DC_GRAPH = 'applyToDCGraph';
export const STEP_APPLY_LAYOUT = 'applyLayout';
export const DISCO_STEPS = [
  STEP_SPLIT,
  STEP_IMPORT,
  STEP_CELL_SIZES,
  STEP_POLYS,
  STEP_PACK,
  STEP_APPLY_TO_DC_GRAPH,
  STEP_APPLY_LAYOUT,
] as const;
export type DiscoStep = (typeof DISCO_STEPS)[number];

export const DISCO_ROW_GROUPS = ['full', 'stops', 'throws'] as const;
export type DiscoRowGroup = (typeof DISCO_ROW_GROUPS)[number];

/** The element kinds of the import stop, in the recorder's rank order (`DiscoVectors.KINDS`). */
export const ELEMENT_KINDS = ['node', 'nodeLabel', 'port', 'portLabel', 'edge', 'extEdge', 'edgeLabel'] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

/** The names of `DCDirection` / `Direction` in ordinal order. */
export const DIRECTION_NAMES = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;
export type DirectionName = (typeof DIRECTION_NAMES)[number];

export interface ExtensionEntry {
  readonly dir: DirectionName;
  readonly offset: HexPoint;
  readonly width: Hex;
}
export interface ElementEntry {
  readonly kind: ElementKind;
  readonly ref: string;
  readonly shape: readonly HexPoint[];
  readonly bounds: readonly [Hex, Hex, Hex, Hex];
  readonly parentCoords: HexPoint | null;
  readonly extensions: readonly ExtensionEntry[];
}
export interface ComponentEntry {
  readonly index: number;
  readonly first: string;
  readonly id: number;
  readonly offset: HexPoint;
  readonly minCorner: HexPoint;
  readonly bounds: HexPoint;
  readonly elements: readonly ElementEntry[];
}
/** A property value of the import stop: a hex double, a number, a boolean, a string (enum name), a list of hex doubles or names. */
export type PropEntry = Hex | number | boolean | string | readonly string[];
export interface ImportStop {
  readonly step: typeof STEP_IMPORT;
  readonly componentSpacing: Hex;
  readonly inset: Hex;
  readonly dimensions: HexPoint | null;
  readonly props: Readonly<Record<string, PropEntry>>;
  readonly components: readonly ComponentEntry[];
}
export interface CellSizesStop {
  readonly step: typeof STEP_CELL_SIZES;
  readonly componentCount: number;
  readonly componentBounds: readonly HexPoint[];
  readonly recommendation: Hex;
  readonly cellSizeX: Hex;
  readonly cellSizeY: Hex;
  readonly aspectRatio: Hex;
  readonly fill: boolean;
  readonly upperBound: Hex;
}
export interface PolyExtensionEntry {
  readonly dir: DirectionName;
  readonly offset: number;
  readonly width: number;
}
/** One polyomino of the polys and pack stops. */
export interface PolyEntry {
  readonly component: number;
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly cellSizeX: Hex;
  readonly cellSizeY: Hex;
  readonly offset: HexPoint;
  readonly cells: readonly string[];
  readonly extensions: readonly PolyExtensionEntry[];
}
export interface PolysStop {
  readonly step: typeof STEP_POLYS;
  readonly polys: readonly PolyEntry[];
}
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
/** `polys` is the size of the polyomino list, `comps` / `dims` those of the DCGraph, each `null` when its debug property is unset. */
export interface DebugEntry {
  readonly id: string;
  readonly polys: number | null;
  readonly comps: number | null;
  readonly dims: HexPoint | null;
}
/** The ELK dump of the recorder (`dumpBody`): the top node and every descendant in the recorder's traversal order. */
export interface ElkDump {
  readonly graph: BoxEntry;
  readonly nodes: readonly BoxEntry[];
  readonly ports: readonly BoxEntry[];
  readonly labels: readonly BoxEntry[];
  readonly edges: readonly EdgeEntry[];
  readonly debug: readonly DebugEntry[];
}
export interface SplitComponentEntry {
  readonly first: string;
  readonly nodes: readonly string[];
  readonly dfsOrder: readonly string[];
}
export interface SplitStop {
  readonly step: typeof STEP_SPLIT;
  readonly componentLayoutApplied: boolean;
  readonly afterComponentLayout: ElkDump | null;
  readonly components: readonly SplitComponentEntry[];
  readonly incidence: readonly { readonly id: string; readonly adjacent: readonly string[] }[];
}
export interface GridEntry {
  readonly w: number;
  readonly h: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly cells: readonly string[];
}
export interface PackStop {
  readonly step: typeof STEP_PACK;
  readonly order: readonly number[];
  readonly polys: readonly PolyEntry[];
  readonly grid: GridEntry;
  readonly filledBounds: readonly [number, number, number, number];
}
export interface ApplyToDCGraphStop {
  readonly step: typeof STEP_APPLY_TO_DC_GRAPH;
  readonly dimensions: HexPoint;
  readonly components: readonly { readonly index: number; readonly offset: HexPoint }[];
  readonly polys: readonly {
    readonly component: number;
    readonly id: number;
    readonly x: number;
    readonly y: number;
  }[];
  readonly debugPolys: number;
}
export interface ApplyLayoutStop extends ElkDump {
  readonly step: typeof STEP_APPLY_LAYOUT;
}
export interface StopByStep {
  readonly [STEP_IMPORT]: ImportStop;
  readonly [STEP_CELL_SIZES]: CellSizesStop;
  readonly [STEP_POLYS]: PolysStop;
  readonly [STEP_SPLIT]: SplitStop;
  readonly [STEP_PACK]: PackStop;
  readonly [STEP_APPLY_TO_DC_GRAPH]: ApplyToDCGraphStop;
  readonly [STEP_APPLY_LAYOUT]: ApplyLayoutStop;
}
export type Stop = StopByStep[DiscoStep];

export interface ThrowsExpected {
  readonly class: string;
  readonly message: string | null;
  readonly frame: string;
}

interface RowBase {
  readonly id: string;
  /** The prepared graph as ELK JSON (the root of the graph). */
  readonly input: Readonly<Record<string, unknown>>;
}
export interface FullRow extends RowBase {
  readonly group: 'full';
  readonly expected: { readonly layoutNode: string; readonly [key: string]: unknown };
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly expected: {
    readonly layoutNode: string;
    readonly steps: readonly DiscoStep[];
    readonly stops: readonly Stop[];
  };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly expected: { readonly layoutNode: string; readonly throws: ThrowsExpected };
}
export type DiscoRow = FullRow | StopsRow | ThrowsRow;

export const isFullRow = (row: DiscoRow): row is FullRow => row.group === 'full';
export const isStopsRow = (row: DiscoRow): row is StopsRow => row.group === 'stops';
export const isThrowsRow = (row: DiscoRow): row is ThrowsRow => row.group === 'throws';

/** The path of the disco ref. */
export const discoRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'disco.json');

export const discoRefExists = (file: string = discoRefPath()): boolean => existsSync(file);

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
    steps.length === stops.length &&
    steps.length === DISCO_STEPS.length &&
    steps.every((step, i) => step === DISCO_STEPS[i]) &&
    stops.every((stop, i) => isObject(stop) && stop.step === steps[i]);
  if (!wellFormed) {
    reject(id, `a stops row needs expected.steps = ${DISCO_STEPS.join(', ')} and stops[i].step = steps[i]`);
  }
}

function checkRow(raw: unknown, index: number): DiscoRow {
  if (
    !isObject(raw) ||
    typeof raw.id !== 'string' ||
    !isObject(raw.input) ||
    !isObject(raw.expected) ||
    typeof raw.expected.layoutNode !== 'string'
  ) {
    throw new Error(`disco row ${String(index)} is malformed`);
  }
  if (!(DISCO_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === 'stops') {
    checkStops(raw.id, raw.expected);
  } else if (raw.group === 'throws' && !isObject(raw.expected.throws)) {
    reject(raw.id, 'a throws row needs expected.throws');
  } else if (raw.group === 'full' && !isObject(raw.expected.graph)) {
    reject(raw.id, 'a full row needs expected.graph');
  }
  return raw as unknown as DiscoRow;
}

/** The first difference between the header's `rowCounts` and the rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly DiscoRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of DISCO_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids, the `rowCounts` header. */
export function parseDiscoFile(file: string): DiscoRow[] {
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

const cache = new Map<string, readonly DiscoRow[]>();

/** The rows of the disco ref in file order, optionally of one group; validated, cached per path. */
export function loadDiscoRows(group?: 'full', file?: string): readonly FullRow[];
export function loadDiscoRows(group: 'stops', file?: string): readonly StopsRow[];
export function loadDiscoRows(group: 'throws', file?: string): readonly ThrowsRow[];
export function loadDiscoRows(group?: DiscoRowGroup, file?: string): readonly DiscoRow[];
export function loadDiscoRows(group?: DiscoRowGroup, file: string = discoRefPath()): readonly DiscoRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseDiscoFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** The stop of a stops row for one step (typed by the step). */
export function stopOf<S extends DiscoStep>(row: StopsRow, step: S): StopByStep[S] {
  const stop = row.expected.stops[DISCO_STEPS.indexOf(step)];
  if (stop === undefined || stop.step !== step) {
    reject(row.id, `has no ${step} stop`);
  }
  return stop as StopByStep[S];
}
