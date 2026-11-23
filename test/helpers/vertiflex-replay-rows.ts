// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/vertiflex.json (mission 8a, T3; recorded by tools/vectors/VertiFlexVectors.java, whose header is the
// contract of this file): { id, group, input, expected } in the groups
//   full    expected = a DUMP { graph, nodes, ports, labels, edges }, every entry;
//   stops   expected = { steps, stops }, stops[i].step = steps[i], DELTA-ENCODED: the Import stop lists every entry, a later stop only the
//           entries (by id) whose serialised form changed; `graph` is one entry or null;
//   throws  expected = { throws: { class, message, frame } }.
// A "state" is the accumulated full dump after a stop (`accumulate`): the same shape as a `full` expected plus `props`, in the
// recorder's traversal order. Doubles are 16-hex-digit raw bit strings (`encodeHex`, `decodeHex`).
// The file is validated once per path (`loadVertiFlexRows`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { doubleToRawLongBits, longBitsToDouble } from '../../src/java/lang/JavaDouble.js';
import { repoRoot } from '../corpus/corpus.js';

/** The steps of a stops row in execution order; the router step is `StraightEdgeRouter` or `BendEdgeRouter` per row. */
export const STEP_IMPORT = 'Import';
export const STEP_MICRO = 'NodeMicroLayout';
export const STEP_PREAMBLE = 'Preamble';
export const STEP_Y_PLACER = 'NodeYPlacer';
export const STEP_RELATIVE_X_PLACER = 'RelativeXPlacer';
export const STEP_ABSOLUTE_X_PLACER = 'AbsoluteXPlacer';
export const STEP_SET_GRAPH_SIZE = 'SetGraphSize';
export const ROUTER_STEPS = ['StraightEdgeRouter', 'BendEdgeRouter'] as const;

export const VERTIFLEX_ROW_GROUPS = ['full', 'stops', 'throws'] as const;
export type VertiFlexRowGroup = (typeof VERTIFLEX_ROW_GROUPS)[number];

/** 16 lowercase hex digits of raw double bits (`JavaVectors.hex`). */
export type Hex = string;
export type HexQuad = readonly [Hex, Hex, Hex, Hex];
export type HexPoint = readonly [Hex, Hex];

const HEX_RADIX = 16;
const HEX_DIGITS = 16;
const BITS = 64;

/** 16 hex digits of raw double bits to a double. */
export function decodeHex(hex: Hex): number {
  return longBitsToDouble(BigInt.asIntN(BITS, BigInt(`0x${hex}`)));
}

/** A double to its 16 lowercase hex digits of raw bits. */
export function encodeHex(value: number): Hex {
  return BigInt.asUintN(BITS, doubleToRawLongBits(value)).toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
}

/** Whether a string has the form of an encoded double. */
export const isHex = (value: unknown): value is Hex => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);

export interface GraphEntry {
  readonly id: string;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
  readonly padding: HexQuad;
}
export interface NodeEntry extends GraphEntry {
  readonly margins: HexQuad;
}
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
}

/** The V/InternalProperties names a dump lists, in the recorder's order (`Snap.prop`). */
export const PROP_NAMES = [
  'LEFT_OUTLINE',
  'RIGHT_OUTLINE',
  'OUTLINE_MAX_DEPTH',
  'MIN_X',
  'MAX_X',
  'MIN_Y',
  'MAX_Y',
  'ROOT_NODE',
  'EDGE_BEND_HEIGHT',
  'NODE_MODEL_ORDER',
] as const;
export type PropName = (typeof PROP_NAMES)[number];
/** An outline (list of points), a hex double, the root's id (`ROOT_NODE`) or an integer (`NODE_MODEL_ORDER`). */
export type PropValue = readonly HexPoint[] | Hex | string | number;
export interface PropsEntry {
  readonly id: string;
  readonly props: Readonly<Partial<Record<PropName, PropValue>>>;
}

/** A full dump: every entry, in traversal order. `props` is absent from a `full` row's expected value. */
export interface Dump {
  readonly graph: GraphEntry;
  readonly nodes: readonly NodeEntry[];
  readonly ports: readonly BoxEntry[];
  readonly labels: readonly BoxEntry[];
  readonly edges: readonly EdgeEntry[];
  readonly props: readonly PropsEntry[];
}

/** One stop of a stops row: the entries that changed since the previous stop. */
export interface Stop {
  readonly step: string;
  readonly graph: GraphEntry | null;
  readonly nodes: readonly NodeEntry[];
  readonly ports: readonly BoxEntry[];
  readonly labels: readonly BoxEntry[];
  readonly edges: readonly EdgeEntry[];
  readonly props: readonly PropsEntry[];
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
  readonly expected: Omit<Dump, 'props'>;
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly expected: { readonly steps: readonly string[]; readonly stops: readonly Stop[] };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly expected: { readonly throws: ThrowsExpected };
}
export type VertiFlexRow = FullRow | StopsRow | ThrowsRow;

export const isFullRow = (row: VertiFlexRow): row is FullRow => row.group === 'full';
export const isStopsRow = (row: VertiFlexRow): row is StopsRow => row.group === 'stops';
export const isThrowsRow = (row: VertiFlexRow): row is ThrowsRow => row.group === 'throws';

/** The path of the vertiflex ref. */
export const vertiflexRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'vertiflex.json');

/** The path of the second vertiflex ref (tree-recorder-gaps #66): same contract, written after vertiflex.json. */
export const vertiflexExtraRefPath = (): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'vertiflex-extra.json');

export const vertiflexRefExists = (file: string = vertiflexRefPath()): boolean => existsSync(file);

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
    stops.every((stop, i) => isObject(stop) && stop.step === steps[i]);
  if (!wellFormed || (steps as unknown[])[0] !== STEP_IMPORT) {
    reject(
      id,
      'a stops row needs expected.steps and expected.stops of equal length, stops[i].step = steps[i], Import first',
    );
  }
}

function checkRow(raw: unknown, index: number): VertiFlexRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`vertiflex row ${String(index)} is malformed`);
  }
  if (!(VERTIFLEX_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === 'stops') {
    checkStops(raw.id, raw.expected);
  } else if (raw.group === 'throws' && !isObject(raw.expected.throws)) {
    reject(raw.id, 'a throws row needs expected.throws');
  } else if (raw.group === 'full' && !isObject(raw.expected.graph)) {
    reject(raw.id, 'a full row needs expected.graph');
  }
  return raw as unknown as VertiFlexRow;
}

/** The first difference between the header's `rowCounts` and the rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly VertiFlexRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of VERTIFLEX_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids, the `rowCounts` header. */
export function parseVertiFlexFile(file: string): VertiFlexRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  const rows = parsed.rows.map((row, i) => checkRow(row, i));
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) {
    throw new Error(`${path.basename(file)}: duplicate row ids`);
  }
  const difference = rowCountsDifference(parsed.rowCounts, rows);
  if (difference !== null) {
    throw new Error(`${path.basename(file)}: ${difference}`);
  }
  return rows;
}

const cache = new Map<string, readonly VertiFlexRow[]>();

/** The rows of the vertiflex ref in file order, optionally of one group; validated, cached per path. */
export function loadVertiFlexRows(group?: 'full', file?: string): readonly FullRow[];
export function loadVertiFlexRows(group: 'stops', file?: string): readonly StopsRow[];
export function loadVertiFlexRows(group: 'throws', file?: string): readonly ThrowsRow[];
export function loadVertiFlexRows(group?: VertiFlexRowGroup, file?: string): readonly VertiFlexRow[];
export function loadVertiFlexRows(
  group?: VertiFlexRowGroup,
  file: string = vertiflexRefPath(),
): readonly VertiFlexRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseVertiFlexFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

// ------------------------------------------------------------------------------------------------------------
// accumulating the deltas

/** The index of a step in a stops row. */
export function stepIndex(row: StopsRow, step: string): number {
  const index = row.expected.steps.indexOf(step);
  if (index < 0) {
    reject(row.id, `has no step ${step} (steps: ${row.expected.steps.join(', ')})`);
  }
  return index;
}

/** The step before `step` in the row. */
export function previousStep(row: StopsRow, step: string): string {
  const index = stepIndex(row, step);
  if (index === 0) {
    reject(row.id, `step ${step} has no predecessor`);
  }
  return row.expected.steps[index - 1]!;
}

function mergeById<T extends { readonly id: string }>(state: Map<string, T>, entries: readonly T[]): void {
  for (const entry of entries) {
    state.set(entry.id, entry);
  }
}

/**
 * The accumulated state after stop `index`: each stop's entries replace the same id's entry of the previous state (a Map keeps the
 * Import stop's order). Props are listed in traversal order: the graph first, then the nodes in node order.
 */
export function accumulate(row: StopsRow, index: number): Dump {
  const { stops } = row.expected;
  const first = stops[0]!;
  if (first.graph === null) {
    reject(row.id, 'the Import stop has no graph entry');
  }
  let graph = first.graph;
  const nodes = new Map<string, NodeEntry>();
  const ports = new Map<string, BoxEntry>();
  const labels = new Map<string, BoxEntry>();
  const edges = new Map<string, EdgeEntry>();
  const props = new Map<string, PropsEntry>();
  for (const stop of stops.slice(0, index + 1)) {
    graph = stop.graph ?? graph;
    mergeById(nodes, stop.nodes);
    mergeById(ports, stop.ports);
    mergeById(labels, stop.labels);
    mergeById(edges, stop.edges);
    mergeById(props, stop.props);
  }
  const order = [graph.id, ...nodes.keys()];
  const orderedProps = order.flatMap((id) => (props.has(id) ? [props.get(id)!] : []));
  return {
    graph,
    nodes: [...nodes.values()],
    ports: [...ports.values()],
    labels: [...labels.values()],
    edges: [...edges.values()],
    props: orderedProps,
  };
}

/** The accumulated state after the named step. */
export const stateAfter = (row: StopsRow, step: string): Dump => accumulate(row, stepIndex(row, step));
