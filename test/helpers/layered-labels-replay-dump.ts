// SPDX-License-Identifier: EPL-2.0
// The dump and comparison of a labels stop row (mission 7f2, G2): 7f's `pipelineDump` / `comparePipeline` plus what the
// recorder adds (LayeredLabelsVectors.java `geometry`, `terminalDump`):
//   geometry.labels      path -> { pos } for EVERY label of the baseline (`Base.labels()`, sorted by path), not only those of
//                        nodes and ports, on the stops that carry it (the expected side decides, as for splines in 7e);
//   geometry.labelSizes  path -> [width, height] as raw IEEE hex for the same label set, only on the 12 label/comment arms;
//   layout1, logged      the extra exports of the terminal `interactive` and `logging` steps.
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';
import { encodeHex, type HexPair } from './layered-framework-replay.js';
import { compareLogged, normalizeIdentityHashes, type Logged, type Normalize } from './layered-labels-replay-logged.js';
import type { LabelsStepsResult } from './layered-labels-replay-ops.js';
import type { Diff } from './layered-phase-replay-compare.js';
import { contextOf, importDumpOf } from './layered-phase-replay-dump.js';
import { comparePipeline, pipelineDump } from './layered-pipeline-replay-ops.js';
import { compareValues } from './layered-site-replay-compare.js';
import type { PositionGeometry } from './layered-placement-replay-rows.js';
import type { RoutingExpected, RoutingGeometry } from './layered-routing-replay-rows.js';

export const LABEL_SIZES_KEY = 'labelSizes';

/** The routing geometry plus the label sizes of a stop on one of the 12 arms. */
export interface LabelsGeometry extends RoutingGeometry {
  readonly labelSizes?: Readonly<Record<string, HexPair>>;
}

/** `expected` of a labels stop row: the routing dump with the label geometry and the terminal extras. */
export interface LabelsExpected extends Omit<RoutingExpected, 'geometry'> {
  readonly geometry: LabelsGeometry;
  readonly layout?: unknown;
  readonly layout1?: unknown;
  readonly logged?: Logged;
}

type Vector = { readonly x: number; readonly y: number };
const pairOf = (v: Vector): HexPair => [encodeHex(v.x), encodeHex(v.y)];

/** Every label the replay knows by path, sorted by path (the recorder's `Base.labels()`). */
function labelsByPath(graph: LGraph): [string, LLabel][] {
  const ctx = contextOf(graph);
  const labels = [...ctx.paths.keys()].filter((o): o is LLabel => o instanceof LLabel);
  return labels
    .map((label): [string, LLabel] => [ctx.pathOf(label), label])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * `LayeredLabelsVectors.java` `phaseDump`: after the ports of the listed nodes, every baseline (import) port not met yet,
 * so a port a processor detached (`CommentPreprocessor`'s box ports) keeps its geometry entry; ports the import did not
 * have (`new/p<k>`, or `x/p<k>` once they left the graph) appear only on a listed node.
 */
function withDetachedPorts(
  listed: Readonly<Record<string, PositionGeometry>>,
  graph: LGraph,
): Record<string, PositionGeometry> {
  const ctx = contextOf(graph);
  const baseline = new Set(
    importDumpOf(graph).graphs.flatMap((level) =>
      level.layerlessNodes.flatMap((node) => node.ports.map((p) => p.path)),
    ),
  );
  const detached = [...ctx.paths.keys()]
    .filter((element): element is LPort => element instanceof LPort)
    .map((port): [string, LPort] => [ctx.pathOf(port), port])
    .filter(([path]) => baseline.has(path) && !(path in listed))
    .map(([path, port]): [string, PositionGeometry] => [path, { pos: pairOf(port.getPosition()) }]);
  return { ...listed, ...Object.fromEntries(detached) };
}

/** `layered-site-replay-context.ts` names an element that left the graph `x/<kind><k>` when a dump first meets it. */
const LEFT_GRAPH_PREFIX = 'x/';
const GRAPH_PACKAGE = 'org.eclipse.elk.alg.layered.graph.';

/** A C4 value with each `{ref}` to an element that left the graph replaced by `{class: <Java binary name>}`, at any depth. */
function withLeftRefsAsClass(value: unknown, graph: LGraph): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => withLeftRefsAsClass(item, graph));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const ref = (value as { ref?: unknown }).ref;
  if (typeof ref === 'string' && Object.keys(value).length === 1) {
    return ref.startsWith(LEFT_GRAPH_PREFIX)
      ? { class: `${GRAPH_PACKAGE}${(contextOf(graph).get(ref) as object).constructor.name}` }
      : value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withLeftRefsAsClass(item, graph)]));
}

/**
 * The recorder's rule for removed elements (`.agent-notes/layered-edge-routing.md`, "`Ctx.encode` auto-names an element that
 * left the graph"), applied to edges: an edge neither in the graph nor of the import (an edge `LONG_EDGE_JOINER` dropped that a
 * spline `edgeChain` still holds) is listed nowhere and a reference to it is `{class}`. 7e's `routingDump` does this for nodes.
 */
function withoutLeftEdges(base: RoutingExpected, graph: LGraph): RoutingExpected {
  const kept = (path: string): boolean => !path.startsWith(LEFT_GRAPH_PREFIX);
  return {
    ...base,
    edges: base.edges.filter((edge) => kept(edge.path)),
    changed: base.changed
      .filter((entry) => kept(entry.path))
      .map((entry) => ({ ...entry, props: withLeftRefsAsClass(entry.props, graph) as typeof entry.props })),
    geometry: {
      ...base.geometry,
      edges: Object.fromEntries(Object.entries(base.geometry.edges).filter(([path]) => kept(path))),
    },
  };
}

/**
 * The dump of a replayed labels row. `expected` only decides which optional members the row records (`geometry.labels`,
 * `geometry.labelSizes`, `layout1`, `logged`); a terminal `layout` / `interactive` / `logging` row also carries `layout`.
 */
export function labelsDump(result: LabelsStepsResult, expected: LabelsExpected): LabelsExpected {
  const base = withoutLeftEdges(pipelineDump(result) as RoutingExpected, result.graph);
  const labels = labelsByPath(result.graph);
  const positions: Record<string, PositionGeometry> = Object.fromEntries(
    labels.map(([path, label]) => [path, { pos: pairOf(label.getPosition()) }]),
  );
  const sizes = Object.fromEntries(labels.map(([path, label]) => [path, pairOf(label.getSize())]));
  return {
    ...base,
    geometry: {
      ...base.geometry,
      ...(base.geometry.ports === undefined ? {} : { ports: withDetachedPorts(base.geometry.ports, result.graph) }),
      ...(expected.geometry.labels === undefined ? {} : { labels: positions }),
      ...(expected.geometry.labelSizes === undefined ? {} : { [LABEL_SIZES_KEY]: sizes }),
    },
    ...(result.layout1 === undefined ? {} : { layout1: result.layout1 }),
    ...(result.logged === undefined ? {} : { logged: result.logged }),
  };
}

function compareKeyed(
  member: string,
  actual: Readonly<Record<string, unknown>>,
  expected: Readonly<Record<string, unknown>>,
): Diff[] {
  const diffs: Diff[] = [];
  for (const [key, want] of Object.entries(expected)) {
    const where = `geometry ${member} ${key}`;
    const messages = key in actual ? compareValues(where, actual[key], want) : ['missing'];
    diffs.push(...messages.map((message) => ({ where, message })));
  }
  for (const key of Object.keys(actual).filter((k) => !(k in expected))) {
    diffs.push({ where: `geometry ${member} ${key}`, message: 'unexpected' });
  }
  return diffs;
}

function compareExport(member: string, actual: unknown, expected: unknown): Diff[] {
  const diffs = compareLayout(expected, actual).diffs;
  return diffs.length === 0 ? [] : [{ where: member, message: formatDiffs(diffs) }];
}

/**
 * The differences between a replayed and a recorded labels row (`[]`: equal): 7f's `comparePipeline` (routing at AD-4, the
 * exported `layout`), then the label sizes, `layout1` and the logged graphs when the expected side has them.
 */
export function compareLabels(
  actual: LabelsExpected,
  expected: LabelsExpected,
  normalize: Normalize = normalizeIdentityHashes,
): Diff[] {
  const diffs = comparePipeline(actual as RoutingExpected, expected as RoutingExpected);
  if (expected.geometry.labelSizes !== undefined) {
    diffs.push(...compareKeyed(LABEL_SIZES_KEY, actual.geometry.labelSizes ?? {}, expected.geometry.labelSizes));
  }
  if (expected.layout1 !== undefined) {
    diffs.push(...compareExport('layout1', actual.layout1, expected.layout1));
  }
  if (expected.logged !== undefined) {
    const logged = actual.logged ?? { tags: [], dot: [], json: [] };
    diffs.push(...compareLogged(logged, expected.logged, normalize).map((message) => ({ where: 'logged', message })));
  }
  return diffs;
}
