// SPDX-License-Identifier: EPL-2.0
// The TS twin of the FGraph dump of tools/vectors/ForceVectors.java (`fdump`, `propsDump`, `recombineBody`; mission 8b, T6), in four parts:
//   dumpState(graph, options)        an FGraph in exactly the recorder's format (`State`): props, nodes, edges, labels, bends, adjacency;
//   dumpRecombine(components, result) the `recombine` stop body: each component summarised after the sort, and the result state;
//   compareJson / compareState / compareRecombine  a readable diff (path, expected, actual) at the AD-4 bar: ids, list lengths, list order, key order,
//                                    strings, integers and booleans exact; doubles (16-hex strings, found by key name) within `tol`,
//                                    NaN equals NaN, same-signed infinities are equal; `classify` says whether two values are raw-bit
//                                    identical or only within the tolerance;
//   rebuildGraph(state) / rebuildComponents  the inverse: an FGraph from a dumped state, so a step can start from its recorded "before".
// What a rebuild cannot restore (not in the dump): the ELK origin of each element (a stub ElkNode, ElkEdge or ElkLabel carrying the dumped
// id stands in, so `name` and `edge` round-trip but no applyLayout can run on a rebuilt graph), the graph's own origin (none), the object
// identity of an edge or label listed twice (rebuilt by name: one object, listed twice, as `ComponentsProcessor.dfs` made it), the
// `java.util.Random` (`props.randomPeek` is a fingerprint, the generator state cannot be rebuilt: compare with `ignore: ['randomPeek']`
// and let the replay of the step that creates the generator restore it), and every other property of the original ELK elements.
// The dump reads PADDING without `getProperty`: the first read of a cloneable default (ElkPadding) stores a copy on the holder and
// changes what later code reads, so the explicit value, or else a fresh default, is taken from `getAllProperties()` (the recorder does).
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import type { KVector } from '../../src/core/math/KVector.js';
import type { Spacing } from '../../src/core/math/Spacing.js';
import { ElkGraphFactory } from '../../src/graph/ElkGraphFactory.js';
import { type ElkGraphElement, isElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { MapPropertyHolder } from '../../src/graph/properties/MapPropertyHolder.js';
import type { Random } from '../../src/java/util/Random.js';
import { FBendpoint } from '../../src/alg/force/graph/FBendpoint.js';
import { FEdge } from '../../src/alg/force/graph/FEdge.js';
import { FGraph } from '../../src/alg/force/graph/FGraph.js';
import { FLabel } from '../../src/alg/force/graph/FLabel.js';
import { FNode } from '../../src/alg/force/graph/FNode.js';
import { ForceMetaDataProvider } from '../../src/alg/force/options/ForceMetaDataProvider.js';
import { ForceModelStrategy } from '../../src/alg/force/options/ForceModelStrategy.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { InternalProperties } from '../../src/alg/force/options/InternalProperties.js';
import { StressMetaDataProvider } from '../../src/alg/force/options/StressMetaDataProvider.js';
import { StressOptions } from '../../src/alg/force/options/StressOptions.js';
import { Dimension } from '../../src/alg/force/stress/Dimension.js';
import {
  decodeHex,
  hexOf,
  type BendState,
  type EdgeState,
  type ElkDump,
  type Hex,
  type HexQuad,
  type HexVec,
  type LabelState,
  type NodeState,
  type RecombineEntry,
  type State,
  type StateProps,
} from './force-replay-rows.js';

/** The tolerance of AD-4 for numeric coordinates and sizes. */
export const TOLERANCE = 1e-6;

const FORCE_PROBE_OPTION = 'org.eclipse.elk.force.model';
const STRESS_PROBE_OPTION = 'org.eclipse.elk.stress.dimension';

/**
 * Registers the force and stress option models once per module registry (the service keeps the core options only): explicit, never an
 * import side effect. Both are registered for both refs because a stress row also carries force options (`forcePass`).
 */
export function registerForce(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(FORCE_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new ForceMetaDataProvider(), new ForceOptions());
  }
  if (service.getOptionData(STRESS_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new StressMetaDataProvider(), new StressOptions());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph) with the force and stress options registered. */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerForce();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

// ------------------------------------------------------------------------------------------------------------
// dump

/** Options of {@link dumpState}. */
export interface DumpOptions {
  /** A stress row: adds the stress props, `fixed` on nodes and `del` on edges. */
  readonly stress?: boolean;
  /**
   * The fingerprint of a generator: the hex of `nextLong()` of a COPY of it (the original is not advanced). `java.util.Random` has no
   * copy, so the step that creates the generator (T8) supplies this; without it a graph that holds a generator cannot be dumped.
   */
  readonly randomPeek?: (random: Random) => Hex;
}

const vec = (v: KVector): HexVec => [hexOf(v.x), hexOf(v.y)];
const quad = (s: Spacing): HexQuad => [hexOf(s.top), hexOf(s.right), hexOf(s.bottom), hexOf(s.left)];

/** The ELK id of a graph element's origin, or `''` (`ForceVectors.nameOf`). */
export function nameOf(holder: MapPropertyHolder): string {
  const origin = holder.getProperty(InternalProperties.ORIGIN);
  return isElkGraphElement(origin) ? (origin.getIdentifier() ?? '') : '';
}

function peekOf(graph: FGraph, options: DumpOptions): Hex | null {
  const random = graph.getProperty(InternalProperties.RANDOM);
  if (random === null) {
    return null;
  }
  if (options.randomPeek === undefined) {
    throw new Error('the graph holds a Random: pass DumpOptions.randomPeek (java.util.Random cannot be copied)');
  }
  return options.randomPeek(random);
}

function propsOf(graph: FGraph, options: DumpOptions): StateProps {
  const upLeft = graph.getProperty(InternalProperties.BB_UPLEFT);
  const lowRight = graph.getProperty(InternalProperties.BB_LOWRIGHT);
  const explicit = graph.getAllProperties().get(ForceOptions.PADDING);
  const padding =
    explicit !== undefined && explicit !== null ? (explicit as ElkPadding) : ForceOptions.PADDING.getDefault();
  const base: StateProps = {
    model: graph.getProperty(ForceOptions.MODEL).name(),
    iterations: graph.getProperty(ForceOptions.ITERATIONS),
    temperature: hexOf(graph.getProperty(ForceOptions.TEMPERATURE)),
    repulsion: hexOf(graph.getProperty(ForceOptions.REPULSION)),
    spacing: hexOf(graph.getProperty(ForceOptions.SPACING_NODE_NODE)),
    aspectRatio: hexOf(graph.getProperty(ForceOptions.ASPECT_RATIO)),
    randomSeed: graph.getProperty(ForceOptions.RANDOM_SEED),
    separate: graph.getProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS),
    interactive: graph.getProperty(ForceOptions.INTERACTIVE),
    prio: graph.getProperty(ForceOptions.PRIORITY),
    padding: quad(padding),
    bbUpLeft: upLeft === null ? null : vec(upLeft),
    bbLowRight: lowRight === null ? null : vec(lowRight),
    randomPeek: peekOf(graph, options),
  };
  if (options.stress !== true) {
    return base;
  }
  return {
    ...base,
    dimension: graph.getProperty(StressOptions.DIMENSION).name(),
    iterationLimit: graph.getProperty(StressOptions.ITERATION_LIMIT),
    epsilon: hexOf(graph.getProperty(StressOptions.EPSILON)),
    desiredEdgeLength: hexOf(graph.getProperty(StressOptions.DESIRED_EDGE_LENGTH)),
  };
}

function nodeOf(node: FNode, stress: boolean): NodeState {
  const entry: NodeState = {
    id: node.id,
    name: nameOf(node),
    label: node.getLabel(),
    pos: vec(node.getPosition()),
    disp: vec(node.getDisplacement()),
    size: vec(node.getSize()),
    prio: node.getProperty(ForceOptions.PRIORITY),
  };
  return stress ? { ...entry, fixed: node.getProperty(StressOptions.FIXED) } : entry;
}

function edgeOf(edge: FEdge, stress: boolean): EdgeState {
  const entry: EdgeState = {
    name: nameOf(edge),
    src: nameOf(edge.getSource()!),
    tgt: nameOf(edge.getTarget()!),
    srcId: edge.getSource()!.id,
    tgtId: edge.getTarget()!.id,
    prio: edge.getProperty(ForceOptions.PRIORITY),
    power: edge.getProperty(ForceOptions.REPULSIVE_POWER),
    labelSpacing: hexOf(edge.getProperty(ForceOptions.SPACING_EDGE_LABEL)),
    sp: vec(edge.getSourcePoint()),
    tp: vec(edge.getTargetPoint()),
    bends: edge.getBendpoints().map((b) => vec(b.getPosition())),
  };
  return stress
    ? {
        ...entry,
        del: edge.hasProperty(StressOptions.DESIRED_EDGE_LENGTH)
          ? hexOf(edge.getProperty(StressOptions.DESIRED_EDGE_LENGTH))
          : null,
      }
    : entry;
}

function labelOf(label: FLabel): LabelState {
  return {
    name: nameOf(label),
    text: label.getText(),
    edge: nameOf(label.getEdge()),
    pos: vec(label.getPosition()),
    disp: vec(label.getDisplacement()),
    size: vec(label.getSize()),
    inline: label.getProperty(ForceOptions.EDGE_LABELS_INLINE),
    prio: label.getProperty(ForceOptions.PRIORITY),
  };
}

function bendOf(bend: FBendpoint): BendState {
  return {
    edge: nameOf(bend.getEdge()),
    index: bend.getEdge().getBendpoints().indexOf(bend),
    pos: vec(bend.getPosition()),
    disp: vec(bend.getDisplacement()),
    size: vec(bend.getSize()),
    prio: bend.getProperty(ForceOptions.PRIORITY),
  };
}

/** An FGraph in the recorder's `fdump` format. The key order of every entry is the recorder's. */
export function dumpState(graph: FGraph, options: DumpOptions = {}): State {
  const stress = options.stress === true;
  // `adjacency` is private (the recorder reads it by reflection too); bracket access is the TS escape hatch
  const adjacency = graph['adjacency'];
  return {
    props: propsOf(graph, options),
    nodes: graph.getNodes().map((n) => nodeOf(n, stress)),
    edges: graph.getEdges().map((e) => edgeOf(e, stress)),
    labels: graph.getLabels().map(labelOf),
    bends: graph.getBendpoints().map(bendOf),
    adjacency: adjacency === null ? null : adjacency.map((row) => [...row]),
  };
}

/** The `recombine` stop body: `components` as `ComponentsProcessor.recombine` left them (sorted), and the returned graph. */
export function dumpRecombine(
  components: readonly FGraph[],
  result: FGraph,
  options: DumpOptions = {},
): { components: RecombineEntry[]; result: State } {
  return {
    components: components.map((c) => {
      const upLeft = c.getProperty(InternalProperties.BB_UPLEFT);
      const lowRight = c.getProperty(InternalProperties.BB_LOWRIGHT);
      return {
        first: c.getNodes().length === 0 ? null : nameOf(c.getNodes()[0]!),
        nodes: c.getNodes().length,
        prio: c.getProperty(ForceOptions.PRIORITY),
        bbUpLeft: upLeft === null ? null : vec(upLeft),
        bbLowRight: lowRight === null ? null : vec(lowRight),
      };
    }),
    result: dumpState(result, options),
  };
}

// ------------------------------------------------------------------------------------------------------------
// compare

/** One difference: where (a path like `nodes[2].pos[0]`), the expected value and the actual one. */
export interface Difference {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

/** Keys whose string values are hex doubles, and the keys below which every string is one (a vector is a list of hex). */
export const HEX_KEYS: ReadonlySet<string> = new Set([
  'temperature',
  'repulsion',
  'spacing',
  'aspectRatio',
  'epsilon',
  'desiredEdgeLength',
  'padding',
  'bbUpLeft',
  'bbLowRight',
  'pos',
  'disp',
  'size',
  'sp',
  'tp',
  'bends',
  'labelSpacing',
  'del',
]);

/** Options of the comparators. */
export interface CompareOptions {
  /** The numeric tolerance; defaults to {@link TOLERANCE}. */
  readonly tol?: number;
  /** More keys (T8: the model dump; T10: `apsp`, `w`) whose strings are hex doubles. */
  readonly extraHexKeys?: ReadonlySet<string>;
  /** Keys whose values are not compared at all, wherever they occur (a rebuilt graph cannot restore `randomPeek`). */
  readonly ignore?: readonly string[];
}

/** Whether two doubles are equal at the bar: NaN equals NaN, equal infinities are equal, finite values differ by at most `tol`. */
export function numbersEqual(expected: number, actual: number, tol: number = TOLERANCE): boolean {
  if (Number.isNaN(expected) || Number.isNaN(actual)) {
    return Number.isNaN(expected) && Number.isNaN(actual);
  }
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return expected === actual;
  }
  return Math.abs(expected - actual) <= tol;
}

const isHexString = (value: unknown): value is Hex => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);

function compareInto(
  expected: unknown,
  actual: unknown,
  path: string,
  inHex: boolean,
  options: CompareOptions,
  out: Difference[],
): void {
  const tol = options.tol ?? TOLERANCE;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      out.push({
        path,
        expected: `array of ${String(expected.length)}`,
        actual: Array.isArray(actual) ? `array of ${String(actual.length)}` : actual,
      });
      return;
    }
    expected.forEach((item, i) => compareInto(item, actual[i], `${path}[${String(i)}]`, inHex, options, out));
  } else if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
      out.push({ path, expected: 'object', actual });
      return;
    }
    const ignore = options.ignore ?? [];
    const keysOf = (o: object): string[] => Object.keys(o).filter((k) => !ignore.includes(k));
    const expectedKeys = keysOf(expected);
    if (expectedKeys.join() !== keysOf(actual).join()) {
      out.push({ path, expected: `keys ${expectedKeys.join()}`, actual: `keys ${keysOf(actual).join()}` });
      return;
    }
    for (const key of expectedKeys) {
      const hexBelow = inHex || HEX_KEYS.has(key) || (options.extraHexKeys?.has(key) ?? false);
      compareInto(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        path === '' ? key : `${path}.${key}`,
        hexBelow,
        options,
        out,
      );
    }
  } else if (inHex && isHexString(expected) && isHexString(actual)) {
    if (!numbersEqual(decodeHex(expected), decodeHex(actual), tol)) {
      out.push({
        path,
        expected: `${expected} (${String(decodeHex(expected))})`,
        actual: `${actual} (${String(decodeHex(actual))})`,
      });
    }
  } else if (expected !== actual) {
    out.push({ path, expected, actual });
  }
}

/** The differences between two recorded-format values (a state, a recombine body, ...); `[]` when they agree at the bar. */
export function compareJson(expected: unknown, actual: unknown, options: CompareOptions = {}): Difference[] {
  const out: Difference[] = [];
  compareInto(expected, actual, '', false, options, out);
  return out;
}

/** The differences between a recorded state and a TS state. */
export const compareState = (expected: State, actual: State, options: CompareOptions = {}): Difference[] =>
  compareJson(expected, actual, options);

/** The differences between a recorded `recombine` body and a TS one. */
export const compareRecombine = (
  expected: { readonly components: readonly RecombineEntry[]; readonly result: State },
  actual: { readonly components: readonly RecombineEntry[]; readonly result: State },
  options: CompareOptions = {},
): Difference[] => compareJson(expected, actual, options);

/** `identical` when the two values serialise to the same text (raw-bit identical, NaN canonical), else `within` or `differs`. */
export function classify(
  expected: unknown,
  actual: unknown,
  options: CompareOptions = {},
): 'identical' | 'within' | 'differs' {
  const ignore = options.ignore ?? [];
  const drop = (value: unknown): string =>
    JSON.stringify(value, (key, v: unknown) => (ignore.includes(key) ? undefined : v));
  if (drop(expected) === drop(actual)) {
    return 'identical';
  }
  return compareJson(expected, actual, options).length === 0 ? 'within' : 'differs';
}

/** The first `limit` differences as text lines. */
export function formatDifferences(differences: readonly Difference[], limit = 5): string {
  const lines = differences
    .slice(0, limit)
    .map((d) => `  ${d.path}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`);
  if (differences.length > limit) {
    lines.push(`  ... and ${String(differences.length - limit)} more`);
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------------------------------------------------
// rebuild

function stubElement<T extends ElkGraphElement>(element: T, name: string): T {
  element.setIdentifier(name === '' ? null : name);
  return element;
}

function vecOf(target: KVector, value: HexVec): void {
  target.x = decodeHex(value[0]);
  target.y = decodeHex(value[1]);
}

function applyProps(graph: FGraph, props: StateProps): void {
  graph.setProperty(ForceOptions.MODEL, ForceModelStrategy.valueOf(props.model));
  graph.setProperty(ForceOptions.ITERATIONS, props.iterations);
  graph.setProperty(ForceOptions.TEMPERATURE, decodeHex(props.temperature));
  graph.setProperty(ForceOptions.REPULSION, decodeHex(props.repulsion));
  graph.setProperty(ForceOptions.SPACING_NODE_NODE, decodeHex(props.spacing));
  graph.setProperty(ForceOptions.ASPECT_RATIO, decodeHex(props.aspectRatio));
  graph.setProperty(ForceOptions.RANDOM_SEED, props.randomSeed);
  graph.setProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS, props.separate);
  graph.setProperty(ForceOptions.INTERACTIVE, props.interactive);
  graph.setProperty(ForceOptions.PRIORITY, props.prio);
  const [top, right, bottom, left] = props.padding.map(decodeHex) as [number, number, number, number];
  graph.setProperty(ForceOptions.PADDING, new ElkPadding(top, right, bottom, left));
  if (props.bbUpLeft !== null) {
    graph.setProperty(InternalProperties.BB_UPLEFT, vecObject(props.bbUpLeft));
  }
  if (props.bbLowRight !== null) {
    graph.setProperty(InternalProperties.BB_LOWRIGHT, vecObject(props.bbLowRight));
  }
  if (props.dimension !== undefined) {
    graph.setProperty(StressOptions.DIMENSION, Dimension.valueOf(props.dimension));
    graph.setProperty(StressOptions.ITERATION_LIMIT, props.iterationLimit!);
    graph.setProperty(StressOptions.EPSILON, decodeHex(props.epsilon!));
    graph.setProperty(StressOptions.DESIRED_EDGE_LENGTH, decodeHex(props.desiredEdgeLength!));
  }
}

function vecObject(value: HexVec): KVector {
  const v = new FNode().getPosition().clone();
  vecOf(v, value);
  return v;
}

function rebuildNodes(graph: FGraph, state: State): Map<number, FNode> {
  const byId = new Map<number, FNode>();
  for (const entry of state.nodes) {
    const node = new FNode(entry.label);
    node.id = entry.id;
    node.setProperty(InternalProperties.ORIGIN, stubElement(ElkGraphUtil.createNode(null), entry.name));
    vecOf(node.getPosition(), entry.pos);
    vecOf(node.getDisplacement(), entry.disp);
    vecOf(node.getSize(), entry.size);
    node.setProperty(ForceOptions.PRIORITY, entry.prio);
    if (entry.fixed !== undefined) {
      node.setProperty(StressOptions.FIXED, entry.fixed);
    }
    graph.getNodes().push(node);
    byId.set(entry.id, node);
  }
  return byId;
}

function rebuildEdges(graph: FGraph, state: State, nodes: ReadonlyMap<number, FNode>): Map<string, FEdge> {
  const byName = new Map<string, FEdge>();
  for (const entry of state.edges) {
    // ComponentsProcessor.dfs lists an edge that closes a cycle twice (ComponentsProcessor.java:136-139): the same object
    const known = byName.get(entry.name);
    if (known !== undefined) {
      graph.getEdges().push(known);
      continue;
    }
    const edge = new FEdge();
    edge.setProperty(InternalProperties.ORIGIN, stubElement(ElkGraphFactory.eINSTANCE.createElkEdge(), entry.name));
    edge.setSource(nodes.get(entry.srcId) ?? null);
    edge.setTarget(nodes.get(entry.tgtId) ?? null);
    if (edge.getSource() === null || edge.getTarget() === null) {
      throw new Error(`edge ${entry.name}: node ${String(entry.srcId)} or ${String(entry.tgtId)} is not in the state`);
    }
    edge.setProperty(ForceOptions.PRIORITY, entry.prio);
    edge.setProperty(ForceOptions.REPULSIVE_POWER, entry.power);
    edge.setProperty(ForceOptions.SPACING_EDGE_LABEL, decodeHex(entry.labelSpacing));
    if (entry.del !== undefined && entry.del !== null) {
      edge.setProperty(StressOptions.DESIRED_EDGE_LENGTH, decodeHex(entry.del));
    }
    graph.getEdges().push(edge);
    byName.set(entry.name, edge);
  }
  return byName;
}

function rebuildLabels(graph: FGraph, state: State, edges: ReadonlyMap<string, FEdge>): void {
  const byName = new Map<string, FLabel>();
  for (const entry of state.labels) {
    // the labels of a duplicated edge are listed twice with it: the same object
    const known = byName.get(entry.name);
    if (known !== undefined) {
      graph.getLabels().push(known);
      continue;
    }
    const edge = edges.get(entry.edge);
    if (edge === undefined) {
      throw new Error(`label ${entry.name}: edge ${entry.edge} is not in the state`);
    }
    const label = new FLabel(edge, entry.text);
    label.setProperty(InternalProperties.ORIGIN, stubElement(ElkGraphUtil.createLabel(null) as ElkLabel, entry.name));
    vecOf(label.getPosition(), entry.pos);
    vecOf(label.getDisplacement(), entry.disp);
    vecOf(label.getSize(), entry.size);
    label.setProperty(ForceOptions.EDGE_LABELS_INLINE, entry.inline);
    label.setProperty(ForceOptions.PRIORITY, entry.prio);
    graph.getLabels().push(label);
    byName.set(entry.name, label);
  }
}

function rebuildBends(graph: FGraph, state: State, edges: ReadonlyMap<string, FEdge>): void {
  for (const entry of state.bends) {
    const edge = edges.get(entry.edge);
    if (edge === undefined || edge.getBendpoints().length !== entry.index) {
      throw new Error(`bend ${String(entry.index)} of edge ${entry.edge}: cannot be rebuilt in dump order`);
    }
    const bend = new FBendpoint(edge);
    vecOf(bend.getPosition(), entry.pos);
    vecOf(bend.getDisplacement(), entry.disp);
    vecOf(bend.getSize(), entry.size);
    bend.setProperty(ForceOptions.PRIORITY, entry.prio);
    graph.getBendpoints().push(bend);
  }
}

/**
 * An FGraph from a dumped state: every option the dump lists is set explicitly on the graph (so `getProperty` reads the recorded value),
 * nodes/edges/labels/bends are created in dump order, and `adjacency` is recomputed with `calcAdjacency` when the state has one (the
 * recorded matrix is that function's result on the same edges; the caller compares it back).
 */
export function rebuildGraph(state: State): FGraph {
  const graph = new FGraph();
  applyProps(graph, state.props);
  const nodes = rebuildNodes(graph, state);
  const edges = rebuildEdges(graph, state, nodes);
  rebuildLabels(graph, state, edges);
  rebuildBends(graph, state, edges);
  if (state.adjacency !== null) {
    graph.calcAdjacency();
  }
  return graph;
}

/** The FGraphs of a list of states (a `split` stop's components, or the states before `recombine`). */
export const rebuildComponents = (states: readonly State[]): FGraph[] => states.map(rebuildGraph);

// ------------------------------------------------------------------------------------------------------------
// the ELK graph

/**
 * Writes the geometry of a recorded ELK dump (`forcePass`, `microLayout`) onto a re-imported input graph: x, y, width, height of every node,
 * port and label by id. A stress `import` stop is taken after the force provider ran on the graph, so a replay that has no
 * ForceLayoutProvider yet starts from that recorded geometry. Not restored: margins, paddings, child areas and edge sections (the
 * importer reads none of them).
 */
export function applyElkGeometry(root: ElkNode, elk: ElkDump): void {
  const byId = new Map<
    string,
    ElkGraphElement & { setLocation(x: number, y: number): void; setDimensions(w: number, h: number): void }
  >();
  const visit = (node: ElkNode): void => {
    byId.set(node.getIdentifier()!, node);
    const labels = [...(node.getLabels() as Iterable<ElkLabel>)];
    for (const port of node.getPorts()) {
      byId.set(port.getIdentifier()!, port);
      labels.push(...(port.getLabels() as Iterable<ElkLabel>));
    }
    for (const edge of node.getContainedEdges()) {
      labels.push(...(edge.getLabels() as Iterable<ElkLabel>));
    }
    for (const label of labels) {
      byId.set(label.getIdentifier()!, label);
    }
    for (const child of node.getChildren()) {
      visit(child);
    }
  };
  visit(root);
  root.setLocation(decodeHex(elk.graph.x as Hex), decodeHex(elk.graph.y as Hex));
  root.setDimensions(decodeHex(elk.graph.w as Hex), decodeHex(elk.graph.h as Hex));
  for (const entry of [...elk.nodes, ...elk.ports, ...elk.labels]) {
    const element = byId.get(entry.id as string);
    if (element === undefined) {
      throw new Error(`the ELK dump names ${String(entry.id)}, the input graph has no such element`);
    }
    element.setLocation(decodeHex(entry.x as Hex), decodeHex(entry.y as Hex));
    element.setDimensions(decodeHex(entry.w as Hex), decodeHex(entry.h as Hex));
  }
}
