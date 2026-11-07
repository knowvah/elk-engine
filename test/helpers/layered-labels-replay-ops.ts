// SPDX-License-Identifier: EPL-2.0
// TS twins of the three step ops mission 7f2 adds (G2, G5, G6; positions as LayeredLabelsVectors.java records them):
//   ["labelManager", "<kind>"]  the FIRST step, before importGraph (import target null): sets the manager on the ROOT ElkNode
//                               before the import copies it: "none" leaves it unset, "shrink-width" installs the G6 manager;
//   ["interactive"]             TERMINAL: layout, export as `layout1`, `InteractiveLayeredGraphVisitor.visit(node)`, layout;
//   ["logging"]                 TERMINAL: the layout runs with `new BasicProgressMonitor().withLogging(true)`; the graphs
//                               logged over the monitor tree are captured as `{ tags, dot, json }`.
// The ops attach to 7f's interpreter by import: `runLabelsRow` peels them off, runs the remainder through 7f's
// `runPipelineSteps` and performs the ops around it. Nothing in the 7f helpers is edited.
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { LayeredLayoutProvider } from '../../src/alg/layered/LayeredLayoutProvider.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILabelManager } from '../../src/core/labels/ILabelManager.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LabelManagementOptions } from '../../src/core/labels/LabelManagementOptions.js';
import { KVector } from '../../src/core/math/KVector.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import type { IGraphElementVisitor } from '../../src/core/util/IGraphElementVisitor.js';
import { LoggedGraphType, type LoggedGraph } from '../../src/core/util/LoggedGraph.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { exportLikeOracle } from './graph-json-oracle.js';
import type { Logged } from './layered-labels-replay-logged.js';
import type { Factories } from './layered-phase-replay-ops.js';
import type { PhaseStep } from './layered-phase-replay-rows.js';
import { runPipelineSteps, type ComponentsHandler, type PipelineStepsResult } from './layered-pipeline-replay-ops.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';

export const LABEL_MANAGER_OP = 'labelManager';
export const INTERACTIVE_OP = 'interactive';
export const LOGGING_OP = 'logging';
export const LABEL_MANAGER_NONE = 'none';
export const LABEL_MANAGER_SHRINK_WIDTH = 'shrink-width';

// ------------------------------------------------------------------------------------------------------------
// the G6 manager

/**
 * The recorder's `shrink-width` manager (LayeredLabelsVectors.java `ShrinkWidthManager`): a label wider than the target
 * becomes `target x height`, any other label is not shortened (`null`). The label is never mutated. The class is named as
 * the Java binary name of the nested recorder class because the dump encodes an opaque property value (the
 * `labelManager` option) by its class name.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
class LayeredLabelsVectors$ShrinkWidthManager implements ILabelManager {
  /**
   * The recorder's manager has no `toString`, so the oracle exports the option as `Object.toString()`, `<binary name>@<hex
   * identity hash>`, the hash being 1 under `-XX:hashCode=2`. The twin is test data (G6), so it prints that string.
   */
  toString(): string {
    return `${LayeredLabelsVectors$ShrinkWidthManager.name}@${ORACLE_IDENTITY_HASH}`;
  }

  manageLabelSize(label: unknown, targetWidth: number): KVector | null {
    const elkLabel = label as ElkLabel;
    return elkLabel.getWidth() > targetWidth ? new KVector(targetWidth, elkLabel.getHeight()) : null;
  }
}

/** The identity hash of every object under the oracle's `-XX:hashCode=2`. */
const ORACLE_IDENTITY_HASH = 1;

/**
 * Java registers `LabelManagementOptions` through the service loader; `registerLayered` registers the layered provider only,
 * and `JsonExporter` omits an unknown option, so the `labelManager` option would be missing from a layout export.
 */
export function registerLabelManagementOptions(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(LabelManagementOptions.LABEL_MANAGER.getId()) === null) {
    service.registerLayoutMetaDataProviders(new LabelManagementOptions());
  }
}

/**
 * The manager of a kind: `shrink-width` only. `none` has no manager (`installLabelManager` leaves the option unset).
 *
 * @throws Error naming the kind when it is not a manager
 */
export function createLabelManager(kind: string): ILabelManager {
  if (kind !== LABEL_MANAGER_SHRINK_WIDTH) {
    throw new Error(`unknown label manager kind ${kind}`);
  }
  return new LayeredLabelsVectors$ShrinkWidthManager();
}

/** Installs the manager of `kind` on the node (`none`: nothing is set). */
export function installLabelManager(root: ElkNode, kind: string): void {
  registerLabelManagementOptions();
  if (kind !== LABEL_MANAGER_NONE) {
    root.setProperty(LabelManagementOptions.LABEL_MANAGER, createLabelManager(kind));
  }
}

function rootOf(node: ElkNode): ElkNode {
  let root = node;
  for (let parent = root.getParent(); parent !== null; parent = root.getParent()) {
    root = parent;
  }
  return root;
}

/**
 * Runs `run` with the manager of `kind` installed on the root of the graph the 7f interpreter imports, immediately before
 * the import (as the recorder sets it on the root before `importGraph`). The transformer is patched for the call only.
 */
function withManager<T>(kind: string, run: () => T): T {
  const original = ElkGraphTransformer.prototype.importGraph;
  ElkGraphTransformer.prototype.importGraph = function (this: ElkGraphTransformer, graph: ElkNode): LGraph {
    installLabelManager(rootOf(graph), kind);
    return original.call(this, graph);
  };
  try {
    return run();
  } finally {
    ElkGraphTransformer.prototype.importGraph = original;
  }
}

// ------------------------------------------------------------------------------------------------------------
// logging

/** Every logged graph of the monitor and its sub-monitors, depth first: own graphs first, children in creation order. */
function loggedGraphsOf(monitor: IElkProgressMonitor): LoggedGraph[] {
  // a monitor without logging returns the Java `null` here
  const own = (monitor.getLoggedGraphs() as LoggedGraph[] | null) ?? [];
  return [...own, ...monitor.getSubMonitors().flatMap(loggedGraphsOf)];
}

/**
 * The recorder's `expected.logged` (`logged(root)`): one DOT and one JSON entry per logged pair, depth first over the monitor
 * tree; `tags[i]` is the tag shared by `dot[i]` and `json[i]`.
 *
 * @throws Error when a graph is neither DOT nor JSON or the two lists do not pair up by tag (the recorder's own check)
 */
export function capturedLogged(monitor: IElkProgressMonitor): Logged {
  const tags: string[] = [];
  const dot: string[] = [];
  const json: string[] = [];
  const jsonTags: string[] = [];
  for (const logged of loggedGraphsOf(monitor)) {
    const type = logged.getGraphType();
    if (type === LoggedGraphType.DOT) {
      tags.push(logged.getTag());
      dot.push(logged.getGraph() as string);
    } else if (type === LoggedGraphType.JSON) {
      jsonTags.push(logged.getTag());
      json.push(logged.getGraph() as string);
    } else {
      throw new Error(`a logged graph of type ${String(type)}`);
    }
  }
  if (JSON.stringify(tags) !== JSON.stringify(jsonTags)) {
    throw new Error('the logged DOT and JSON graphs do not pair up by tag');
  }
  return { tags, dot, json };
}

// ------------------------------------------------------------------------------------------------------------
// the interpreter around 7f's

/** What a labels row replay produced: 7f's result plus `layout1` (interactive) and `logged` (logging). */
export interface LabelsStepsResult extends PipelineStepsResult {
  /** The export after the first layout of an `interactive` row. */
  readonly layout1?: unknown;
  /** The captured logged graphs of a `logging` row. */
  readonly logged?: Logged;
}

/** The pieces a row's ops need: the visitor for `interactive` (T10's class arrives later, so it is a factory). */
export interface LabelsEnvironment {
  readonly factories: Factories;
  readonly components: ComponentsHandler;
  readonly createInteractiveVisitor?: () => IGraphElementVisitor;
}

const exportOf = (node: ElkNode): unknown => JSON.parse(exportLikeOracle(node)) as unknown;
const originOf = (graph: LGraph): ElkNode => graph.getProperty(InternalProperties.ORIGIN) as ElkNode;

function terminal(row: PipelineStopRow, steps: readonly PhaseStep[]): PhaseStep | null {
  const last = steps[steps.length - 1];
  return last !== undefined && (last[0] === INTERACTIVE_OP || last[0] === LOGGING_OP) ? last : null;
}

function checkNoArguments(row: PipelineStopRow, step: PhaseStep): void {
  if (step.length !== 1) {
    throw new Error(`row ${row.id}: op ${step[0]} takes 0 arguments and ends the row`);
  }
}

/** The terminal `interactive` step: layout, `layout1`, the visitor, layout again (recorder `terminalDump`). */
function interactive(graph: LGraph, env: LabelsEnvironment, rowId: string): LabelsStepsResult {
  if (env.createInteractiveVisitor === undefined) {
    throw new Error(`row ${rowId}: op ${INTERACTIVE_OP} needs a visitor factory (InteractiveLayeredGraphVisitor, T10)`);
  }
  const node = originOf(graph);
  const provider = new LayeredLayoutProvider();
  provider.layout(node, new BasicProgressMonitor());
  const layout1 = exportOf(node);
  env.createInteractiveVisitor().visit(node);
  provider.layout(node, new BasicProgressMonitor());
  return { graph, components: null, terminal: 'layout', layout: exportOf(node), layout1 };
}

/** The terminal `logging` step: the layout with a logging monitor, the logged graphs captured over the monitor tree. */
function logging(graph: LGraph): LabelsStepsResult {
  const node = originOf(graph);
  const monitor = new BasicProgressMonitor().withLogging(true);
  new LayeredLayoutProvider().layout(node, monitor);
  return { graph, components: null, terminal: 'layout', layout: exportOf(node), logged: capturedLogged(monitor) };
}

function runRest(row: PipelineStopRow, steps: readonly PhaseStep[], env: LabelsEnvironment): LabelsStepsResult {
  const last = terminal(row, steps);
  if (last === null) {
    return runPipelineSteps({ ...row, steps }, env.factories, env.components);
  }
  checkNoArguments(row, last);
  const head = runPipelineSteps({ ...row, steps: steps.slice(0, -1) }, env.factories, env.components);
  return last[0] === INTERACTIVE_OP ? interactive(head.graph, env, row.id) : logging(head.graph);
}

/**
 * Interprets a step row with the new ops. A leading `labelManager <kind>` is peeled off and applied to the root before the
 * import; a terminal `interactive` or `logging` runs on the ELK node of the imported graph after 7f's interpreter has run
 * the steps before it. The imported `LGraph` stays untouched by the terminal layouts, as in the recorder.
 *
 * @throws Error naming the op when it is unknown (7f's interpreter) or misplaced
 */
export function runLabelsRow(row: PipelineStopRow, env: LabelsEnvironment): LabelsStepsResult {
  if (row.steps === null) {
    throw new Error(`row ${row.id} has no steps`);
  }
  const [first, ...rest] = row.steps;
  if (first?.[0] !== LABEL_MANAGER_OP) {
    return runRest(row, row.steps, env);
  }
  if (first.length !== 2) {
    throw new Error(`row ${row.id}: op ${LABEL_MANAGER_OP} takes 1 arguments, got ${String(first.length - 1)}`);
  }
  return withManager(String(first[1]), () => runRest(row, rest, env));
}
