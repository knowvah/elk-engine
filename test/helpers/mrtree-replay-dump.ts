// SPDX-License-Identifier: EPL-2.0
// The TS twin of the stop dump of tools/vectors/MrTreeVectors.java (mission 8a, T6; the recorder header is the format contract). One module,
// three jobs that later tasks (T9, T12, T14-T17) share:
//   dumpTGraph(graph)            a TS TGraph in exactly the recorder's graph format ({ props, nodes, edges }): node `ref` = the ORIGIN's
//                                identifier, else the label; edge `ref` = the ORIGIN's identifier, else `d:<source ref>><target ref>`; the
//                                properties that are SET among every InternalProperties field plus TREE_LEVEL, POSITION_CONSTRAINT and
//                                PRIORITY, in the recorder's order; raw IEEE hex numbers;
//   buildTGraph(dump, options)   a TS TGraph rebuilt from a recorded graph (the "before" state of a replayed step): nodes with ids, labels,
//                                centre positions and sizes, edges with bend points, out lists in `children` order, in lists in graph edge
//                                order, every dumped property, graph-level properties;
//   compareStop / compareGraph   differences as { path, expected, actual }: ids, refs, labels, strings, booleans, child order, node and edge
//                                order exact; numbers (hex doubles) within 1e-6 absolute (AD-4).
// WHAT THE RECORDER DOES NOT DUMP (so a rebuild cannot restore it; see `RebuildLimits` and the T6 report): the in/out edge LISTS themselves
//   (the out list is recovered from `children` by matching the first unused graph edge of that source and target; the in list is the matched
//   edges in graph edge order, checked against the recorded `parent`), TEdge/TNode labels (TLabel), TEdge.id, and every property outside the
//   dumped set: the importer copies ALL ElkNode properties onto the TGraph, TNodes and TEdges (spacing, direction, weighting, compaction, ...),
//   which processors read, but the dump carries only the internal ones. `BuildOptions.templates` supplies them: a task imports the row's
//   `input` with the ported ElkGraphImporter and passes the imported graph's property holders; the dumped values then overwrite.
// ORIGIN values: the dump holds the origin's identifier; a rebuild stores a `ReplayOrigin` (an object with `getIdentifier()`) unless
//   `BuildOptions.origin` resolves the real ElkNode/ElkEdge of the re-imported input.
import { KVector } from '../../src/core/math/KVector.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { LinkedList } from '../../src/java/util/LinkedList.js';
import { TEdge } from '../../src/alg/mrtree/graph/TEdge.js';
import { TGraph } from '../../src/alg/mrtree/graph/TGraph.js';
import { TNode } from '../../src/alg/mrtree/graph/TNode.js';
import { InternalProperties } from '../../src/alg/mrtree/options/InternalProperties.js';
import { MrTreeOptions } from '../../src/alg/mrtree/options/MrTreeOptions.js';
import {
  decodeHex,
  decodeHexPair,
  encodeHex,
  encodeHexPair,
  type DumpProps,
  type ElkResult,
  type Hex,
  type HexPair,
  type PropValue,
  type Stop,
  type StopEdge,
  type StopGraph,
  type StopNode,
} from './mrtree-replay-rows.js';

/** AD-4: absolute tolerance of every numeric comparison. */
export const NUMERIC_TOLERANCE = 1e-6;

// ------------------------------------------------------------------------------------------------------------
// the property table

type Kind = 'int' | 'boolean' | 'double' | 'string' | 'node' | 'edge' | 'vector' | 'origin' | 'nodeList' | 'edgeList';

interface Codec {
  readonly name: string;
  readonly property: IProperty<unknown>;
  /** `unsupported` is the recorder's `RANDOM`: it fails the recording, so a dump of a set one fails too. */
  readonly kind: Kind | 'unsupported';
}

const entry = (name: string, property: IProperty<unknown>, kind: Codec['kind']): Codec => ({ name, property, kind });

/** Every InternalProperties field and its Java value type (the recorder's `enc` by instance type). */
const INTERNAL_CODECS: readonly Codec[] = [
  entry('ORIGIN', InternalProperties.ORIGIN, 'origin'),
  entry('RANDOM', InternalProperties.RANDOM, 'unsupported'),
  entry('DEPTH', InternalProperties.DEPTH, 'int'),
  entry('FAN', InternalProperties.FAN, 'int'),
  entry('DESCENDANTS', InternalProperties.DESCENDANTS, 'int'),
  entry('ROOT', InternalProperties.ROOT, 'boolean'),
  entry('LEFTNEIGHBOR', InternalProperties.LEFTNEIGHBOR, 'node'),
  entry('RIGHTNEIGHBOR', InternalProperties.RIGHTNEIGHBOR, 'node'),
  entry('LEFTSIBLING', InternalProperties.LEFTSIBLING, 'node'),
  entry('RIGHTSIBLING', InternalProperties.RIGHTSIBLING, 'node'),
  entry('DUMMY', InternalProperties.DUMMY, 'boolean'),
  entry('LEVEL', InternalProperties.LEVEL, 'int'),
  entry('REMOVABLE_EDGES', InternalProperties.REMOVABLE_EDGES, 'edgeList'),
  entry('XCOOR', InternalProperties.XCOOR, 'int'),
  entry('YCOOR', InternalProperties.YCOOR, 'int'),
  entry('LEVELHEIGHT', InternalProperties.LEVELHEIGHT, 'double'),
  entry('LEVELMIN', InternalProperties.LEVELMIN, 'double'),
  entry('LEVELMAX', InternalProperties.LEVELMAX, 'double'),
  entry('GRAPH_XMIN', InternalProperties.GRAPH_XMIN, 'double'),
  entry('GRAPH_YMIN', InternalProperties.GRAPH_YMIN, 'double'),
  entry('GRAPH_XMAX', InternalProperties.GRAPH_XMAX, 'double'),
  entry('GRAPH_YMAX', InternalProperties.GRAPH_YMAX, 'double'),
  entry('COMPACT_LEVEL_ASCENSION', InternalProperties.COMPACT_LEVEL_ASCENSION, 'boolean'),
  entry('COMPACT_CONSTRAINTS', InternalProperties.COMPACT_CONSTRAINTS, 'nodeList'),
  entry('ID', InternalProperties.ID, 'string'),
  entry('POSITION', InternalProperties.POSITION, 'int'),
  entry('PRELIM', InternalProperties.PRELIM, 'double'),
  entry('MODIFIER', InternalProperties.MODIFIER, 'double'),
  entry('BB_UPLEFT', InternalProperties.BB_UPLEFT, 'vector'),
  entry('BB_LOWRIGHT', InternalProperties.BB_LOWRIGHT, 'vector'),
];

/** The names of the InternalProperties fields: the table is checked against the class by the helper test. */
export const INTERNAL_PROPERTY_NAMES: readonly string[] = INTERNAL_CODECS.map((codec) => codec.name);

const byName = (a: Codec, b: Codec): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/**
 * The recorder's PROP_ORDER: the InternalProperties fields sorted by Java field name, then the three MrTreeOptions properties sorted by
 * name (`POSITION_CONSTRAINT`, `PRIORITY`, `TREE_LEVEL`; all Integer).
 */
const CODECS: readonly Codec[] = [
  ...[...INTERNAL_CODECS].sort(byName),
  ...[
    entry('POSITION_CONSTRAINT', MrTreeOptions.POSITION_CONSTRAINT, 'int'),
    entry('PRIORITY', MrTreeOptions.PRIORITY, 'int'),
    entry('TREE_LEVEL', MrTreeOptions.TREE_LEVEL, 'int'),
  ].sort(byName),
];

/** The dumped property names in the recorder's order. */
export const DUMPED_PROPERTY_NAMES: readonly string[] = CODECS.map((codec) => codec.name);

const CODEC_BY_NAME: ReadonlyMap<string, Codec> = new Map(CODECS.map((codec) => [codec.name, codec]));

// ------------------------------------------------------------------------------------------------------------
// origins and refs

/** What `ORIGIN` holds after a rebuild when no resolver gives the real element: it answers `getIdentifier()` like an ElkGraphElement. */
export class ReplayOrigin {
  constructor(
    readonly kind: 'graph' | 'node' | 'edge',
    private readonly identifier: string,
  ) {}

  getIdentifier(): string {
    return this.identifier;
  }
}

const hasIdentifier = (value: unknown): value is { getIdentifier(): string | null } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { getIdentifier?: unknown }).getIdentifier === 'function';

/** The recorder's `nodeRef`: the ORIGIN element's identifier, else the label. */
export function nodeRef(node: TNode): string {
  const origin = node.getProperty(InternalProperties.ORIGIN);
  const identifier = hasIdentifier(origin) ? origin.getIdentifier() : null;
  const ref = identifier ?? node.getLabel();
  if (ref === null) {
    throw new Error(
      `node n_${String(node.id)} has neither an ORIGIN identifier nor a label: the dump has no ref for it`,
    );
  }
  return ref;
}

/** The recorder's `edgeRef`: the ORIGIN element's identifier, else `d:<source ref>><target ref>`. */
export function edgeRef(edge: TEdge): string {
  const origin = edge.getProperty(InternalProperties.ORIGIN);
  const identifier = hasIdentifier(origin) ? origin.getIdentifier() : null;
  return identifier ?? `d:${nodeRef(edge.getSource()!)}>${nodeRef(edge.getTarget()!)}`;
}

// ------------------------------------------------------------------------------------------------------------
// dump

function encode(codec: Codec, value: unknown): PropValue {
  switch (codec.kind) {
    case 'int':
    case 'boolean':
    case 'string':
      return value as number | boolean | string;
    case 'double':
      return encodeHex(value as number);
    case 'node':
      return nodeRef(value as TNode);
    case 'edge':
      return edgeRef(value as TEdge);
    case 'vector':
      return encodeHexPair((value as KVector).x, (value as KVector).y);
    case 'origin':
      return (value as { getIdentifier(): string }).getIdentifier();
    case 'nodeList':
      return [...(value as Iterable<TNode>)].map(nodeRef);
    case 'edgeList':
      return [...(value as Iterable<TEdge>)].map(edgeRef);
    case 'unsupported':
      throw new Error(`unencodable property ${codec.name}`);
  }
}

/** The set properties among the dumped ones, in the recorder's order. */
export function dumpProps(holder: IPropertyHolder): DumpProps {
  const set = new Map<string, unknown>();
  for (const [property, value] of holder.getAllProperties()) {
    set.set(property.getId(), value);
  }
  const out: Record<string, PropValue> = {};
  for (const codec of CODECS) {
    if (set.has(codec.property.getId())) {
      out[codec.name] = encode(codec, set.get(codec.property.getId()));
    }
  }
  return out;
}

export function dumpTNode(node: TNode): StopNode {
  const parent = node.getParent();
  return {
    ref: nodeRef(node),
    id: node.id,
    label: node.getLabel(),
    x: encodeHex(node.getPosition().x),
    y: encodeHex(node.getPosition().y),
    w: encodeHex(node.getSize().x),
    h: encodeHex(node.getSize().y),
    parent: parent === null ? null : nodeRef(parent),
    children: [...node.getChildren()].map(nodeRef),
    props: dumpProps(node),
  };
}

export function dumpTEdge(edge: TEdge): StopEdge {
  return {
    ref: edgeRef(edge),
    source: nodeRef(edge.getSource()!),
    target: nodeRef(edge.getTarget()!),
    bends: [...edge.getBendPoints()].map((k) => encodeHexPair(k.x, k.y)),
    props: dumpProps(edge),
  };
}

/** The recorder's `dumpGraph`: nodes and edges in `getNodes()`/`getEdges()` order (an edge listed twice is dumped twice). */
export function dumpTGraph(graph: TGraph): StopGraph {
  const seen = new Set<string>();
  const nodes = [...graph.getNodes()].map((node) => {
    const dumped = dumpTNode(node);
    if (seen.has(dumped.ref)) {
      throw new Error(`duplicate node ref ${dumped.ref}`);
    }
    seen.add(dumped.ref);
    return dumped;
  });
  return { props: dumpProps(graph), nodes, edges: [...graph.getEdges()].map(dumpTEdge) };
}

/** A stop of the recorder's shape for a TS replay's graphs. */
export const dumpStop = (step: string, comp: number, graphs: readonly TGraph[]): Stop => ({
  step,
  comp,
  graphs: graphs.map(dumpTGraph),
});

// ------------------------------------------------------------------------------------------------------------
// rebuild

/** A recorded graph that cannot be rebuilt faithfully (the message names what the dump lacks or contradicts). */
export class ReplayRebuildError extends Error {}

/** The property holders an importer-built graph supplies for the properties the dump does not carry (see the header). */
export interface PropertyTemplates {
  readonly graph?: IPropertyHolder | null;
  readonly node?: (ref: string) => IPropertyHolder | null | undefined;
  readonly edge?: (ref: string) => IPropertyHolder | null | undefined;
}

export interface BuildOptions {
  readonly templates?: PropertyTemplates;
  /** Resolves an ORIGIN identifier to the element it names (default: a {@link ReplayOrigin}). */
  readonly origin?: (kind: 'graph' | 'node' | 'edge', identifier: string) => unknown;
}

interface Context {
  readonly nodes: Map<string, TNode>;
  readonly edges: Map<string, TEdge>;
  readonly origin: (kind: 'graph' | 'node' | 'edge', identifier: string) => unknown;
}

const requireKey = <V>(map: ReadonlyMap<string, V>, key: string, what: string): V => {
  const value = map.get(key);
  if (value === undefined) {
    throw new ReplayRebuildError(`${what} ${JSON.stringify(key)} is not in the dump`);
  }
  return value;
};

function decode(codec: Codec, value: PropValue, context: Context, holder: 'graph' | 'node' | 'edge'): unknown {
  switch (codec.kind) {
    case 'int':
    case 'boolean':
    case 'string':
      return value;
    case 'double':
      return decodeHex(value as Hex);
    case 'node':
      return requireKey(context.nodes, value as string, 'node ref');
    case 'edge':
      return requireKey(context.edges, value as string, 'edge ref');
    case 'vector': {
      const [x, y] = decodeHexPair(value as HexPair);
      return new KVector(x, y);
    }
    case 'origin':
      return context.origin(holder, value as string);
    case 'nodeList':
      // `List<TNode>` is an ArrayList (an array here)
      return (value as readonly string[]).map((ref) => requireKey(context.nodes, ref, 'node ref'));
    case 'edgeList':
      // `List<TEdge>` is a LinkedList
      return new LinkedList((value as readonly string[]).map((ref) => requireKey(context.edges, ref, 'edge ref')));
    case 'unsupported':
      throw new ReplayRebuildError(`property ${codec.name} cannot be rebuilt`);
  }
}

function applyProps(
  holder: IPropertyHolder,
  props: DumpProps,
  template: IPropertyHolder | null | undefined,
  context: Context,
  kind: 'graph' | 'node' | 'edge',
): void {
  if (template !== null && template !== undefined) {
    holder.copyProperties(template);
  }
  for (const [name, value] of Object.entries(props)) {
    const codec = requireKey(CODEC_BY_NAME, name, 'property');
    holder.setProperty(codec.property, decode(codec, value, context, kind));
  }
}

function buildNodes(dump: StopGraph, graph: TGraph): Map<string, TNode> {
  const nodes = new Map<string, TNode>();
  for (const data of dump.nodes) {
    if (nodes.has(data.ref)) {
      throw new ReplayRebuildError(`duplicate node ref ${data.ref}`);
    }
    const node = new TNode(data.id, graph, data.label);
    node.getPosition().x = decodeHex(data.x);
    node.getPosition().y = decodeHex(data.y);
    node.getSize().x = decodeHex(data.w);
    node.getSize().y = decodeHex(data.h);
    nodes.set(data.ref, node);
    graph.getNodes().add(node);
  }
  return nodes;
}

/** An edge listed twice (a component's edge list repeats an edge with both endpoints in it) is one TEdge listed twice. */
function buildEdges(dump: StopGraph, graph: TGraph, nodes: ReadonlyMap<string, TNode>): Map<string, TEdge> {
  const edges = new Map<string, TEdge>();
  for (const data of dump.edges) {
    let edge = edges.get(data.ref);
    if (edge === undefined) {
      edge = new TEdge(requireKey(nodes, data.source, 'node ref'), requireKey(nodes, data.target, 'node ref'));
      for (const bend of data.bends) {
        const [x, y] = decodeHexPair(bend);
        edge.getBendPoints().add(new KVector(x, y));
      }
      edges.set(data.ref, edge);
    } else if (edge.getSource() !== nodes.get(data.source) || edge.getTarget() !== nodes.get(data.target)) {
      throw new ReplayRebuildError(`edge ref ${data.ref} is listed twice with different endpoints`);
    }
    graph.getEdges().add(edge);
  }
  return edges;
}

/**
 * The out list of every node is its `children` order: each child ref takes the first unused graph edge from that node to that child.
 * The in list is those edges in graph edge order. The recorded `parent` (source of the first incoming edge) is the only check the dump
 * allows on the in list.
 */
function wireEdgeLists(dump: StopGraph, graph: TGraph, nodes: ReadonlyMap<string, TNode>): void {
  const unique = [...new Set(graph.getEdges())];
  const wired = new Set<TEdge>();
  for (const data of dump.nodes) {
    const node = requireKey(nodes, data.ref, 'node ref');
    const used = new Set<TEdge>();
    for (const childRef of data.children) {
      const child = requireKey(nodes, childRef, 'node ref');
      const edge = unique.find((e) => e.getSource() === node && e.getTarget() === child && !used.has(e));
      if (edge === undefined) {
        throw new ReplayRebuildError(`node ${data.ref} lists child ${childRef} but no graph edge leads there`);
      }
      used.add(edge);
      wired.add(edge);
      node.getOutgoingEdges().add(edge);
    }
  }
  for (const edge of unique) {
    if (wired.has(edge)) {
      edge.getTarget()!.getIncomingEdges().add(edge);
    }
  }
  for (const data of dump.nodes) {
    // refs are by the dump's keys: the ORIGIN properties that `nodeRef` reads are not set yet
    const parent = requireKey(nodes, data.ref, 'node ref').getParent();
    const derived = parent === null ? null : ([...nodes].find(([, node]) => node === parent)?.[0] ?? null);
    if (derived !== data.parent) {
      throw new ReplayRebuildError(
        `node ${data.ref}: the rebuilt first incoming edge comes from ${String(derived)}, the dump records parent ${String(data.parent)} (the in-edge list order is not dumped)`,
      );
    }
  }
}

/** Rebuilds a TS TGraph from a recorded graph (see the header for what is and is not restored). */
export function buildTGraph(dump: StopGraph, options: BuildOptions = {}): TGraph {
  const graph = new TGraph();
  const nodes = buildNodes(dump, graph);
  const edges = buildEdges(dump, graph, nodes);
  wireEdgeLists(dump, graph, nodes);
  const context: Context = {
    nodes,
    edges,
    origin: options.origin ?? ((kind, identifier) => new ReplayOrigin(kind, identifier)),
  };
  const templates = options.templates ?? {};
  applyProps(graph, dump.props, templates.graph, context, 'graph');
  for (const data of dump.nodes) {
    const node = requireKey(nodes, data.ref, 'node ref');
    applyProps(node, data.props, templates.node?.(data.ref), context, 'node');
  }
  for (const data of dump.edges) {
    const edge = requireKey(edges, data.ref, 'edge ref');
    applyProps(edge, data.props, templates.edge?.(data.ref), context, 'edge');
  }
  return graph;
}

// ------------------------------------------------------------------------------------------------------------
// comparison

/** One difference: where (a path into the stop), what the recording holds and what the replay produced. */
export interface Difference {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

/** A readable report of differences, one per line. */
export const formatDifferences = (differences: readonly Difference[]): string =>
  differences
    .map((d) => `${d.path}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`)
    .join('\n');

const ABSENT = '<absent>';

class Differences {
  readonly list: Difference[] = [];

  exact(path: string, expected: unknown, actual: unknown): void {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      this.list.push({ path, expected, actual });
    }
  }

  /** Hex doubles within the tolerance (infinities and NaN by identity). */
  hex(path: string, expected: Hex | null | undefined, actual: Hex | null | undefined): void {
    if (typeof expected !== 'string' || typeof actual !== 'string') {
      this.exact(path, expected, actual);
      return;
    }
    const e = decodeHex(expected);
    const a = decodeHex(actual);
    const same = Number.isNaN(e) ? Number.isNaN(a) : e === a || Math.abs(e - a) <= NUMERIC_TOLERANCE;
    if (!same) {
      this.list.push({ path, expected: e, actual: a });
    }
  }

  pair(path: string, expected: HexPair, actual: HexPair): void {
    this.hex(`${path}.x`, expected[0], actual[0]);
    this.hex(`${path}.y`, expected[1], actual[1]);
  }

  pairs(path: string, expected: readonly HexPair[], actual: readonly HexPair[]): void {
    this.exact(`${path}.length`, expected.length, actual.length);
    const common = Math.min(expected.length, actual.length);
    for (let i = 0; i < common; i++) {
      this.pair(`${path}[${String(i)}]`, expected[i]!, actual[i]!);
    }
  }
}

function compareValue(out: Differences, path: string, codec: Codec, expected: PropValue, actual: PropValue): void {
  if (codec.kind === 'double') {
    out.hex(path, expected as Hex, actual as Hex);
  } else if (codec.kind === 'vector') {
    out.pair(path, expected as HexPair, actual as HexPair);
  } else {
    out.exact(path, expected, actual);
  }
}

function compareProps(out: Differences, path: string, expected: DumpProps, actual: DumpProps): void {
  for (const name of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    const codec = requireKey(CODEC_BY_NAME, name, 'property');
    const e = expected[name];
    const a = actual[name];
    if (e === undefined || a === undefined) {
      out.list.push({ path: `${path}.${name}`, expected: e ?? ABSENT, actual: a ?? ABSENT });
    } else {
      compareValue(out, `${path}.${name}`, codec, e, a);
    }
  }
}

function compareNode(out: Differences, path: string, e: StopNode, a: StopNode): void {
  out.exact(`${path}.ref`, e.ref, a.ref);
  out.exact(`${path}.id`, e.id, a.id);
  out.exact(`${path}.label`, e.label, a.label);
  out.hex(`${path}.x`, e.x, a.x);
  out.hex(`${path}.y`, e.y, a.y);
  out.hex(`${path}.w`, e.w, a.w);
  out.hex(`${path}.h`, e.h, a.h);
  out.exact(`${path}.parent`, e.parent, a.parent);
  out.exact(`${path}.children`, e.children, a.children);
  compareProps(out, `${path}.props`, e.props, a.props);
}

function compareEdge(out: Differences, path: string, e: StopEdge, a: StopEdge): void {
  out.exact(`${path}.ref`, e.ref, a.ref);
  out.exact(`${path}.source`, e.source, a.source);
  out.exact(`${path}.target`, e.target, a.target);
  out.pairs(`${path}.bends`, e.bends, a.bends);
  compareProps(out, `${path}.props`, e.props, a.props);
}

function compareLists<T extends { readonly ref: string }>(
  out: Differences,
  path: string,
  expected: readonly T[],
  actual: readonly T[],
  compareItem: (out: Differences, path: string, e: T, a: T) => void,
): void {
  out.exact(`${path}.length`, expected.length, actual.length);
  const common = Math.min(expected.length, actual.length);
  for (let i = 0; i < common; i++) {
    const e = expected[i]!;
    compareItem(out, `${path}[${String(i)}:${e.ref}]`, e, actual[i]!);
  }
}

function compareGraphInto(out: Differences, path: string, expected: StopGraph, actual: StopGraph): void {
  compareProps(out, `${path}.props`, expected.props, actual.props);
  compareLists(out, `${path}.nodes`, expected.nodes, actual.nodes, compareNode);
  compareLists(out, `${path}.edges`, expected.edges, actual.edges, compareEdge);
}

/** Differences between a recorded graph and a replayed graph dump (ids and order exact, numbers within 1e-6). */
export function compareGraph(expected: StopGraph, actual: StopGraph, path = 'graph'): Difference[] {
  const out = new Differences();
  compareGraphInto(out, path, expected, actual);
  return out.list;
}

function compareElkInto(out: Differences, expected: ElkResult, actual: ElkResult): void {
  out.hex('elk.graph.w', expected.graph.w, actual.graph.w);
  out.hex('elk.graph.h', expected.graph.h, actual.graph.h);
  out.hex('elk.graph.childAreaWidth', expected.graph.childAreaWidth, actual.graph.childAreaWidth);
  out.hex('elk.graph.childAreaHeight', expected.graph.childAreaHeight, actual.graph.childAreaHeight);
  out.exact('elk.nodes.length', expected.nodes.length, actual.nodes.length);
  expected.nodes.forEach((e, i) => {
    const a = actual.nodes[i];
    const path = `elk.nodes[${String(i)}:${e.id}]`;
    out.exact(`${path}.id`, e.id, a?.id);
    for (const field of ['x', 'y', 'w', 'h'] as const) {
      out.hex(`${path}.${field}`, e[field], a?.[field]);
    }
  });
  out.exact('elk.edges.length', expected.edges.length, actual.edges.length);
  expected.edges.forEach((e, i) => {
    const a = actual.edges[i];
    const path = `elk.edges[${String(i)}:${e.id}]`;
    out.exact(`${path}.id`, e.id, a?.id);
    out.exact(`${path}.sections.length`, e.sections.length, a?.sections.length);
    e.sections.forEach((section, k) => {
      const other = a?.sections[k];
      if (other !== undefined) {
        out.pair(`${path}.sections[${String(k)}].start`, section.start, other.start);
        out.pair(`${path}.sections[${String(k)}].end`, section.end, other.end);
        out.pairs(`${path}.sections[${String(k)}].bends`, section.bends, other.bends);
      }
    });
  });
}

/** Differences between the recorded and the replayed ELK result of `applyLayout`. */
export function compareElk(expected: ElkResult, actual: ElkResult): Difference[] {
  const out = new Differences();
  compareElkInto(out, expected, actual);
  return out.list;
}

/** Differences between a recorded stop and a replayed one: step, comp, every graph and the ELK result. */
export function compareStop(expected: Stop, actual: Stop): Difference[] {
  const out = new Differences();
  out.exact('step', expected.step, actual.step);
  out.exact('comp', expected.comp, actual.comp);
  out.exact('graphs.length', expected.graphs.length, actual.graphs.length);
  const common = Math.min(expected.graphs.length, actual.graphs.length);
  for (let i = 0; i < common; i++) {
    compareGraphInto(out, `graphs[${String(i)}]`, expected.graphs[i]!, actual.graphs[i]!);
  }
  if (expected.elk !== undefined && actual.elk !== undefined) {
    compareElkInto(out, expected.elk, actual.elk);
  } else {
    out.exact('elk', expected.elk ?? ABSENT, actual.elk ?? ABSENT);
  }
  return out.list;
}
