// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/layered-routing.json and layered-routing-steps.json (mission 7e, R3, R12): the 7d
// placement row format, whose `expected.geometry` also carries `graph` (size and offset), `edges` (bend and junction
// points per edge) and, on SPLINES stops, `splines`. A `calls` row is slim: `steps` and `expected.result` only.
// `loadRows` of the 7b helpers closes the group list at models/scenarios/sites, so this loader checks the rows itself
// (the same structural rules as 7b/7c/7d, plus the 7e members) and accepts any number of ref files.
import { readFileSync } from 'node:fs';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import type { Hex, HexPair, HexQuad } from './layered-framework-replay.js';
import type { PhaseRow, PhaseStep } from './layered-phase-replay-rows.js';
import { ENUM_TYPES, type EnumClass } from './layered-site-replay-registry.js';
import type { PlacementExpected, PlacementGeometry, PlacementRow } from './layered-placement-replay-rows.js';

/**
 * Every routing row sets `org.eclipse.elk.edgeRouting` as `{t: 'enum', c: 'EdgeRouting'}`, and the landed 7a registry of
 * C4 enum types (`ENUM_TYPES`, layered-site-replay-registry.ts, untouched) does not know `EdgeRouting`. Registers it
 * there, once (idempotent); runs when this module is evaluated, so importing the loader suffices. The registry object
 * is typed read-only but is a plain mutable record.
 */
export function registerRoutingEnums(): void {
  (ENUM_TYPES as Record<string, EnumClass>).EdgeRouting ??= EdgeRouting as unknown as EnumClass;
}

registerRoutingEnums();

/**
 * The property the recorder leaves out of `expected.changed` and of the full `dump` (its `IGNORED_IDS`, beside
 * `processors`, `random` and `spacings`, which the landed `ignoredProperties()` covers): the route is recorded in
 * `geometry.splines` instead.
 */
export const IGNORED_ROUTE_START_ID: string = InternalProperties.SPLINE_ROUTE_START.getId();

/** The phase name of the edge routing phase, as a row's `runPhase` step or `prefix` entry spells it. */
export const P5_EDGE_ROUTING = 'P5_EDGE_ROUTING';

/** The step op that ends a `calls` row: `["call", "<Class>.<method>", <arg>…]`. */
export const CALL_OP = 'call';

/** The row groups of the two 7e ref files (`sites` is empty in this mission but stays in the format). */
export const ROUTING_ROW_GROUPS = ['models', 'scenarios', 'sites', 'calls'] as const;
export type RoutingRowGroup = (typeof ROUTING_ROW_GROUPS)[number];

/** The kinds of `expected.result` (R12). */
export const CALL_RESULT_TYPES = ['double', 'boolean', 'vector', 'rectangle', 'nubs'] as const;
export type CallResultType = (typeof CALL_RESULT_TYPES)[number];

/** A spline: control points, knot vector, dimension, outer box (top, right, bottom, left), optional label position. */
export interface NubsSummary {
  readonly controlPoints: readonly HexPair[];
  readonly knotVector: readonly Hex[];
  readonly dim: number;
  readonly outerBox: HexQuad;
  readonly firstLabelPosition?: HexPair;
}

/** The `expected.result` of a `calls` row, or what `summarise` makes of a call's return value. */
export type CallResult =
  | { readonly type: 'double'; readonly value: Hex }
  | { readonly type: 'boolean'; readonly value: boolean }
  | { readonly type: 'vector'; readonly value: HexPair }
  | { readonly type: 'rectangle'; readonly value: HexQuad }
  | { readonly type: 'nubs'; readonly value: NubsSummary }
  /** A call that returned nothing (`SplinesMath.intersect` of parallel lines): the recorder keeps the declared type. */
  | { readonly type: CallResultType; readonly value: null };

/** One `SplineSegment` of a route (R3): `box` is (x, y, width, height). */
export interface SegmentSummary {
  readonly box: HexQuad;
  readonly rank: number;
  readonly isStraight: boolean;
  readonly xDelta: Hex;
  readonly westOfInitialLayer: boolean;
  readonly centerControlPointY: Hex;
}

/** The bend points of an edge and, when the edge has the `JUNCTION_POINTS` property, its junction points. */
export interface EdgeRouteGeometry {
  readonly bendPoints: readonly HexPair[];
  readonly junctionPoints?: readonly HexPair[];
}

/** The spline of one start edge: the edge chain (paths) and the route (segments). */
export interface SplineGeometry {
  readonly chain: readonly string[];
  readonly route: readonly SegmentSummary[];
}

/** N3's placement `geometry` plus R3's `graph`, `edges` and `splines`. */
export interface RoutingGeometry extends PlacementGeometry {
  readonly graph: { readonly size: HexPair; readonly offset: HexPair };
  readonly edges: Readonly<Record<string, EdgeRouteGeometry>>;
  readonly splines?: Readonly<Record<string, SplineGeometry>>;
}

/** The placement `expected` with the routing geometry. */
export interface RoutingExpected extends PlacementExpected {
  readonly geometry: RoutingGeometry;
}

/** A `models`, `scenarios` or `sites` row: a `PhaseRow` (7b) whose `expected` carries the routing geometry. */
export interface RoutingRow extends PlacementRow {
  readonly expected: RoutingExpected;
}

/** The `expected` of a `calls` row: the result alone (the recorder writes no dump for a call). */
export interface CallExpected {
  readonly result: CallResult;
}

/** A `calls` row: `["importGraph", null]`, optional setup steps, then the final `["call", "<Class>.<method>", <arg>…]`. */
export interface CallRow extends Omit<PhaseRow, 'group' | 'expected' | 'steps' | 'prefix'> {
  readonly group: 'calls';
  readonly steps: readonly PhaseStep[];
  readonly prefix: null;
  readonly expected: CallExpected;
}

/** What `loadRoutingRows` returns: narrow with `isCallRow` / `isGeometryRow`. */
export type RoutingFileRow = RoutingRow | CallRow;

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const isPair = (value: unknown): boolean => Array.isArray(value) && value.length === 2;

function reject(id: string, what: string): never {
  throw new Error(`row ${id}: ${what}`);
}

function checkShape(row: Obj, index: number): string {
  if (typeof row.id !== 'string' || !isObject(row.input) || !isObject(row.expected)) {
    throw new Error(`layered-routing row ${String(index)} is malformed`);
  }
  if (!(ROUTING_ROW_GROUPS as readonly unknown[]).includes(row.group)) {
    reject(row.id, `unknown group ${JSON.stringify(row.group)}`);
  }
  if ((row.steps === null) === (row.prefix === null)) {
    reject(row.id, 'exactly one of steps and prefix must be set');
  }
  return row.id;
}

function checkPlacement(id: string, expected: Obj): Obj {
  const { ports, geometry } = expected;
  const portsOk =
    isObject(ports) && Object.values(ports).every((l) => Array.isArray(l) && l.every((p) => typeof p === 'string'));
  if (!portsOk) {
    reject(id, 'expected.ports is missing or is not a map of path lists');
  }
  if (!isObject(geometry) || !isObject(geometry.nodes) || !Array.isArray(geometry.layers)) {
    reject(id, 'expected.geometry is missing or has no nodes map and layers list');
  }
  return geometry;
}

function checkRoutingGeometry(id: string, geometry: Obj): void {
  const graph = geometry.graph;
  const missing = [
    isObject(graph) && isPair(graph.size) && isPair(graph.offset) ? null : 'graph',
    isObject(geometry.edges) ? null : 'edges',
  ].filter((name) => name !== null);
  if (missing.length > 0) {
    reject(
      id,
      `expected.geometry.graph and expected.geometry.edges are required (missing or malformed: ${missing.join(', ')})`,
    );
  }
  if (geometry.splines !== undefined && !isObject(geometry.splines)) {
    reject(id, 'expected.geometry.splines is not a map of start edge paths');
  }
}

function checkCall(id: string, row: Obj): void {
  if (!Array.isArray(row.steps)) {
    reject(id, 'a calls row needs steps');
  }
  const result = (row.expected as Obj).result;
  if (!isObject(result) || !(CALL_RESULT_TYPES as readonly unknown[]).includes(result.type) || !('value' in result)) {
    reject(id, `expected.result of a calls row must be { type: ${CALL_RESULT_TYPES.join(' | ')}, value }`);
  }
}

function checkRow(raw: unknown, index: number): RoutingFileRow {
  if (!isObject(raw)) {
    throw new Error(`layered-routing row ${String(index)} is malformed`);
  }
  const id = checkShape(raw, index);
  if (raw.group === 'calls') {
    checkCall(id, raw);
  } else {
    checkRoutingGeometry(id, checkPlacement(id, raw.expected as Obj));
  }
  return raw as unknown as RoutingFileRow;
}

function rowsOf(file: string): RoutingFileRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  return parsed.rows.map((row, i) => checkRow(row, i));
}

/**
 * The rows of one or more routing ref files, concatenated in the order given. A row of the other groups without
 * `expected.geometry.graph` and `expected.geometry.edges` (every 7d row) is rejected by name; a `calls` row needs only
 * `steps` and `expected.result`.
 */
export function loadRoutingRows(...files: readonly string[]): RoutingFileRow[] {
  return files.flatMap((file) => rowsOf(file));
}

export const isCallRow = (row: RoutingFileRow): row is CallRow => row.group === 'calls';
export const isGeometryRow = (row: RoutingFileRow): row is RoutingRow => row.group !== 'calls';

/**
 * The row as the 7b replay helpers (`importRow`, `runSteps`) type it. A `calls` row is not a full `PhaseRow`: those
 * helpers read `input`, `target`, `options` and `steps` only, so it passes through them unchanged.
 */
export function phaseRowOf(row: RoutingFileRow): PhaseRow {
  return row as unknown as PhaseRow;
}
