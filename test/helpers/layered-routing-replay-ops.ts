// SPDX-License-Identifier: EPL-2.0
// The replay of mission 7e: `runRoutingPrefix` is `runPlacementPrefix` of layered-placement-replay-ops.ts (7d, the
// origin of this file) with P5_EDGE_ROUTING added to the accepted phases, and `runCall` interprets a `calls` row (R12):
// the steps before the final `call` step run through the 7b `runSteps`, then the named method is called with the
// decoded arguments and its return value is summarised. Processors, phases and callers are injected, so a class can be
// tested before the enum arm or the registry that constructs it is wired. `SplineSegment`, `Rectangle` and `NubSpline`
// are recognised by shape (their ports land after this file), so a summary never imports them.
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { KVector } from '../../src/core/math/KVector.js';
import { Direction } from '../../src/core/options/Direction.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { decodeHex, encodeHex, type HexPair, type HexQuad } from './layered-framework-replay.js';
import { elementAt } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { runSteps, type Factories } from './layered-phase-replay-ops.js';
import { importRow } from './layered-phase-replay-rows.js';
import {
  CALL_OP,
  P5_EDGE_ROUTING,
  phaseRowOf,
  type CallResult,
  type CallResultType,
  type CallRow,
  type NubsSummary,
  type RoutingFileRow,
  type RoutingRow,
} from './layered-routing-replay-rows.js';

const PHASE_SEPARATOR = '/';
const PHASES: ReadonlySet<string> = new Set([
  'P1_CYCLE_BREAKING',
  'P2_LAYERING',
  'P3_NODE_ORDERING',
  'P4_NODE_PLACEMENT',
  P5_EDGE_ROUTING,
]);

function runOn(processor: ILayoutProcessor<LGraph>, graph: LGraph): void {
  processor.process(graph, new NullElkProgressMonitor());
}

function runPrefixEntry(entry: string, graph: LGraph, factories: Factories): void {
  const at = entry.indexOf(PHASE_SEPARATOR);
  if (at < 0) {
    runOn(factories.createProcessor(entry), graph);
    return;
  }
  const phase = entry.slice(0, at);
  if (!PHASES.has(phase)) {
    throw new Error(`prefix entry ${entry} names the unknown phase ${phase}`);
  }
  runOn(factories.createPhase(phase, entry.slice(at + PHASE_SEPARATOR.length)), graph);
}

/** Replays a model row: import, `normalise`, then the recorded `prefix` in order (cf. `runPlacementPrefix`). */
export function runRoutingPrefix(row: RoutingRow, factories: Factories): LGraph {
  if (row.prefix === null) {
    throw new Error(`row ${row.id} has no prefix`);
  }
  const { graph } = importRow(row);
  normalise(graph);
  row.prefix.forEach((entry) => runPrefixEntry(entry, graph, factories));
  return graph;
}

/** Interprets a step row (`scenarios`, `sites`, `calls` up to its end) through the 7b `runSteps`, without a cast. */
export function runRoutingSteps(row: RoutingFileRow, factories: Factories): LGraph {
  return runSteps(phaseRowOf(row), factories);
}

// ------------------------------------------------------------------------------------------------------------
// calls

/** The callable table of a `calls` replay: `<Class>.<method>` to the function that runs it (an instance method takes its receiver first). */
export type CallerTable = Readonly<Record<string, (...args: never[]) => unknown>>;

/** An enum class as a `["enum", "<Type>.<NAME>"]` argument names it: only `valueOf(name)` is used. */
export interface EnumType {
  valueOf(name: string): unknown;
}

/**
 * Builders for the argument kinds whose classes are ported after this file (`Rectangle`, `NubSpline`). Both receive the
 * row's own order and encoding decoded: `rectangle` as (top, right, bottom, left), which is NOT the order of the Java
 * `Rectangle(left, top, right, bottom)` constructor, and `nubs` as (clamped, dim, control points).
 */
export interface CallConstructors {
  readonly rectangle?: (top: number, right: number, bottom: number, left: number) => unknown;
  readonly nubs?: (clamped: boolean, dim: number, points: KVector[]) => unknown;
}

/** What a `calls` replay may inject beyond the callers: the enum types and the builders of not-yet-ported classes. */
export interface CallOptions {
  readonly enums?: Readonly<Record<string, EnumType>>;
  readonly constructors?: CallConstructors;
}

/** The enum types a call argument may name, by simple type name (the 7e methods take a `PortSide` or a `Direction`). */
export const CALL_ENUMS: Readonly<Record<string, EnumType>> = { PortSide, Direction };

const TYPE_SEPARATOR = '.';

interface DecodeContext {
  readonly row: CallRow;
  readonly graph: LGraph;
  readonly enums: Readonly<Record<string, EnumType>>;
  readonly constructors: CallConstructors;
}

type Decoder = (context: DecodeContext, rest: readonly unknown[]) => unknown;

function decodeEnum({ row, enums }: DecodeContext, spelled: string): unknown {
  const at = spelled.lastIndexOf(TYPE_SEPARATOR);
  const typeName = spelled.slice(spelled.lastIndexOf(TYPE_SEPARATOR, at - 1) + 1, Math.max(at, 0));
  const type = at >= 0 && Object.hasOwn(enums, typeName) ? enums[typeName] : undefined;
  if (type === undefined) {
    throw new Error(`row ${row.id}: enum argument ${spelled} names no known enum type`);
  }
  return type.valueOf(spelled.slice(at + 1));
}

const vectorOf = (x: unknown, y: unknown): KVector => new KVector(decodeHex(x as string), decodeHex(y as string));
const vectorsOf = (pairs: unknown): KVector[] =>
  (pairs as readonly (readonly unknown[])[]).map(([x, y]) => vectorOf(x, y));

function built<K extends keyof CallConstructors>(context: DecodeContext, kind: K): NonNullable<CallConstructors[K]> {
  const make = context.constructors[kind];
  if (make === undefined) {
    throw new Error(`row ${context.row.id}: argument kind ${kind} needs a constructors.${kind} builder`);
  }
  return make as NonNullable<CallConstructors[K]>;
}

const elementArg: Decoder = ({ graph }, [path]) => elementAt(graph, path as string);

/** One decoder per argument kind of the recorder (LayeredRoutingVectors.java `callArg`). */
const DECODERS: Readonly<Record<string, Decoder>> = {
  port: elementArg,
  node: elementArg,
  double: (_, [hex]) => decodeHex(hex as string),
  boolean: (_, [flag]) => flag as boolean,
  int: (_, [value]) => value as number,
  enum: (context, [spelled]) => decodeEnum(context, spelled as string),
  vector: (_, [x, y]) => vectorOf(x, y),
  vectors: (_, [pairs]) => vectorsOf(pairs),
  rectangle: (context, sides) =>
    built(context, 'rectangle')(...(sides.map((hex) => decodeHex(hex as string)) as [number, number, number, number])),
  nubs: (context, [clamped, dim, points]) =>
    built(context, 'nubs')(clamped as boolean, dim as number, vectorsOf(points)),
};

function decodeArg(context: DecodeContext, arg: unknown): unknown {
  const [kind, ...rest] = Array.isArray(arg) ? (arg as readonly unknown[]) : [];
  if (typeof kind !== 'string' || !Object.hasOwn(DECODERS, kind)) {
    throw new Error(`row ${context.row.id}: unknown call argument ${JSON.stringify(arg)}`);
  }
  return DECODERS[kind]!(context, rest);
}

const pairOf = (v: { readonly x: number; readonly y: number }): HexPair => [encodeHex(v.x), encodeHex(v.y)];
const isFunction = (value: unknown, name: string): boolean =>
  typeof (value as Record<string, unknown>)[name] === 'function';

type Quad = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

/** The four getters of `Rectangle` (`getTop`…) or the four public fields of an `ElkMargin`, as (top, right, bottom, left). */
function quadOf(shape: object): HexQuad | null {
  const record = shape as Record<string, unknown>;
  const read = (side: string, getter: string): number =>
    isFunction(shape, getter) ? (record[getter] as () => number).call(shape) : (record[side] as number);
  const values: Quad = {
    top: read('top', 'getTop'),
    right: read('right', 'getRight'),
    bottom: read('bottom', 'getBottom'),
    left: read('left', 'getLeft'),
  };
  return Object.values(values).every((side) => typeof side === 'number')
    ? [encodeHex(values.top), encodeHex(values.right), encodeHex(values.bottom), encodeHex(values.left)]
    : null;
}

const NUBS_METHODS = ['getControlPoints', 'getKnotVector', 'getDim', 'getOuterBox'];

function nubsOf(spline: object): NubsSummary {
  const s = spline as Record<string, () => unknown>;
  const outerBox = quadOf(s.getOuterBox!() as object);
  if (outerBox === null) {
    throw new Error('the outer box of a spline has no top, right, bottom and left');
  }
  const label = isFunction(spline, 'getFirstLabelPosition') ? (s.getFirstLabelPosition!() as KVector | null) : null;
  return {
    controlPoints: Array.from(s.getControlPoints!() as Iterable<KVector>, pairOf),
    knotVector: Array.from(s.getKnotVector!() as Iterable<number>, encodeHex),
    dim: s.getDim!() as number,
    outerBox,
    ...(label === null ? {} : { firstLabelPosition: pairOf(label) }),
  };
}

/**
 * A call's return value as a `CallResult` (R12): a `number` is a `double`, a `boolean` a `boolean`, a `KVector` a
 * `vector`, an object with the four spline getters a `nubs`, and an object with `Rectangle`'s four getters or four side
 * fields (`Rectangle`, `ElkMargin`) a `rectangle` (top, right, bottom, left). A `null` result has no type of its own:
 * it is `{ type: nullType, value: null }` when the caller names the declared type, else an error.
 */
export function summarise(result: unknown, nullType?: CallResultType): CallResult {
  if (result === null && nullType !== undefined) {
    return { type: nullType, value: null };
  }
  if (typeof result === 'number') {
    return { type: 'double', value: encodeHex(result) };
  }
  if (typeof result === 'boolean') {
    return { type: 'boolean', value: result };
  }
  if (result instanceof KVector) {
    return { type: 'vector', value: pairOf(result) };
  }
  if (result !== null && typeof result === 'object') {
    if (NUBS_METHODS.every((name) => isFunction(result, name))) {
      return { type: 'nubs', value: nubsOf(result) };
    }
    const quad = quadOf(result);
    if (quad !== null) {
      return { type: 'rectangle', value: quad };
    }
  }
  throw new Error(`cannot summarise the call result ${String(result)}`);
}

function callStepOf(row: CallRow): { head: CallRow['steps']; name: string; args: readonly unknown[] } {
  const at = row.steps.findIndex(([op]) => op === CALL_OP);
  if (at < 0 || at !== row.steps.length - 1) {
    throw new Error(`row ${row.id}: a calls row ends with exactly one ${CALL_OP} step`);
  }
  const [, name, ...args] = row.steps[at]!;
  return { head: row.steps.slice(0, at), name: name as string, args };
}

/**
 * Runs a `calls` row: the steps before the final `call` step through `runSteps` (`normalise`, `layers`, `runProcessor`
 * as in any step row), then `callers[<Class>.<method>]` with the decoded arguments, and returns the summarised result.
 * Argument kinds: `port`/`node` by path in the replayed graph, `double` by `decodeHex`, `boolean`, `int`, `enum` by
 * `valueOf`, `vector`, `vectors`, and `rectangle`/`nubs` through `options.constructors`. A `null` return takes the
 * type the row's expected result declares.
 */
export function runCall(
  row: CallRow,
  factories: Factories,
  callers: CallerTable,
  options: CallOptions = {},
): CallResult {
  const { head, name, args } = callStepOf(row);
  if (!Object.hasOwn(callers, name)) {
    throw new Error(`row ${row.id}: no caller is registered for ${name}`);
  }
  const graph = runSteps({ ...phaseRowOf(row), steps: head }, factories);
  const context: DecodeContext = {
    row,
    graph,
    enums: options.enums ?? CALL_ENUMS,
    constructors: options.constructors ?? {},
  };
  const returned = (callers[name] as (...values: unknown[]) => unknown)(...args.map((arg) => decodeArg(context, arg)));
  return summarise(returned, row.expected.result.type);
}
