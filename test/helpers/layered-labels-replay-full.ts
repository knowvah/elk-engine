// SPDX-License-Identifier: EPL-2.0
// Full rows of mission 7f2 (F4, G2, G5; family = the second id segment, `full/<family>/<model>/<variant>`):
//   logged       the run uses `new BasicProgressMonitor().withLogging(true)`; expected = { layout, plans, logged };
//   interactive  GENERATE_POSITION_AND_LAYER_IDS is in the row's options or input: recursive layout, export `layout1`,
//                `InteractiveLayeredGraphVisitor.visit(root)`, layout again; expected = { layout1, layout, plans }, the
//                plans those of the SECOND run;
//   any other    7f's `runFullRow` on the same input.
// Every family drops the options the recorder drops after loading (`dropUnresolvedOptions`).
// The visitor is a factory: `InteractiveLayeredGraphVisitor` arrives in T10.
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IGraphElementVisitor } from '../../src/core/util/IGraphElementVisitor.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import { compareLayout, type Diff } from '../golden/compare-json.js';
import { exportLikeOracle } from './graph-json-oracle.js';
import { compareLogged, normalizeIdentityHashes, type Logged, type Normalize } from './layered-labels-replay-logged.js';
import { capturedLogged } from './layered-labels-replay-ops.js';
import { applyOptions, loadInput } from './layered-phase-replay-rows.js';
import { compareFullRow, plansFromRun, type FullResult, type PlanCapture } from './layered-pipeline-replay-ops.js';
import type { FullRow } from './layered-pipeline-replay-rows.js';

export const LOGGED_FAMILY = 'logged';
export const INTERACTIVE_FAMILY = 'interactive';
const FAMILY_INDEX = 1;
const ID_SEPARATOR = '/';

/** The family of a full row: the second segment of its id. */
export const familyOf = (row: FullRow): string => row.id.split(ID_SEPARATOR)[FAMILY_INDEX] ?? '';

/** A full replay's result: 7f's, plus `layout1` (interactive) and `logged` (logged). */
export interface LabelsFullResult extends FullResult {
  readonly layout1?: unknown;
  readonly logged?: Logged;
}

/** What the runners need: the interactive visitor factory (T10) and the plan capture (default: `plansFromRun`). */
export interface LabelsFullEnvironment {
  readonly createInteractiveVisitor?: () => IGraphElementVisitor;
  readonly capture?: PlanCapture;
}

/** Every label of an element, and the labels of those labels. */
function labelsOf(element: ElkGraphElement): ElkGraphElement[] {
  return [...element.getLabels()].flatMap((label) => [label, ...labelsOf(label)]);
}

/** The node, its ports, contained edges and children at every depth, and all their labels (`eAllContents` order is not needed). */
function elementsOf(node: ElkNode): ElkGraphElement[] {
  const shapes: ElkGraphElement[] = [node, ...node.getPorts(), ...node.getContainedEdges()];
  return [
    ...shapes.flatMap((element) => [element, ...labelsOf(element)]),
    ...[...node.getChildren()].flatMap(elementsOf),
  ];
}

/**
 * `LayeredLabelsVectors.java` `dropUnresolvedOptions`: a `.elkt` value no registered option parses (an enum constant the Java
 * lacks, e.g. `edgeLabels.placement: UNDEFINED`, `portLabels.placement: FIXED`) stays a `LayoutOptionProxy`; the recorder
 * removes those right after loading, so the export omits them.
 */
function dropUnresolvedOptions(root: ElkNode): void {
  for (const element of elementsOf(root)) {
    const unresolved = [...element.getAllProperties()]
      .filter(([, value]) => value instanceof LayoutOptionProxy)
      .map(([key]) => key);
    unresolved.forEach((key) => element.setProperty(key, null));
  }
}

function preparedRoot(row: FullRow): ElkNode {
  const root = loadInput(row.input);
  dropUnresolvedOptions(root);
  applyOptions(root, row.options);
  return root;
}

const exportOf = (node: ElkNode): unknown => JSON.parse(exportLikeOracle(node)) as unknown;

/** A `logged` row: the layout with a logging monitor; the logged graphs are captured over the monitor tree. */
export function runLoggedFullRow(row: FullRow, env: LabelsFullEnvironment = {}): LabelsFullResult {
  const graph = preparedRoot(row);
  const monitor = new BasicProgressMonitor().withLogging(true);
  const plans = (env.capture ?? plansFromRun)(row, () => {
    new RecursiveGraphLayoutEngine().layout(graph, monitor);
  });
  return { layout: exportOf(graph), plans, logged: capturedLogged(monitor) };
}

/** An `interactive` row: layout, `layout1`, the visitor, layout again; the plans are those of the second run. */
export function runInteractiveFullRow(row: FullRow, env: LabelsFullEnvironment): LabelsFullResult {
  if (env.createInteractiveVisitor === undefined) {
    throw new Error(
      `row ${row.id}: the interactive family needs a visitor factory (InteractiveLayeredGraphVisitor, T10)`,
    );
  }
  const graph = preparedRoot(row);
  const engine = new RecursiveGraphLayoutEngine();
  engine.layout(graph, new BasicProgressMonitor());
  const layout1 = exportOf(graph);
  env.createInteractiveVisitor().visit(graph);
  const plans = (env.capture ?? plansFromRun)(row, () => {
    engine.layout(graph, new BasicProgressMonitor());
  });
  return { layout1, layout: exportOf(graph), plans };
}

/** 7f's `runFullRow` (`layered-pipeline-replay-ops.ts`) on the input with unresolved options dropped. */
export function runPlainFullRow(row: FullRow, env: LabelsFullEnvironment = {}): LabelsFullResult {
  const graph = preparedRoot(row);
  const plans = (env.capture ?? plansFromRun)(row, () => {
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  });
  return { layout: exportOf(graph), plans };
}

/** Lays a full row out by family; plain families go straight to 7f's `runFullRow`. */
export function runLabelsFullRow(row: FullRow, env: LabelsFullEnvironment = {}): LabelsFullResult {
  switch (familyOf(row)) {
    case LOGGED_FAMILY:
      return runLoggedFullRow(row, env);
    case INTERACTIVE_FAMILY:
      return runInteractiveFullRow(row, env);
    default:
      return runPlainFullRow(row, env);
  }
}

/** The expected side of a full row beyond 7f's: `layout1` and `logged`. */
interface LabelsFullExpected {
  readonly layout1?: unknown;
  readonly logged?: Logged;
}

/**
 * Layout and plans as 7f's `compareFullRow` (AD-4, exact plans), then `layout1` and the logged graphs when the expected
 * side has them.
 */
export function compareLabelsFullRow(
  actual: LabelsFullResult,
  row: FullRow,
  normalize: Normalize = normalizeIdentityHashes,
): Diff[] {
  const extra = row.expected as typeof row.expected & LabelsFullExpected;
  const diffs = compareFullRow(actual, row);
  if (extra.layout1 !== undefined) {
    diffs.push(...compareLayout(extra.layout1, actual.layout1).diffs.map((d) => ({ ...d, path: `layout1${d.path}` })));
  }
  if (extra.logged !== undefined) {
    const logged = actual.logged ?? { tags: [], dot: [], json: [] };
    const messages = compareLogged(logged, extra.logged, normalize);
    diffs.push(
      ...messages.map((message): Diff => ({ path: 'logged', kind: 'value', expected: message, actual: undefined })),
    );
  }
  return diffs;
}
