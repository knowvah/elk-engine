// SPDX-License-Identifier: EPL-2.0
// Replay of the `sites` rows of the compound ref (mission 7h, T14; recorded by tools/vectors/LayeredCompoundVectors.java, "Group sites").
// A sites row has one of four kinds, told apart by the shape of `expected`:
//   run      `{ layout, plans, stops, tree }` as a `scenarios` row: replayed by `replayScenario`;
//   logged   a run row that also holds `logged = { tags, dot, json }`: the run is made under `new BasicProgressMonitor().withLogging(true)`,
//            replayed as a run row, and the graphs the monitor tree logged are compared with `compareLogged` (textual, line based,
//            identity hashes normalised: layered-labels-replay-logged.ts);
//   throws   `{ throws: { class, message, frame } }`: the oracle run threw inside ELK. The TS run must throw, and the throw must
//            CORRESPOND to the Java one (`throwDiffs`), defined here conservatively:
//              - a Java class of ELK (`org.eclipse.elk.*`): the TS error is exactly the port's class of that name (`TS_EXCEPTIONS`; an
//                unmapped class is a diff, so a new recording cannot pass by accident) and its message equals the Java message;
//              - `java.lang.NullPointerException`: the JavaScript analogue, a `TypeError` (the engine's own "Cannot read properties of
//                null", or the port's deliberate null-unboxing `TypeError`, e.g. `SplineSegment.anchorY`). The message is JDK "helpful NPE"
//                text and engine text, so it is not compared (the recorder's header says the same);
//              - BOTH: the throw originates in the ported file of `frame`. The check reads the TOP of the error's stack: the first stack
//                frame inside this repository's `src/` that is neither a `src/java/` shim nor a constructor frame (`new X`, the exception's own class chain),
//                must lie in a file whose base name starts with the Java class of `frame` (a port split into prefixed files,
//                `LGraphUtilExternalPorts.ts` for `LGraphUtil.java`, still matches), and, when the caller names the ported function
//                (`PortedSite.fn`), the frame's function name must end with it. Chosen over a spy because a stack frame is where V8 raised
//                the TypeError (a spy on the function would also pass if the error came from a callee or a caller's argument
//                evaluation); reliable because both kinds of throw are raised by code of that function itself (a property read on a
//                null, or an explicit `throw` in it), so no frame of a callee precedes it, and `Error.stackTraceLimit` (10) is far
//                above the one frame inspected.
//            A run that completes, or throws from another class, message or file, is a mismatch (one diff string).
//   worked   (issue #60, sites/ElkLayered/recursiveWork) a run row that also holds `work = [{ task, work }]`: the run is made under a
//            `WorkRecorder`, the twin of the recorder's class of that name. It overrides the two protected hooks of `BasicProgressMonitor`:
//            `doBegin` keeps the task name and the total work, `doSubTask` returns a monitor of the same kind. The list holds one entry
//            per monitor of the tree that began, depth first, sub-monitors in creation order; it is compared exactly (`workDiffs`).
//            The work of a `begin` is a Java `float`; the recorder writes it as an integer and refuses any other value.
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { UnsupportedGraphException } from '../../src/core/UnsupportedGraphException.js';
import { capturedLogged } from './layered-labels-replay-ops.js';
import { compareLogged, type Logged } from './layered-labels-replay-logged.js';
import { runRow } from './layered-compound-replay-run.js';
import { replayScenario } from './layered-compound-replay-stops.js';
import type { CompoundRow, CompoundScenarioRow, CompoundSiteRow } from './layered-compound-replay-rows.js';

export const SITES_GROUP = 'sites';
export const NPE_CLASS = 'java.lang.NullPointerException';

/** One monitor of a `worked` row that began: the name and the total work its `begin` was given. */
export interface WorkEntry {
  readonly task: string;
  readonly work: number;
}

/** What the oracle recorded for a throw row. */
export interface JavaThrow {
  readonly class: string;
  readonly message: string | null;
  /** The first org.eclipse.elk frame, `File.java:line`. */
  readonly frame: string;
}

/** The TS classes of the ELK exceptions a throw row may name (the TS port has the Java hierarchy, AD-16). */
export const TS_EXCEPTIONS: ReadonlyMap<string, new (...args: never[]) => Error> = new Map([
  ['org.eclipse.elk.core.UnsupportedGraphException', UnsupportedGraphException],
]);

/** The ported function a throw row's frame lies in, for the check of the stack top (the Java method is named in the table). */
export interface PortedSite {
  /** The TS function (name as V8 prints it, without class qualifier) that ports the Java method of the frame. */
  readonly fn: string;
}

/** Throw rows to the TS function that ports the Java method of the recorded frame (filled in below). */
export const PORTED_SITES: ReadonlyMap<string, PortedSite> = new Map([
  // ElkLayered.java:344 is in the lambda of reviewAndCorrectHierarchicalProcessors; the TS arrow function is anonymous, so the
  // enclosing named frame is checked.
  ['sites/ElkLayered/childStrategyThrow', { fn: 'reviewAndCorrectHierarchicalProcessors' }],
  // SplineSegment.java:247 is anchorY.
  ['sites/SplineSegment/anchorYWithoutPortCoordinate/DOWN', { fn: 'anchorY' }],
  ['sites/SplineSegment/anchorYWithoutPortCoordinate/UP', { fn: 'anchorY' }],
  // ElkGraphImporter.java:1205 is in transformEdge; the TS splits its tail (the self loop property and the port creation) into completeEdge.
  ['sites/ElkGraphImporter/selfLoopInCompoundNode', { fn: 'completeEdge' }],
  // LGraphUtil.java:944 is in createExternalPortDummy; the TS splits the order information into orderInformation / positionInformation.
  ['sites/CompoundGraphPreprocessor/hierarchicalPortFIXED_RATIO', { fn: 'positionInformation' }],
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isSiteThrowRow = (row: CompoundRow): row is CompoundSiteRow & { expected: { throws: JavaThrow } } =>
  row.group === SITES_GROUP && isObject(row.expected.throws);

export const isSiteLoggedRow = (row: CompoundRow): row is CompoundSiteRow & { expected: { logged: Logged } } =>
  row.group === SITES_GROUP && isObject(row.expected.logged);

export const isSiteRunRow = (row: CompoundRow): boolean =>
  row.group === SITES_GROUP && 'layout' in row.expected && 'plans' in row.expected && 'stops' in row.expected;

export const isSiteWorkedRow = (row: CompoundRow): row is CompoundSiteRow & { expected: { work: WorkEntry[] } } =>
  row.group === SITES_GROUP && Array.isArray(row.expected.work);

// ------------------------------------------------------------------------------------------------------------
// the stack top

const STACK_FRAME = /^\s*at (?:(?<fn>[^()]*?) \()?(?<file>[^()]*?):\d+:\d+\)?$/;
const REPO_SRC = '/src/';
const CONSTRUCTOR_FRAME = 'new ';
const JAVA_SHIMS = '/src/java/';

/** The function and file of one `Error.stack` frame line, or `null` for a line that is no frame. */
export function parseFrame(line: string): { fn: string; file: string } | null {
  const match = STACK_FRAME.exec(line);
  return match?.groups === undefined ? null : { fn: match.groups.fn ?? '', file: match.groups.file ?? '' };
}

/** The first frame with a function name among the ported frames (an anonymous arrow function takes its enclosing function). */
export function portedNamedTop(stack: string): { fn: string; file: string } | null {
  return portedFrames(stack).find((frame) => frame.fn !== '') ?? null;
}

/** The first frame of the stack inside the repository's `src/` and outside the `src/java/` shims and the constructors of the error's own class chain (the ported code that raised the error). */
export function portedTop(stack: string): { fn: string; file: string } | null {
  return portedFrames(stack)[0] ?? null;
}

function portedFrames(stack: string): { fn: string; file: string }[] {
  return stack
    .split('\n')
    .map(parseFrame)
    .filter(
      (frame): frame is { fn: string; file: string } =>
        frame !== null &&
        frame.file.includes(REPO_SRC) &&
        !frame.file.includes(JAVA_SHIMS) &&
        !frame.fn.startsWith(CONSTRUCTOR_FRAME),
    );
}

const baseNameOf = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');
const javaClassOf = (frame: string): string => frame.slice(0, frame.indexOf('.java'));
const lastSegment = (name: string): string => name.slice(name.lastIndexOf('.') + 1);

function originDiffs(expected: JavaThrow, error: Error, site?: PortedSite): string[] {
  const top = portedTop(error.stack ?? '');
  const javaClass = javaClassOf(expected.frame);
  if (top === null) {
    return [`throw: no frame of src/ on the stack of ${error.name}, expected one in ${javaClass} (${expected.frame})`];
  }
  const diffs: string[] = [];
  if (!baseNameOf(top.file).startsWith(javaClass)) {
    diffs.push(`throw: raised in ${top.file}, expected a port of ${expected.frame}`);
  }
  const named = portedNamedTop(error.stack ?? '');
  if (site !== undefined && lastSegment(named?.fn ?? '') !== site.fn) {
    diffs.push(`throw: raised in function ${named?.fn ?? '(none)'}, expected ${site.fn} (${expected.frame})`);
  }
  return diffs;
}

function classDiffs(expected: JavaThrow, error: Error): string[] {
  if (expected.class === NPE_CLASS) {
    return error instanceof TypeError ? [] : [`throw: expected a TypeError (${NPE_CLASS}), got ${error.name}`];
  }
  const ctor = TS_EXCEPTIONS.get(expected.class);
  if (ctor === undefined) {
    return [`throw: no TS class is mapped to ${expected.class}`];
  }
  const diffs: string[] = [];
  if (error.constructor !== ctor) {
    diffs.push(`throw: expected class ${expected.class}, got ${error.constructor.name}`);
  }
  if (error.message !== expected.message) {
    diffs.push(`throw: message ${JSON.stringify(error.message)} != ${JSON.stringify(expected.message)}`);
  }
  return diffs;
}

/** The diffs between a Java throw and the error a TS run raised (empty when they correspond, see the header). */
export function throwDiffs(expected: JavaThrow, error: unknown, site?: PortedSite): string[] {
  if (!(error instanceof Error)) {
    return [`throw: a non-Error value was thrown: ${String(error)}`];
  }
  return [...classDiffs(expected, error), ...originDiffs(expected, error, site)];
}

/** Replays a throw row: the TS run must throw, and the throw must correspond to the recorded Java one. */
export function replayThrow(row: CompoundSiteRow & { expected: { throws: JavaThrow } }, site?: PortedSite): string[] {
  try {
    runRow(row);
  } catch (error) {
    return throwDiffs(row.expected.throws, error, site);
  }
  return [`throw: the run completed, the oracle threw ${row.expected.throws.class} at ${row.expected.throws.frame}`];
}

// ------------------------------------------------------------------------------------------------------------
// run and logged rows

/** Replays a run row: as a `scenarios` row. */
export const replayRunSite = (row: CompoundSiteRow): string[] =>
  replayScenario(row as unknown as CompoundScenarioRow).diffs;

const CROSS_HIERARCHY_PROPERTY = '"crossHierarchyMap"';

/** The `crossHierarchyMap` property lines of a JSON debug text, raw (no normalisation: the line holds no identity hash). */
const crossHierarchyLines = (json: string): string[] =>
  json
    .split('\n')
    .filter((line) => line.includes(CROSS_HIERARCHY_PROPERTY))
    .map((line) => line.trim());

/**
 * The `crossHierarchyMap` lines of every logged JSON, compared exactly: `normalizeIdentityHashes` also rewrites the `-> <port index>`
 * of an edge's text (its pattern is the DOT edge target), so the general comparison would not see a wrong port index in the line.
 */
function crossHierarchyDiffs(actual: Logged, expected: Logged): string[] {
  return expected.json.flatMap((json, i) => {
    const want = crossHierarchyLines(json);
    const got = crossHierarchyLines(actual.json[i] ?? '');
    return JSON.stringify(got) === JSON.stringify(want)
      ? []
      : [`json[${String(i)}] crossHierarchyMap: ${JSON.stringify(got)} != ${JSON.stringify(want)}`];
  });
}

/** Replays a logged row: as a run row, run under a logging monitor, plus the comparison of the logged graphs. */
export function replayLoggedSite(row: CompoundSiteRow & { expected: { logged: Logged } }): string[] {
  const monitor = new BasicProgressMonitor().withLogging(true);
  const diffs = replayScenario(row as unknown as CompoundScenarioRow, { monitor }).diffs;
  const logged = capturedLogged(monitor);
  return [...diffs, ...compareLogged(logged, row.expected.logged), ...crossHierarchyDiffs(logged, row.expected.logged)];
}

// ------------------------------------------------------------------------------------------------------------
// worked rows

/** A monitor that keeps what its `begin` was given and makes sub-monitors of its own kind (the recorder's `WorkRecorder`). */
export class WorkRecorder extends BasicProgressMonitor {
  /** The task and total work of this monitor's `begin`, or `null` before it. */
  began: WorkEntry | null = null;

  protected override doBegin(name: string, newTotalWork: number): void {
    this.began = { task: name, work: newTotalWork };
  }

  /** As `BasicProgressMonitor.doSubTask`, for a monitor without logging, log persistence or execution times. */
  protected override doSubTask(_work: number, maxHierarchyLevels: number): BasicProgressMonitor {
    const newMaxHierarchyLevels = maxHierarchyLevels > 0 ? maxHierarchyLevels - 1 : maxHierarchyLevels;
    return new WorkRecorder().withMaxHierarchyLevels(newMaxHierarchyLevels);
  }
}

/** The work of every monitor of the tree that began: depth first, sub-monitors in creation order. */
export function recordedWork(monitor: WorkRecorder): WorkEntry[] {
  const below = monitor.getSubMonitors().flatMap((child) => recordedWork(child as WorkRecorder));
  return monitor.began === null ? below : [monitor.began, ...below];
}

/** The diffs between the work a TS run recorded and the oracle's list: the lengths, then every entry both lists hold. */
export function workDiffs(actual: readonly WorkEntry[], expected: readonly WorkEntry[]): string[] {
  const length =
    actual.length === expected.length
      ? []
      : [`work: ${String(actual.length)} entries, expected ${String(expected.length)}`];
  const entries = expected.flatMap((want, i) => {
    const got = actual[i];
    return got === undefined || (got.task === want.task && got.work === want.work)
      ? []
      : [`work[${String(i)}]: ${JSON.stringify(got)} != ${JSON.stringify(want)}`];
  });
  return [...length, ...entries];
}

/** Replays a worked row: as a run row, run under a `WorkRecorder`, plus the comparison of the work lists. */
export function replayWorkedSite(row: CompoundSiteRow & { expected: { work: WorkEntry[] } }): string[] {
  const monitor = new WorkRecorder();
  const diffs = replayScenario(row as unknown as CompoundScenarioRow, { monitor }).diffs;
  return [...diffs, ...workDiffs(recordedWork(monitor), row.expected.work)];
}

/** Replays any sites row by its kind; `site` names the ported function of a throw row. */
export function replaySiteRow(row: CompoundRow, site: PortedSite | undefined = PORTED_SITES.get(row.id)): string[] {
  if (isSiteThrowRow(row)) {
    return replayThrow(row, site);
  }
  if (isSiteLoggedRow(row)) {
    return replayLoggedSite(row);
  }
  if (isSiteRunRow(row)) {
    return isSiteWorkedRow(row) ? replayWorkedSite(row) : replayRunSite(row as CompoundSiteRow);
  }
  throw new Error(`row ${row.id}: a sites row of no known kind (run, logged, worked or throws)`);
}
