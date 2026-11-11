// SPDX-License-Identifier: EPL-2.0
// The TS twin of the whole-tree dump of tools/vectors/LayeredCompoundVectors.java (`Dump.treeDump`; mission 7h, T2, H2). One tree
// dump is
//   { graphs: [ <graph> ... ], crossHierarchyMap: null | [ { origEdge, segments: [ { edge, graph, type } ] } ] }
// where <graph> is the landed per-graph dump (`dumpWithPropertyValues`, layered-site-replay-dump.ts: the recorder's positional paths
// `g<k>` in pre-order, `g<k>/n<i>`, ports, labels, layers and edges, which `assignPaths` numbers as the recorder does: an edge that two
// graphs meet belongs to the first one; raw IEEE hex numbers; per node the landed `nested` link, the path of its nested graph) with the
// additions of this module:
//   graph.levelPath       the ELK ids from the root of the ELK graph down to the graph's ORIGIN node joined by `/`, a missing id as
//                         "" (`levelPathOf`, the key of `expected.plans`); the ORIGIN must be an ElkNode, as in the recorder;
//   properties            every element's properties without the ids `processors`, `random`, `spacings`, `splines.route.start`, the
//                         SelfLoopHolder, `org.eclipse.elk.resolvedAlgorithm` and `crossHierarchyMap` (`TREE_IGNORED_IDS`);
//   crossHierarchyMap     `InternalProperties.CROSS_HIERARCHY_MAP` of the ROOT graph, `null` when the property is not set: one entry
//                         per key in the map's key order, the values of a key stably sorted by `CrossHierarchyEdgeComparator(root)`;
//                         `origEdge` is the key's path, else `orig/<k>`; `edge` the path of the segment's edge, else `seg/<k>/<i>`
//                         (i = position in the sorted values); `graph` the segment graph's path (an unknown one is a bug and throws);
//                         `type` the `PortType` name.
// THE COMPARATOR SEAM: `CrossHierarchyEdgeComparator` (T4, `src/alg/layered/compound/CrossHierarchyEdgeComparator.ts`, `new
// CrossHierarchyEdgeComparator(graph)` and `compare(a, b)`) is not ported at the time of writing, so it is injected: `dumpTree(root,
// { comparatorFor })`. The default is the ported class, resolved once when this module is evaluated and only if its file exists; until
// then the default leaves each key's values in the map's own iteration order (no sort) and `HAS_PORTED_COMPARATOR` is false. A
// test passes `comparatorFor` to sort with a stand-in. `comparatorFor: null` forces "no sort".
// LAYER NODES: `layerNodes` per graph = the node objects of the nodes that only sit in a layer, in layer order (the order of their
// `g<k>/n<i>` paths). ROUTE: the landed node dump is private to `dumpLGraph` and writes objects for layerless nodes only, so no
// exported route gives a layer node's object; instead of a twin of the node dump, `dumpTree` appends the layer-only nodes (those not
// in `getLayerlessNodes()`, deduplicated, in layer order) to each graph's layerless list for the duration of one
// `dumpWithPropertyValues` call and removes them again (try/finally). The landed path assignment numbers a graph's nodes as layerless
// then layer-only nodes in layer order, so the appended nodes keep exactly their paths and the landed node dump, path assignment and
// value encoding produce their objects: the two dumps cannot drift. The objects past the original layerless count are `layerNodes`.
// Comparison (AD-4): the landed `compareLGraphDump` over `graphs` (structure and strings exact, numbers within 1e-6), then the level
// paths and the cross-hierarchy map exactly.
import { existsSync } from 'node:fs';
import { isElkNode, type ElkNode } from '../../src/graph/ElkNode.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import {
  compareLGraphDump,
  type EdgeDump,
  type GraphDump,
  type LabelDump,
  type NodeDump,
  type PortDump,
  type Properties,
} from './layered-framework-replay.js';
import { assignPaths } from './layered-site-replay-args.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';
import { levelPathOf } from './layered-pipeline-replay-ops.js';

export const LEVEL_PATH_FIELD = 'levelPath';
export const CROSS_HIERARCHY_FIELD = 'crossHierarchyMap';
const ORIG_FALLBACK = 'orig';
const SEGMENT_FALLBACK = 'seg';

/** What this module needs of a `CrossHierarchyEdge` (the class is ported by T4): its three accessors. */
export interface CrossHierarchySegment {
  getEdge(): LEdge;
  getGraph(): LGraph;
  getType(): { name(): string };
}

/** The read side of the root's `CROSS_HIERARCHY_MAP` (a `Multimap<LEdge, CrossHierarchyEdge>`): `keySet` and `get`. */
export interface CrossHierarchySource {
  keySet(): LEdge[];
  get(key: LEdge): Iterable<CrossHierarchySegment>;
}

/** `CrossHierarchyEdgeComparator.compare`: the order of the segments of one key. */
export type SegmentComparator = (a: CrossHierarchySegment, b: CrossHierarchySegment) => number;
/** `new CrossHierarchyEdgeComparator(root)` as a function of the root graph. */
export type ComparatorFactory = (root: LGraph) => SegmentComparator;

export interface TreeDumpOptions {
  /** The comparator of the map's values (default: the ported class when it exists, else no sort; `null`: no sort). */
  readonly comparatorFor?: ComparatorFactory | null;
}

export interface SegmentDump {
  readonly edge: string;
  readonly graph: string;
  readonly type: string;
}
export interface CrossHierarchyEntry {
  readonly origEdge: string;
  readonly segments: readonly SegmentDump[];
}
export const LAYER_NODES_FIELD = 'layerNodes';
export type TreeGraphDump = GraphDump & {
  readonly [LEVEL_PATH_FIELD]: string;
  readonly [LAYER_NODES_FIELD]: readonly NodeDump[];
};
export interface TreeDump {
  readonly graphs: readonly TreeGraphDump[];
  readonly [CROSS_HIERARCHY_FIELD]: readonly CrossHierarchyEntry[] | null;
}

// ------------------------------------------------------------------------------------------------------------
// the comparator seam

const COMPARATOR_FILE = new URL('../../src/alg/layered/compound/CrossHierarchyEdgeComparator.ts', import.meta.url);
const COMPARATOR_MODULE = '../../src/alg/layered/compound/CrossHierarchyEdgeComparator.js';

interface ComparatorModule {
  readonly CrossHierarchyEdgeComparator: new (graph: LGraph) => { compare: SegmentComparator };
}

/** The ported comparator as a factory, or `null` while its file does not exist (T4 ports it). */
async function loadPortedComparator(): Promise<ComparatorFactory | null> {
  if (!existsSync(COMPARATOR_FILE)) {
    return null;
  }
  const module = (await import(/* @vite-ignore */ COMPARATOR_MODULE)) as ComparatorModule;
  return (root) => {
    const comparator = new module.CrossHierarchyEdgeComparator(root);
    return (a, b) => comparator.compare(a, b);
  };
}

const PORTED_COMPARATOR: ComparatorFactory | null = await loadPortedComparator();

/** Whether the default comparator is the ported `CrossHierarchyEdgeComparator` (false until T4 lands). */
export const HAS_PORTED_COMPARATOR: boolean = PORTED_COMPARATOR !== null;

// ------------------------------------------------------------------------------------------------------------
// level path

/** The level path of a graph: that of the ElkNode it was imported from; a graph without such an origin is a bug. */
export function levelPathOfGraph(graph: LGraph): string {
  const origin: unknown = graph.getProperty(InternalProperties.ORIGIN);
  if (!isElkNode(origin)) {
    throw new Error('a graph without an ElkNode origin');
  }
  return levelPathOf(origin as ElkNode);
}

// ------------------------------------------------------------------------------------------------------------
// properties

let ignoredIds: ReadonlySet<string> | null = null;

/** The property ids a tree dump leaves out (header: group models), read from the properties on first use. */
export function treeIgnoredIds(): ReadonlySet<string> {
  ignoredIds ??= new Set(
    [
      InternalProperties.PROCESSORS,
      InternalProperties.RANDOM,
      InternalProperties.SPACINGS,
      InternalProperties.SPLINE_ROUTE_START,
      InternalProperties.SELF_LOOP_HOLDER,
      CoreOptions.RESOLVED_ALGORITHM,
      InternalProperties.CROSS_HIERARCHY_MAP,
    ].map((property) => property.getId()),
  );
  return ignoredIds;
}

function keptProperties(properties: Properties): Properties {
  const ignored = treeIgnoredIds();
  return Object.fromEntries(Object.entries(properties).filter(([id]) => !ignored.has(id)));
}

const withKept = <T extends { readonly properties: Properties }>(element: T): T => ({
  ...element,
  properties: keptProperties(element.properties),
});

const labelsKept = (labels: readonly LabelDump[]): LabelDump[] => labels.map(withKept);

const portKept = (port: PortDump): PortDump => ({ ...withKept(port), labels: labelsKept(port.labels) });

const nodeKept = (node: NodeDump): NodeDump => ({
  ...withKept(node),
  ports: node.ports.map(portKept),
  labels: labelsKept(node.labels),
});

const edgeKept = (edge: EdgeDump): EdgeDump => ({ ...withKept(edge), labels: labelsKept(edge.labels) });

/** A graph dump with the ignored property ids removed from the graph and every element under it. */
export function withoutIgnoredProperties<G extends GraphDump>(graph: G): G {
  const layerNodes = (graph as Partial<TreeGraphDump>)[LAYER_NODES_FIELD];
  return {
    ...withKept(graph),
    layerlessNodes: graph.layerlessNodes.map(nodeKept),
    ...(layerNodes === undefined ? {} : { [LAYER_NODES_FIELD]: layerNodes.map(nodeKept) }),
    edges: graph.edges.map(edgeKept),
  };
}

// ------------------------------------------------------------------------------------------------------------
// the cross hierarchy map

function pathOfGraph(paths: ReadonlyMap<object, string>, graph: LGraph): string {
  const path = paths.get(graph);
  if (path === undefined) {
    throw new Error('a cross-hierarchy segment whose graph is in no graph of the tree');
  }
  return path;
}

function segmentsOf(
  source: CrossHierarchySource,
  key: LEdge,
  sorted: SegmentComparator | null,
): readonly CrossHierarchySegment[] {
  const values = [...source.get(key)];
  return sorted === null ? values : values.sort(sorted); // Array.prototype.sort is stable, as List.sort
}

function entryOf(
  source: CrossHierarchySource,
  k: number,
  key: LEdge,
  env: { readonly paths: ReadonlyMap<object, string>; readonly sorted: SegmentComparator | null },
): CrossHierarchyEntry {
  const segments = segmentsOf(source, key, env.sorted).map((segment, i): SegmentDump => ({
    edge: env.paths.get(segment.getEdge()) ?? `${SEGMENT_FALLBACK}/${String(k)}/${String(i)}`,
    graph: pathOfGraph(env.paths, segment.getGraph()),
    type: segment.getType().name(),
  }));
  return { origEdge: env.paths.get(key) ?? `${ORIG_FALLBACK}/${String(k)}`, segments };
}

/**
 * `CROSS_HIERARCHY_MAP` as the list of the tree dump: keys in the map's order, each key's values stably sorted by `sorted` (`null`:
 * not sorted); `null` for a root without the property.
 */
export function crossHierarchyDump(
  source: CrossHierarchySource | null,
  paths: ReadonlyMap<object, string>,
  sorted: SegmentComparator | null,
): CrossHierarchyEntry[] | null {
  if (source === null) {
    return null;
  }
  return source.keySet().map((key, k) => entryOf(source, k, key, { paths, sorted }));
}

// ------------------------------------------------------------------------------------------------------------
// the dump

/** The graph registered under each dump path `g<k>` (the inverse of the landed path assignment). */
function graphsByPath(paths: ReadonlyMap<object, string>, graphPaths: ReadonlySet<string>): Map<string, LGraph> {
  return new Map([...paths].filter(([, path]) => graphPaths.has(path)).map(([graph, path]) => [path, graph as LGraph]));
}

function comparatorOf(root: LGraph, options: TreeDumpOptions): SegmentComparator | null {
  const factory = options.comparatorFor === undefined ? PORTED_COMPARATOR : options.comparatorFor;
  return factory === null ? null : factory(root);
}

/** Every graph of the tree under `root`, pre-order, nested graphs of layer nodes included. */
function treeGraphs(root: LGraph): LGraph[] {
  const graphs: LGraph[] = [];
  const visit = (graph: LGraph): void => {
    graphs.push(graph);
    const nodes = new Set([...graph.getLayerlessNodes(), ...graph.getLayers().flatMap((layer) => layer.getNodes())]);
    for (const node of nodes) {
      const nested = node.getNestedGraph();
      if (nested !== null) {
        visit(nested);
      }
    }
  };
  visit(root);
  return graphs;
}

/** Runs `action` with each graph's layer-only nodes appended to its layerless list (see the header: LAYER NODES), then restores. */
function withLayerNodesListed<T>(graphs: readonly LGraph[], action: () => T): { result: T; counts: number[] } {
  const counts = graphs.map((graph) => graph.getLayerlessNodes().length);
  graphs.forEach((graph) => {
    const listed = graph.getLayerlessNodes();
    const seen = new Set(listed);
    for (const node of graph.getLayers().flatMap((layer) => layer.getNodes())) {
      if (!seen.has(node)) {
        seen.add(node);
        listed.push(node);
      }
    }
  });
  try {
    return { result: action(), counts };
  } finally {
    graphs.forEach((graph, i) => graph.getLayerlessNodes().splice(counts[i]!));
  }
}

/**
 * The whole-tree dump of the `LGraph` tree under `root` at its current state: every graph once, in pre-order, with its level path;
 * the root's cross-hierarchy map (see the header for the comparator seam).
 */
export function dumpTree(root: LGraph, options: TreeDumpOptions = {}): TreeDump {
  const { result: base, counts } = withLayerNodesListed(treeGraphs(root), () => dumpWithPropertyValues(root));
  const paths = assignPaths(root);
  const graphs = graphsByPath(paths, new Set(base.graphs.map((graph) => graph.path)));
  const source = root.getProperty(InternalProperties.CROSS_HIERARCHY_MAP) as CrossHierarchySource | null;
  return {
    graphs: base.graphs.map((dump, i) => ({
      ...withoutIgnoredProperties({ ...dump, layerlessNodes: dump.layerlessNodes.slice(0, counts[i]) }),
      [LEVEL_PATH_FIELD]: levelPathOfGraph(graphs.get(dump.path)!),
      [LAYER_NODES_FIELD]: dump.layerlessNodes.slice(counts[i]).map(nodeKept),
    })),
    [CROSS_HIERARCHY_FIELD]: crossHierarchyDump(source, paths, comparatorOf(root, options)),
  };
}

// ------------------------------------------------------------------------------------------------------------
// property value forms (T7)
// The recorder writes every property value in the C4 form of the site recorders (`{t:'int',v}`, `{t:'double',v:'<text>'}`, a list of
// references as a bare array, an enum's `c` as the Java binary-style name `Outer.Inner`, an element outside the dump as
// `{class:'<fqcn>'}`). The TS dump writes T1's form for what its encoder knows (`{t:'number',v}`, `{t:'list',...}` for an array) and the
// C4 encoder's for the values it patches in (`dumpWithPropertyValues`), so the two forms meet in one dump. The landed
// `compareLGraphDump` compares an expected `int`/`double` with an actual `{t:'number'}` only and an expected bare array with an actual
// array only. These two maps bring both sides to the form the comparison reads; neither changes a number, a name or a tolerance.
// T9 (audit): an element outside the dumped tree is marked by its LGraph class on both sides (the recorder's `{ class:
// 'org.eclipse.elk.alg.layered.graph.<LGraph|LNode|LPort|LEdge|LLabel|Layer>' }` against the TS dump's `{ ref: 'x/<kind><k>' }` or
// unpatched `{ class: '<Name>' }`), so a different class still differs; every other `{ class }` (an opaque value) is compared as is.
// layered-compound-replay-mutation.test.ts perturbs one value of each kind and requires the comparison to name it.

type Json = unknown;
type JsonObject = Record<string, Json>;

const isObject = (value: Json): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isRef = (item: Json): boolean => isObject(item) && ('ref' in item || 'elk' in item);
const isElementRef = (item: Json): boolean => isRef(item) || outsideClassOfActual(item) !== undefined;
const isOnlyKey = (value: Json, key: string): value is JsonObject =>
  isObject(value) && Object.keys(value).length === 1 && key in value;
/** The package of the LGraph element classes the recorder names in `{ class }` for an element outside the dumped tree. */
const LGRAPH_PACKAGE = 'org.eclipse.elk.alg.layered.graph.';
/** The LGraph element class by the kind letter of the path `Ctx.pathOf` gives an element outside the dump (`x/<kind><k>`). */
const OUTSIDE_KIND_CLASS: Readonly<Record<string, string>> = {
  g: 'LGraph',
  n: 'LNode',
  p: 'LPort',
  e: 'LEdge',
  l: 'LLabel',
  layer: 'Layer',
};
const OUTSIDE_CLASSES: ReadonlySet<string> = new Set(Object.values(OUTSIDE_KIND_CLASS));
const OUTSIDE_PATH = /^x\/(layer|[a-z])\d+$/;

/** The marker of an LGraph element outside the dumped tree: it names the element's class, which both sides must agree on. */
const unreferenced = (className: string): JsonObject => ({ unreferenced: className });

/** The class an outside element of the actual dump is: from `{ ref: 'x/<kind><k>' }` or, unpatched, `{ class: '<Name>' }`. */
function outsideClassOfActual(value: Json): string | undefined {
  if (isOnlyKey(value, 'ref') && typeof value.ref === 'string' && OUTSIDE_PATH.test(value.ref)) {
    return OUTSIDE_KIND_CLASS[value.ref.slice(2).replace(/\d+$/, '')];
  }
  return isOnlyKey(value, 'class') && typeof value.class === 'string' && OUTSIDE_CLASSES.has(value.class)
    ? value.class
    : undefined;
}

/** The class an outside element of the recorder's dump is: `{ class: 'org.eclipse.elk.alg.layered.graph.<Name>' }`. */
function outsideClassOfExpected(value: Json): string | undefined {
  if (!isOnlyKey(value, 'class') || typeof value.class !== 'string' || !value.class.startsWith(LGRAPH_PACKAGE)) {
    return undefined;
  }
  const name = value.class.slice(LGRAPH_PACKAGE.length);
  return OUTSIDE_CLASSES.has(name) ? name : undefined;
}

function mapValues(value: Json, leaf: (v: JsonObject) => Json | undefined): Json {
  if (Array.isArray(value)) {
    return value.map((item) => mapValues(item, leaf));
  }
  if (!isObject(value)) {
    return value;
  }
  const replaced = leaf(value);
  if (replaced !== undefined) {
    return replaced;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapValues(item, leaf)]));
}

/**
 * AD-10: an identity-hashed Java `HashMap` is ported as an insertion-ordered `Map`, and the C4 encoder names an unknown object by its
 * constructor, so the TS dump of such a property value is `{ class: 'Map' }` where the recorder has `{ class: 'java.util.HashMap' }`
 * (`SortByInputModelProcessor.java:110` stores one as `TARGET_NODE_MODEL_ORDER`; the same twin as `JAVA_CLASS_TWINS` of
 * layered-order-replay-compare.ts, first recorded by the 7c rows). The marker holds no entries, so only the class is compared.
 */
const JAVA_HASH_MAP = 'java.util.HashMap';
const isTsMapMarker = (value: JsonObject): boolean => isOnlyKey(value, 'class') && value.class === 'Map';

const simpleName = (name: unknown): unknown => (typeof name === 'string' ? (name.split('.').pop() ?? name) : name);

/** An actual dump value as `compareLGraphDump` reads it against a recorder value. */
function actualLeaf(value: JsonObject): Json | undefined {
  if ((value.t === 'int' || value.t === 'double') && 'v' in value) {
    return { t: 'number', v: Number(value.v) };
  }
  const outside = outsideClassOfActual(value);
  if (outside !== undefined) {
    return unreferenced(outside);
  }
  const items = value.items;
  if (value.t === 'list' && Array.isArray(items) && items.length > 0 && items.every(isElementRef)) {
    return items.map((item) => {
      const itemOutside = outsideClassOfActual(item);
      return itemOutside === undefined ? item : unreferenced(itemOutside);
    });
  }
  if (value.t === 'enum') {
    return { ...value, c: simpleName(value.c) };
  }
  return isTsMapMarker(value) ? { class: JAVA_HASH_MAP } : undefined;
}

/** A recorder value as `compareLGraphDump` reads it: the enum's class by its simple name, an outside element by its class. */
function expectedLeaf(value: JsonObject): Json | undefined {
  const outside = outsideClassOfExpected(value);
  if (outside !== undefined) {
    return unreferenced(outside);
  }
  return value.t === 'enum' ? { ...value, c: simpleName(value.c) } : undefined;
}

const withProperties = (holder: JsonObject, leaf: (v: JsonObject) => Json | undefined): JsonObject =>
  isObject(holder.properties) ? { ...holder, properties: mapValues(holder.properties, leaf) as JsonObject } : holder;

function inForm<G extends GraphDump>(graph: G, leaf: (v: JsonObject) => Json | undefined): G {
  const each = (items: readonly unknown[] | undefined): unknown[] | undefined =>
    items?.map((item) => {
      const holder = withProperties(item as JsonObject, leaf);
      return {
        ...holder,
        ...(Array.isArray(holder.ports) ? { ports: each(holder.ports as unknown[]) } : {}),
        ...(Array.isArray(holder.labels) ? { labels: each(holder.labels as unknown[]) } : {}),
      };
    });
  const raw = graph as unknown as JsonObject;
  const layerNodes = raw[LAYER_NODES_FIELD] as unknown[] | undefined;
  return {
    ...withProperties(raw, leaf),
    layerlessNodes: each(graph.layerlessNodes),
    edges: each(graph.edges),
    ...(layerNodes === undefined ? {} : { [LAYER_NODES_FIELD]: each(layerNodes) }),
  } as unknown as G;
}

const actualInRecorderForm = <G extends GraphDump>(graph: G): G => inForm(graph, actualLeaf);
const expectedInTsForm = <G extends GraphDump>(graph: G): G => inForm(graph, expectedLeaf);

// ------------------------------------------------------------------------------------------------------------
// the comparison

const asTree = (value: unknown): TreeDump => value as TreeDump;

function compareLevelPaths(actual: TreeDump, expected: TreeDump): string[] {
  const count = Math.min(actual.graphs.length, expected.graphs.length);
  const diffs: string[] = [];
  for (let i = 0; i < count; i++) {
    const [a, e] = [actual.graphs[i]![LEVEL_PATH_FIELD], expected.graphs[i]![LEVEL_PATH_FIELD]];
    if (a !== e) {
      diffs.push(`graphs[${String(i)}].${LEVEL_PATH_FIELD}: expected ${e}, got ${a}`);
    }
  }
  return diffs;
}

/**
 * `layerNodes` at the bar of `layerlessNodes`: the landed comparison over graphs that agree on everything else (the expected's).
 * The graph's own properties are emptied on both sides (T6): `compareLGraphDump` reads an expected `int`/`double` as a match only
 * for an actual TS `number`, so the expected graph's recorded properties compared with themselves were reported as differences;
 * the graph properties are compared once, by the `graphs` comparison.
 */
function compareLayerNodes(actual: TreeDump, expected: TreeDump): string[] {
  const count = Math.min(actual.graphs.length, expected.graphs.length);
  const only = (graph: TreeGraphDump, nodes: readonly NodeDump[]): GraphDump => ({
    ...graph,
    properties: {},
    layerlessNodes: nodes.map(nodeKept),
    layers: [],
    edges: [],
  });
  const diffs: string[] = [];
  for (let i = 0; i < count; i++) {
    const [a, e] = [actual.graphs[i]!, expected.graphs[i]!];
    const found = compareLGraphDump(
      { graphs: [only(e, a[LAYER_NODES_FIELD])] },
      { graphs: [only(e, e[LAYER_NODES_FIELD])] },
    );
    diffs.push(...found.map((d) => d.replace('graphs[0].layerlessNodes', `graphs[${String(i)}].${LAYER_NODES_FIELD}`)));
  }
  return diffs;
}

function compareCrossHierarchy(actual: TreeDump, expected: TreeDump): string[] {
  const [a, e] = [actual[CROSS_HIERARCHY_FIELD], expected[CROSS_HIERARCHY_FIELD]];
  if (a === null || e === null) {
    return a === e ? [] : [`${CROSS_HIERARCHY_FIELD}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`];
  }
  if (a.length !== e.length) {
    return [`${CROSS_HIERARCHY_FIELD}: expected ${String(e.length)} entries, got ${String(a.length)}`];
  }
  return e.flatMap((want, i) =>
    JSON.stringify(a[i]) === JSON.stringify(want)
      ? []
      : [`${CROSS_HIERARCHY_FIELD}[${String(i)}]: expected ${JSON.stringify(want)}, got ${JSON.stringify(a[i])}`],
  );
}

/**
 * The differences between two tree dumps (`[]`: equal): the landed `compareLGraphDump` over `graphs` (AD-4: structure and
 * strings exact, numbers within 1e-6) with the ignored property ids removed from both sides, then the level paths and the
 * cross-hierarchy map, exactly.
 */
export function compareTree(expected: unknown, actual: unknown): string[] {
  const [want, got] = [asTree(expected), asTree(actual)];
  const actualForm = { ...got, graphs: got.graphs.map(withoutIgnoredProperties).map(actualInRecorderForm) };
  const expectedForm = { ...want, graphs: want.graphs.map(withoutIgnoredProperties).map(expectedInTsForm) };
  const graphs = compareLGraphDump({ graphs: actualForm.graphs }, { graphs: expectedForm.graphs });
  return [
    ...graphs,
    // T8: `layerNodes` goes through the same value forms as `layerlessNodes` (it was compared in the raw forms)
    ...compareLayerNodes(actualForm, expectedForm),
    ...compareLevelPaths(got, want),
    ...compareCrossHierarchy(got, want),
  ];
}
