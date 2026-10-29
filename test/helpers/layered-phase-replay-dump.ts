// SPDX-License-Identifier: EPL-2.0
// The phase dump of mission 7b (B2): what a cycle breaker, a layerer or one of the ten intermediate processors did to
// an imported graph, in the recorder's `expected` shape. Paths are the 7a positional paths of the post-import state,
// remembered per imported graph (a processor moves nodes from the layerless list into layers, so positions computed
// afterwards would shift); elements the import did not have are `new/n<k>`, `new/p<k>`, `new/e<k>` in the order this
// dump first meets them.
//
// `changed` compares each element's C4 property map with a baseline. The baseline is the post-import dump, until
// `normalise` runs (it adds ORIGINAL_PORT_CONSTRAINTS to every node and may set DIRECTION and the edge spacing); from
// then on it is the state `normalise` left (`rebaseline`), so a graph that was imported and normalised with no step
// after it has `changed: []`. `processors`, `random` and `spacings` are ignored.
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import type { EncodedValue, LGraphDump, Properties } from './layered-framework-replay.js';
import { normalizeC4 } from './layered-site-replay-compare.js';
import { Ctx } from './layered-site-replay-context.js';

/** An edge of the graph as the recorder lists it. */
export interface EdgeExpected {
  readonly path: string;
  readonly src: string | null;
  readonly tgt: string | null;
  readonly reversed: boolean;
}

/** An element whose properties differ from the baseline; a removed property is `null`. */
export interface ChangedEntry {
  readonly path: string;
  readonly props: Readonly<Record<string, EncodedValue>>;
}

/** B2's row `expected`; `dump` (the full 7a dump) is stored for step rows with fewer than 10 nodes. */
export interface Expected {
  readonly layers: readonly (readonly string[])[];
  readonly layerless: readonly string[];
  readonly hidden: readonly string[];
  readonly edges: readonly EdgeExpected[];
  readonly changed: readonly ChangedEntry[];
  readonly dump?: LGraphDump;
}

const NEW_PREFIX = 'new/';
let ignored: ReadonlySet<string> | null = null;

/** The property ids no dump compares: runtime objects. Built on first use (module load order of InternalProperties). */
export function ignoredProperties(): ReadonlySet<string> {
  ignored ??= new Set([
    InternalProperties.PROCESSORS.getId(),
    InternalProperties.RANDOM.getId(),
    InternalProperties.SPACINGS.getId(),
  ]);
  return ignored;
}

type PropertyMap = Record<string, EncodedValue>;

class Registration {
  readonly byPath = new Map<string, object>();
  readonly ctx = new Ctx({});
  readonly created = new Map<object, string>();
  private readonly counters = new Map<string, number>();
  baseline: Map<string, PropertyMap> | null = null;

  constructor(
    readonly paths: ReadonlyMap<object, string>,
    readonly importDump: LGraphDump,
  ) {
    this.ctx.bindAll(paths);
    paths.forEach((path, element) => this.byPath.set(path, element));
  }

  /** The path of an element: the import's, or `new/<kind><k>` named on first sight. */
  pathOf(element: object, kind: 'n' | 'p' | 'e'): string {
    const known = this.paths.get(element) ?? this.created.get(element);
    if (known !== undefined) {
      return known;
    }
    const k = this.counters.get(kind) ?? 0;
    this.counters.set(kind, k + 1);
    const path = `${NEW_PREFIX}${kind}${String(k)}`;
    this.created.set(element, path);
    this.byPath.set(path, element);
    this.ctx.bind(element, path);
    return path;
  }
}

const REGISTRY = new WeakMap<LGraph, Registration>();

function registrationOf(graph: LGraph): Registration {
  const registration = REGISTRY.get(graph);
  if (registration === undefined) {
    throw new Error('the graph was not imported through importTarget/importRow');
  }
  return registration;
}

/** Remembers the positional paths and the post-import dump of a freshly imported graph. */
export function recordImport(graph: LGraph, paths: ReadonlyMap<object, string>, importDump: LGraphDump): void {
  REGISTRY.set(graph, new Registration(paths, importDump));
}

/** The post-import dump `recordImport` stored. */
export function importDumpOf(graph: LGraph): LGraphDump {
  return registrationOf(graph).importDump;
}

/** The replay's name/C4 context of an imported graph (decodes `{ref}` values, encodes property values). */
export function contextOf(graph: LGraph): Ctx {
  return registrationOf(graph).ctx;
}

/** The element an import path (or a `new/` path met by an earlier dump) names. */
export function elementAt(graph: LGraph, path: string): object {
  const element = registrationOf(graph).byPath.get(path);
  if (element === undefined) {
    throw new Error(`no element has the path ${path}`);
  }
  return element;
}

// ---------------------------------------------------------------------------------------------------------------
// Traversal

function hiddenNodes(graph: LGraph): LNode[] {
  // HIDDEN_NODES has no default: a graph no processor hid nodes in answers null at run time.
  return (graph.getProperty(InternalProperties.HIDDEN_NODES) as LNode[] | null) ?? [];
}

function nodesOf(graph: LGraph): LNode[] {
  const nodes = new Set<LNode>(graph.getLayerlessNodes());
  graph.getLayers().forEach((layer) => layer.getNodes().forEach((node) => nodes.add(node)));
  hiddenNodes(graph).forEach((node) => nodes.add(node));
  return [...nodes];
}

function graphsOf(root: LGraph): LGraph[] {
  const graphs: LGraph[] = [];
  const visit = (graph: LGraph): void => {
    graphs.push(graph);
    for (const node of nodesOf(graph)) {
      const nested = node.getNestedGraph();
      if (nested !== null) {
        visit(nested);
      }
    }
  };
  visit(root);
  return graphs;
}

interface Elements {
  readonly nodes: LNode[];
  readonly ports: LPort[];
  readonly edges: LEdge[];
}

function collect(root: LGraph): Elements {
  const nodes = graphsOf(root).flatMap(nodesOf);
  const ports = nodes.flatMap((node) => node.getPorts());
  const edges = new Set<LEdge>();
  for (const port of ports) {
    [...port.getOutgoingEdges(), ...port.getIncomingEdges()].forEach((edge) => edges.add(edge));
  }
  return { nodes, ports, edges: [...edges] };
}

// ---------------------------------------------------------------------------------------------------------------
// Properties

function encodeProperties(registration: Registration, element: LGraphElement): PropertyMap {
  const props: PropertyMap = {};
  for (const [property, value] of element.getAllProperties() as Iterable<[{ getId(): string }, unknown]>) {
    if (!ignoredProperties().has(property.getId())) {
      props[property.getId()] = registration.ctx.encode(value, 0) as EncodedValue;
    }
  }
  return props;
}

function elementsWithProperties(registration: Registration): [string, LGraphElement][] {
  return [...registration.byPath]
    .filter(
      (entry): entry is [string, LGraphElement] => entry[1] instanceof LGraphElement && !(entry[1] instanceof Layer),
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function snapshot(registration: Registration): Map<string, PropertyMap> {
  return new Map(elementsWithProperties(registration).map(([path, el]) => [path, encodeProperties(registration, el)]));
}

/** Every path-bearing object of a dump with its `properties`, by path. */
function indexDump(node: unknown, out: Map<string, PropertyMap>): Map<string, PropertyMap> {
  if (Array.isArray(node)) {
    node.forEach((child) => indexDump(child, out));
  } else if (node !== null && typeof node === 'object') {
    const object = node as { path?: unknown; properties?: unknown };
    if (typeof object.path === 'string' && object.properties !== undefined) {
      out.set(object.path, object.properties as PropertyMap);
    }
    Object.values(node).forEach((child) => indexDump(child, out));
  }
  return out;
}

/**
 * Makes the current state the `changed` baseline. `normalise` calls it last: the configurator's property writes are
 * not the effect of a phase.
 */
export function rebaseline(graph: LGraph): void {
  const registration = registrationOf(graph);
  registration.baseline = snapshot(registration);
}

function sameValue(a: EncodedValue | undefined, b: EncodedValue | undefined): boolean {
  return JSON.stringify(normalizeC4(a)) === JSON.stringify(normalizeC4(b));
}

function diffProperties(current: PropertyMap, base: PropertyMap): PropertyMap {
  const props: PropertyMap = {};
  for (const [id, value] of Object.entries(current)) {
    if (!(id in base) || !sameValue(value, base[id])) {
      props[id] = value;
    }
  }
  for (const id of Object.keys(base)) {
    if (!(id in current) && !ignoredProperties().has(id)) {
      props[id] = null;
    }
  }
  return props;
}

function withoutIgnored(properties: PropertyMap): PropertyMap {
  return Object.fromEntries(Object.entries(properties).filter(([id]) => !ignoredProperties().has(id)));
}

function changedEntries(registration: Registration, baseline: Map<string, PropertyMap>): ChangedEntry[] {
  const changed: ChangedEntry[] = [];
  for (const [path, element] of elementsWithProperties(registration)) {
    const base = withoutIgnored(baseline.get(path) ?? {});
    const props = diffProperties(encodeProperties(registration, element), base);
    if (Object.keys(props).length > 0) {
      changed.push({ path, props });
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------------------------------------------
// The dump

function edgeOrder(registration: Registration): (a: LEdge, b: LEdge) => number {
  const ordinal = new Map<object, number>([...registration.paths.keys()].map((element, i) => [element, i]));
  const rank = (edge: LEdge): number => ordinal.get(edge) ?? Number.MAX_SAFE_INTEGER;
  return (a, b) => rank(a) - rank(b);
}

function portPath(registration: Registration, port: LPort | null): string | null {
  return port === null ? null : registration.pathOf(port, 'p');
}

function edgesExpected(registration: Registration, edges: readonly LEdge[]): EdgeExpected[] {
  return [...edges].sort(edgeOrder(registration)).map((edge) => ({
    path: registration.pathOf(edge, 'e'),
    src: portPath(registration, edge.getSource()),
    tgt: portPath(registration, edge.getTarget()),
    reversed: edge.getProperty(InternalProperties.REVERSED),
  }));
}

/** The B2 `expected` of the graph's current state against the baseline described in the file header. */
export function phaseDump(graph: LGraph, importDump: LGraphDump): Expected {
  const registration = registrationOf(graph);
  const elements = collect(graph);
  elements.nodes.forEach((node) => registration.pathOf(node, 'n'));
  elements.ports.forEach((port) => registration.pathOf(port, 'p'));
  const edges = edgesExpected(registration, elements.edges);
  const path = (node: LNode): string => registration.pathOf(node, 'n');
  const baseline = registration.baseline ?? indexDump(importDump, new Map());
  return {
    layers: graph.getLayers().map((layer) => layer.getNodes().map(path)),
    layerless: graph.getLayerlessNodes().map(path),
    hidden: hiddenNodes(graph).map(path),
    edges,
    changed: changedEntries(registration, baseline),
  };
}
