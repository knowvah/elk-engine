// SPDX-License-Identifier: EPL-2.0
// The TS twin of the recorder's runs in tools/vectors/RadialVectors.java (mission 8a, T13): `runStops` mirrors `runStops` (the micro
// layout run here, then the REAL RadialLayoutProvider.layout with OMIT_NODE_MICRO_LAYOUT temporarily true, restored afterwards, under
// a BasicProgressMonitor subclass that dumps the graph at every doSubTask and at doDone; processor names come from the provider's
// private assembleAlgorithm), `runEngine` mirrors `runEngine`, and `throwDiffs` is the correspondence check of a recorded throw.
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { RadialLayoutProvider } from '../../src/alg/radial/RadialLayoutProvider.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { IllegalArgumentException } from '../../src/java/lang/IllegalArgumentException.js';
import { BasicIndexOutOfBoundsException } from '../../src/emf/common/util/BasicIndexOutOfBoundsException.js';
import { dumpRadial } from './radial-replay-dump.js';
import type { RadialDump, RadialStop, RadialThrown } from './radial-replay-rows.js';

export const STEP_MICRO = 'NodeMicroLayout';
export const STEP_ROOT = 'RootAndRadius';

/** The stops a provider run completed, the step names it would have had, and the error it raised (null when it completed). */
export interface RadialRun {
  readonly stops: RadialStop[];
  readonly names: readonly string[];
  readonly error: unknown;
  /** The step that was running when the run threw (the recorder's `names[steps.size()]`), `null` for a completed run. */
  readonly step: string | null;
}

/** Dumps the graph each time the provider starts a processor and when it is done (the recorder's HookMonitor). */
class HookMonitor extends BasicProgressMonitor {
  constructor(private readonly hook: () => void) {
    super();
  }

  protected override doSubTask(work: number, maxHierarchyLevels: number): BasicProgressMonitor {
    this.hook();
    return super.doSubTask(work, maxHierarchyLevels);
  }

  protected override doDone(): void {
    this.hook();
  }
}

/** The simple class names of the processors the provider assembles for `graph` (the recorder's reflection on `assembleAlgorithm`). */
export function processorNames(provider: RadialLayoutProvider, graph: ElkNode): string[] {
  const assemble = provider['assembleAlgorithm'] as (g: ElkNode) => object[];
  return assemble.call(provider, graph).map((processor) => processor.constructor.name);
}

/** The recorder's step driver on `graph` (the prepared input of a `stops` or `throws` row). */
export function runStops(graph: ElkNode): RadialRun {
  const provider = new RadialLayoutProvider();
  const omit = graph.getProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT);
  const hadOmit = graph.hasProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT);
  const stops: RadialStop[] = [];
  const names: string[] = omit ? [] : [STEP_MICRO];
  names.push(STEP_ROOT);
  const stopNow = (step: string): number => stops.push({ step, ...dumpRadial(graph) });
  try {
    names.push(...processorNames(provider, graph));
    if (!omit) {
      NodeMicroLayout.forGraph(graph).execute();
      stopNow(STEP_MICRO);
    }
  } catch (error) {
    return { stops, names, error, step: STEP_MICRO };
  }
  graph.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true);
  try {
    const monitor = new HookMonitor(() => {
      stopNow(names[stops.length] as string);
    });
    provider.layout(graph, monitor);
  } catch (error) {
    return { stops, names, error, step: names[stops.length] ?? null };
  } finally {
    graph.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, hadOmit ? omit : null);
  }
  return { stops, names, error: null, step: null };
}

/** The result of the recursive engine on `graph` (a dump), or the error it raised. */
export function runEngine(graph: ElkNode): { dump: RadialDump | null; error: unknown } {
  try {
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  } catch (error) {
    return { dump: null, error };
  }
  return { dump: dumpRadial(graph), error: null };
}

// ------------------------------------------------------------------------------------------------------------
// recorded throws

const NPE_CLASS = 'java.lang.NullPointerException';
const TS_CLASSES: ReadonlyMap<string, new (...args: never[]) => Error> = new Map<
  string,
  new (...args: never[]) => Error
>([
  ['java.lang.IllegalArgumentException', IllegalArgumentException],
  ['org.eclipse.emf.common.util.BasicEList$BasicIndexOutOfBoundsException', BasicIndexOutOfBoundsException],
]);
const STACK_FRAME = /^\s*at (?:(?<fn>[^()]*?) \()?(?<file>[^()]*?):\d+:\d+\)?$/;
/** Directories whose frames are no ELK code in the Java either (JRE, EMF, Guava, Gson): the recorded frame is the first ELK one. */
const NON_ELK = ['/src/java/', '/src/emf/', '/src/guava/', '/src/gson/'];

/** The source files of the stack's `src/` frames that are ELK code, innermost first (constructor frames skipped). */
export function elkFrameFiles(stack: string): string[] {
  const files: string[] = [];
  for (const line of stack.split('\n')) {
    const match = STACK_FRAME.exec(line);
    const file = match?.groups?.file ?? '';
    const fn = match?.groups?.fn ?? '';
    if (file.includes('/src/') && !NON_ELK.some((dir) => file.includes(dir)) && !fn.startsWith('new ')) {
      files.push(file);
    }
  }
  return files;
}

const baseName = (file: string): string => file.slice(file.lastIndexOf('/') + 1).replace(/\.[a-z]+$/, '');

/**
 * The differences between a recorded throw and the error of a TS run (empty when they correspond): a NullPointerException is a
 * `TypeError` (message not compared, it is JVM text); every other class is the port's class of that name with the same message;
 * the innermost ELK frame of the error lies in the port of the recorded `frame`'s Java file; `step` is the running step.
 */
export function throwDiffs(expected: RadialThrown, run: RadialRun): string[] {
  const error = run.error;
  if (!(error instanceof Error)) {
    return [`throw: the run ${error === null ? 'completed' : 'threw a non-Error'}, the oracle threw ${expected.class}`];
  }
  const diffs: string[] = [];
  if (expected.class === NPE_CLASS) {
    if (!(error instanceof TypeError)) {
      diffs.push(`throw: expected a TypeError (${NPE_CLASS}), got ${error.constructor.name}`);
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
  const javaClass = expected.frame.slice(0, expected.frame.indexOf('.java'));
  const top = elkFrameFiles(error.stack ?? '')[0];
  if (top === undefined || !baseName(top).startsWith(javaClass)) {
    diffs.push(`throw: first ELK frame ${top ?? '(none)'}, expected a port of ${expected.frame}`);
  }
  if (run.step !== expected.step) {
    diffs.push(`throw: step ${String(run.step)}, expected ${expected.step}`);
  }
  return diffs;
}
