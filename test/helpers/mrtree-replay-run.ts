// SPDX-License-Identifier: EPL-2.0
// The TS twin of the recorder's runs in tools/vectors/MrTreeVectors.java (mission 8a, T17):
//   runStops(input)   `runStops`/`stopsBody` (MrTreeVectors.java:1098-1162). The Java offers no step hook (`MrTree.doLayout` runs the
//                     assembled list in one go), so, as the recorder does, the few orchestration lines of `TreeLayoutProvider.layout`
//                     (TreeLayoutProvider.java:49-88) are replicated here around the REAL `ElkGraphImporter`, `ComponentsProcessor`
//                     and `MrTree` (its private `updateModules` and `algorithm`, read the way the recorder reads them by reflection),
//                     each processor run with a NullElkProgressMonitor and a stop dumped after it;
//   runEngine(input)  `runFull`: the REAL provider through RecursiveGraphLayoutEngine (MrTree registered explicitly, TR5), dumped in the
//                     `full` shape (root first, margins, padding, labels);
//   throwDiffs        the correspondence check of a recorded throw (class, message unless NPE, first ELK frame, step).
import { ElkGraphImporter } from '../../src/alg/mrtree/ElkGraphImporter.js';
import { ComponentsProcessor } from '../../src/alg/mrtree/ComponentsProcessor.js';
import type { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { MrTree } from '../../src/alg/mrtree/MrTree.js';
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { IllegalArgumentException } from '../../src/java/lang/IllegalArgumentException.js';
import { StringIndexOutOfBoundsException } from '../../src/java/lang/StringIndexOutOfBoundsException.js';
import { dumpStop } from './mrtree-replay-dump.js';
import {
  STEP_APPLY,
  STEP_IMPORT,
  STEP_PACK,
  STEP_SPLIT,
  WHOLE_GRAPH_COMP,
  decodeHex,
  encodeHex,
  encodeHexPair,
  type FullExpected,
  type Stop,
  type ThrownError,
} from './mrtree-replay-rows.js';
import { dumpElk, parseRowInput } from './mrtree-replay-state.js';
import { elkFrameFiles } from './radial-replay-run.js';

export const STEP_MICRO = 'NodeMicroLayout';
export const STEP_UPDATE_MODULES = 'MrTree.updateModules';

/** The stops a run completed, and the error it raised with the step that was running (`null` for a completed run). */
export interface MrTreeRun {
  readonly stops: Stop[];
  readonly error: unknown;
  readonly step: string | null;
}

interface MrTreePrivates {
  updateModules(graph: TGraph): void;
  algorithm: ILayoutProcessor<TGraph>[];
}

/** The recorder's `runStops` on the ELK JSON `input` of a `stops` or `throws` row. */
export function runStops(input: Readonly<Record<string, unknown>>): MrTreeRun {
  const root = parseRowInput(input);
  const stops: Stop[] = [];
  const step = { current: STEP_MICRO };
  try {
    withDeepStacks(() => stopsBody(root, stops, step));
  } catch (error) {
    return { stops, error, step: step.current };
  }
  return { stops, error: null, step: null };
}

/**
 * Frames an error captured at stack exhaustion keeps: V8's default (10) holds only the innermost frames of the recursion, which are
 * arbitrary property-map frames; 200 reaches the recursive port method (see {@link throwDiffs}).
 */
const DEEP_STACK_TRACE_LIMIT = 200;

/** Runs `body` with a raised `Error.stackTraceLimit` (restored afterwards), so a stack-exhaustion error shows the recursion. */
function withDeepStacks<T>(body: () => T): T {
  const saved = Error.stackTraceLimit;
  Error.stackTraceLimit = DEEP_STACK_TRACE_LIMIT;
  try {
    return body();
  } finally {
    Error.stackTraceLimit = saved;
  }
}

/** `stopsBody` (MrTreeVectors.java:1124-1162), the sequence of `TreeLayoutProvider.layout` (TreeLayoutProvider.java:49-88). */
function stopsBody(root: ElkNode, stops: Stop[], step: { current: string }): void {
  if (!root.getProperty(MrTreeOptions.OMIT_NODE_MICRO_LAYOUT)) {
    NodeMicroLayout.forGraph(root).execute();
  }
  step.current = STEP_IMPORT;
  const importer = new ElkGraphImporter();
  const tGraph = importer.importGraph(root);
  stops.push(dumpStop(step.current, WHOLE_GRAPH_COMP, [tGraph]));
  step.current = STEP_SPLIT;
  const componentsProcessor = new ComponentsProcessor();
  const comps = componentsProcessor.split(tGraph);
  stops.push(dumpStop(step.current, WHOLE_GRAPH_COMP, comps));
  const mrTree = new MrTree();
  const internals = mrTree as unknown as MrTreePrivates;
  comps.forEach((comp, c) => {
    step.current = STEP_UPDATE_MODULES;
    internals.updateModules(comp);
    for (const processor of internals.algorithm) {
      step.current = processor.constructor.name;
      processor.process(comp, new NullElkProgressMonitor());
      stops.push(dumpStop(step.current, c, [comp]));
    }
  });
  step.current = STEP_PACK;
  const packed = componentsProcessor.pack(comps);
  stops.push(dumpStop(step.current, WHOLE_GRAPH_COMP, [packed]));
  step.current = STEP_APPLY;
  importer.applyLayout(packed);
  stops.push({ ...dumpStop(step.current, WHOLE_GRAPH_COMP, []), elk: dumpElk(root) });
}

// ------------------------------------------------------------------------------------------------------------
// the engine (group full)

const quad = (t: number, r: number, b: number, l: number): readonly string[] => [t, r, b, l].map(encodeHex);

/** The recorder's `dumpElk(root, micro=true)`: the `full` expectation shape. */
export function dumpFull(root: ElkNode): FullExpected {
  const nodes = [root, ...root.getChildren()];
  const { graph } = dumpElk(root);
  return {
    graph,
    nodes: nodes.map((node) => {
      const margins = node.getProperty(CoreOptions.MARGINS);
      const padding = node.getProperty(CoreOptions.PADDING);
      return {
        id: node.getIdentifier(),
        x: encodeHex(node.getX()),
        y: encodeHex(node.getY()),
        w: encodeHex(node.getWidth()),
        h: encodeHex(node.getHeight()),
        margins: quad(margins.top, margins.right, margins.bottom, margins.left),
        padding: quad(padding.top, padding.right, padding.bottom, padding.left),
      };
    }),
    edges: [...root.getContainedEdges()].map((edge) => ({
      id: edge.getIdentifier(),
      sections: [...edge.getSections()].map((section) => ({
        start: encodeHexPair(section.getStartX(), section.getStartY()),
        end: encodeHexPair(section.getEndX(), section.getEndY()),
        bends: [...section.getBendPoints()].map((bend) => encodeHexPair(bend.getX(), bend.getY())),
      })),
    })),
    labels: nodes.flatMap((node) =>
      [...node.getLabels()].map((label) => ({
        id: label.getIdentifier(),
        x: encodeHex(label.getX()),
        y: encodeHex(label.getY()),
        w: encodeHex(label.getWidth()),
        h: encodeHex(label.getHeight()),
      })),
    ),
  };
}

/** The result of the recursive engine on the row's input (a `full`-shaped dump), or the error it raised. */
export function runEngine(input: Readonly<Record<string, unknown>>): { dump: FullExpected | null; error: unknown } {
  const root = parseRowInput(input);
  try {
    withDeepStacks(() => new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()));
  } catch (error) {
    return { dump: null, error };
  }
  return { dump: dumpFull(root), error: null };
}

/** Differences between a recorded `full` expectation and a dump: ids, counts, order exactly; doubles (16 hex digits) within `tol`. */
export function compareFull(expected: unknown, actual: unknown, tol = 1e-6, path = 'full'): string[] {
  if (typeof expected === 'string' && typeof actual === 'string' && HEX_DOUBLE.test(expected)) {
    const [e, a] = [decodeHex(expected), decodeHex(actual)];
    return HEX_DOUBLE.test(actual) && (e === a || Math.abs(e - a) <= tol)
      ? []
      : [`${path}: expected ${e}, actual ${a}`];
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const out = expected.length === actual.length ? [] : [`${path}.length: ${expected.length} != ${actual.length}`];
    for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
      out.push(...compareFull(expected[i], actual[i], tol, `${path}[${i}]`));
    }
    return out;
  }
  if (typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null) {
    const [e, a] = [expected as Record<string, unknown>, actual as Record<string, unknown>];
    const keys = new Set([...Object.keys(e), ...Object.keys(a)]);
    return [...keys].flatMap((key) => compareFull(e[key], a[key], tol, `${path}.${key}`));
  }
  return expected === actual ? [] : [`${path}: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`];
}

const HEX_DOUBLE = /^[0-9a-f]{16}$/;

// ------------------------------------------------------------------------------------------------------------
// recorded throws

const NPE_CLASS = 'java.lang.NullPointerException';
/** The JVM's stack exhaustion is V8's `RangeError` ("Maximum call stack size exceeded"). */
const SOE_CLASS = 'java.lang.StackOverflowError';
const TS_CLASSES: ReadonlyMap<string, new (...args: never[]) => Error> = new Map<
  string,
  new (...args: never[]) => Error
>([
  ['java.lang.IllegalArgumentException', IllegalArgumentException],
  ['java.lang.StringIndexOutOfBoundsException', StringIndexOutOfBoundsException],
]);

const baseName = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');

/**
 * The differences between a recorded throw and the error of a TS run (empty when they correspond): a NullPointerException is a
 * `TypeError` (the JVM's helpful text is not compared), a StackOverflowError is a `RangeError` (message not compared, the stack must hold
 * a frame of the port of the recorded frame's class); every other class is the port's class of that name with the same message;
 * the innermost ELK frame of the error lies in the port of the recorded `frame`'s Java class; `step` is the running step.
 */
export function throwDiffs(
  expected: ThrownError,
  run: { readonly error: unknown; readonly step: string | null },
  expectedStep: string | null,
): string[] {
  const error = run.error;
  if (!(error instanceof Error)) {
    return [`throw: the run ${error === null ? 'completed' : 'threw a non-Error'}, the oracle threw ${expected.class}`];
  }
  const diffs: string[] = [];
  if (expected.class === NPE_CLASS) {
    if (!(error instanceof TypeError)) {
      diffs.push(`throw: expected a TypeError (${NPE_CLASS}), got ${error.constructor.name}`);
    }
  } else if (expected.class === SOE_CLASS) {
    // the message is not compared: the JVM's is null and V8's text is engine-specific
    if (!(error instanceof RangeError)) {
      diffs.push(`throw: expected a RangeError (${SOE_CLASS}), got ${error.constructor.name}`);
    }
  } else {
    const ctor = TS_CLASSES.get(expected.class);
    if (ctor === undefined) {
      diffs.push(`throw: no TS class is mapped to ${expected.class}`);
    } else if (error.constructor !== ctor) {
      diffs.push(`throw: expected class ${expected.class}, got ${error.constructor.name}`);
    }
    if (error.message !== expected.message) {
      diffs.push(`throw: message ${JSON.stringify(error.message)} != ${JSON.stringify(expected.message)}`);
    }
  }
  const javaClass = (expected.frame ?? '').slice(0, (expected.frame ?? '').indexOf('.java'));
  const frames = elkFrameFiles(error.stack ?? '');
  const top = frames[0];
  if (expected.class === SOE_CLASS) {
    // the recorded frame is the recorder's most frequent ELK frame; V8's innermost frame at exhaustion is arbitrary, so the
    // captured stack (see withDeepStacks) must contain a frame of the port of that Java class
    if (!frames.some((file) => baseName(file).startsWith(javaClass))) {
      diffs.push(`throw: no frame of a port of ${String(expected.frame)} in the captured stack`);
    }
  } else if (top === undefined || !baseName(top).startsWith(javaClass)) {
    diffs.push(`throw: first ELK frame ${top ?? '(none)'}, expected a port of ${String(expected.frame)}`);
  }
  if (expectedStep !== null && run.step !== expectedStep) {
    diffs.push(`throw: step ${String(run.step)}, expected ${expectedStep}`);
  }
  return diffs;
}
