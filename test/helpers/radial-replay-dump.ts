// SPDX-License-Identifier: EPL-2.0
// The TS twin of the stop dump of tools/vectors/RadialVectors.java (`dump`, mission 8a, T2/T7) and the three operations a radial step
// replay (T10, T13) needs on it:
//   dumpRadial(graph, step?)             an ElkGraph in exactly the recorder's format: nodes in pre-order (root first), ports of the
//                                        nodes in that order, labels (per node its labels with nested ones after their owner, then
//                                        its ports' labels; then the labels of every contained edge), edges (per node in order its
//                                        contained edges that have a section), props (only SET properties, per node in the order
//                                        root, radius, orderId, targetAngle, childAreaWidth, childAreaHeight, position), margins and
//                                        padding per node (`getProperty`, an unset option reads its default). Doubles are 16-hex raw
//                                        bits (`doubleToRawLongBits`); an Integer (`orderId`) is a plain number; ElkNode values are ids.
//   applyRadialStop(graph, stop, fixed)  makes the re-imported `input` graph equal to a recorded stop: node geometry, the dumped
//                                        properties (set when the stop lists them, removed when it does not), edge sections (rebuilt
//                                        from the stop; edges the stop does not list lose theirs) and, from `fixed` (the first stop of
//                                        the row: ports, labels, margins, padding), the sections the later stops omit. A step can thus
//                                        start from the recorded "before" state rather than a TS-computed one.
//   compareStop(expected, actual, tol)   the differences of two dumps as { path, expected, actual }: structure, ids and order exact,
//                                        every double within `tol` (default 1e-6, AD-4); only the sections `expected` carries are
//                                        compared (a later recorded stop has no fixed sections).
// WHAT THE DUMP DOES NOT CARRY, and no radial step reads: an edge section's incoming/outgoing shape (the router creates sections with
// `firstEdgeSection` and sets only start, end and bend points), the identifier of a section, properties other than the seven above.
// The recorder's dump therefore suffices to rebuild every stop faithfully.
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { InternalProperties } from '../../src/alg/radial/InternalProperties.js';
import { RadialMetaDataProvider } from '../../src/alg/radial/options/RadialMetaDataProvider.js';
import { RadialOptions } from '../../src/alg/radial/options/RadialOptions.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { doubleToRawLongBits, longBitsToDouble } from '../../src/java/lang/JavaDouble.js';
import {
  fixedSectionsOf,
  type FixedSection,
  type Hex,
  type HexEdge,
  type HexProp,
  type HexQuad,
  type HexSection,
  type HexShape,
  type PropName,
  type PropValue,
  type RadialDump,
  type RadialRow,
  stopsOf,
} from './radial-replay-rows.js';

export const DEFAULT_TOLERANCE = 1e-6;
const HEX_RADIX = 16;
const HEX_DIGITS = 16;
const RADIAL_PROBE_OPTION = 'org.eclipse.elk.radial.rotate';

/** A double to its 16 lowercase hex digits of raw bits. */
export function encodeHex(value: number): Hex {
  return BigInt.asUintN(64, doubleToRawLongBits(value)).toString(HEX_RADIX).padStart(HEX_DIGITS, '0');
}

/** The double of 16 hex digits of raw bits. */
export function decodeHex(hex: Hex): number {
  return longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
}

/** Registers the radial option metadata once per module registry (the service keeps core and labels only). */
export function registerRadial(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(RADIAL_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new RadialMetaDataProvider(), new RadialOptions());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph) with the radial options registered. */
export function importRadialInput(row: RadialRow): ElkNode {
  registerRadial();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

// ------------------------------------------------------------------------------------------------------------
// traversal (the recorder's order)

/** The nodes in pre-order: the root first, then each child in list order, recursing into inner children. */
export function collectNodes(root: ElkNode): ElkNode[] {
  const out: ElkNode[] = [];
  const visit = (node: ElkNode): void => {
    out.push(node);
    for (const child of node.getChildren()) {
      visit(child);
    }
  };
  visit(root);
  return out;
}

function labelsOf(labels: Iterable<ElkLabel>, out: ElkLabel[]): void {
  for (const label of labels) {
    out.push(label);
    labelsOf(label.getLabels(), out);
  }
}

/** The labels in the recorder's order: node labels and port labels per node, then the labels of every contained edge. */
export function collectLabels(nodes: readonly ElkNode[]): ElkLabel[] {
  const out: ElkLabel[] = [];
  for (const node of nodes) {
    labelsOf(node.getLabels(), out);
    for (const port of node.getPorts()) {
      labelsOf(port.getLabels(), out);
    }
  }
  for (const node of nodes) {
    for (const edge of node.getContainedEdges()) {
      labelsOf(edge.getLabels(), out);
    }
  }
  return out;
}

const collectPorts = (nodes: readonly ElkNode[]): ElkShape[] => nodes.flatMap((n) => [...n.getPorts()]);
const collectEdges = (nodes: readonly ElkNode[]): ElkEdge[] => nodes.flatMap((n) => [...n.getContainedEdges()]);

// ------------------------------------------------------------------------------------------------------------
// the dump

interface PropSpec {
  readonly name: PropName;
  readonly property: IProperty<unknown>;
}

/** The dumped properties in the recorder's per-element order (`PROPS` of RadialVectors.java). */
const PROP_SPECS: readonly PropSpec[] = [
  { name: 'root', property: InternalProperties.ROOT_NODE },
  { name: 'radius', property: RadialOptions.RADIUS },
  { name: 'orderId', property: RadialOptions.ORDER_ID },
  { name: 'targetAngle', property: RadialOptions.ROTATION_TARGET_ANGLE },
  { name: 'childAreaWidth', property: CoreOptions.CHILD_AREA_WIDTH },
  { name: 'childAreaHeight', property: CoreOptions.CHILD_AREA_HEIGHT },
  { name: 'position', property: CoreOptions.POSITION },
];

function encodeProp(name: PropName, value: unknown): PropValue {
  if (name === 'root') {
    return (value as ElkNode).getIdentifier() as string;
  }
  if (name === 'orderId') {
    return value as number;
  }
  if (name === 'position') {
    const position = value as KVector;
    return [encodeHex(position.x), encodeHex(position.y)];
  }
  return encodeHex(value as number);
}

const shapeOf = (s: ElkShape & { getIdentifier(): string | null }): HexShape => [
  s.getIdentifier(),
  encodeHex(s.getX()),
  encodeHex(s.getY()),
  encodeHex(s.getWidth()),
  encodeHex(s.getHeight()),
];

const quadOf = (t: number, r: number, b: number, l: number): HexQuad => [
  encodeHex(t),
  encodeHex(r),
  encodeHex(b),
  encodeHex(l),
];

function propsOf(nodes: readonly ElkNode[]): HexProp[] {
  const out: HexProp[] = [];
  for (const node of nodes) {
    for (const { name, property } of PROP_SPECS) {
      if (node.hasProperty(property)) {
        out.push([node.getIdentifier(), name, encodeProp(name, node.getProperty(property))]);
      }
    }
  }
  return out;
}

function sectionOf(section: ElkEdgeSection): HexSection {
  const bends: [Hex, Hex][] = [];
  for (const bend of section.getBendPoints()) {
    bends.push([encodeHex(bend.getX()), encodeHex(bend.getY())]);
  }
  return [
    encodeHex(section.getStartX()),
    encodeHex(section.getStartY()),
    encodeHex(section.getEndX()),
    encodeHex(section.getEndY()),
    bends,
  ];
}

function edgesOf(nodes: readonly ElkNode[]): HexEdge[] {
  const out: HexEdge[] = [];
  for (const edge of collectEdges(nodes)) {
    if (!edge.getSections().isEmpty()) {
      out.push([edge.getIdentifier(), [...edge.getSections()].map(sectionOf)]);
    }
  }
  return out;
}

/** Dumps `graph` in the recorder's stop format (all seven sections; `step` adds the stop's name). */
export function dumpRadial(graph: ElkNode, step?: string): RadialDump & { readonly step?: string } {
  const nodes = collectNodes(graph);
  const dump: RadialDump = {
    nodes: nodes.map(shapeOf),
    edges: edgesOf(nodes),
    props: propsOf(nodes),
    ports: collectPorts(nodes).map((p) => shapeOf(p as ElkShape & { getIdentifier(): string | null })),
    labels: collectLabels(nodes).map(shapeOf),
    margins: nodes.map((n) => {
      const m = n.getProperty(CoreOptions.MARGINS);
      return quadOf(m.top, m.right, m.bottom, m.left);
    }),
    padding: nodes.map((n) => {
      const p = n.getProperty(CoreOptions.PADDING);
      return quadOf(p.top, p.right, p.bottom, p.left);
    }),
  };
  return step === undefined ? dump : { step, ...dump };
}

// ------------------------------------------------------------------------------------------------------------
// applying a recorded stop

function fail(what: string): never {
  throw new Error(`applyRadialStop: ${what}`);
}

function setShape(target: ElkShape & { getIdentifier(): string | null }, shape: HexShape, where: string): void {
  if (target.getIdentifier() !== shape[0]) {
    fail(`${where} is ${String(target.getIdentifier())} in the graph, ${String(shape[0])} in the stop`);
  }
  target.setLocation(decodeHex(shape[1]), decodeHex(shape[2]));
  target.setDimensions(decodeHex(shape[3]), decodeHex(shape[4]));
}

function applyShapes(
  targets: readonly (ElkShape & { getIdentifier(): string | null })[],
  shapes: readonly HexShape[],
  name: string,
): void {
  if (targets.length !== shapes.length) {
    fail(`the graph has ${String(targets.length)} ${name}, the stop ${String(shapes.length)}`);
  }
  targets.forEach((t, i) => setShape(t, shapes[i] as HexShape, `${name}[${String(i)}]`));
}

function decodeProp(name: PropName, value: PropValue, byId: ReadonlyMap<string, ElkNode>): unknown {
  if (name === 'root') {
    const node = byId.get(value as string);
    return node ?? fail(`the root prop names ${String(value)}, which is not a node`);
  }
  if (name === 'orderId') {
    return value;
  }
  if (name === 'position') {
    const [x, y] = value as readonly [Hex, Hex];
    return new KVector(decodeHex(x), decodeHex(y));
  }
  return decodeHex(value as Hex);
}

function applyProps(nodes: readonly ElkNode[], props: readonly HexProp[]): void {
  const byId = new Map<string, ElkNode>();
  for (const node of nodes) {
    byId.set(node.getIdentifier() as string, node);
  }
  const wanted = new Map<string, PropValue>();
  for (const [element, name, value] of props) {
    if (!byId.has(element as string)) {
      fail(`the stop sets ${name} on ${String(element)}, which is not a node`);
    }
    wanted.set(`${String(element)}\u0000${name}`, value);
  }
  for (const node of nodes) {
    for (const { name, property } of PROP_SPECS) {
      const value = wanted.get(`${String(node.getIdentifier())}\u0000${name}`);
      node.setProperty(property, value === undefined ? null : decodeProp(name, value, byId));
    }
  }
}

function applyEdges(nodes: readonly ElkNode[], edges: readonly HexEdge[]): void {
  const sections = new Map<string, readonly HexSection[]>();
  for (const [id, list] of edges) {
    sections.set(id as string, list);
  }
  const seen = new Set<string>();
  for (const edge of collectEdges(nodes)) {
    const id = edge.getIdentifier() as string;
    edge.getSections().clear();
    for (const s of sections.get(id) ?? []) {
      const section = ElkGraphUtil.createEdgeSection(edge);
      section.setStartLocation(decodeHex(s[0]), decodeHex(s[1]));
      section.setEndLocation(decodeHex(s[2]), decodeHex(s[3]));
      for (const [bx, by] of s[4]) {
        ElkGraphUtil.createBendPoint(section, decodeHex(bx), decodeHex(by));
      }
    }
    seen.add(id);
  }
  for (const id of sections.keys()) {
    if (!seen.has(id)) {
      fail(`the stop has sections for edge ${id}, which is not an edge of the graph`);
    }
  }
}

function applyQuads(nodes: readonly ElkNode[], quads: readonly HexQuad[], property: 'margins' | 'padding'): void {
  if (nodes.length !== quads.length) {
    fail(`the graph has ${String(nodes.length)} nodes, the stop ${String(quads.length)} ${property}`);
  }
  nodes.forEach((node, i) => {
    const [t, r, b, l] = (quads[i] as HexQuad).map(decodeHex) as [number, number, number, number];
    if (property === 'margins') {
      node.setProperty(CoreOptions.MARGINS, new ElkMargin(t, r, b, l));
    } else {
      node.setProperty(CoreOptions.PADDING, new ElkPadding(t, r, b, l));
    }
  });
}

/**
 * Makes `graph` (the re-imported row input, or a graph already in some recorded state) equal to `stop`. `fixed` supplies the
 * sections the stop omits (a later stop carries no ports, labels, margins and padding): pass `fixedSectionsOf(stops)`.
 */
export function applyRadialStop(graph: ElkNode, stop: RadialDump, fixed: Pick<RadialDump, FixedSection> = stop): void {
  const nodes = collectNodes(graph);
  applyShapes(nodes, stop.nodes, 'nodes');
  applyProps(nodes, stop.props);
  applyEdges(nodes, stop.edges);
  const ports = stop.ports ?? fixed.ports;
  const labels = stop.labels ?? fixed.labels;
  const margins = stop.margins ?? fixed.margins;
  const padding = stop.padding ?? fixed.padding;
  if (ports === undefined || labels === undefined || margins === undefined || padding === undefined) {
    fail('neither the stop nor `fixed` carries ports, labels, margins and padding');
  }
  applyShapes(collectPorts(nodes) as (ElkShape & { getIdentifier(): string | null })[], ports, 'ports');
  applyShapes(collectLabels(nodes), labels, 'labels');
  applyQuads(nodes, margins, 'margins');
  applyQuads(nodes, padding, 'padding');
}

/** The re-imported input of a `stops`/`throws` row moved to the state of stop `index` (the "before" state of stop `index + 1`). */
export function buildStopState(row: Exclude<RadialRow, { group: 'full' }>, index: number): ElkNode {
  const stops = stopsOf(row);
  const stop = stops[index];
  if (stop === undefined) {
    throw new Error(`row ${row.id} has no stop ${String(index)}`);
  }
  const graph = importRadialInput(row);
  applyRadialStop(graph, stop, fixedSectionsOf(stops));
  return graph;
}

/** The `full` row's graph moved to the recorded result, for symmetry with `buildStopState`. */
export function buildFullState(row: Extract<RadialRow, { group: 'full' }>): ElkNode {
  const graph = importRadialInput(row);
  applyRadialStop(graph, row.expected);
  return graph;
}

// ------------------------------------------------------------------------------------------------------------
// comparison

export interface StopDiff {
  /** Where: `nodes[2](n3).x`, `edges[0](e1).sections[0].end.y`, `props[4](n1,orderId)`. */
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

/** Equal doubles: within `tol`, or identical (infinities, NaN of the same bits). */
function closeHex(expected: Hex, actual: Hex, tol: number): boolean {
  if (expected === actual) {
    return true;
  }
  const a = decodeHex(expected);
  const b = decodeHex(actual);
  return Math.abs(a - b) <= tol;
}

function pushDiff(out: StopDiff[], path: string, expected: unknown, actual: unknown): void {
  out.push({ path, expected, actual });
}

function compareNumberList(
  out: StopDiff[],
  path: string,
  e: readonly Hex[],
  a: readonly Hex[],
  tol: number,
  names: readonly string[],
): void {
  names.forEach((name, i) => {
    const x = e[i] as Hex;
    const y = a[i] as Hex;
    if (!closeHex(x, y, tol)) {
      pushDiff(out, `${path}.${name}`, decodeHex(x), decodeHex(y));
    }
  });
}

const SHAPE_FIELDS = ['x', 'y', 'width', 'height'] as const;
const QUAD_FIELDS = ['top', 'right', 'bottom', 'left'] as const;

function compareShapes(
  out: StopDiff[],
  name: string,
  e: readonly HexShape[],
  a: readonly HexShape[],
  tol: number,
): void {
  if (e.length !== a.length) {
    pushDiff(out, `${name}.length`, e.length, a.length);
  }
  for (let i = 0; i < Math.min(e.length, a.length); i++) {
    const [ex, ac] = [e[i] as HexShape, a[i] as HexShape];
    const path = `${name}[${String(i)}](${String(ex[0])})`;
    if (ex[0] !== ac[0]) {
      pushDiff(out, `${path}.id`, ex[0], ac[0]);
    }
    compareNumberList(out, path, ex.slice(1) as Hex[], ac.slice(1) as Hex[], tol, SHAPE_FIELDS);
  }
}

function compareQuads(out: StopDiff[], name: string, e: readonly HexQuad[], a: readonly HexQuad[], tol: number): void {
  if (e.length !== a.length) {
    pushDiff(out, `${name}.length`, e.length, a.length);
  }
  for (let i = 0; i < Math.min(e.length, a.length); i++) {
    compareNumberList(out, `${name}[${String(i)}]`, e[i] as HexQuad, a[i] as HexQuad, tol, QUAD_FIELDS);
  }
}

function compareSection(out: StopDiff[], path: string, e: HexSection, a: HexSection, tol: number): void {
  const names = ['start.x', 'start.y', 'end.x', 'end.y'];
  compareNumberList(out, path, e.slice(0, 4) as Hex[], a.slice(0, 4) as Hex[], tol, names);
  if (e[4].length !== a[4].length) {
    pushDiff(out, `${path}.bendPoints.length`, e[4].length, a[4].length);
  }
  for (let b = 0; b < Math.min(e[4].length, a[4].length); b++) {
    const bend = `${path}.bendPoints[${String(b)}]`;
    compareNumberList(out, bend, e[4][b] as readonly Hex[], a[4][b] as readonly Hex[], tol, ['x', 'y']);
  }
}

function compareEdges(out: StopDiff[], e: readonly HexEdge[], a: readonly HexEdge[], tol: number): void {
  if (e.length !== a.length) {
    pushDiff(out, 'edges.length', e.length, a.length);
  }
  for (let i = 0; i < Math.min(e.length, a.length); i++) {
    const [ex, ac] = [e[i] as HexEdge, a[i] as HexEdge];
    const path = `edges[${String(i)}](${String(ex[0])})`;
    if (ex[0] !== ac[0]) {
      pushDiff(out, `${path}.id`, ex[0], ac[0]);
    }
    if (ex[1].length !== ac[1].length) {
      pushDiff(out, `${path}.sections.length`, ex[1].length, ac[1].length);
    }
    for (let s = 0; s < Math.min(ex[1].length, ac[1].length); s++) {
      compareSection(out, `${path}.sections[${String(s)}]`, ex[1][s] as HexSection, ac[1][s] as HexSection, tol);
    }
  }
}

function comparePropValue(
  out: StopDiff[],
  path: string,
  name: PropName,
  e: PropValue,
  a: PropValue,
  tol: number,
): void {
  if (name === 'position') {
    compareNumberList(out, path, e as readonly Hex[], a as readonly Hex[], tol, ['x', 'y']);
  } else if (name === 'root' || name === 'orderId') {
    if (e !== a) {
      pushDiff(out, path, e, a);
    }
  } else if (!closeHex(e as Hex, a as Hex, tol)) {
    pushDiff(out, path, decodeHex(e as Hex), decodeHex(a as Hex));
  }
}

function compareProps(out: StopDiff[], e: readonly HexProp[], a: readonly HexProp[], tol: number): void {
  if (e.length !== a.length) {
    pushDiff(out, 'props.length', e.length, a.length);
  }
  for (let i = 0; i < Math.min(e.length, a.length); i++) {
    const [ex, ac] = [e[i] as HexProp, a[i] as HexProp];
    const path = `props[${String(i)}](${String(ex[0])},${ex[1]})`;
    if (ex[0] !== ac[0] || ex[1] !== ac[1]) {
      pushDiff(out, `${path}.key`, [ex[0], ex[1]], [ac[0], ac[1]]);
    } else {
      comparePropValue(out, path, ex[1], ex[2], ac[2], tol);
    }
  }
}

/**
 * The differences between a recorded dump and an actual one (empty when equal): ids, order, counts, names and non-numeric values
 * exactly, every double within `tol`. Only the sections `expected` carries are compared; `step` is compared when both have it.
 */
export function compareStop(
  expected: RadialDump & { readonly step?: string },
  actual: RadialDump & { readonly step?: string },
  tol: number = DEFAULT_TOLERANCE,
): StopDiff[] {
  const out: StopDiff[] = [];
  if (expected.step !== undefined && actual.step !== undefined && expected.step !== actual.step) {
    pushDiff(out, 'step', expected.step, actual.step);
  }
  compareShapes(out, 'nodes', expected.nodes, actual.nodes, tol);
  compareEdges(out, expected.edges, actual.edges, tol);
  compareProps(out, expected.props, actual.props, tol);
  const fixedShapes = [
    ['ports', expected.ports, actual.ports],
    ['labels', expected.labels, actual.labels],
  ] as const;
  for (const [name, e, a] of fixedShapes) {
    if (e !== undefined) {
      compareShapes(out, name, e, a ?? [], tol);
    }
  }
  const fixedQuads = [
    ['margins', expected.margins, actual.margins],
    ['padding', expected.padding, actual.padding],
  ] as const;
  for (const [name, e, a] of fixedQuads) {
    if (e !== undefined) {
      compareQuads(out, name, e, a ?? [], tol);
    }
  }
  return out;
}

/** One readable line per difference: `path: expected <e>, actual <a>`. */
export function formatDiffs(diffs: readonly StopDiff[], max = 20): string {
  const lines = diffs
    .slice(0, max)
    .map((d) => `${d.path}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`);
  if (diffs.length > max) {
    lines.push(`... and ${String(diffs.length - max)} more`);
  }
  return lines.join('\n');
}

/** Asserts `compareStop` is empty, throwing an Error whose message is `formatDiffs` (a replay test's one-liner). */
export function assertSameStop(
  expected: RadialDump & { readonly step?: string },
  actual: RadialDump & { readonly step?: string },
  context = 'stop',
  tol: number = DEFAULT_TOLERANCE,
): void {
  const diffs = compareStop(expected, actual, tol);
  if (diffs.length > 0) {
    throw new Error(`${context}: ${String(diffs.length)} difference(s)\n${formatDiffs(diffs)}`);
  }
}
