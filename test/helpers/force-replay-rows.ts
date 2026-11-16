// SPDX-License-Identifier: EPL-2.0
// Rows of test/golden/refs/java/{force,stress}.json (mission 8b, T6; recorded by tools/vectors/ForceVectors.java, whose header is the
// contract of this file): { id, group, input, expected } in the groups
//   full    expected = the ELK dump after the engine run (typed `unknown`: T8 types it);
//   stops   expected = { steps, stops }, every stop carries the WHOLE state a later step reads (no delta);
//   throws  expected = { throws: { class, message, frame } };
//   log     (force.json only) input and expected are hex doubles (Math.log).
// A "state" is the dump of an FGraph (`fdump` of the recorder). Doubles are 16-hex-digit raw bit strings; NaN is the canonical
// 7ff8000000000000. T8 and T10 extend this file with the typed bodies of their stops; the parts below are complete for import, split and
// recombine (T6). Each file is parsed and validated once per path (`loadForceRows`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../corpus/corpus.js';
import { decodeHex, encodeHex, isHex, type Hex } from './vertiflex-replay-rows.js';

export { decodeHex, encodeHex, isHex, type Hex };

/** The two refs: the force provider and the stress provider. */
export const FORCE_REFS = ['force', 'stress'] as const;
export type ForceRef = (typeof FORCE_REFS)[number];

export const FORCE_ROW_GROUPS = ['full', 'stops', 'throws', 'log'] as const;
export type ForceRowGroup = (typeof FORCE_ROW_GROUPS)[number];

/** The canonical NaN of the recorder (`JavaVectors.hex`). */
export const NAN_HEX: Hex = '7ff8000000000000';

/** A double to its hex raw bits, NaN canonicalised as the recorder does (a JS NaN payload is platform text). */
export const hexOf = (value: number): Hex => (Number.isNaN(value) ? NAN_HEX : encodeHex(value));

export type HexVec = readonly [Hex, Hex];
export type HexQuad = readonly [Hex, Hex, Hex, Hex];

/** The step names of the stops of both refs, in the order a force row (then a stress row) runs them. */
export const STEP_IMPORT = 'import';
export const STEP_SPLIT = 'split';
export const STEP_RECOMBINE = 'recombine';
export const STEP_APPLY_LAYOUT = 'applyLayout';
export const STEP_FORCE_PASS = 'forcePass';
export const STEP_MICRO_LAYOUT = 'microLayout';
export const STATE_STEPS = [
  'initialize',
  'iteration1',
  'iteration2',
  'iteration10',
  'iterationLast',
  'execute',
  'labelRefresh',
] as const;
export const ELK_STEPS = [STEP_FORCE_PASS, STEP_MICRO_LAYOUT, STEP_APPLY_LAYOUT] as const;
export const ALL_STEPS: readonly string[] = [STEP_IMPORT, STEP_SPLIT, STEP_RECOMBINE, ...STATE_STEPS, ...ELK_STEPS];

// ------------------------------------------------------------------------------------------------------------
// the state (an FGraph dump)

/** `props`: the options the dump reads through `getProperty`, the stress ones only in a stress row. */
export interface StateProps {
  readonly model: string;
  readonly iterations: number;
  readonly temperature: Hex;
  readonly repulsion: Hex;
  readonly spacing: Hex;
  readonly aspectRatio: Hex;
  readonly randomSeed: number;
  readonly separate: boolean;
  readonly interactive: boolean;
  readonly prio: number;
  readonly padding: HexQuad;
  readonly bbUpLeft: HexVec | null;
  readonly bbLowRight: HexVec | null;
  readonly randomPeek: Hex | null;
  readonly dimension?: string;
  readonly iterationLimit?: number;
  readonly epsilon?: Hex;
  readonly desiredEdgeLength?: Hex;
}
export interface NodeState {
  readonly id: number;
  readonly name: string;
  readonly label: string | null;
  readonly pos: HexVec;
  readonly disp: HexVec;
  readonly size: HexVec;
  readonly prio: number;
  readonly fixed?: boolean;
}
export interface EdgeState {
  readonly name: string;
  readonly src: string;
  readonly tgt: string;
  readonly srcId: number;
  readonly tgtId: number;
  readonly prio: number;
  readonly power: number;
  readonly labelSpacing: Hex;
  readonly sp: HexVec;
  readonly tp: HexVec;
  readonly bends: readonly HexVec[];
  readonly del?: Hex | null;
}
export interface LabelState {
  readonly name: string;
  readonly text: string | null;
  readonly edge: string;
  readonly pos: HexVec;
  readonly disp: HexVec;
  readonly size: HexVec;
  readonly inline: boolean;
  readonly prio: number;
}
export interface BendState {
  readonly edge: string;
  readonly index: number;
  readonly pos: HexVec;
  readonly disp: HexVec;
  readonly size: HexVec;
  readonly prio: number;
}
/** The whole FGraph state; `adjacency` is `null` before `initialize`. */
export interface State {
  readonly props: StateProps;
  readonly nodes: readonly NodeState[];
  readonly edges: readonly EdgeState[];
  readonly labels: readonly LabelState[];
  readonly bends: readonly BendState[];
  readonly adjacency: readonly (readonly number[])[] | null;
}

/** One entry of `recombine.components`: a component after `ComponentsProcessor.recombine` sorted the list. */
export interface RecombineEntry {
  readonly first: string | null;
  readonly nodes: number;
  readonly prio: number;
  readonly bbUpLeft: HexVec | null;
  readonly bbLowRight: HexVec | null;
}

// ------------------------------------------------------------------------------------------------------------
// the stops

export interface ImportStop {
  readonly step: 'import';
  readonly component: null;
  readonly state: State;
}
export interface SplitStop {
  readonly step: 'split';
  readonly component: null;
  /** force rows only: the simple class name of the model the provider chose. */
  readonly model?: string;
  /** force rows only: the fingerprint of the generator state (`null` before `setOptions`). */
  readonly randomPeek?: Hex | null;
  readonly components: readonly State[];
}
export interface RecombineStop {
  readonly step: 'recombine';
  readonly component: null;
  readonly components: readonly RecombineEntry[];
  readonly result: State;
}
/** A stop of the ELK graph: `forcePass` and `microLayout` (stress) and `applyLayout`; `elk` is the recorder's ELK dump. */
export interface ElkStop {
  readonly step: (typeof ELK_STEPS)[number];
  readonly component: null;
  readonly elk: ElkDump;
}
/** A per-component stop (T8: initialize, iteration*; T10: initialize, execute, labelRefresh). */
export interface StateStop {
  readonly step: (typeof STATE_STEPS)[number];
  readonly component: number;
  readonly iteration?: number;
  readonly state: State;
  /** force: every instance field of the concrete model plus dispBound (T8). */
  readonly model?: Readonly<Record<string, string | number>>;
  /** stress: dim, iterationLimit, epsilon, desiredEdgeLength, and apsp, w at `initialize` (T10). */
  readonly stress?: Readonly<Record<string, unknown>>;
}
export type Stop = ImportStop | SplitStop | RecombineStop | ElkStop | StateStop;

/** The ELK dump `{ graph, nodes, ports, labels, edges }` (typed by T8, who builds the dump of it). */
export interface ElkDump {
  readonly graph: Readonly<Record<string, unknown>>;
  readonly nodes: readonly Readonly<Record<string, unknown>>[];
  readonly ports: readonly Readonly<Record<string, unknown>>[];
  readonly labels: readonly Readonly<Record<string, unknown>>[];
  readonly edges: readonly Readonly<Record<string, unknown>>[];
}

export interface ThrowsExpected {
  readonly class: string;
  readonly message: string | null;
  readonly frame: string;
}

interface RowBase {
  readonly id: string;
  readonly ref: ForceRef;
}
export interface FullRow extends RowBase {
  readonly group: 'full';
  readonly input: Readonly<Record<string, unknown>>;
  readonly expected: ElkDump;
}
export interface StopsRow extends RowBase {
  readonly group: 'stops';
  readonly input: Readonly<Record<string, unknown>>;
  readonly expected: { readonly steps: readonly string[]; readonly stops: readonly Stop[] };
}
export interface ThrowsRow extends RowBase {
  readonly group: 'throws';
  readonly input: Readonly<Record<string, unknown>>;
  readonly expected: { readonly throws: ThrowsExpected };
}
export interface LogRow extends RowBase {
  readonly group: 'log';
  readonly input: Hex;
  readonly expected: Hex;
}
export type ForceRow = FullRow | StopsRow | ThrowsRow | LogRow;

// ------------------------------------------------------------------------------------------------------------
// loading

export const forceRefPath = (ref: ForceRef): string =>
  path.join(repoRoot(), 'test', 'golden', 'refs', 'java', `${ref}.json`);
export const forceRefExists = (ref: ForceRef): boolean => existsSync(forceRefPath(ref));

type Obj = Readonly<Record<string, unknown>>;
const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

function reject(id: string, what: string): never {
  throw new Error(`force ref row ${id}: ${what}`);
}

function checkState(id: string, where: string, value: unknown): State {
  if (!isObject(value) || !isObject(value.props)) {
    return reject(id, `${where} is not a state`);
  }
  for (const key of ['nodes', 'edges', 'labels', 'bends'] as const) {
    if (!Array.isArray(value[key])) {
      reject(id, `${where}.${key} is not an array`);
    }
  }
  if (value.adjacency !== null && !Array.isArray(value.adjacency)) {
    reject(id, `${where}.adjacency is neither null nor an array`);
  }
  return value as unknown as State;
}

function checkStop(id: string, stop: unknown, index: number): Stop {
  const where = `stops[${String(index)}]`;
  if (!isObject(stop) || typeof stop.step !== 'string' || !ALL_STEPS.includes(stop.step)) {
    return reject(id, `${where} has no known step`);
  }
  if (stop.step === STEP_IMPORT) {
    checkState(id, `${where}.state`, stop.state);
  } else if (stop.step === STEP_SPLIT) {
    if (!Array.isArray(stop.components)) reject(id, `${where}.components is not an array`);
    stop.components.forEach((c, k) => checkState(id, `${where}.components[${String(k)}]`, c));
  } else if (stop.step === STEP_RECOMBINE) {
    if (!Array.isArray(stop.components)) reject(id, `${where}.components is not an array`);
    checkState(id, `${where}.result`, stop.result);
  } else if ((ELK_STEPS as readonly string[]).includes(stop.step)) {
    if (!isObject(stop.elk)) reject(id, `${where}.elk is not an object`);
  } else {
    checkState(id, `${where}.state`, stop.state);
    if (typeof stop.component !== 'number') reject(id, `${where} has no component index`);
  }
  return stop as unknown as Stop;
}

function checkRow(ref: ForceRef, row: unknown, index: number): ForceRow {
  if (!isObject(row) || typeof row.id !== 'string') {
    throw new Error(`${ref}.json row ${String(index)}: no id`);
  }
  const id = row.id;
  const group = row.group;
  if (typeof group !== 'string' || !(FORCE_ROW_GROUPS as readonly string[]).includes(group)) {
    return reject(id, `unknown group ${String(group)}`);
  }
  if (group === 'log') {
    if (!isHex(row.input) || !isHex(row.expected)) reject(id, 'log row without hex input and expected');
  } else if (!isObject(row.input) || !isObject(row.expected)) {
    reject(id, 'input and expected must be objects');
  }
  if (group === 'stops') {
    const expected = row.expected as Obj;
    if (
      !Array.isArray(expected.steps) ||
      !Array.isArray(expected.stops) ||
      expected.steps.length !== expected.stops.length
    ) {
      reject(id, 'steps and stops differ');
    }
    const steps: readonly unknown[] = expected.steps;
    expected.stops.forEach((stop, i) => {
      const checked = checkStop(id, stop, i);
      if (checked.step !== steps[i]) reject(id, `stops[${String(i)}].step differs from steps[${String(i)}]`);
    });
  }
  return { ...row, ref } as unknown as ForceRow;
}

/** Parses and validates one ref file: every row, unique ids, the `rowCounts` header. */
export function parseForceFile(ref: ForceRef, file: string = forceRefPath(ref)): ForceRow[] {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isObject(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error(`${file}: no "rows" array`);
  }
  const rows = parsed.rows.map((row, i) => checkRow(ref, row, i));
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error(`${ref}.json: duplicate row ids`);
  }
  const counts = parsed.rowCounts;
  if (isObject(counts)) {
    for (const group of FORCE_ROW_GROUPS) {
      const actual = rows.filter((row) => row.group === group).length;
      if (counts[group] !== undefined && counts[group] !== actual) {
        throw new Error(
          `${ref}.json: rowCounts.${group} is ${JSON.stringify(counts[group])}, the file holds ${String(actual)} rows`,
        );
      }
    }
  }
  return rows;
}

const cache = new Map<string, readonly ForceRow[]>();

/** The rows of a ref in file order, optionally of one group; validated, parsed once per path. */
export function loadForceRows(ref: ForceRef, group?: 'full'): readonly FullRow[];
export function loadForceRows(ref: ForceRef, group: 'stops'): readonly StopsRow[];
export function loadForceRows(ref: ForceRef, group: 'throws'): readonly ThrowsRow[];
export function loadForceRows(ref: ForceRef, group: 'log'): readonly LogRow[];
export function loadForceRows(ref: ForceRef, group?: ForceRowGroup): readonly ForceRow[];
export function loadForceRows(ref: ForceRef, group?: ForceRowGroup): readonly ForceRow[] {
  const file = forceRefPath(ref);
  let rows = cache.get(file);
  if (rows === undefined) {
    rows = parseForceFile(ref, file);
    cache.set(file, rows);
  }
  return group === undefined ? rows : rows.filter((row) => row.group === group);
}

// ------------------------------------------------------------------------------------------------------------
// stop access

/** The stop type whose `step` admits `S` (`ElkStop` and `StateStop` have a union of steps, which `Extract` cannot select by one). */
export type StopOf<S extends Stop['step']> = Stop extends infer T
  ? T extends { step: infer X }
    ? [S] extends [X]
      ? T
      : never
    : never
  : never;

/** The stop of `step` (of `component` when given; the whole-graph stops have none), or `undefined` when the row has none. */
export function findStop<S extends Stop['step']>(row: StopsRow, step: S, component?: number): StopOf<S> | undefined {
  return row.expected.stops.find(
    (stop) => stop.step === step && (component === undefined || stop.component === component),
  ) as StopOf<S> | undefined;
}

/** Like {@link findStop} but the stop must exist. */
export function stopOf<S extends Stop['step']>(row: StopsRow, step: S, component?: number): StopOf<S> {
  const stop = findStop(row, step, component);
  if (stop === undefined) {
    return reject(row.id, `has no ${step} stop (steps: ${row.expected.steps.join(', ')})`);
  }
  return stop;
}

/**
 * The state of every component right before `recombine`: the last stop of the component before the recombine stop (T8: its
 * `iterationLast`; T10: its `labelRefresh`), or the `split` state when the component has no stop of its own (a stress component with a
 * single node is skipped).
 */
export function componentStatesBeforeRecombine(row: StopsRow): State[] {
  const { stops } = row.expected;
  const recombineAt = stops.findIndex((stop) => stop.step === STEP_RECOMBINE);
  if (recombineAt < 0) {
    return reject(row.id, 'has no recombine stop');
  }
  const split = stopOf(row, STEP_SPLIT);
  return split.components.map((splitState, k) => {
    let state = splitState;
    for (const stop of stops.slice(0, recombineAt)) {
      if (stop.component === k && 'state' in stop) {
        state = stop.state;
      }
    }
    return state;
  });
}
