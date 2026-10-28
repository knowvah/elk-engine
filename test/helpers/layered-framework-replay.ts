// SPDX-License-Identifier: EPL-2.0
// Replay helper for test/golden/refs/java/layered-framework.json (mission 7a, L3/L4; recorded by
// tools/vectors/LayeredFrameworkVectors.java before any TS consumer). Shared by the transform replay (T6) and its
// successors: loads the rows once, imports a row's ELK JSON input with layered registered (L5), dumps an LGraph in the
// recorder's format (its header describes it) and compares two dumps at the AD-4 bar (numbers within 1e-6, everything
// else exact).
//
// Two things a TypeScript value cannot say, and how the comparison treats them:
// - `number` is both Java `Integer` and `Double`: the TS dump tags every number `{ t: 'number', v }`; the comparison
//   checks an expected `int` exactly and an expected `double` (a `Double.toString` string) within the tolerance.
// - an empty `EnumSet` does not know its element class: the TS dump gives `c: null` for it and the comparison skips
//   the class name of an empty actual set (the items, none, are still compared). Likewise the Java class name of a
//   collection (`ArrayList` vs `LinkedList`) is not recoverable from a TS array, so a list's `c` is not compared.
import { readFileSync } from 'node:fs';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { Spacing } from '../../src/core/math/Spacing.js';
import { KVector } from '../../src/core/math/KVector.js';
import { ElkNode } from '../../src/graph/ElkNode.js';
import { isElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import type { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import type { LPort } from '../../src/alg/layered/graph/LPort.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { RuntimeException } from '../../src/java/lang/RuntimeException.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import { doubleToRawLongBits, longBitsToDouble } from '../../src/java/lang/JavaDouble.js';
import { compareLayout, formatDiffs } from '../golden/compare-json.js';

const VECTORS_URL = new URL('../golden/refs/java/layered-framework.json', import.meta.url);
/** AD-4: absolute tolerance on numbers. */
export const TOLERANCE = 1e-6;
const LAYERED_PROBE_OPTION = 'org.eclipse.elk.layered.spacing.baseValue';
const HEX_DIGITS = 16;
const HEX_RADIX = 16;
const MAX_VALUE_DEPTH = 8;

export type Hex = string;
export type HexPair = readonly [Hex, Hex];
export type HexQuad = readonly [Hex, Hex, Hex, Hex];

/** An encoded property value (C4 extended with element references; see the recorder header). */
export type EncodedValue =
  | null
  | { readonly ref: string }
  | { readonly elk: string | null }
  | { readonly class: string }
  | { readonly t: 'bool'; readonly v: boolean }
  | { readonly t: 'string'; readonly v: string }
  | { readonly t: 'int'; readonly v: number }
  | { readonly t: 'double'; readonly v: string }
  | { readonly t: 'number'; readonly v: number }
  | { readonly t: 'enum'; readonly c: string; readonly n: string }
  | { readonly t: 'set'; readonly c: string | null; readonly items: readonly string[] }
  | { readonly t: 'list'; readonly c: string; readonly items: readonly EncodedValue[] }
  | { readonly t: 'obj'; readonly c: string; readonly fields: Readonly<Record<string, EncodedValue>> }
  | readonly EncodedValue[];

export type Properties = Readonly<Record<string, EncodedValue>>;

export interface LabelDump {
  readonly path: string;
  readonly text: string;
  readonly pos: HexPair;
  readonly size: HexPair;
  readonly properties: Properties;
}
export interface PortDump {
  readonly path: string;
  readonly side: string;
  readonly pos: HexPair;
  readonly size: HexPair;
  readonly anchor: HexPair;
  readonly explicitAnchor: boolean;
  readonly connectedToExternalNodes: boolean;
  readonly margin: HexQuad;
  readonly properties: Properties;
  readonly labels: readonly LabelDump[];
  readonly incoming: readonly string[];
  readonly outgoing: readonly string[];
}
export interface NodeDump {
  readonly path: string;
  readonly type: string;
  readonly pos: HexPair;
  readonly size: HexPair;
  readonly margin: HexQuad;
  readonly padding: HexQuad;
  readonly properties: Properties;
  readonly ports: readonly PortDump[];
  readonly labels: readonly LabelDump[];
  readonly nested: string | null;
}
export interface EdgeDump {
  readonly path: string;
  readonly source: string | null;
  readonly target: string | null;
  readonly bendPoints: readonly HexPair[];
  readonly labels: readonly LabelDump[];
  readonly properties: Properties;
}
export interface GraphDump {
  readonly path: string;
  readonly size: HexPair;
  readonly padding: HexQuad;
  readonly offset: HexPair;
  readonly properties: Properties;
  readonly layerlessNodes: readonly NodeDump[];
  readonly layers: readonly (readonly string[])[];
  readonly edges: readonly EdgeDump[];
}
export interface LGraphDump {
  readonly graphs: readonly GraphDump[];
}

export type RowGroup = 'transform' | 'adapters' | 'metadata';

/** One recorded row; `expected` (or `exception`) is group-specific, see {@link TransformRow}. */
export interface LayeredFrameworkRow {
  readonly id: string;
  readonly group: RowGroup;
  readonly input: unknown;
  readonly options: Readonly<Record<string, unknown>>;
  /** The ELK identifier of the nested node to import instead of the root (T1 deviation). */
  readonly target?: string;
  readonly expected?: unknown;
  readonly exception?: { readonly class: string; readonly message: string };
}

/** A `transform` row: the LGraph dump after import and the ELK JSON after the transfer back, or the exception. */
export interface TransformRow extends LayeredFrameworkRow {
  readonly group: 'transform';
  readonly expected?: { readonly lgraph: LGraphDump; readonly elk: unknown };
}

interface RowFile {
  readonly rows: readonly LayeredFrameworkRow[];
}

let cachedRows: readonly LayeredFrameworkRow[] | null = null;

/** Loads `layered-framework.json` once and returns the rows of `group` in recorded order. */
export function loadLayeredFrameworkRows(group: 'transform'): readonly TransformRow[];
export function loadLayeredFrameworkRows(group: RowGroup): readonly LayeredFrameworkRow[];
export function loadLayeredFrameworkRows(group: RowGroup): readonly LayeredFrameworkRow[] {
  cachedRows ??= (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as RowFile).rows;
  return cachedRows.filter((row) => row.group === group);
}

/** 16 hex digits of raw double bits (the `JavaVectors.hex` convention) to a double. */
export function decodeHex(hex: Hex): number {
  return longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
}

/** A double to its 16 lowercase hex digits of raw bits. */
export function encodeHex(value: number): Hex {
  return BigInt.asUintN(64, doubleToRawLongBits(value)).toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
}

/** L5: registers the layered metadata once per module registry (the service keeps core and labels only). */
export function registerLayered(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(LAYERED_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph) with layered registered. */
export function importInput(row: LayeredFrameworkRow): ElkNode {
  registerLayered();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

/** The node the scenario imports: the root, or the node with the row's `target` identifier (pre-order). */
export function findImportTarget(root: ElkNode, target: string | undefined): ElkNode {
  if (target === undefined) {
    return root;
  }
  const found = findNode(root, target);
  if (found === null) {
    throw new Error(`import target ${target} not found`);
  }
  return found;
}

function findNode(parent: ElkNode, identifier: string): ElkNode | null {
  for (const child of parent.getChildren()) {
    if (child.getIdentifier() === identifier) {
      return child;
    }
    const nested = findNode(child, identifier);
    if (nested !== null) {
      return nested;
    }
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------------
// The LGraph dump

const pair = (v: KVector): HexPair => [encodeHex(v.x), encodeHex(v.y)];
const quad = (top: number, right: number, bottom: number, left: number): HexQuad => [
  encodeHex(top),
  encodeHex(right),
  encodeHex(bottom),
  encodeHex(left),
];
const quadOf = (s: { top: number; right: number; bottom: number; left: number }): HexQuad =>
  quad(s.top, s.right, s.bottom, s.left);

interface Named {
  name(): string;
  ordinal(): number;
}

function isEnumConstant(value: object): value is Named {
  return (
    'name' in value && 'ordinal' in value && typeof value.name === 'function' && typeof value.ordinal === 'function'
  );
}

/** Encodes a property value; `paths` resolves LGraph elements to their positional path. */
function encodeValue(value: unknown, paths: ReadonlyMap<object, string>, depth: number): EncodedValue {
  if (value === null || value === undefined) {
    return null;
  }
  switch (typeof value) {
    case 'boolean':
      return { t: 'bool', v: value };
    case 'string':
      return { t: 'string', v: value };
    case 'number':
      return { t: 'number', v: value };
    case 'object':
      return encodeObject(value, paths, depth);
    default:
      return { class: typeof value };
  }
}

function encodeObject(value: object, paths: ReadonlyMap<object, string>, depth: number): EncodedValue {
  if (depth > MAX_VALUE_DEPTH) {
    return { class: value.constructor.name };
  }
  if (value instanceof LGraphElement) {
    const path = paths.get(value);
    return path === undefined ? { class: value.constructor.name } : { ref: path };
  }
  if (isElkGraphElement(value)) {
    return { elk: value.getIdentifier() };
  }
  if (isEnumConstant(value)) {
    return { t: 'enum', c: value.constructor.name, n: value.name() };
  }
  if (value instanceof EnumSet) {
    const items = [...(value as EnumSet<Named>)];
    return {
      t: 'set',
      c: items.length === 0 ? null : (items[0] as object).constructor.name,
      items: items.map((i) => i.name()),
    };
  }
  if (value instanceof KVector) {
    return {
      t: 'obj',
      c: 'KVector',
      fields: { x: encodeValue(value.x, paths, depth + 1), y: encodeValue(value.y, paths, depth + 1) },
    };
  }
  if (value instanceof Spacing) {
    const fields: Record<string, EncodedValue> = {};
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      fields[side] = encodeValue(value[side], paths, depth + 1);
    }
    return { t: 'obj', c: value.constructor.name, fields };
  }
  if (Array.isArray(value)) {
    return { t: 'list', c: 'List', items: value.map((i: unknown) => encodeValue(i, paths, depth + 1)) };
  }
  return { class: value.constructor.name };
}

class Dump {
  readonly paths = new Map<object, string>();
  readonly graphs: LGraph[] = [];
  readonly nodeLists = new Map<LGraph, LNode[]>();
  readonly edgeLists = new Map<LGraph, LEdge[]>();

  constructor(root: LGraph) {
    this.register(root);
    for (const g of [...this.graphs]) {
      this.registerEdges(g);
    }
  }

  private register(g: LGraph): void {
    const gp = `g${String(this.graphs.length)}`;
    this.graphs.push(g);
    this.paths.set(g, gp);
    const nodes = [...g.getLayerlessNodes()];
    const seen = new Set<LNode>(nodes);
    for (const layer of g.getLayers()) {
      this.paths.set(layer, `${gp}/layer${String(layer.getIndex())}`);
      for (const n of layer.getNodes()) {
        if (!seen.has(n)) {
          seen.add(n);
          nodes.push(n);
        }
      }
    }
    this.nodeLists.set(g, nodes);
    nodes.forEach((n, i) => this.registerNode(gp, n, i));
  }

  private registerNode(gp: string, n: LNode, i: number): void {
    const np = `${gp}/n${String(i)}`;
    this.paths.set(n, np);
    this.labelPaths(n.getLabels(), np);
    n.getPorts().forEach((p, j) => {
      this.paths.set(p, `${np}/p${String(j)}`);
      this.labelPaths(p.getLabels(), `${np}/p${String(j)}`);
    });
    const nested = n.getNestedGraph();
    if (nested !== null) {
      this.register(nested);
    }
  }

  private labelPaths(labels: readonly LLabel[], owner: string): void {
    labels.forEach((label, i) => this.paths.set(label, `${owner}/l${String(i)}`));
  }

  private registerEdges(g: LGraph): void {
    const edges: LEdge[] = [];
    this.edgeLists.set(g, edges);
    const gp = this.paths.get(g) as string;
    for (const n of this.nodeLists.get(g) as LNode[]) {
      for (const p of n.getPorts()) {
        for (const e of [...p.getOutgoingEdges(), ...p.getIncomingEdges()]) {
          if (!this.paths.has(e)) {
            const ep = `${gp}/e${String(edges.length)}`;
            this.paths.set(e, ep);
            edges.push(e);
            this.labelPaths(e.getLabels(), ep);
          }
        }
      }
    }
  }

  dump(): LGraphDump {
    return { graphs: this.graphs.map((g) => this.graph(g)) };
  }

  private path(o: object | null): string | null {
    return o === null ? null : (this.paths.get(o) ?? null);
  }

  private graph(g: LGraph): GraphDump {
    const p = g.getPadding();
    return {
      path: this.path(g) as string,
      size: pair(g.getSize()),
      padding: quad(p.top, p.right, p.bottom, p.left),
      offset: pair(g.getOffset()),
      properties: this.properties(g),
      layerlessNodes: g.getLayerlessNodes().map((n) => this.node(n)),
      layers: g.getLayers().map((layer) => layer.getNodes().map((n) => this.path(n) as string)),
      edges: (this.edgeLists.get(g) as LEdge[]).map((e) => this.edge(e)),
    };
  }

  private node(n: LNode): NodeDump {
    const nested = n.getNestedGraph();
    return {
      path: this.path(n) as string,
      type: n.getType().name(),
      pos: pair(n.getPosition()),
      size: pair(n.getSize()),
      margin: quadOf(n.getMargin()),
      padding: quadOf(n.getPadding()),
      properties: this.properties(n),
      ports: n.getPorts().map((p) => this.port(p)),
      labels: this.labels(n.getLabels()),
      nested: nested === null ? null : this.path(nested),
    };
  }

  private port(p: LPort): PortDump {
    return {
      path: this.path(p) as string,
      side: p.getSide().name(),
      pos: pair(p.getPosition()),
      size: pair(p.getSize()),
      anchor: pair(p.getAnchor()),
      explicitAnchor: p.isExplicitlySuppliedPortAnchor(),
      connectedToExternalNodes: p.isConnectedToExternalNodes(),
      margin: quadOf(p.getMargin()),
      properties: this.properties(p),
      labels: this.labels(p.getLabels()),
      incoming: p.getIncomingEdges().map((e) => this.path(e) as string),
      outgoing: p.getOutgoingEdges().map((e) => this.path(e) as string),
    };
  }

  private edge(e: LEdge): EdgeDump {
    return {
      path: this.path(e) as string,
      source: this.path(e.getSource()),
      target: this.path(e.getTarget()),
      bendPoints: [...e.getBendPoints()].map(pair),
      labels: this.labels(e.getLabels()),
      properties: this.properties(e),
    };
  }

  private labels(labels: readonly LLabel[]): LabelDump[] {
    return labels.map((label) => ({
      path: this.path(label) as string,
      text: label.getText(),
      pos: pair(label.getPosition()),
      size: pair(label.getSize()),
      properties: this.properties(label),
    }));
  }

  /** Every property set on the element, keys sorted (a Java `TreeMap`: UTF-16 order, as `Array.sort`). */
  private properties(e: LGraphElement): Properties {
    const entries: [string, EncodedValue][] = [];
    for (const [property, value] of e.getAllProperties() as Iterable<[IProperty<unknown>, unknown]>) {
      entries.push([property.getId(), encodeValue(value, this.paths, 0)]);
    }
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  }
}

/** Dumps an LGraph (and its nested graphs, pre-order) in the recorder's `expected.lgraph` format. */
export function dumpLGraph(lgraph: LGraph): LGraphDump {
  return new Dump(lgraph).dump();
}

// ------------------------------------------------------------------------------------------------------------
// Comparison

function close(actual: number, expected: number): boolean {
  return (
    (Number.isNaN(actual) && Number.isNaN(expected)) || Math.abs(actual - expected) <= TOLERANCE || actual === expected
  );
}

/** JSON with object keys sorted, so that key order never decides equality. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

class Differences {
  readonly list: string[] = [];

  note(path: string, expected: unknown, actual: unknown): void {
    this.list.push(`${path}: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`);
  }

  exact(path: string, actual: unknown, expected: unknown): void {
    if (canonical(actual) !== canonical(expected)) {
      this.note(path, expected, actual);
    }
  }

  hex(path: string, actual: Hex, expected: Hex): void {
    if (!close(decodeHex(actual), decodeHex(expected))) {
      this.note(path, decodeHex(expected), decodeHex(actual));
    }
  }

  hexes(path: string, actual: readonly Hex[], expected: readonly Hex[]): void {
    if (actual.length !== expected.length) {
      this.note(`${path}.length`, expected.length, actual.length);
      return;
    }
    expected.forEach((e, i) => this.hex(`${path}[${String(i)}]`, actual[i] as Hex, e));
  }

  /** Both lists must have the same length; returns whether to descend. */
  sameLength(path: string, actual: readonly unknown[], expected: readonly unknown[]): boolean {
    if (actual.length !== expected.length) {
      this.note(`${path}.length`, expected.length, actual.length);
      return false;
    }
    return true;
  }

  value(path: string, actual: EncodedValue, expected: EncodedValue): void {
    compareValue(this, path, actual, expected);
  }
}

type Tagged = Exclude<EncodedValue, null | readonly EncodedValue[]>;

function compareValue(d: Differences, path: string, actual: EncodedValue, expected: EncodedValue): void {
  if (expected === null || actual === null) {
    d.exact(path, actual, expected);
  } else if (Array.isArray(expected)) {
    compareArray(d, path, actual, expected as readonly EncodedValue[]);
  } else if (Array.isArray(actual)) {
    d.note(path, expected, actual);
  } else {
    compareTagged(d, path, actual as Tagged, expected as Tagged);
  }
}

function compareArray(d: Differences, path: string, actual: EncodedValue, expected: readonly EncodedValue[]): void {
  if (!Array.isArray(actual)) {
    d.note(path, expected, actual);
    return;
  }
  const items = actual as readonly EncodedValue[];
  if (d.sameLength(path, items, expected)) {
    expected.forEach((e, i) => compareValue(d, `${path}[${String(i)}]`, items[i] as EncodedValue, e));
  }
}

function compareTagged(d: Differences, path: string, actual: Tagged, expected: Tagged): void {
  if ('t' in expected) {
    compareScalarOrComposite(d, path, actual, expected);
  } else {
    d.exact(path, actual, expected);
  }
}

function compareScalarOrComposite(
  d: Differences,
  path: string,
  actual: Tagged,
  expected: Tagged & { t: string },
): void {
  const a = actual as { t?: string; v?: unknown; c?: string | null; n?: string; items?: readonly unknown[] };
  const e = expected as typeof a;
  // an expected int/double is a TS `number`
  if (expected.t === 'int' || expected.t === 'double') {
    if (a.t !== 'number') {
      d.note(path, expected, actual);
    } else if (expected.t === 'int') {
      d.exact(path, a.v, e.v);
    } else if (!close(a.v as number, Number(e.v))) {
      d.note(path, Number(e.v), a.v);
    }
    return;
  }
  if (a.t !== e.t) {
    d.note(path, expected, actual);
    return;
  }
  compareSameTag(d, path, actual, expected);
}

function compareSameTag(d: Differences, path: string, actual: Tagged, expected: Tagged & { t: string }): void {
  switch (expected.t) {
    case 'set': {
      const a = actual as Extract<Tagged, { t: 'set' }>;
      const e = expected as Extract<Tagged, { t: 'set' }>;
      if (a.items.length > 0) {
        d.exact(`${path}.c`, a.c, e.c);
      }
      d.exact(`${path}.items`, a.items, e.items);
      break;
    }
    case 'list': {
      const a = actual as Extract<Tagged, { t: 'list' }>;
      const e = expected as Extract<Tagged, { t: 'list' }>;
      compareArray(d, `${path}.items`, a.items, e.items);
      break;
    }
    case 'obj': {
      const a = actual as Extract<Tagged, { t: 'obj' }>;
      const e = expected as Extract<Tagged, { t: 'obj' }>;
      d.exact(`${path}.c`, a.c, e.c);
      compareProperties(d, `${path}.fields`, a.fields, e.fields);
      break;
    }
    default:
      d.exact(path, actual, expected);
  }
}

function compareProperties(d: Differences, path: string, actual: Properties, expected: Properties): void {
  d.exact(`${path}.keys`, Object.keys(actual).sort(), Object.keys(expected).sort());
  for (const key of Object.keys(expected)) {
    if (key in actual) {
      d.value(`${path}[${key}]`, actual[key] as EncodedValue, expected[key] as EncodedValue);
    }
  }
}

function compareLabels(
  d: Differences,
  path: string,
  actual: readonly LabelDump[],
  expected: readonly LabelDump[],
): void {
  if (!d.sameLength(`${path}.labels`, actual, expected)) {
    return;
  }
  expected.forEach((e, i) => {
    const a = actual[i] as LabelDump;
    const p = `${path}.labels[${String(i)}]`;
    d.exact(`${p}.path`, a.path, e.path);
    d.exact(`${p}.text`, a.text, e.text);
    d.hexes(`${p}.pos`, a.pos, e.pos);
    d.hexes(`${p}.size`, a.size, e.size);
    compareProperties(d, `${p}.properties`, a.properties, e.properties);
  });
}

function comparePort(d: Differences, p: string, a: PortDump, e: PortDump): void {
  d.exact(`${p}.path`, a.path, e.path);
  d.exact(`${p}.side`, a.side, e.side);
  d.hexes(`${p}.pos`, a.pos, e.pos);
  d.hexes(`${p}.size`, a.size, e.size);
  d.hexes(`${p}.anchor`, a.anchor, e.anchor);
  d.exact(`${p}.explicitAnchor`, a.explicitAnchor, e.explicitAnchor);
  d.exact(`${p}.connectedToExternalNodes`, a.connectedToExternalNodes, e.connectedToExternalNodes);
  d.hexes(`${p}.margin`, a.margin, e.margin);
  compareProperties(d, `${p}.properties`, a.properties, e.properties);
  compareLabels(d, p, a.labels, e.labels);
  d.exact(`${p}.incoming`, a.incoming, e.incoming);
  d.exact(`${p}.outgoing`, a.outgoing, e.outgoing);
}

function compareNode(d: Differences, p: string, a: NodeDump, e: NodeDump): void {
  d.exact(`${p}.path`, a.path, e.path);
  d.exact(`${p}.type`, a.type, e.type);
  d.hexes(`${p}.pos`, a.pos, e.pos);
  d.hexes(`${p}.size`, a.size, e.size);
  d.hexes(`${p}.margin`, a.margin, e.margin);
  d.hexes(`${p}.padding`, a.padding, e.padding);
  compareProperties(d, `${p}.properties`, a.properties, e.properties);
  if (d.sameLength(`${p}.ports`, a.ports, e.ports)) {
    e.ports.forEach((port, i) => comparePort(d, `${p}.ports[${String(i)}]`, a.ports[i] as PortDump, port));
  }
  compareLabels(d, p, a.labels, e.labels);
  d.exact(`${p}.nested`, a.nested, e.nested);
}

function compareEdge(d: Differences, p: string, a: EdgeDump, e: EdgeDump): void {
  d.exact(`${p}.path`, a.path, e.path);
  d.exact(`${p}.source`, a.source, e.source);
  d.exact(`${p}.target`, a.target, e.target);
  if (d.sameLength(`${p}.bendPoints`, a.bendPoints, e.bendPoints)) {
    e.bendPoints.forEach((b, i) => d.hexes(`${p}.bendPoints[${String(i)}]`, a.bendPoints[i] as HexPair, b));
  }
  compareLabels(d, p, a.labels, e.labels);
  compareProperties(d, `${p}.properties`, a.properties, e.properties);
}

function compareGraph(d: Differences, p: string, a: GraphDump, e: GraphDump): void {
  d.exact(`${p}.path`, a.path, e.path);
  d.hexes(`${p}.size`, a.size, e.size);
  d.hexes(`${p}.padding`, a.padding, e.padding);
  d.hexes(`${p}.offset`, a.offset, e.offset);
  compareProperties(d, `${p}.properties`, a.properties, e.properties);
  if (d.sameLength(`${p}.layerlessNodes`, a.layerlessNodes, e.layerlessNodes)) {
    e.layerlessNodes.forEach((n, i) =>
      compareNode(d, `${p}.layerlessNodes[${String(i)}]`, a.layerlessNodes[i] as NodeDump, n),
    );
  }
  d.exact(`${p}.layers`, a.layers, e.layers);
  if (d.sameLength(`${p}.edges`, a.edges, e.edges)) {
    e.edges.forEach((edge, i) => compareEdge(d, `${p}.edges[${String(i)}]`, a.edges[i] as EdgeDump, edge));
  }
}

/** Compares two LGraph dumps at the AD-4 bar; returns the differences (empty when they match). */
export function compareLGraphDump(actual: LGraphDump, expected: LGraphDump): string[] {
  const d = new Differences();
  if (d.sameLength('graphs', actual.graphs, expected.graphs)) {
    expected.graphs.forEach((g, i) => compareGraph(d, `graphs[${String(i)}]`, actual.graphs[i] as GraphDump, g));
  }
  return d.list;
}

// ------------------------------------------------------------------------------------------------------------
// The transform scenario (`LayeredFrameworkVectors.transformScenario`)

export type TransformOutcome =
  | { readonly lgraph: LGraphDump; readonly elk: unknown }
  | { readonly exception: { readonly class: string; readonly message: string } };

/** Imports the row, dumps the LGraph, transfers the layout back and exports the ELK graph with the row's flags. */
export function replayTransformRow(row: LayeredFrameworkRow): TransformOutcome {
  const root = importInput(row);
  try {
    const transformer = new ElkGraphTransformer();
    const lgraph = transformer.importGraph(findImportTarget(root, row.target));
    const dump = dumpLGraph(lgraph);
    transformer.applyLayout(lgraph);
    const json = ElkGraphJson.forGraph(root)
      .omitLayout(false)
      .omitZeroDimension(false)
      .omitZeroPositions(false)
      .omitUnknownLayoutOptions(true)
      .toJson();
    return { lgraph: dump, elk: JSON.parse(json) as unknown };
  } catch (e) {
    if (e instanceof RuntimeException) {
      return { exception: { class: e.name, message: e.message } };
    }
    throw e;
  }
}

/** Compares a replay outcome with the row: the dump and the ELK JSON, or the exception class and message. */
export function compareTransformOutcome(actual: TransformOutcome, row: TransformRow): string[] {
  if (row.exception !== undefined) {
    if (!('exception' in actual)) {
      return [`expected exception ${JSON.stringify(row.exception)}, got a result`];
    }
    const d = new Differences();
    d.exact('exception', actual.exception, row.exception);
    return d.list;
  }
  if ('exception' in actual) {
    return [`unexpected exception ${JSON.stringify(actual.exception)}`];
  }
  const expected = row.expected as { lgraph: LGraphDump; elk: unknown };
  const diffs = compareLGraphDump(actual.lgraph, expected.lgraph);
  const elk = compareLayout(expected.elk, actual.elk);
  return elk.ok ? diffs : [...diffs, `elk: ${formatDiffs(elk.diffs)}`];
}
