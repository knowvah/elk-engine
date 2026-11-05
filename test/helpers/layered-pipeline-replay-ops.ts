// SPDX-License-Identifier: EPL-2.0
// The replay of mission 7f (F4, F5). `runFullRow`/`compareFullRow` lay a whole graph out through the recursive engine
// and compare the export and the per-level plans; `runStopRow` replays a model row through the real driver
// (`prepareLayoutTest`, `getLayoutTestConfiguration`, `runLayoutTestStep`) rather than a hand-walked prefix; and
// `runPipelineSteps` interprets the `componentsSplit` / `componentsCombine` step ops before the landed 7b `runSteps`
// sees the rest. The driver, the dump, the comparator and the components processor are parameters: `ElkLayered` is
// staged until T8, the tests inject a fake, and T9/T10 pass `new ElkLayered()` with the 7b-7e dump and comparator of
// the row's own family. The level path of `expected.plans` is the ELK ids from the root down, joined by `/`
// (`levelPathOf`); a graph without an id on a level path uses the empty string for it.
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { NullElkProgressMonitor } from '../../src/core/util/NullElkProgressMonitor.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { compareLayout, type Diff } from '../golden/compare-json.js';
import { exportLikeOracle } from './graph-json-oracle.js';
import { encodeHex, type HexQuad, type LGraphDump } from './layered-framework-replay.js';
import { contextOf, importDumpOf } from './layered-phase-replay-dump.js';
import { compareRouting } from './layered-routing-replay-compare.js';
import { routingDump } from './layered-routing-replay-dump.js';
import type { RoutingExpected } from './layered-routing-replay-rows.js';
import type { Diff as PhaseDiff } from './layered-phase-replay-compare.js';
import { runSteps, type Factories } from './layered-phase-replay-ops.js';
import { applyOptions, importRow, loadInput, type PhaseRow, type PhaseStep } from './layered-phase-replay-rows.js';
import { planNames } from './layered-pipeline-replay-names.js';
import type { ComponentsExpected, FullRow, PipelineStopRow, PlanMap } from './layered-pipeline-replay-rows.js';

/** What a driver's test state must expose: the graphs under test (`ElkLayered.TestExecutionState#getGraphs`). */
export interface DriverState {
  getGraphs(): LGraph[] | null;
}

/** The test API of `ElkLayered` (Java `prepareLayoutTest`, `getLayoutTestConfiguration`, `runLayoutTestStep`). */
export interface PipelineDriver<S extends DriverState = DriverState> {
  prepareLayoutTest(graph: LGraph): S;
  getLayoutTestConfiguration(state: S): Iterable<ILayoutProcessor<LGraph>>;
  runLayoutTestStep(state: S): void;
}

/** The two operations of `ComponentsProcessor` the `componentsSplit` / `componentsCombine` ops call. */
export interface ComponentsHandler {
  split(graph: LGraph): readonly LGraph[];
  combine(components: readonly LGraph[], target: LGraph): void;
}

export const COMPONENTS_SPLIT_OP = 'componentsSplit';
export const COMPONENTS_COMBINE_OP = 'componentsCombine';
const DUMP_OP = 'dump';
const LEVEL_SEPARATOR = '/';

/** The result of a `full` replay: the exported layout and the plan of each hierarchy level. */
export interface FullResult {
  readonly layout: unknown;
  readonly plans: PlanMap;
}

// ------------------------------------------------------------------------------------------------------------
// full rows

/** The level path of a node: the ids from the root down, joined by `/`. */
export function levelPathOf(node: ElkNode): string {
  const ids: string[] = [];
  for (let n: ElkNode | null = node; n !== null; n = n.getParent()) {
    ids.unshift(n.getIdentifier() ?? '');
  }
  return ids.join(LEVEL_SEPARATOR);
}

/**
 * Whether the recursive engine lays a level out for this node: it has children, or inside self loops
 * (`RecursiveGraphLayoutEngine.gatherInsideSelfLoops`: INSIDE_SELF_LOOPS_ACTIVATE and a self loop marked INSIDE_SELF_LOOPS_YO).
 */
function isLevel(node: ElkNode): boolean {
  if (!node.getChildren().isEmpty()) {
    return true;
  }
  if (!node.getProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE)) {
    return false;
  }
  for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
    if (edge.isSelfloop() && edge.getProperty(CoreOptions.INSIDE_SELF_LOOPS_YO)) {
      return true;
    }
  }
  return false;
}

/** The levels the engine lays out (see `isLevel`), the root first, depth first. */
export function levelsOf(root: ElkNode): ElkNode[] {
  const levels: ElkNode[] = [];
  const visit = (node: ElkNode): void => {
    if (isLevel(node)) {
      levels.push(node);
    }
    for (const child of node.getChildren()) {
      visit(child);
    }
  };
  visit(root);
  return levels;
}

function planOf<S extends DriverState>(driver: PipelineDriver<S>, level: ElkNode): string[] {
  const state = driver.prepareLayoutTest(new ElkGraphTransformer().importGraph(level));
  return planNames(Array.from(driver.getLayoutTestConfiguration(state)));
}

function preparedRoot(row: FullRow): ElkNode {
  const root = loadInput(row.input);
  applyOptions(root, row.options);
  return root;
}

/**
 * Lays a `full` row out: the input with the row's options on the root, the recursive engine, the oracle's export;
 * the plans come from a second, untouched copy of the input prepared through the driver, level by level.
 */
export function runFullRow<S extends DriverState>(row: FullRow, driver: PipelineDriver<S>): FullResult {
  const graph = preparedRoot(row);
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  const plans: Record<string, string[]> = {};
  levelsOf(preparedRoot(row)).forEach((level) => {
    plans[levelPathOf(level)] = planOf(driver, level);
  });
  return { layout: JSON.parse(exportLikeOracle(graph)) as unknown, plans };
}

function firstPlanDiff(level: string, expected: readonly string[], actual: readonly string[]): Diff[] {
  const length = Math.max(expected.length, actual.length);
  for (let i = 0; i < length; i++) {
    if (expected[i] !== actual[i]) {
      return [{ path: `plans[${level}][${String(i)}]`, kind: 'value', expected: expected[i], actual: actual[i] }];
    }
  }
  return [];
}

function planDiffs(expected: PlanMap, actual: PlanMap): Diff[] {
  const levels = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  return [...levels].flatMap((level): Diff[] => {
    if (!Object.hasOwn(actual, level)) {
      return [{ path: `plans[${level}]`, kind: 'missing', expected: expected[level] }];
    }
    if (!Object.hasOwn(expected, level)) {
      return [{ path: `plans[${level}]`, kind: 'extra', actual: actual[level] }];
    }
    return firstPlanDiff(level, expected[level]!, actual[level]!);
  });
}

/** The layout diffs at AD-4 (`compareLayout`, 1e-6), then the exact plan diffs (the first differing entry per level). */
export function compareFullRow(actual: FullResult, row: FullRow): Diff[] {
  return [...compareLayout(row.expected.layout, actual.layout).diffs, ...planDiffs(row.expected.plans, actual.plans)];
}

// ------------------------------------------------------------------------------------------------------------
// stop rows

/** How a stop row is dumped and compared; the driver is the real `ElkLayered` (T9, T10) or a fake (tests). */
export interface StopOptions<S extends DriverState, E, D> {
  readonly driver: PipelineDriver<S>;
  readonly dump: (graph: LGraph, importDump: LGraphDump) => E;
  readonly compare: (actual: E, expected: E) => readonly D[];
}

/**
 * Replays a model row through the driver (F5): import with the row's options, `prepareLayoutTest`, check that the
 * names of the plan's first entries equal `row.prefix`, `runLayoutTestStep` once per prefix entry, dump the first
 * graph under test and compare it with the row's expectation. Returns the comparator's diffs.
 *
 * @throws Error naming the row and the first differing entry when the plan departs from the prefix
 */
export function runStopRow<S extends DriverState, E, D>(
  row: PipelineStopRow,
  { driver, dump, compare }: StopOptions<S, E, D>,
): readonly D[] {
  if (row.prefix === null) {
    throw new Error(`row ${row.id} has no prefix`);
  }
  const { prefix } = row;
  const { graph, importDump } = importRow(row as unknown as PhaseRow);
  const state = driver.prepareLayoutTest(graph);
  const plan = Array.from(driver.getLayoutTestConfiguration(state)).slice(0, prefix.length);
  const names = planNames(plan);
  const at = prefix.findIndex((entry, i) => names[i] !== entry);
  if (at >= 0 || names.length < prefix.length) {
    const i = at >= 0 ? at : names.length;
    throw new Error(
      `row ${row.id}: plan entry ${String(i)} is ${names[i] ?? '(none)'}, the row's prefix has ${prefix[i]!}`,
    );
  }
  prefix.forEach(() => driver.runLayoutTestStep(state));
  const stopped = state.getGraphs()?.[0];
  if (stopped === undefined) {
    throw new Error(`row ${row.id}: the driver holds no graph after the prefix`);
  }
  // the row's own `expected` is the family's expectation (E): the caller pairs row family, dump and comparator
  return compare(dump(stopped, importDump), row.expected as unknown as E);
}

// ------------------------------------------------------------------------------------------------------------
// step rows with component ops (LayeredPipelineVectors.java `runSteps`, header "NEW STEP OPS")

/** What the replay of a step row ended on: the target graph, the component list after a split, and how the row ends. */
export interface PipelineStepsResult {
  readonly graph: LGraph;
  /** The component list `componentsSplit` produced, in list order; `null` for a row without a split. */
  readonly components: readonly LGraph[] | null;
  /** `split`: the row ends on the component list; `combine`/`dump`: on a dump of the target; `null`: no terminal op. */
  readonly terminal: 'split' | 'combine' | 'dump' | null;
}

const PHASES: ReadonlySet<string> = new Set([
  'P1_CYCLE_BREAKING',
  'P2_LAYERING',
  'P3_NODE_ORDERING',
  'P4_NODE_PLACEMENT',
  'P5_EDGE_ROUTING',
]);

const RUN_OPS: ReadonlySet<string> = new Set(['runProcessor', 'runPhase']);
const isSplit = ([op]: PhaseStep): boolean => op === COMPONENTS_SPLIT_OP;

function runOnEach(step: PhaseStep, components: readonly LGraph[], factories: Factories): void {
  const [op, a, b] = step as readonly [string, string, string?];
  const processor = op === 'runProcessor' ? factories.createProcessor(a) : makePhase(a, b!, factories);
  components.forEach((component) => processor.process(component, new NullElkProgressMonitor()));
}

function makePhase(phase: string, strategy: string, factories: Factories): ILayoutProcessor<LGraph> {
  if (!PHASES.has(phase)) {
    throw new Error(`step runPhase names the unknown phase ${phase}`);
  }
  return factories.createPhase(phase, strategy);
}

/** The end of `ElkLayered.layout` before `combine`: every component's layered nodes go back to its layerless list. */
function unlayer(component: LGraph): void {
  for (const layer of component.getLayers()) {
    component.getLayerlessNodes().push(...layer.getNodes());
    layer.getNodes().length = 0;
  }
  component.getLayerlessNodes().forEach((node) => node.setLayer(null));
  component.getLayers().length = 0;
}

function tailStep(
  row: PipelineStopRow,
  step: PhaseStep,
  index: number,
  last: number,
  handler: ComponentsHandler,
  state: { graph: LGraph; components: readonly LGraph[] },
  factories: Factories,
): PipelineStepsResult['terminal'] {
  const [op, ...args] = step;
  if (RUN_OPS.has(op)) {
    runOnEach(step, state.components, factories);
    return null;
  }
  if (op === COMPONENTS_COMBINE_OP && index === last && args.length === 0) {
    state.components.forEach(unlayer);
    handler.combine(state.components, state.graph);
    return 'combine';
  }
  if (op === DUMP_OP && index === last) {
    return 'dump';
  }
  throw new Error(`row ${row.id}: step ${op} cannot follow ${COMPONENTS_SPLIT_OP} here`);
}

/**
 * Interprets a step row as the recorder does. The steps before the first `componentsSplit` run through the landed
 * `runSteps`; `componentsSplit` (no arguments, once) splits the graph through `components`; every later `runProcessor` /
 * `runPhase` runs on EACH component in list order; `componentsCombine` is the last step after a split, first
 * un-layers every component (the end of `ElkLayered.layout`), then calls `combine(components, graph)`. A trailing
 * `dump` targets the graph. Dump the result with `pipelineDump`.
 */
export function runPipelineSteps(
  row: PipelineStopRow,
  factories: Factories,
  components: ComponentsHandler,
): PipelineStepsResult {
  const steps = row.steps;
  if (steps === null) {
    throw new Error(`row ${row.id} has no steps`);
  }
  const at = steps.findIndex(isSplit);
  if (at < 0 && steps.some(([op]) => op === COMPONENTS_COMBINE_OP)) {
    throw new Error(`row ${row.id}: ${COMPONENTS_COMBINE_OP} needs a ${COMPONENTS_SPLIT_OP} before it`);
  }
  const head = at < 0 ? steps : steps.slice(0, at);
  const graph = runSteps({ ...(row as unknown as PhaseRow), steps: head }, factories);
  if (at < 0) {
    return { graph, components: null, terminal: null };
  }
  if (steps[at]!.length !== 1) {
    throw new Error(`row ${row.id}: op ${COMPONENTS_SPLIT_OP} takes 0 arguments, got ${String(steps[at]!.length - 1)}`);
  }
  const state = { graph, components: components.split(graph) };
  const tail = steps.slice(at + 1);
  let terminal: PipelineStepsResult['terminal'] = tail.length === 0 ? 'split' : null;
  tail.forEach((step, i) => {
    terminal = tailStep(row, step, i, tail.length - 1, components, state, factories);
  });
  return { graph, components: state.components, terminal };
}

// ------------------------------------------------------------------------------------------------------------
// what component rows expect

export type { ComponentsExpected };

/** The component list of a split, in the row's shape; node paths are the import's, as the recorder encodes them. */
export function componentsDump(graph: LGraph, components: readonly LGraph[]): ComponentsExpected {
  const ctx = contextOf(graph);
  return {
    components: components.map((component) => {
      const sides = component.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
      const { top, right, bottom, left } = component.getPadding();
      return {
        nodes: component.getLayerlessNodes().map((node) => ctx.pathOf(node)),
        extPortConnections: sides === null ? null : Array.from(sides, (side) => side.name()),
        padding: [encodeHex(top), encodeHex(right), encodeHex(bottom), encodeHex(left)],
      };
    }),
  };
}

/** Exact comparison of two component lists (paths, side names and hex-encoded paddings are all strings). */
export function compareComponents(actual: ComponentsExpected, expected: ComponentsExpected): PhaseDiff[] {
  const same = JSON.stringify(actual.components) === JSON.stringify(expected.components);
  return same
    ? []
    : [
        {
          where: 'components',
          message: `expected ${JSON.stringify(expected.components)}, got ${JSON.stringify(actual.components)}`,
        },
      ];
}

/** A terminal `componentsSplit` row dumps the component list; a `componentsCombine` or `dump` row the target (7e). */
export function pipelineDump(result: PipelineStepsResult): ComponentsExpected | RoutingExpected {
  if (result.terminal === 'split') {
    return componentsDump(result.graph, result.components!);
  }
  return routingDump(result.graph, importDumpOf(result.graph));
}

/** The comparator of `pipelineDump`: `compareComponents` for a component list, 7e's `compareRouting` for a target dump. */
export function comparePipeline(
  actual: ComponentsExpected | RoutingExpected,
  expected: ComponentsExpected | RoutingExpected,
): PhaseDiff[] {
  if ('components' in expected && 'components' in actual) {
    return compareComponents(actual, expected);
  }
  if ('components' in expected || 'components' in actual) {
    return [{ where: 'expected', message: 'a component list was compared with a target dump' }];
  }
  return compareRouting(actual, expected);
}
