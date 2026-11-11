// SPDX-License-Identifier: EPL-2.0
// Runs a vertiflex ref row through the real provider the way tools/vectors/VertiFlexVectors.java did (mission 8a, T11):
//   runFull(row)    the engine run on the re-imported input: the final dump;
//   runStops(row)   the engine run under a progress monitor tree shaped like the recorder's `Hook` (depth 1 is the provider's monitor,
//                   depth 2 the processors): Preamble = the provider creates the sub monitor of its first processor, each phase = its
//                   sub monitor completes, SetGraphSize = the provider's own monitor completes. `Import` is taken before the run and
//                   `NodeMicroLayout` from a separate re-imported copy, as the recorder did. Returns the dumps by step name, in order;
//   runThrows(row)  the engine run; the error it throws (or null when it completes).
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { dumpVertiFlex, importInput } from './vertiflex-replay-dump.js';
import {
  ROUTER_STEPS,
  STEP_IMPORT,
  STEP_MICRO,
  STEP_PREAMBLE,
  STEP_SET_GRAPH_SIZE,
  type Dump,
  type FullRow,
  type StopsRow,
  type ThrowsRow,
} from './vertiflex-replay-rows.js';

const PROVIDER_DEPTH = 1;
const PROCESSOR_DEPTH = 2;

/** One recorded stop of a TS run. */
export interface CapturedStop {
  readonly step: string;
  readonly dump: Dump;
}

/** The monitor of the recorder's `Hook`: reports a stop at its three kinds of hooks. */
class Hook extends BasicProgressMonitor {
  constructor(
    private readonly recorder: StopCapture,
    private readonly depth: number,
  ) {
    super();
  }

  protected override doSubTask(_work: number, _maxHierarchyLevels: number): BasicProgressMonitor {
    if (this.depth === PROVIDER_DEPTH) {
      this.recorder.onProcessorStart();
    }
    return new Hook(this.recorder, this.depth + 1);
  }

  protected override doDone(_topInstance: boolean, _maxHierarchyLevels: number): void {
    if (this.depth === PROCESSOR_DEPTH) {
      this.recorder.onProcessorDone();
    } else if (this.depth === PROVIDER_DEPTH) {
      this.recorder.stop(STEP_SET_GRAPH_SIZE);
    }
  }
}

class StopCapture {
  readonly stops: CapturedStop[] = [];
  private preamble = false;
  private done = 0;

  constructor(
    private readonly graph: ElkNode,
    private readonly processors: readonly string[],
  ) {}

  stop(step: string): void {
    this.stops.push({ step, dump: dumpVertiFlex(this.graph) });
  }

  onProcessorStart(): void {
    if (!this.preamble) {
      this.preamble = true;
      this.stop(STEP_PREAMBLE);
    }
  }

  onProcessorDone(): void {
    this.stop(this.processors[this.done] ?? `processor#${String(this.done)}`);
    this.done++;
  }
}

/** The processor step names a stops row recorded (between Preamble and SetGraphSize). */
export function processorSteps(row: StopsRow): string[] {
  return row.expected.steps.filter(
    (step) => ![STEP_IMPORT, STEP_MICRO, STEP_PREAMBLE, STEP_SET_GRAPH_SIZE].includes(step),
  );
}

/** The router step a stops row names. */
export const routerStepOf = (row: StopsRow): (typeof ROUTER_STEPS)[number] =>
  ROUTER_STEPS.find((step) => row.expected.steps.includes(step))!;

/** The `full` dump of the TS run of a row (the `props` of the dump included). */
export function runFull(row: FullRow | StopsRow): Dump {
  const graph = importInput(row);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return dumpVertiFlex(graph);
}

/** The stops of the TS run of a stops row, in the recorder's order: Import, NodeMicroLayout, Preamble, processors, SetGraphSize. */
export function runStops(row: StopsRow): CapturedStop[] {
  const graph = importInput(row);
  const capture = new StopCapture(graph, processorSteps(row));
  capture.stop(STEP_IMPORT);
  const micro = importInput(row);
  if (!micro.getProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT)) {
    NodeMicroLayout.forGraph(micro).execute();
  }
  const microStop: CapturedStop = { step: STEP_MICRO, dump: dumpVertiFlex(micro) };
  new RecursiveGraphLayoutEngine().layout(graph, new Hook(capture, 0));
  const [importStop, ...rest] = capture.stops;
  return [importStop!, microStop, ...rest];
}

/** The error the TS run of a throws row raised, or `null` when it completed. */
export function runThrows(row: ThrowsRow): unknown {
  try {
    const graph = importInput(row);
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  } catch (error) {
    return error;
  }
  return null;
}
