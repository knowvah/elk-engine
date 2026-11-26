// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/mrtree.json (mission 8a, T1; recorded by tools/vectors/MrTreeVectors.java, whose header is the contract):
// 188 rows in three groups: `full` (122: the engine's result), `stops` (54: the TGraph after every step of TreeLayoutProvider.layout) and
// `throws` (12). This module types and validates the file once, decodes hex doubles and lists rows by group and step; the TGraph dump,
// rebuild and comparison live in mrtree-replay-dump.ts.
//
// A STOP is { step, comp, graphs, elk? } (see the recorder header): importGraph, split, then the 15 per-component processors in the order
// of STEP_NAMES for every component, then pack and applyLayout. A TRANSITION (`transitionsOf`) pairs a stop with the graph state a step
// started from, which is what a replay needs: the "before" graphs (rebuilt as a TS TGraph) and the "after" graphs (compared).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { canonicalHex } from './double-hex.js';

/** 16 lowercase hex digits of `Double.doubleToLongBits` (NaN canonical, issue #72). */
export type Hex = string;
export type HexPair = readonly [Hex, Hex];

/** The three row groups of the file (`rowCounts` keys, header order). */
export const MRTREE_ROW_GROUPS = ['full', 'stops', 'throws'] as const;
export type MrTreeRowGroup = (typeof MRTREE_ROW_GROUPS)[number];

export const FULL_GROUP = 'full';
export const STOPS_GROUP = 'stops';
export const THROWS_GROUP = 'throws';

/** The stop names that are not processors (`comp` is -1 on them). */
export const STEP_IMPORT = 'ElkGraphImporter.importGraph';
export const STEP_SPLIT = 'ComponentsProcessor.split';
export const STEP_PACK = 'ComponentsProcessor.pack';
export const STEP_APPLY = 'ElkGraphImporter.applyLayout';
export const WHOLE_GRAPH_COMP = -1;

/** The 15 per-component steps in recorded order (the same list for every row: MrTree.updateModules, recorder header). */
export const PROCESSOR_STEPS = [
  'DFSTreeifyer',
  'RootProcessor',
  'FanProcessor',
  'LevelProcessor',
  'NodeOrderer',
  'NeighborsProcessor',
  'LevelHeightProcessor',
  'NodePlacer',
  'DirectionProcessor',
  'NodePositionProcessor',
  'CompactionProcessor',
  'LevelCoordinatesProcessor',
  'GraphBoundsProcessor',
  'Untreeifyer',
  'EdgeRouter',
] as const;
export type ProcessorStep = (typeof PROCESSOR_STEPS)[number];

/** A property value as the recorder encodes it (Integer, Boolean, String, Double as Hex, KVector as pair, refs, lists). */
export type PropValue = number | boolean | string | HexPair | readonly PropValue[];
/** The set properties of a graph, node or edge, keyed by Java field name. */
export type DumpProps = Readonly<Record<string, PropValue>>;

export interface StopNode {
  readonly ref: string;
  readonly id: number;
  /** `TNode.getLabel()`: "" for a node without label, `null` only for an unlabeled dummy. */
  readonly label: string | null;
  readonly x: Hex;
  readonly y: Hex;
  readonly w: Hex;
  readonly h: Hex;
  readonly parent: string | null;
  readonly children: readonly string[];
  readonly props: DumpProps;
}

export interface StopEdge {
  readonly ref: string;
  readonly source: string;
  readonly target: string;
  readonly bends: readonly HexPair[];
  readonly props: DumpProps;
}

export interface StopGraph {
  readonly props: DumpProps;
  readonly nodes: readonly StopNode[];
  readonly edges: readonly StopEdge[];
}

export interface ElkSection {
  readonly start: HexPair;
  readonly end: HexPair;
  readonly bends: readonly HexPair[];
}

/** The ELK graph after `applyLayout` (`graph`, nodes root first, edges of the root). */
export interface ElkResult {
  readonly graph: {
    readonly w: Hex;
    readonly h: Hex;
    readonly childAreaWidth: Hex | null;
    readonly childAreaHeight: Hex | null;
  };
  readonly nodes: readonly {
    readonly id: string;
    readonly x: Hex;
    readonly y: Hex;
    readonly w: Hex;
    readonly h: Hex;
  }[];
  readonly edges: readonly { readonly id: string; readonly sections: readonly ElkSection[] }[];
}

export interface Stop {
  readonly step: string;
  readonly comp: number;
  readonly graphs: readonly StopGraph[];
  readonly elk?: ElkResult;
}

export interface ThrownError {
  readonly class: string;
  readonly message: string | null;
  readonly frame: string | null;
}

export interface FullExpected {
  readonly graph: ElkResult['graph'];
  readonly nodes: readonly Record<string, unknown>[];
  readonly edges: readonly Record<string, unknown>[];
  readonly labels: readonly Record<string, unknown>[];
}

export interface StopsExpected {
  readonly stops: readonly Stop[];
  /** Present with `throws` when a step threw; the stop of the throwing step is not recorded. */
  readonly throwsAt?: string;
  readonly throws?: ThrownError;
}

interface RowBase {
  readonly id: string;
  /** The scenario graph as ELK JSON (re-imported by a replay with the ported importer). */
  readonly input: Readonly<Record<string, unknown>>;
}
export interface FullRow extends RowBase {
  readonly group: typeof FULL_GROUP;
  readonly expected: FullExpected;
}
export interface StopsRow extends RowBase {
  readonly group: typeof STOPS_GROUP;
  readonly expected: StopsExpected;
}
export interface ThrowsRow extends RowBase {
  readonly group: typeof THROWS_GROUP;
  readonly expected: { readonly throws: ThrownError };
}
export type MrTreeRow = FullRow | StopsRow | ThrowsRow;

export const isFullRow = (row: MrTreeRow): row is FullRow => row.group === FULL_GROUP;
export const isStopsRow = (row: MrTreeRow): row is StopsRow => row.group === STOPS_GROUP;
export const isThrowsRow = (row: MrTreeRow): row is ThrowsRow => row.group === THROWS_GROUP;

// ------------------------------------------------------------------------------------------------------------
// hex doubles

const HEX_PATTERN = /^[0-9a-f]{16}$/;
const BYTES = 8;

/** 16 hex digits of raw double bits to the double. */
export function decodeHex(hex: Hex): number {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`not a 16-digit lowercase hex double: ${JSON.stringify(hex)}`);
  }
  const view = new DataView(new ArrayBuffer(BYTES));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

/** A double to its 16 lowercase hex digits: raw bits, every NaN canonical (`Double.doubleToLongBits`, issue #72; the recorder rejects a NaN). */
export function encodeHex(value: number): Hex {
  return canonicalHex(value);
}

export const decodeHexPair = (pair: HexPair): [number, number] => [decodeHex(pair[0]), decodeHex(pair[1])];
export const encodeHexPair = (x: number, y: number): HexPair => [encodeHex(x), encodeHex(y)];

// ------------------------------------------------------------------------------------------------------------
// the loader

/** The path of the mrtree ref. */
export const mrTreeRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'mrtree.json');

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`mrtree row ${id}: ${what}`);
}

function checkGraph(id: string, graph: unknown): void {
  if (!isObject(graph) || !isObject(graph.props) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    reject(id, 'a graph dump needs props, nodes and edges');
  }
}

function checkStop(id: string, stop: unknown): void {
  if (!isObject(stop) || typeof stop.step !== 'string' || !Number.isInteger(stop.comp) || !Array.isArray(stop.graphs)) {
    reject(id, 'a stop needs step, comp and graphs');
  }
  for (const graph of stop.graphs) {
    checkGraph(id, graph);
  }
}

function checkStops(id: string, expected: Obj): void {
  if (!Array.isArray(expected.stops)) {
    reject(id, 'a stops row needs expected.stops');
  }
  for (const stop of expected.stops) {
    checkStop(id, stop);
  }
  const hasAt = 'throwsAt' in expected;
  if (hasAt !== 'throws' in expected || (hasAt && typeof expected.throwsAt !== 'string')) {
    reject(id, 'throwsAt and throws come together, throwsAt a string');
  }
}

function checkRow(raw: unknown, index: number): MrTreeRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`mrtree row ${String(index)} is malformed`);
  }
  if (!(MRTREE_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === STOPS_GROUP) {
    checkStops(raw.id, raw.expected);
  } else if (raw.group === THROWS_GROUP && !isObject(raw.expected.throws)) {
    reject(raw.id, 'a throws row needs expected.throws');
  } else if (raw.group === FULL_GROUP && !isObject(raw.expected.graph)) {
    reject(raw.id, 'a full row needs expected.graph');
  }
  return raw as unknown as MrTreeRow;
}

/** The first difference between the header's `rowCounts` and the loaded rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly MrTreeRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of MRTREE_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by id) and the `rowCounts` header. */
export function parseMrTreeFile(file: string): MrTreeRow[] {
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

const cache = new Map<string, readonly MrTreeRow[]>();

/** The rows of the ref in file order, optionally of one group; validated, cached per path. */
export function loadMrTreeRows(group?: MrTreeRowGroup, file: string = mrTreeRefPath()): readonly MrTreeRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseMrTreeFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

export const loadFullRows = (file?: string): readonly FullRow[] => loadMrTreeRows(FULL_GROUP, file).filter(isFullRow);
export const loadStopsRows = (file?: string): readonly StopsRow[] =>
  loadMrTreeRows(STOPS_GROUP, file).filter(isStopsRow);
export const loadThrowsRows = (file?: string): readonly ThrowsRow[] =>
  loadMrTreeRows(THROWS_GROUP, file).filter(isThrowsRow);

/** The second ref (same contract, recorded in mission 8a after T1), next to the first. */
export const mrTreeExtraRefPath = (): string => path.join(path.dirname(mrTreeRefPath()), 'mrtree-extra.json');

/** The family of a row: the second segment of its id (`stops/<family>/<name>`). */
export const familyOf = (row: MrTreeRow): string => row.id.split('/')[1] ?? '';

// ------------------------------------------------------------------------------------------------------------
// listing by step

/** The stops of one step in a row, in recorded order (one per component for a processor step). */
export const stopsOfStep = (row: StopsRow, step: string): readonly Stop[] =>
  row.expected.stops.filter((stop) => stop.step === step);

/** The stops rows that recorded a stop of the step (a row that threw earlier has none for the later steps). */
export const rowsWithStep = (step: string, rows: readonly StopsRow[] = loadStopsRows()): readonly StopsRow[] =>
  rows.filter((row) => stopsOfStep(row, step).length > 0);

/** A step with the graph state it started from. `before` is `null` for the import (nothing precedes it). */
export interface Transition {
  readonly step: string;
  readonly comp: number;
  /** The graphs the step started from: the previous stop of the same component, the split's, or every component's last for pack. */
  readonly before: readonly StopGraph[] | null;
  readonly stop: Stop;
}

function lastStopOfComponent(stops: readonly Stop[], upTo: number, comp: number): Stop | undefined {
  for (let i = upTo - 1; i >= 0; i--) {
    const stop = stops[i];
    if (stop !== undefined && stop.comp === comp && stop.step !== STEP_SPLIT) {
      return stop;
    }
  }
  return undefined;
}

function beforeOf(stops: readonly Stop[], index: number, stop: Stop): readonly StopGraph[] | null {
  const previous = stops[index - 1];
  if (previous === undefined) {
    return null;
  }
  if (stop.step === STEP_SPLIT || stop.step === STEP_APPLY) {
    return previous.graphs;
  }
  if (stop.step === STEP_PACK) {
    // every component's EdgeRouter stop, in component order (one component or several)
    return stops
      .slice(0, index)
      .filter((s) => s.step === PROCESSOR_STEPS[PROCESSOR_STEPS.length - 1])
      .flatMap((s) => s.graphs);
  }
  const own = lastStopOfComponent(stops, index, stop.comp);
  if (own !== undefined) {
    return own.graphs;
  }
  // the first processor of a component starts from that component's graph of the split stop
  const split = stops.find((s) => s.step === STEP_SPLIT);
  const graph = split?.graphs[stop.comp];
  return graph === undefined ? null : [graph];
}

/** Every recorded stop of a stops row with the state it started from (see {@link Transition}). */
export function transitionsOf(row: StopsRow): readonly Transition[] {
  const stops = row.expected.stops;
  return stops.map((stop, index) => ({ step: stop.step, comp: stop.comp, before: beforeOf(stops, index, stop), stop }));
}

/** The transitions of one step across the rows (the replay unit of one task: one step, every recorded component). */
export function transitionsOfStep(
  step: string,
  rows: readonly StopsRow[] = loadStopsRows(),
): readonly { readonly rowId: string; readonly transition: Transition }[] {
  return rows.flatMap((row) =>
    transitionsOf(row)
      .filter((t) => t.step === step)
      .map((transition) => ({ rowId: row.id, transition })),
  );
}
