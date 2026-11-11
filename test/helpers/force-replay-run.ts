// SPDX-License-Identifier: EPL-2.0
// Runs the stops of a force or stress ref row that mission 8b T6 owns the way tools/vectors/ForceVectors.java ran them
// (ForceLayoutProvider.layout :41-71, StressLayoutProvider.layout :46-85):
//   runImport(row)     NodeMicroLayout on the re-imported input (unless the option omits it) and ElkGraphImporter.importGraph; a stress row that
//                      ran the force pass first (`forcePass` stop) runs the real ForceLayoutProvider first (T6 stubbed it with the
//                      recorded geometry of that stop while the provider did not exist; T10 replaced the stub);
//   runSplit(row)      ComponentsProcessor.split on the graph rebuilt from the recorded `import` state (the provider's setOptions and
//                      updateModel, which only create the generator and choose the model, are not reproduced: split reads
//                      SEPARATE_CONNECTED_COMPONENTS only);
//   runRecombine(row)  ComponentsProcessor.recombine on the components rebuilt from the state of each component before the step.
// `ownedStop(row, step)` pairs the recorded body with the TS body of a step, ready for `compareJson`. T8 adds initialize/iteration*/
// applyLayout/full/throws here and T10 the stress stops, each as one more case of that function.
import { NodeMicroLayout } from '../../src/alg/common/NodeMicroLayout.js';
import { ComponentsProcessor } from '../../src/alg/force/ComponentsProcessor.js';
import { ElkGraphImporter } from '../../src/alg/force/ElkGraphImporter.js';
import { ForceLayoutProvider } from '../../src/alg/force/ForceLayoutProvider.js';
import type { FGraph } from '../../src/alg/force/graph/FGraph.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { StressOptions } from '../../src/alg/force/options/StressOptions.js';
import { LayoutAlgorithmResolver } from '../../src/core/data/LayoutAlgorithmResolver.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../src/core/util/ElkUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import {
  dumpRecombine,
  dumpState,
  importInput,
  rebuildComponents,
  rebuildGraph,
  type CompareOptions,
  type DumpOptions,
} from './force-replay-dump.js';
import {
  componentStatesBeforeRecombine,
  findStop,
  STEP_FORCE_PASS,
  STEP_IMPORT,
  STEP_RECOMBINE,
  STEP_SPLIT,
  stopOf,
  type StopsRow,
} from './force-replay-rows.js';

/** The steps this file runs. */
export const OWNED_STEPS = [STEP_IMPORT, STEP_SPLIT, STEP_RECOMBINE] as const;
export type OwnedStep = (typeof OWNED_STEPS)[number];

/** `ForceVectors.resolve`: the algorithm resolver runs on the graph before any step. */
const resolve = (graph: ElkNode): void => {
  ElkUtil.applyVisitors(graph, new LayoutAlgorithmResolver());
};

/** The dump options of a ref: a stress row adds the stress props. */
export const dumpOptionsOf = (row: StopsRow): DumpOptions => ({ stress: row.ref === 'stress' });

/** The `omitNodeMicroLayout` option the provider of the row's ref reads (`ForceLayoutProvider.java:44`, `StressLayoutProvider.java:55`). */
const omitsMicroLayout = (row: StopsRow, graph: ElkNode): boolean =>
  graph.getProperty(row.ref === 'stress' ? StressOptions.OMIT_NODE_MICRO_LAYOUT : ForceOptions.OMIT_NODE_MICRO_LAYOUT);

/** The ELK graph a row's import starts from, after the steps before `import`. */
export function prepareForImport(row: StopsRow): ElkNode {
  const graph = importInput(row);
  resolve(graph);
  if (findStop(row, STEP_FORCE_PASS) !== undefined) {
    // stress, not interactive: the force provider runs first (`StressLayoutProvider.java:50`), as the recorder does
    // (`ForceVectors.stress`: a monitor begun with "ELK Stress", the force pass on its sub task)
    const monitor = new BasicProgressMonitor();
    monitor.begin('ELK Stress', 1);
    new ForceLayoutProvider().layout(graph, monitor.subTask(1)!);
  } else if (!omitsMicroLayout(row, graph)) {
    NodeMicroLayout.forGraph(graph).execute();
  }
  return graph;
}

/** The FGraph `ElkGraphImporter.importGraph` makes for a row. */
export function runImport(row: StopsRow): FGraph {
  return new ElkGraphImporter().importGraph(prepareForImport(row));
}

/** The components `ComponentsProcessor.split` makes of the graph rebuilt from the recorded `import` state. */
export function runSplit(row: StopsRow): FGraph[] {
  return new ComponentsProcessor().split(rebuildGraph(stopOf(row, STEP_IMPORT).state));
}

/** The components (sorted in place) and the graph `ComponentsProcessor.recombine` makes of the recorded states before the step. */
export function runRecombine(row: StopsRow): { components: FGraph[]; result: FGraph } {
  const components = rebuildComponents(componentStatesBeforeRecombine(row));
  const result = new ComponentsProcessor().recombine(components);
  return { components, result };
}

/** A recorded stop body and the TS body of the same step, with the comparison options that apply. */
export interface OwnedStopResult {
  readonly expected: unknown;
  readonly actual: unknown;
  readonly options: CompareOptions;
}

/** The generator cannot be rebuilt from its fingerprint, so an isolated step from a dumped state ignores `randomPeek`. */
const NO_RANDOM_PEEK: CompareOptions = { ignore: ['randomPeek'] };

/** Replays one owned step of a stops row; `null` when the row has no such stop. */
export function ownedStop(row: StopsRow, step: OwnedStep): OwnedStopResult | null {
  const dump = dumpOptionsOf(row);
  if (step === STEP_IMPORT) {
    const stop = findStop(row, STEP_IMPORT);
    return stop === undefined ? null : { expected: stop.state, actual: dumpState(runImport(row), dump), options: {} };
  }
  if (step === STEP_SPLIT) {
    const stop = findStop(row, STEP_SPLIT);
    return stop === undefined
      ? null
      : { expected: stop.components, actual: runSplit(row).map((c) => dumpState(c, dump)), options: NO_RANDOM_PEEK };
  }
  const stop = findStop(row, STEP_RECOMBINE);
  if (stop === undefined) {
    return null;
  }
  const { components, result } = runRecombine(row);
  return {
    expected: { components: stop.components, result: stop.result },
    actual: dumpRecombine(components, result, dump),
    options: NO_RANDOM_PEEK,
  };
}
