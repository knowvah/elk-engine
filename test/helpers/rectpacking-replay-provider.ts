// SPDX-License-Identifier: EPL-2.0
// Engine-run replay of the rectpacking ref (mission 8c, T12): a row is run through `RecursiveGraphLayoutEngine` with the providers the
// recorder registered, and the stops of the provider loop are taken the way the recorder takes them (tools/vectors/RectPackingVectors.java,
// class `Rec` / `Recorder`): a `BasicProgressMonitor` subclass with logging on that hands every `logGraph(ElkNode, tag)` of the provider to
// the recorder; `k-Before X` opens stop `begin` (k = 0) or `after:<previous>`, `n-Finished` closes the last processor, `Output` is `end`.
// No production hook. Reads properties through the T6 dump helpers (`getAllProperties()` for the cloneable padding).
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import type { LoggedGraphType } from '../../src/core/util/LoggedGraph.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { RectPackingLayoutProvider } from '../../src/alg/rectpacking/RectPackingLayoutProvider.js';
import { dumpElk, importInput, layoutNodeOf } from './rectpacking-replay-elk.js';
import { recomputeDrawing, simpleJavaName } from './rectpacking-replay-p1p3.js';
import { dumpP2State } from './rectpacking-replay-p2.js';
import type { ElkDump, FullRow, GraphRun, Stop, StopsRow, ThrowsRow } from './rectpacking-replay-rows.js';

const BEFORE = /^(\d+)-Before (\w+)$/;
const FINISHED = /^\d+-Finished$/;
const OUTPUT_TAG = 'Output';
const GREEDY_PROCESSOR = 'GreedyWidthApproximator';
const PROVIDER_MODE = 'provider';

interface Entry {
  readonly graph: string;
  readonly processors: string[];
  readonly stops: Stop[];
  last: string;
}

const identifierOf = (graph: ElkNode): string => graph.getIdentifier() ?? '';

/** The recorder's `Recorder`: turns the provider's `logGraph` points into the stops of one graph entry per layout node. */
class StopRecorder {
  readonly graphs = new Map<string, Entry>();

  event(g: ElkNode, tag: string): void {
    const before = BEFORE.exec(tag);
    if (before !== null) {
      const id = identifierOf(g);
      let entry = this.graphs.get(id);
      if (entry === undefined) {
        entry = { graph: id, processors: [], stops: [], last: '' };
        this.graphs.set(id, entry);
      }
      const k = Number(before[1]);
      if (k !== entry.processors.length) {
        throw new Error(`processor index ${String(k)} out of order on ${id}`);
      }
      entry.stops.push(this.stop(k === 0 ? 'begin' : `after:${entry.last}`, g, entry.last));
      entry.processors.push(before[2]!);
      entry.last = before[2]!;
    } else if (FINISHED.test(tag)) {
      const entry = this.entryOf(g);
      entry.stops.push(this.stop(`after:${entry.last}`, g, entry.last));
    } else if (tag === OUTPUT_TAG) {
      this.entryOf(g).stops.push(this.stop('end', g, null));
    }
    // other tags (the compaction's own logGraph points) are counted by the recorder, not dumped
  }

  private entryOf(g: ElkNode): Entry {
    const entry = this.graphs.get(identifierOf(g));
    if (entry === undefined) {
      throw new Error(`no entry for ${identifierOf(g)}`);
    }
    return entry;
  }

  private stop(name: string, g: ElkNode, previous: string | null): Stop {
    const state = dumpP2State(g);
    return {
      stop: name,
      state: previous === GREEDY_PROCESSOR ? { ...state, drawing: recomputeDrawing(g) } : state,
    };
  }

  graphRuns(): GraphRun[] {
    return [...this.graphs.values()].map((e) => ({ graph: e.graph, processors: e.processors, stops: e.stops }));
  }
}

/** The recorder's `Rec`: a logging monitor whose sub-tasks record into the same recorder. */
class RecordingMonitor extends BasicProgressMonitor {
  constructor(private readonly recorder: StopRecorder) {
    super();
    this.withLogging(true);
  }

  protected override doSubTask(): BasicProgressMonitor {
    return new RecordingMonitor(this.recorder);
  }

  override logGraph(graph: ElkNode, tag: string): void;
  override logGraph(graph: unknown, tag: string, graphType: LoggedGraphType): void;
  override logGraph(graph: unknown, tag: string, graphType?: LoggedGraphType): void {
    if (graphType === undefined) {
      this.recorder.event(graph as ElkNode, tag);
    } else {
      super.logGraph(graph, tag, graphType);
    }
  }
}

/** How a row is run: through the engine, or (`mode` "provider") by calling the provider on the layout node directly. */
function drive(root: ElkNode, layoutId: string, mode: string, monitor: IElkProgressMonitor): void {
  if (mode === PROVIDER_MODE) {
    new RectPackingLayoutProvider().layout(layoutNodeOf(root, layoutId), monitor);
  } else {
    new RecursiveGraphLayoutEngine().layout(root, monitor);
  }
}

/** A plain engine run of a full row: the dump of the root. */
export function runFullRow(row: FullRow): ElkDump {
  const root = importInput(row);
  drive(root, row.expected.layoutNode, row.expected.mode, new BasicProgressMonitor());
  return dumpElk(root);
}

/** The stops and the final dump of a stops row from ONE engine run with the recording monitor. */
export function runStopsRow(row: StopsRow): { readonly graphs: GraphRun[]; readonly final: ElkDump } {
  const root = importInput(row);
  const recorder = new StopRecorder();
  drive(root, row.expected.layoutNode, row.expected.mode, new RecordingMonitor(recorder));
  return { graphs: recorder.graphRuns(), final: dumpElk(root) };
}

/** The innermost `cause` of a thrown value (the recorder reports the root cause). */
export function rootCauseOf(error: unknown): Error {
  let current = error as Error;
  while (current.cause instanceof Error) {
    current = current.cause;
  }
  return current;
}

/** The root cause thrown by a throws row, run as the row says; fails when nothing is thrown. */
export function runThrowsRow(row: ThrowsRow): Error {
  const root = importInput(row);
  try {
    drive(root, row.expected.layoutNode, row.expected.mode, new BasicProgressMonitor());
  } catch (error) {
    return rootCauseOf(error);
  }
  throw new Error(`${row.id} did not throw`);
}

const JVM_NULL_POINTER = 'java.lang.NullPointerException';

/** True for a row whose root cause is a JVM `NullPointerException` (the port throws a `TypeError`, D10; its message is JVM text). */
export const isJvmNullPointer = (row: ThrowsRow): boolean => row.expected.throws.class === JVM_NULL_POINTER;

/** The expected class name of a throws row in the port (the simple Java name; a JVM NullPointerException is a TypeError, D10). */
export const expectedThrowName = (row: ThrowsRow): string =>
  isJvmNullPointer(row) ? 'TypeError' : simpleJavaName(row.expected.throws.class);

/** The ported file of the recorded Java frame (`AreaApproximation.java:98` is `AreaApproximation.ts`). */
export const portedFrameFile = (row: ThrowsRow): string => `${row.expected.throws.frame.replace(/\.java:\d+$/, '')}.ts`;
