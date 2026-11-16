// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/rectpacking.json (mission 8c, T1 recording by tools/vectors/RectPackingVectors.java, whose header is the
// contract of this file; T6): { id, group, input, expected } in the groups
//   full    expected = { layoutNode, mode, graph, nodes, ports, labels, extras }          an ELK dump of the root after the run;
//   stops   expected = { layoutNode, mode, graphs: [ { graph, processors, stops } ], flags, final }   stop = { stop, state };
//   throws  expected = { layoutNode, mode, throws: { class, message, frame } };
//   sort    input = { positions }, expected = { order } or { throws: { class, message } } (the JDK sort's contract violation).
// Doubles are 16-hex raw bit strings (`Hex`); `decodeHex` / `encodeHex` / `isHex` are those of the vertiflex helper (one codec). The
// file is parsed and validated ONCE per path (`loadRectPackingRows`); the typed accessors read the row without copying it.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, isHex, type Hex, type HexPoint } from './vertiflex-replay-rows.js';

export { decodeHex, encodeHex, isHex };
export type { Hex, HexPoint };

/** The stop names of a graph entry (the recorder's header). */
export const STOP_BEGIN = 'begin';
export const STOP_AFTER_COMPACTOR = 'after:Compactor';
export const STOP_AFTER_SIMPLE_PLACEMENT = 'after:SimplePlacement';
export const STOP_AFTER_NO_PLACEMENT = 'after:NoPlacement';
export const STOP_AFTER_EQUAL_WHITESPACE = 'after:EqualWhitespaceEliminator';
export const STOP_AFTER_ASPECT_RATIO_EXPANDER = 'after:ToAspectratioNodeExpander';
export const STOP_END = 'end';
/** The p2 stops that carry a `state.rows` object graph. */
export const P2_ROW_STOPS = [STOP_AFTER_COMPACTOR, STOP_AFTER_SIMPLE_PLACEMENT] as const;

export const RECTPACKING_ROW_GROUPS = ['full', 'stops', 'throws', 'sort'] as const;
export type RectPackingRowGroup = (typeof RECTPACKING_ROW_GROUPS)[number];

/** A box of an ELK dump: id and the four doubles as hex. */
export interface BoxEntry {
  readonly id: string;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
}
/** `currentPosition` and `priority` are ints (`null` when the property is not set). */
export interface ExtrasEntry {
  readonly id: string;
  readonly currentPosition: number | null;
  readonly priority: number | null;
}
/** The ELK dump of the recorder (`dumpBody`): the top node and every descendant in the recorder's traversal order. */
export interface ElkDump {
  readonly graph: BoxEntry;
  readonly nodes: readonly BoxEntry[];
  readonly ports: readonly BoxEntry[];
  readonly labels: readonly BoxEntry[];
  readonly extras: readonly ExtrasEntry[];
}
/** InternalProperties of a stop state, hex or `null` when not set. */
export interface PropsEntry {
  readonly additionalHeight: Hex | null;
  readonly drawingHeight: Hex | null;
  readonly drawingWidth: Hex | null;
  readonly minHeight: Hex | null;
  readonly minWidth: Hex | null;
  readonly targetWidth: Hex | null;
  readonly minRowIncrease: Hex | null;
  readonly maxRowIncrease: Hex | null;
  readonly minRowDecrease: Hex | null;
  readonly maxRowDecrease: Hex | null;
}
export type PaddingEntry = readonly [Hex, Hex, Hex, Hex];

/** `RectRow` of the object graph: indices refer to `RowsState.blocks` / `RowsState.stacks`. */
export interface RectRowEntry {
  readonly y: Hex;
  readonly width: Hex;
  readonly height: Hex;
  readonly spacing: Hex;
  readonly potentialAdditionalWidth: Hex;
  readonly blocks: readonly number[];
  readonly stacks: readonly number[];
}
export interface BlockStackEntry {
  readonly x: Hex;
  readonly y: Hex;
  readonly width: Hex;
  readonly height: Hex;
  readonly spacing: Hex;
  readonly blocks: readonly number[];
}
export interface BlockRowEntry {
  readonly x: Hex;
  readonly y: Hex;
  readonly width: Hex;
  readonly height: Hex;
  readonly spacing: Hex;
  readonly rects: readonly string[];
}
export interface BlockEntry {
  readonly x: Hex;
  readonly y: Hex;
  readonly width: Hex;
  readonly height: Hex;
  readonly minWidth: Hex;
  readonly minHeight: Hex;
  readonly smallestRectWidth: Hex;
  readonly smallestRectHeight: Hex;
  readonly averageHeight: Hex;
  readonly maxHeight: Hex;
  readonly spacing: Hex;
  readonly fixed: boolean;
  readonly positionFixed: boolean;
  readonly parentRow: number;
  readonly stack: number | null;
  readonly children: readonly string[];
  readonly rows: readonly BlockRowEntry[];
}
/** The `RectRow` object graph of `InternalProperties.ROWS`; `rows[0..listSize)` is the list, the rest are detached parent rows. */
export interface RowsState {
  readonly listSize: number;
  readonly rows: readonly RectRowEntry[];
  readonly blocks: readonly BlockEntry[];
  readonly stacks: readonly BlockStackEntry[];
}
/** The DrawingData of the Greedy stop. */
export interface DrawingEntry {
  readonly dar: Hex;
  readonly drawingWidth: Hex;
  readonly drawingHeight: Hex;
  readonly scaleMeasure: Hex;
  readonly area: Hex;
  readonly aspectRatio: Hex;
  readonly placementOption: string;
  readonly nextX: Hex;
  readonly nextY: Hex;
}
export interface StopState extends ElkDump {
  readonly props: PropsEntry;
  readonly padding: PaddingEntry | null;
  readonly rows: RowsState | null;
  readonly drawing?: DrawingEntry;
}
export interface Stop {
  readonly stop: string;
  readonly state: StopState;
}
export interface GraphRun {
  readonly graph: string;
  readonly processors: readonly string[];
  readonly stops: readonly Stop[];
}

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
  readonly expected: ElkDump & { readonly layoutNode: string; readonly mode: string };
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly expected: {
    readonly layoutNode: string;
    readonly mode: string;
    readonly graphs: readonly GraphRun[];
    readonly flags: Readonly<Record<string, number>>;
    readonly final: ElkDump;
  };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly expected: { readonly layoutNode: string; readonly mode: string; readonly throws: ThrowsExpected };
}
export interface SortRow {
  readonly id: string;
  readonly group: 'sort';
  readonly input: { readonly positions: readonly number[] };
  readonly expected:
    | { readonly order: readonly number[] }
    | { readonly throws: { readonly class: string; readonly message: string | null } };
}
export type RectPackingRow = FullRow | StopsRow | ThrowsRow | SortRow;

export const isFullRow = (row: RectPackingRow): row is FullRow => row.group === 'full';
export const isStopsRow = (row: RectPackingRow): row is StopsRow => row.group === 'stops';
export const isThrowsRow = (row: RectPackingRow): row is ThrowsRow => row.group === 'throws';
export const isSortRow = (row: RectPackingRow): row is SortRow => row.group === 'sort';

/** The path of the rectpacking ref. */
export const rectPackingRefPath = (): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'rectpacking.json');

export const rectPackingRefExists = (file: string = rectPackingRefPath()): boolean => existsSync(file);

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function checkRow(raw: unknown, index: number): RectPackingRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`rectpacking row ${String(index)} is malformed`);
  }
  if (!(RECTPACKING_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  const { expected } = raw;
  if (raw.group === 'sort') {
    if (!Array.isArray(raw.input.positions) || !(Array.isArray(expected.order) || isObject(expected.throws))) {
      reject(raw.id, 'a sort row needs input.positions and expected.order or expected.throws');
    }
  } else if (typeof expected.layoutNode !== 'string') {
    reject(raw.id, 'no expected.layoutNode');
  } else if (raw.group === 'stops' && (!Array.isArray(expected.graphs) || !isObject(expected.final))) {
    reject(raw.id, 'a stops row needs expected.graphs and expected.final');
  } else if (raw.group === 'throws' && !isObject(expected.throws)) {
    reject(raw.id, 'a throws row needs expected.throws');
  } else if (raw.group === 'full' && !isObject(expected.graph)) {
    reject(raw.id, 'a full row needs expected.graph');
  }
  return raw as unknown as RectPackingRow;
}

/** The first difference between the header's `rowCounts` and the rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly RectPackingRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of RECTPACKING_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids, the `rowCounts` header. */
export function parseRectPackingFile(file: string): RectPackingRow[] {
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

const cache = new Map<string, readonly RectPackingRow[]>();

/** The rows of the rectpacking ref in file order, optionally of one group; validated, cached per path. */
export function loadRectPackingRows(group?: 'full', file?: string): readonly FullRow[];
export function loadRectPackingRows(group: 'stops', file?: string): readonly StopsRow[];
export function loadRectPackingRows(group: 'throws', file?: string): readonly ThrowsRow[];
export function loadRectPackingRows(group: 'sort', file?: string): readonly SortRow[];
export function loadRectPackingRows(group?: RectPackingRowGroup, file?: string): readonly RectPackingRow[];
export function loadRectPackingRows(
  group?: RectPackingRowGroup,
  file: string = rectPackingRefPath(),
): readonly RectPackingRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseRectPackingFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** The stop of a graph run by name, or `undefined` when the run has none. */
export const stopNamed = (run: GraphRun, name: string): Stop | undefined => run.stops.find((s) => s.stop === name);

/** The stop of a graph run by name; a missing one is a malformed replay request. */
export function requireStop(run: GraphRun, name: string): Stop {
  const stop = stopNamed(run, name);
  if (stop === undefined) {
    throw new Error(`graph ${run.graph} has no ${name} stop`);
  }
  return stop;
}

/** Every (row, graph run, stop) triple of the stops rows whose stop name is one of `names`, in file order. */
export function collectStops(
  names: readonly string[],
  file?: string,
): { readonly row: StopsRow; readonly run: GraphRun; readonly stop: Stop }[] {
  const found: { row: StopsRow; run: GraphRun; stop: Stop }[] = [];
  for (const row of loadRectPackingRows('stops', file)) {
    for (const run of row.expected.graphs) {
      for (const stop of run.stops) {
        if (names.includes(stop.stop)) {
          found.push({ row, run, stop });
        }
      }
    }
  }
  return found;
}
