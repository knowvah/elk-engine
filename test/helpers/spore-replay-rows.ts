// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/spore-layout.json (mission 8c, T7; recorded by tools/vectors/SporeLayoutVectors.java, whose header is the
// contract of this file): { id, group, input, expected } in the groups
//   full    expected = { algorithm, jitterNodes, tieOrder, graph, nodes, ports, labels, edges } (the ELK dump after the engine run);
//   stops   expected = { algorithm, jitterNodes, tieOrder, stops }, the stops of STOP_NAMES in the recorder's order;
//   throws  expected = { algorithm, jitterNodes, throws: { class, message, frame } };
//   minst   expected = one NaiveMinST call (edge sequence, weights, tree, reversed tree, order sensitivity, hash classification);
//   jitter  expected = { algorithm, invariants } (PK4: the seeded jitter of coincident centres, invariants only);
//   shift   expected = the stops shape, jitterNodes > 0 (issue #106: the jitter scenarios exact, from the shifted centres to the end);
//   objects input = { call, objects, args }, expected = { result } (T13b: Objects.equals, KVector/TEdge.equals, TTriangle.contains).
// Doubles are 16-hex raw bit strings (`Hex`); `decodeHex` / `encodeHex` / `isHex` are those of the vertiflex helper (one codec). A tree
// is nested `[i, child, child, ...]` in Tree.children order. The file is parsed and validated ONCE per path (`loadSporeRows`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, isHex, type Hex, type HexPoint, type HexQuad } from './vertiflex-replay-rows.js';

export { decodeHex, encodeHex, isHex };
export type { Hex, HexPoint, HexQuad };

/** The stop names, in the order the recorder can emit them (`SporeLayoutVectors.STOP_NAMES`). */
export const STEP_UNDERLYING = 'underlying';
export const STEP_IMPORT = 'import';
export const STEP_SCANLINE = 'scanline';
export const STEP_TRIANGULATION = 'triangulation';
export const STEP_TREE = 'tree';
export const STEP_GROW = 'grow';
export const STEP_UPDATE = 'update';
export const STEP_COMPACTION = 'compaction';
export const STEP_END = 'end';
export const STOP_NAMES = [
  STEP_UNDERLYING,
  STEP_IMPORT,
  STEP_SCANLINE,
  STEP_TRIANGULATION,
  STEP_TREE,
  STEP_GROW,
  STEP_UPDATE,
  STEP_COMPACTION,
  STEP_END,
] as const;
export type SporeStep = (typeof STOP_NAMES)[number];

export const SPORE_ROW_GROUPS = ['full', 'stops', 'throws', 'minst', 'jitter', 'shift', 'objects'] as const;
export type SporeRowGroup = (typeof SPORE_ROW_GROUPS)[number];

/** The two algorithms of the bundle (`SporeOverlapRemovalOptions.ALGORITHM_ID`, `SporeCompactionOptions.ALGORITHM_ID`). */
export const OVERLAP_ALGORITHM = 'org.eclipse.elk.sporeOverlap';
export const COMPACTION_ALGORITHM = 'org.eclipse.elk.sporeCompaction';

/** A tree of vertex indices: `[i, child, child, ...]`. */
export type IndexTree = readonly [number, ...IndexTree[]];

/** `[i, j]`: two indices of `Graph.vertices`. */
export type IndexPair = readonly [number, number];

/** The hash classification of a `TEdge` set (`HashInfo`). */
export interface HashInfo {
  readonly capacity: number;
  readonly maxBin: number;
  readonly maxEqualHash: number;
  readonly treeified: boolean;
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
}
/** The ELK dump of the recorder (`dumpBody`): the top node and every descendant in the recorder's traversal order. */
export interface ElkDump {
  readonly graph: BoxEntry;
  readonly nodes: readonly BoxEntry[];
  readonly ports: readonly BoxEntry[];
  readonly labels: readonly BoxEntry[];
  readonly edges: readonly EdgeEntry[];
}

export interface UnderlyingStop extends Partial<ElkDump> {
  readonly step: typeof STEP_UNDERLYING;
  readonly requested: string | null;
  readonly applied: boolean;
}
export interface ImportNodeEntry {
  readonly id: string;
  /** `Node.originalVertex`. */
  readonly v: HexPoint;
  /** `Node.rect`: x, y, width, height. */
  readonly r: HexQuad;
  /** The child's margins: top, right, bottom, left. */
  readonly m: HexQuad;
}
export interface ImportStop {
  readonly step: typeof STEP_IMPORT;
  readonly rootSelection: string;
  readonly preferredRoot: string | null;
  readonly costFunction: string;
  readonly treeConstruction: string;
  readonly compactionStrategy: string;
  readonly orthogonal: boolean;
  readonly spacingNodeNode: Hex;
  readonly maxIterations: number | null;
  readonly runScanline: boolean | null;
  readonly jitterNodes: number;
  readonly root: number | null;
  readonly nodes: readonly ImportNodeEntry[];
}
export interface ScanlineStop {
  readonly step: typeof STEP_SCANLINE;
  readonly iteration: number;
  readonly pairs: readonly IndexPair[];
  readonly edges: readonly IndexPair[];
  readonly capacity: number;
}
export interface TriangulationStop {
  readonly step: typeof STEP_TRIANGULATION;
  readonly iteration: number;
  readonly scanline: boolean;
  readonly delaunay: readonly IndexPair[];
  readonly edges: readonly IndexPair[];
  readonly hash: HashInfo;
}
export interface TreeStop {
  readonly step: typeof STEP_TREE;
  readonly iteration: number;
  readonly strategy: string;
  readonly root: number;
  readonly weights: readonly Hex[];
  readonly tree: IndexTree;
}
/** `[vertex.x, vertex.y, rect.x, rect.y]` of one node. */
export type NodeState = HexQuad;
export interface GrowStop {
  readonly step: typeof STEP_GROW;
  readonly iteration: number;
  readonly overlapsExisted: boolean;
  readonly nodes: readonly NodeState[];
}
export interface UpdateStop {
  readonly step: typeof STEP_UPDATE;
  readonly iteration: number;
  readonly vertices: readonly HexPoint[];
  readonly mapSize: number;
}
export interface CompactionStop {
  readonly step: typeof STEP_COMPACTION;
  readonly ran: boolean;
  readonly nodes: readonly NodeState[];
}
export interface EndStop extends ElkDump {
  readonly step: typeof STEP_END;
  readonly iterations: number | null;
}
export type Stop =
  | UnderlyingStop
  | ImportStop
  | ScanlineStop
  | TriangulationStop
  | TreeStop
  | GrowStop
  | UpdateStop
  | CompactionStop
  | EndStop;

/** The summary of the `NaiveMinST` calls of a run. */
export interface TieOrder {
  readonly calls: number;
  readonly orderSensitive: boolean;
  readonly treeified: boolean;
}

export interface ThrowsExpected {
  readonly class: string;
  readonly message: string | null;
  readonly frame: string;
}

/** One `NaiveMinST` call (`SporeLayoutVectors.minst`). */
export interface MinstExpected {
  readonly algorithm: string;
  readonly jitterNodes: number;
  readonly iteration: number;
  readonly scanline: boolean;
  readonly strategy: string;
  readonly rootIndex: number;
  readonly root: HexPoint;
  readonly vertices: readonly HexPoint[];
  readonly pairs: readonly IndexPair[];
  /** `TEdge` u and v as hex points, `Graph.tEdges` in iteration order. */
  readonly edges: readonly (readonly [HexPoint, HexPoint])[];
  readonly weights: readonly Hex[];
  readonly tree: IndexTree;
  readonly reversedTree: IndexTree;
  readonly orderSensitive: boolean;
  readonly treeified: boolean;
  readonly hash: HashInfo;
}

export interface JitterInvariants {
  readonly nodeCount: number;
  readonly jitterNodes: number;
  readonly overlapFree: boolean | null;
  readonly maxDisplacementBound: Hex;
  readonly runs: number;
  readonly runsAgree: boolean;
}

interface RowBase {
  readonly id: string;
  /** The prepared graph as ELK JSON (the root of the graph; it names `elk.algorithm`). */
  readonly input: Readonly<Record<string, unknown>>;
}
/** One operand of an `objects` row: doubles are 16-hex bit strings (`Double.doubleToLongBits`); `u`, `v`, `a`, `b`, `c` name other operands. */
export type ObjectSpec =
  | { readonly type: 'KVector'; readonly x: Hex; readonly y: Hex }
  | { readonly type: 'Double'; readonly bits: Hex }
  | { readonly type: 'TEdge'; readonly u: string; readonly v: string }
  | { readonly type: 'TTriangle'; readonly a: string; readonly b: string; readonly c: string };
export interface ObjectsRow {
  readonly id: string;
  readonly group: 'objects';
  readonly input: {
    readonly call: 'Objects.equals' | 'equals' | 'TTriangle.contains';
    readonly objects: Readonly<Record<string, ObjectSpec>>;
    readonly args: readonly [string | null, string | null];
  };
  readonly expected: { readonly result: boolean };
}
export interface FullRow extends RowBase {
  readonly group: 'full';
  readonly expected: ElkDump & {
    readonly algorithm: string;
    readonly jitterNodes: number;
    readonly tieOrder: TieOrder;
  };
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly expected: {
    readonly algorithm: string;
    readonly jitterNodes: number;
    readonly tieOrder: TieOrder;
    readonly stops: readonly Stop[];
  };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly expected: { readonly algorithm: string; readonly jitterNodes: number; readonly throws: ThrowsExpected };
}
export interface MinstRow extends RowBase {
  readonly group: 'minst';
  readonly expected: MinstExpected;
}
export interface JitterRow extends RowBase {
  readonly group: 'jitter';
  readonly expected: { readonly algorithm: string; readonly invariants: JitterInvariants };
}
/** A jitter scenario recorded exact (issue #106): the stops of a `StopsRow`, with `jitterNodes` > 0 in the row and its `import` stop. */
export interface ShiftRow extends RowBase {
  readonly group: 'shift';
  readonly expected: StopsRow['expected'];
}
export type SporeRow = FullRow | StopsRow | ThrowsRow | MinstRow | JitterRow | ShiftRow | ObjectsRow;

export const isStopsRow = (row: SporeRow): row is StopsRow => row.group === 'stops';

/** The path of the spore ref. */
export const sporeRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'spore-layout.json');

export const sporeRefExists = (file: string = sporeRefPath()): boolean => existsSync(file);

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function checkStops(id: string, expected: Obj): void {
  const { stops } = expected;
  const known = STOP_NAMES as readonly unknown[];
  const wellFormed =
    Array.isArray(stops) && stops.every((stop) => isObject(stop) && known.includes(stop.step)) && stops.length > 0;
  if (!wellFormed) {
    reject(id, `a stops or shift row needs expected.stops of steps in ${STOP_NAMES.join(', ')}`);
  }
}

function checkRow(raw: unknown, index: number): SporeRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`spore row ${String(index)} is malformed`);
  }
  if (!(SPORE_ROW_GROUPS as readonly unknown[]).includes(raw.group)) {
    reject(raw.id, `unknown group ${JSON.stringify(raw.group)}`);
  }
  if (raw.group === 'stops' || raw.group === 'shift') {
    checkStops(raw.id, raw.expected);
  } else if (raw.group === 'throws' && !isObject(raw.expected.throws)) {
    reject(raw.id, 'a throws row needs expected.throws');
  } else if (raw.group === 'full' && !isObject(raw.expected.graph)) {
    reject(raw.id, 'a full row needs expected.graph');
  } else if (raw.group === 'minst' && !Array.isArray(raw.expected.edges)) {
    reject(raw.id, 'a minst row needs expected.edges');
  } else if (raw.group === 'jitter' && !isObject(raw.expected.invariants)) {
    reject(raw.id, 'a jitter row needs expected.invariants');
  } else if (raw.group === 'objects' && (typeof raw.expected.result !== 'boolean' || !isObject(raw.input.objects))) {
    reject(raw.id, 'an objects row needs input.objects and a boolean expected.result');
  }
  return raw as unknown as SporeRow;
}

/** The first difference between the header's `rowCounts` and the rows, or `null` when equal. */
export function rowCountsDifference(header: unknown, rows: readonly SporeRow[]): string | null {
  const declared = (header ?? {}) as Partial<Record<string, unknown>>;
  for (const group of SPORE_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      return `rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`;
    }
  }
  return null;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids, the `rowCounts` header. */
export function parseSporeFile(file: string): SporeRow[] {
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

const cache = new Map<string, readonly SporeRow[]>();

/** The rows of the spore ref in file order, optionally of one group; validated, cached per path. */
export function loadSporeRows(group: 'full', file?: string): readonly FullRow[];
export function loadSporeRows(group: 'stops', file?: string): readonly StopsRow[];
export function loadSporeRows(group: 'throws', file?: string): readonly ThrowsRow[];
export function loadSporeRows(group: 'minst', file?: string): readonly MinstRow[];
export function loadSporeRows(group: 'jitter', file?: string): readonly JitterRow[];
export function loadSporeRows(group: 'shift', file?: string): readonly ShiftRow[];
export function loadSporeRows(group: 'objects', file?: string): readonly ObjectsRow[];
export function loadSporeRows(group?: SporeRowGroup, file?: string): readonly SporeRow[];
export function loadSporeRows(group?: SporeRowGroup, file: string = sporeRefPath()): readonly SporeRow[] {
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseSporeFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** The stop of a stops row for one step, or `undefined` (the first of that step; `stopsOf` lists them all). */
export function stopOf<S extends SporeStep>(row: StopsRow | ShiftRow, step: S): Extract<Stop, { step: S }> | undefined {
  return row.expected.stops.find((stop) => stop.step === step) as Extract<Stop, { step: S }> | undefined;
}

/** Every stop of one step in recorder order (the per-iteration steps occur once per iteration). */
export function stopsOf<S extends SporeStep>(row: StopsRow, step: S): readonly Extract<Stop, { step: S }>[] {
  return row.expected.stops.filter((stop) => stop.step === step) as Extract<Stop, { step: S }>[];
}

/** The stops of the given steps, in recorder order (a test file compares the steps its classes own). */
export function onlySteps(stops: readonly Stop[], steps: readonly SporeStep[]): readonly Stop[] {
  return stops.filter((stop) => steps.includes(stop.step));
}
