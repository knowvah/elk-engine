// SPDX-License-Identifier: EPL-2.0
// How a row of the compound ref is run (mission 7h, T2): the TS twin of `LayeredCompoundVectors.java` `layoutOnce` / `runFull` /
// `runModels` / `runScenario`. Every row (full, models, scenarios): load the input (an `.elkt` input has its unresolved options
// dropped, as the recorder's `loadFile` does), apply `options` to the ROOT ElkNode (a `null` value removes the property), check that
// no level has random seed 0, then `new RecursiveGraphLayoutEngine().layout(root, controller, new BasicProgressMonitor())` with a
// `TestController` for the layered algorithm (the engine installs it on the provider it fetches, as the recorder installs it on the
// pooled provider). The engine resolves INHERIT hierarchy handling and hands the root to `LayeredLayoutProvider`, which calls
// `ElkLayered.doCompoundLayout` for an INCLUDE_CHILDREN root. The export seeds are those of `exportLikeOracle` (tools/oracle/run.sh).
//
// What the controller's listener records (`PlanRecorder`, `StopRecorder`):
//   plans   level path -> positional names of the processors notified `ready` on the first graph of the level, in order;
//   stops   the hierarchical stops, numbered from 0 in run order: a `finished` notification of CompoundGraphPreprocessor or
//           CompoundGraphPostprocessor (the root), of a hierarchy aware processor on the ROOT (`isRoot`), or of
//           HierarchicalNodeResizingProcessor (any graph). Every other notification is no stop. `processor` is the positional
//           name, `className` the constructor name, `levelPath` that of the graph the processor ran on.
// The seams: `RunEnvironment.around` wraps the engine call (a twin installs `vi.spyOn` replacements of the compound processors there
// and restores them in `finally`); `wantTree` selects the stops whose whole tree is snapshotted; `abortAfter` aborts the run by an
// internal signal right after that stop's capture (for a test that needs only the stage up to that stop).
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { TestController, type ILayoutExecutionListener } from '../../src/core/testing/TestController.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import { isHierarchyAwareLayoutProcessor } from '../../src/alg/layered/IHierarchyAwareLayoutProcessor.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { isElkNode, type ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { applyOptions, loadInput } from './layered-phase-replay-rows.js';
import { levelPathOf } from './layered-pipeline-replay-ops.js';
import { planNames } from './layered-pipeline-replay-names.js';
import type { CompoundOptions, PlanMap } from './layered-compound-replay-rows.js';
import { dumpTree } from './layered-compound-replay-dump.js';
import { withEndLabelRule } from './unsized-end-labels.js';

export const COMPOUND_PREPROCESSOR = 'CompoundGraphPreprocessor';
export const COMPOUND_POSTPROCESSOR = 'CompoundGraphPostprocessor';
export const HIERARCHICAL_NODE_RESIZER_CLASS = 'HierarchicalNodeResizingProcessor';
export const HIERARCHICAL_NODE_RESIZER = 'HIERARCHICAL_NODE_RESIZER';
const COMPOUND_PROCESSORS: ReadonlySet<string> = new Set([COMPOUND_PREPROCESSOR, COMPOUND_POSTPROCESSOR]);
const DIRECTION_PREPROCESSOR = 'DIRECTION_PREPROCESSOR';
const DIRECTION_POSTPROCESSOR = 'DIRECTION_POSTPROCESSOR';
const ELKT_EXTENSION = '.elkt';

/** What a row's input and options are: the fields `runRow` reads. */
export interface RunnableRow {
  readonly id: string;
  readonly input: Parameters<typeof loadInput>[0];
  readonly options: CompoundOptions;
}

/** One hierarchical stop of a run; `tree` is present when `wantTree` selected the stop. */
export interface StopRecord {
  readonly index: number;
  readonly levelPath: string;
  readonly processor: string;
  readonly className: string;
  readonly tree?: unknown;
}

/** The seams of a run; every member is optional. */
export interface RunEnvironment {
  /** Wraps the engine call: a caller installs replacements before it and restores them after (the H3 twin). */
  readonly around?: <T>(run: () => T) => T;
  /** Whether the whole tree is snapshotted at this stop (default: never). */
  readonly wantTree?: (stop: Omit<StopRecord, 'tree'>) => boolean;
  /** The snapshot taken at a wanted stop (default: `dumpTree`). */
  readonly snapshot?: (root: LGraph) => unknown;
  /** Abort the run right after the capture of the stop with this index. */
  readonly abortAfter?: number;
  /** The monitor the engine is handed (default: a plain `BasicProgressMonitor`; a logged site row passes one with logging on). */
  readonly monitor?: BasicProgressMonitor;
}

/** The outcome of a run: the laid-out ELK root, the plan of every level reached, the stops. */
export interface RowRun {
  readonly root: ElkNode;
  readonly plans: PlanMap;
  readonly stops: readonly StopRecord[];
  /** True when `abortAfter` ended the run. */
  readonly aborted: boolean;
}

class StopAbort extends Error {}

// ------------------------------------------------------------------------------------------------------------
// names

const simpleNameOf = (processor: object): string => processor.constructor.name;

/**
 * The recorder's `nameOf` for one processor: the compound processors and the node resizer by class name, every other processor by
 * the landed `planNames` (a member name, `P3_NODE_ORDERING/LAYER_SWEEP`, ... told apart by `crossMinType`). A GraphTransformer is
 * `DIRECTION_PREPROCESSOR` here; `positionalNames` turns the later ones into the postprocessor.
 */
export function nameOfProcessor(processor: ILayoutProcessor<unknown>): string {
  const simple = simpleNameOf(processor);
  if (COMPOUND_PROCESSORS.has(simple)) {
    return simple;
  }
  if (simple === HIERARCHICAL_NODE_RESIZER_CLASS) {
    return HIERARCHICAL_NODE_RESIZER;
  }
  return planNames([processor as ILayoutProcessor<LGraph>])[0]!;
}

/** The names of a plan, GraphTransformer by position (the first is the preprocessor, the others the postprocessor). */
export function positionalNames(plan: readonly ILayoutProcessor<unknown>[]): string[] {
  let transformers = 0;
  return plan.map((processor) => {
    const name = nameOfProcessor(processor);
    return name === DIRECTION_PREPROCESSOR && transformers++ > 0 ? DIRECTION_POSTPROCESSOR : name;
  });
}

/** The recorder's `stopProcessor`: the positional name of a processor whose `finished` notification is a stop, else `null`. */
export function stopNameOf(processor: ILayoutProcessor<unknown>, isRoot: boolean): string | null {
  const simple = simpleNameOf(processor);
  if (COMPOUND_PROCESSORS.has(simple)) {
    return simple;
  }
  if (isHierarchyAwareLayoutProcessor(processor) && isRoot) {
    return nameOfProcessor(processor);
  }
  return simple === HIERARCHICAL_NODE_RESIZER_CLASS ? HIERARCHICAL_NODE_RESIZER : null;
}

// ------------------------------------------------------------------------------------------------------------
// the listener

const originOf = (graph: LGraph): ElkNode => {
  const origin: unknown = graph.getProperty(InternalProperties.ORIGIN);
  if (!isElkNode(origin)) {
    throw new Error('a laid-out graph without an ElkNode origin');
  }
  return origin;
};

function rootGraphOf(graph: LGraph): LGraph {
  let root = graph;
  while (root.getParentNode() !== null) {
    root = root.getParentNode()!.getGraph()!;
  }
  return root;
}

/** Records the plans (first graph of every level) and the stops of one engine run. */
export class RunRecorder implements ILayoutExecutionListener {
  readonly stops: StopRecord[] = [];
  aborted = false;
  private readonly first = new Map<ElkNode, LGraph>();
  private readonly processors = new Map<ElkNode, ILayoutProcessor<unknown>[]>();

  constructor(private readonly env: RunEnvironment) {}

  layoutProcessorReady(processor: ILayoutProcessor<unknown>, graph: unknown, _isRoot: boolean): void {
    const lgraph = graph as LGraph;
    const level = originOf(lgraph);
    const owner = this.first.get(level) ?? (this.first.set(level, lgraph), lgraph);
    if (owner === lgraph) {
      this.processors.set(level, [...(this.processors.get(level) ?? []), processor]);
    }
  }

  layoutProcessorFinished(processor: ILayoutProcessor<unknown>, graph: unknown, isRoot: boolean): void {
    const name = stopNameOf(processor, isRoot);
    if (name === null) {
      return;
    }
    const lgraph = graph as LGraph;
    const stop = {
      index: this.stops.length,
      levelPath: levelPathOf(originOf(lgraph)),
      processor: name,
      className: simpleNameOf(processor),
    };
    const tree = this.env.wantTree?.(stop) === true ? (this.env.snapshot ?? dumpTree)(rootGraphOf(lgraph)) : undefined;
    this.stops.push(tree === undefined ? stop : { ...stop, tree });
    if (this.env.abortAfter === stop.index) {
      throw new StopAbort();
    }
  }

  /** level path -> positional names; a level path must be unique within a run. */
  plans(): PlanMap {
    const plans: Record<string, readonly string[]> = {};
    for (const [level, list] of this.processors) {
      const path = levelPathOf(level);
      if (Object.hasOwn(plans, path)) {
        throw new Error(`level path ${path} is not unique`);
      }
      plans[path] = positionalNames(list);
    }
    return plans;
  }
}

// ------------------------------------------------------------------------------------------------------------
// the row

function allNodes(root: ElkNode): ElkNode[] {
  return [root, ...[...root.getChildren()].flatMap(allNodes)];
}

function elementsOf(node: ElkNode): ElkGraphElement[] {
  const labels = (element: ElkGraphElement): ElkGraphElement[] =>
    [...element.getLabels()].flatMap((label) => [label, ...labels(label)]);
  const shapes: ElkGraphElement[] = [node, ...node.getPorts(), ...node.getContainedEdges()];
  return [...shapes.flatMap((e) => [e, ...labels(e)]), ...[...node.getChildren()].flatMap(elementsOf)];
}

/** The recorder's `dropUnresolvedOptions`: an `.elkt` value no registered option parses stays a proxy; it is removed. */
function dropUnresolvedOptions(root: ElkNode): void {
  for (const element of elementsOf(root)) {
    [...element.getAllProperties()]
      .filter(([, value]) => value instanceof LayoutOptionProxy)
      .forEach(([key]) => element.setProperty(key, null));
  }
}

/** The row's options on the root: a `null` value removes the property (`setProperty(prop, null)`), the rest as `applyOptions`. */
export function applyCompoundOptions(root: ElkNode, options: CompoundOptions): void {
  const service = LayoutMetaDataService.getInstance();
  const set = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== null));
  applyOptions(root, set);
  for (const [id, value] of Object.entries(options)) {
    const data = service.getOptionData(id);
    if (value === null && data === null) {
      throw new Error(`option ${id} is unknown to the metadata service`);
    }
    if (value === null) {
      root.setProperty(data!, null);
    }
  }
}

/** A random seed of 0 would make the layout unrepeatable (the recorder's stop condition). */
export function checkSeeds(root: ElkNode): void {
  for (const node of allNodes(root)) {
    if (!node.getChildren().isEmpty() && node.getProperty(LayeredOptions.RANDOM_SEED) === 0) {
      throw new Error(`random seed 0 (stop condition) at ${levelPathOf(node)}`);
    }
  }
}

/** The row's input with its options applied to the root and the seeds checked: what the engine is handed. */
export function prepareRow(row: RunnableRow): ElkNode {
  const root = loadInput(row.input);
  if ('path' in row.input && row.input.path.endsWith(ELKT_EXTENSION)) {
    dropUnresolvedOptions(root);
  }
  applyCompoundOptions(root, row.options);
  checkSeeds(root);
  return root;
}

/**
 * Runs a row through the recursive engine with a controller and a `RunRecorder`. Errors the run throws propagate, except the
 * internal abort signal (`env.abortAfter`). The layout of a model with an unsized end label runs with assertions off, as
 * the recording JVM did (`withEndLabelRule`).
 */
export function runRow(row: RunnableRow, env: RunEnvironment = {}): RowRun {
  const root = prepareRow(row);
  const recorder = new RunRecorder(env);
  const controller = new TestController(LayeredOptions.ALGORITHM_ID);
  controller.addLayoutExecutionListener(recorder);
  const layout = (): void => {
    try {
      withEndLabelRule(root, () => {
        new RecursiveGraphLayoutEngine().layout(root, controller, env.monitor ?? new BasicProgressMonitor());
      });
    } catch (error) {
      if (!(error instanceof StopAbort) && !(error instanceof Error && error.cause instanceof StopAbort)) {
        throw error;
      }
      recorder.aborted = true;
    }
  };
  (env.around ?? ((run: () => unknown): unknown => run()))(layout);
  return { root, plans: recorder.plans(), stops: recorder.stops, aborted: recorder.aborted };
}
