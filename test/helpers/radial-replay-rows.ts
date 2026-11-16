// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/radial.json (mission 8a, T2; recorded by tools/vectors/RadialVectors.java, whose header is the
// contract of this file): { id, group, input, expected } in the groups
//   full    expected = a DUMP with all seven sections (nodes, edges, props, ports, labels, margins, padding);
//   stops   expected = { stops: [ stop... ] }, the state after each step of RadialLayoutProvider.layout;
//   throws  expected = { throws: { class, message, frame, step }, stops: [ stop... ] }, the stops completed before the throw.
// A stop is { step, nodes, edges, props } and, in the FIRST stop of a row only, { ports, labels, margins, padding } too (the
// recorder asserts them identical in every later stop and in the engine result). Doubles are 16-hex-digit raw bit strings.
// This module validates the file once per path, exposes typed rows and the step pairs a replay needs (T10, T13).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';

/** The steps of the recorder in their execution order (a step that does not run for a row has no stop). */
export const RADIAL_STEPS = [
  'NodeMicroLayout',
  'RootAndRadius',
  'EadesRadial',
  'RadiusExtensionOverlapRemoval',
  'GeneralCompactor',
  'GeneralRotator',
  'CalculateGraphSize',
  'StraightLineEdgeRouter',
  'EdgeAngleCalculator',
] as const;
export type RadialStep = (typeof RADIAL_STEPS)[number];

export const RADIAL_ROW_GROUPS = ['full', 'stops', 'throws'] as const;
export type RadialRowGroup = (typeof RADIAL_ROW_GROUPS)[number];

/** The sections only the first stop of a row (and a `full` dump) carries: nothing after the micro layout changes them. */
export const FIXED_SECTIONS = ['ports', 'labels', 'margins', 'padding'] as const;
export type FixedSection = (typeof FIXED_SECTIONS)[number];

/** A 16-hex-digit lowercase string: `Long.toHexString(Double.doubleToRawLongBits(d))` zero-padded. */
export type Hex = string;
export type HexQuad = readonly [Hex, Hex, Hex, Hex];
/** `[id, x, y, width, height]`: a node, port or label. */
export type HexShape = readonly [string | null, Hex, Hex, Hex, Hex];
/** `[startX, startY, endX, endY, [[bendX, bendY]...]]`. */
export type HexSection = readonly [Hex, Hex, Hex, Hex, readonly (readonly [Hex, Hex])[]];
/** `[edgeId, [section...]]`: only edges with at least one section are listed. */
export type HexEdge = readonly [string | null, readonly HexSection[]];

/** The property names the recorder dumps, in its per-element order. */
export const PROP_NAMES = [
  'root',
  'radius',
  'orderId',
  'targetAngle',
  'childAreaWidth',
  'childAreaHeight',
  'position',
] as const;
export type PropName = (typeof PROP_NAMES)[number];
/** root: node id; orderId: number; position: `[x, y]` hex; the others: hex. */
export type PropValue = string | number | readonly [Hex, Hex];
/** `[elementId, name, value]`. */
export type HexProp = readonly [string | null, PropName, PropValue];

export interface RadialDump {
  readonly nodes: readonly HexShape[];
  readonly edges: readonly HexEdge[];
  readonly props: readonly HexProp[];
  readonly ports?: readonly HexShape[];
  readonly labels?: readonly HexShape[];
  readonly margins?: readonly HexQuad[];
  readonly padding?: readonly HexQuad[];
}

/** One recorded stop: a dump after `step` (the fixed sections only in the first stop of a row). */
export interface RadialStop extends RadialDump {
  readonly step: string;
}

export interface RadialThrown {
  readonly class: string;
  readonly message: string;
  /** The first org.eclipse.elk frame as `File.java:line`. */
  readonly frame: string;
  readonly step: string;
}

/** An ELK JSON graph (the prepared input of a row). */
export type RadialInput = Readonly<Record<string, unknown>>;

export interface RadialFullRow {
  readonly id: string;
  readonly group: 'full';
  readonly input: RadialInput;
  readonly expected: Required<RadialDump>;
}
export interface RadialStopsRow {
  readonly id: string;
  readonly group: 'stops';
  readonly input: RadialInput;
  readonly expected: { readonly stops: readonly RadialStop[] };
}
export interface RadialThrowsRow {
  readonly id: string;
  readonly group: 'throws';
  readonly input: RadialInput;
  readonly expected: { readonly throws: RadialThrown; readonly stops: readonly RadialStop[] };
}
export type RadialRow = RadialFullRow | RadialStopsRow | RadialThrowsRow;

export const isFullRow = (row: RadialRow): row is RadialFullRow => row.group === 'full';
export const isStopsRow = (row: RadialRow): row is RadialStopsRow => row.group === 'stops';
export const isThrowsRow = (row: RadialRow): row is RadialThrowsRow => row.group === 'throws';

// ------------------------------------------------------------------------------------------------------------
// the loader

export const radialRefPath = (): string => path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'radial.json');

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => value !== null && typeof value === 'object' && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`radial row ${id}: ${what}`);
}

const HEX_PATTERN = /^[0-9a-f]{16}$/;
const isHex = (v: unknown): boolean => typeof v === 'string' && HEX_PATTERN.test(v);
const isList = (v: unknown, length?: number): v is unknown[] =>
  Array.isArray(v) && (length === undefined || v.length === length);

function checkShapes(id: string, name: string, list: unknown): void {
  const ok =
    isList(list) &&
    list.every((s) => isList(s, 5) && (s[0] === null || typeof s[0] === 'string') && s.slice(1).every(isHex));
  if (!ok) {
    reject(id, `${name} must be a list of [id, x, y, width, height] with hex doubles`);
  }
}

function checkQuads(id: string, name: string, list: unknown): void {
  if (!(isList(list) && list.every((q) => isList(q, 4) && q.every(isHex)))) {
    reject(id, `${name} must be a list of four hex doubles`);
  }
}

function checkSection(id: string, section: unknown): void {
  const ok =
    isList(section, 5) &&
    section.slice(0, 4).every(isHex) &&
    isList(section[4]) &&
    section[4].every((b) => isList(b, 2) && b.every(isHex));
  if (!ok) {
    reject(id, 'an edge section is [startX, startY, endX, endY, [[bendX, bendY]...]]');
  }
}

function checkEdges(id: string, edges: unknown): void {
  if (!isList(edges)) {
    reject(id, 'edges must be a list');
  }
  for (const edge of edges) {
    if (!(isList(edge, 2) && isList(edge[1]) && edge[1].length > 0)) {
      reject(id, 'an edge is [id, [section...]] with at least one section');
    }
    edge[1].forEach((s) => checkSection(id, s));
  }
}

function checkProp(id: string, prop: unknown): void {
  const known = isList(prop, 3) && (PROP_NAMES as readonly unknown[]).includes(prop[1]);
  if (!known) {
    reject(id, `a prop is [elementId, name, value] with name one of ${PROP_NAMES.join(', ')}`);
  }
  const [, name, value] = prop as [unknown, PropName, unknown];
  let valid: boolean;
  if (name === 'root') {
    valid = typeof value === 'string';
  } else if (name === 'orderId') {
    valid = Number.isInteger(value);
  } else if (name === 'position') {
    valid = isList(value, 2) && value.every(isHex);
  } else {
    valid = isHex(value);
  }
  if (!valid) {
    reject(id, `prop ${name} has a malformed value ${JSON.stringify(value)}`);
  }
}

function checkDump(id: string, dump: Obj, fixed: boolean): void {
  checkShapes(id, 'nodes', dump.nodes);
  checkEdges(id, dump.edges);
  if (!isList(dump.props)) {
    reject(id, 'props must be a list');
  }
  dump.props.forEach((p) => checkProp(id, p));
  for (const name of FIXED_SECTIONS) {
    if (fixed !== name in dump) {
      reject(id, fixed ? `missing the fixed section ${name}` : `unexpected fixed section ${name}`);
    }
  }
  if (fixed) {
    checkShapes(id, 'ports', dump.ports);
    checkShapes(id, 'labels', dump.labels);
    checkQuads(id, 'margins', dump.margins);
    checkQuads(id, 'padding', dump.padding);
  }
}

function checkStops(id: string, stops: unknown): void {
  if (!isList(stops)) {
    reject(id, 'stops must be a list');
  }
  let last = -1;
  stops.forEach((stop, index) => {
    const rank = isObject(stop) ? (RADIAL_STEPS as readonly unknown[]).indexOf(stop.step) : -1;
    if (!isObject(stop) || rank < 0) {
      reject(id, `stop ${String(index)} has no known step`);
    }
    if (rank <= last) {
      reject(id, `stop ${String(index)} (${String(stop.step)}) is out of step order`);
    }
    last = rank;
    checkDump(id, stop, index === 0);
  });
}

function checkThrown(id: string, thrown: unknown): void {
  const ok = isObject(thrown) && ['class', 'message', 'frame', 'step'].every((k) => typeof thrown[k] === 'string');
  if (!ok) {
    reject(id, 'throws must be { class, message, frame, step }');
  }
}

function checkRow(raw: unknown, index: number): RadialRow {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.input) || !isObject(raw.expected)) {
    throw new Error(`radial row ${String(index)} is malformed`);
  }
  const { id, group, expected } = raw;
  if (group === 'full') {
    checkDump(id, expected, true);
  } else if (group === 'stops') {
    checkStops(id, expected.stops);
  } else if (group === 'throws') {
    checkThrown(id, expected.throws);
    checkStops(id, expected.stops);
  } else {
    reject(id, `unknown group ${JSON.stringify(group)}`);
  }
  return raw as unknown as RadialRow;
}

/** Parses and validates one ref file: every row (a malformed one is rejected by name), unique ids and the `rowCounts`. */
export function parseRadialFile(file: string): RadialRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  const rows = parsed.rows.map((row, i) => checkRow(row, i));
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      throw new Error(`${path.basename(file)}: duplicate row id ${row.id}`);
    }
    ids.add(row.id);
  }
  const declared = (parsed.rowCounts ?? {}) as Partial<Record<string, unknown>>;
  for (const group of RADIAL_ROW_GROUPS) {
    const actual = rows.filter((row) => row.group === group).length;
    if (declared[group] !== actual) {
      throw new Error(
        `${path.basename(file)}: rowCounts.${group} is ${JSON.stringify(declared[group])}, the file holds ${String(actual)} rows`,
      );
    }
  }
  return rows;
}

const cache = new Map<string, readonly RadialRow[]>();

/** The rows of the radial ref in file order, optionally of one group; validated, cached per path. */
export function loadRadialRows(group?: RadialRowGroup, file: string = radialRefPath()): readonly RadialRow[] {
  if (!existsSync(file)) {
    throw new Error(`${path.basename(file)} is absent: T2 (tools/vectors/RadialVectors.java recording) has not landed`);
  }
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseRadialFile(file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

/** The row with the given id; throws when none has it. */
export function radialRowById(id: string): RadialRow {
  const row = loadRadialRows().find((r) => r.id === id);
  if (row === undefined) {
    throw new Error(`no radial row ${id}`);
  }
  return row;
}

// ------------------------------------------------------------------------------------------------------------
// stops of a row

/** The recorded stops of a `stops` or `throws` row. */
export const stopsOf = (row: RadialStopsRow | RadialThrowsRow): readonly RadialStop[] => row.expected.stops;

/** Index of the stop of `step` in `stops`, or -1 when the step did not run for the row. */
export const stopIndex = (stops: readonly RadialStop[], step: RadialStep): number =>
  stops.findIndex((s) => s.step === step);

/** The fixed sections (ports, labels, margins, padding) of a row: the first stop's, valid for every stop. */
export function fixedSectionsOf(stops: readonly RadialStop[]): Required<Pick<RadialDump, FixedSection>> {
  const first = stops[0];
  if (
    first?.ports === undefined ||
    first.labels === undefined ||
    first.margins === undefined ||
    first.padding === undefined
  ) {
    throw new Error('a row without a stop has no fixed sections');
  }
  return { ports: first.ports, labels: first.labels, margins: first.margins, padding: first.padding };
}

/** The recorded state before and after one step: the stop before it and the stop of the step itself. */
export interface StepPair {
  readonly step: RadialStep;
  readonly beforeIndex: number;
  readonly before: RadialStop;
  readonly after: RadialStop;
}

/** The pair around `step`, or `null` when the step did not run for the row or is the first stop (no state before it). */
export function stepPair(stops: readonly RadialStop[], step: RadialStep): StepPair | null {
  const index = stopIndex(stops, step);
  const before = stops[index - 1];
  const after = stops[index];
  return index < 1 || before === undefined || after === undefined
    ? null
    : { step, beforeIndex: index - 1, before, after };
}

/** Every `stops` and `throws` row that has a stop pair around `step`, with the pair. */
export function rowsWithStepPair(step: RadialStep): readonly (readonly [RadialStopsRow | RadialThrowsRow, StepPair])[] {
  const out: (readonly [RadialStopsRow | RadialThrowsRow, StepPair])[] = [];
  for (const row of loadRadialRows()) {
    if (!isFullRow(row)) {
      const pair = stepPair(stopsOf(row), step);
      if (pair !== null) {
        out.push([row, pair]);
      }
    }
  }
  return out;
}

/** The value of a prop of `element` in a dump, or `undefined` when it is not set there. */
export function propOf(dump: RadialDump, element: string, name: PropName): PropValue | undefined {
  return dump.props.find((p) => p[0] === element && p[1] === name)?.[2];
}
