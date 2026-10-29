// SPDX-License-Identifier: EPL-2.0
// The TS twin of the step interpreter and the prefix replay of tools/vectors/LayeredPhaseVectors.java (mission 7b; B1,
// B4). `runSteps` interprets a step row's `steps`; `runPrefix` replays a model row's `prefix`: import, `normalise`,
// then every named processor or phase. Processors and phases come from injected `Factories`, so one class can be
// tested before the enum arms that construct it are wired (T8).
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { contextOf, elementAt } from './layered-phase-replay-dump.js';
import { normalise } from './layered-phase-replay-normalise.js';
import { importRow, importTarget, prepareRoot, type PhaseRow, type PhaseStep } from './layered-phase-replay-rows.js';
import { property } from './layered-site-replay-context.js';

/** Builds the processors and phases a row names. */
export interface Factories {
  /** `IntermediateProcessorStrategy.<name>.create()`. */
  createProcessor(name: string): ILayoutProcessor<LGraph>;
  /** The phase instance a `P1_CYCLE_BREAKING` / `P2_LAYERING` strategy creates. */
  createPhase(phase: string, strategy: string): ILayoutProcessor<LGraph>;
}

/** The one table of step ops: op name to its exact argument count (the Java interpreter's header is the source). */
export const STEP_ARITY: Readonly<Record<string, number>> = {
  importGraph: 1,
  normalise: 0,
  setProperty: 3,
  layers: 1,
  reverseEdge: 1,
  runProcessor: 1,
  runPhase: 2,
  dump: 0,
};

const PHASE_SEPARATOR = '/';
const PHASES: ReadonlySet<string> = new Set(['P1_CYCLE_BREAKING', 'P2_LAYERING']);

function runOn(processor: ILayoutProcessor<LGraph>, graph: LGraph): void {
  processor.process(graph, new NullElkProgressMonitor());
}

class Interpreter {
  private graph: LGraph | null = null;
  private readonly root;

  constructor(
    private readonly row: PhaseRow,
    private readonly factories: Factories,
  ) {
    this.root = prepareRoot(row);
  }

  get current(): LGraph {
    if (this.graph === null) {
      throw new Error(`row ${this.row.id}: a step ran before importGraph`);
    }
    return this.graph;
  }

  finish(): LGraph {
    return this.current;
  }

  step([op, ...args]: PhaseStep): void {
    const arity = STEP_ARITY[op];
    if (arity === undefined) {
      throw new Error(`row ${this.row.id}: unknown step op ${op}`);
    }
    if (args.length !== arity) {
      throw new Error(`row ${this.row.id}: op ${op} takes ${String(arity)} arguments, got ${String(args.length)}`);
    }
    this.dispatch(op, args);
  }

  private dispatch(op: string, a: readonly unknown[]): void {
    switch (op) {
      case 'importGraph':
        this.graph = importTarget(this.root, a[0] as string | null);
        break;
      case 'normalise':
        normalise(this.current);
        break;
      case 'setProperty':
        this.setProperty(a[0] as string, a[1] as string, a[2]);
        break;
      case 'layers':
        this.layers(a[0] as string[][]);
        break;
      case 'reverseEdge':
        (elementAt(this.current, a[0] as string) as LEdge).reverse(this.current, true);
        break;
      case 'runProcessor':
        runOn(this.factories.createProcessor(a[0] as string), this.current);
        break;
      case 'runPhase':
        runOn(this.factories.createPhase(a[0] as string, a[1] as string), this.current);
        break;
      default:
        // 'dump': the caller dumps the returned graph with `phaseDump`
        break;
    }
  }

  private setProperty(path: string, id: string, value: unknown): void {
    const element = elementAt(this.current, path) as LGraphElement;
    element.setProperty(property(id), contextOf(this.current).decode(value));
  }

  /**
   * The X4 pattern, as the recorder runs it (LayeredPhaseVectors.java:1217-1228): one new `Layer` per list, in order,
   * each node moved in with `setLayer`. Like the Java `LNode.setLayer`, it leaves the graph's layerless list alone.
   */
  private layers(spec: readonly (readonly string[])[]): void {
    const graph = this.current;
    for (const paths of spec) {
      const nodes = paths.map((path) => elementAt(graph, path) as LNode);
      const layer = new Layer(graph);
      graph.getLayers().push(layer);
      nodes.forEach((node) => node.setLayer(layer));
    }
  }
}

/** Interprets a step row from its input to its last step; returns the graph (dump it with `phaseDump`). */
export function runSteps(row: PhaseRow, factories: Factories): LGraph {
  if (row.steps === null) {
    throw new Error(`row ${row.id} has no steps`);
  }
  const interpreter = new Interpreter(row, factories);
  row.steps.forEach((step) => interpreter.step(step));
  return interpreter.finish();
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

/** Replays a model row: import, `normalise`, then the recorded `prefix` in order. */
export function runPrefix(row: PhaseRow, factories: Factories): LGraph {
  if (row.prefix === null) {
    throw new Error(`row ${row.id} has no prefix`);
  }
  const { graph } = importRow(row);
  normalise(graph);
  row.prefix.forEach((entry) => runPrefixEntry(entry, graph, factories));
  return graph;
}
