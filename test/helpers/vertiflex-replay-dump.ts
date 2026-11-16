// SPDX-License-Identifier: EPL-2.0
// The TS twin of the dump of tools/vectors/VertiFlexVectors.java (`Snap`; mission 8a, T8), in three parts:
//   dumpVertiFlex(graph)   an ElkGraph in exactly the recorder's format: graph, nodes, ports, labels, edges in the recorder's traversal
//                          order (children in model order, each node followed by its labels and its ports with their labels, then the
//                          node's subtree; edges per containing node after the children), and `props`, the V/InternalProperties
//                          that are SET on the graph or a node, in the recorder's key order, outlines as point lists;
//   applyDump(root, dump)  the inverse: writes a recorded state onto a re-imported input graph (geometry, margins and padding as
//                          properties, edge sections, the internal properties incl. OutlineNode chains and ROOT_NODE resolved by id), so
//                          a step starts from the recorded "before" state instead of a TS-computed one;
//   compareStop(a, b, tol) a readable diff (path, expected, actual); ids, list lengths, list order, key order, strings and integers
//                          exact, doubles (16-hex strings) within `tol`.
// What an edge section rebuild cannot restore (not in the dump): the incoming and outgoing shape links of a section. A section whose
// edge already has the recorded number of sections is updated in place (links kept); otherwise the sections are replaced by new ones
// whose links are the edge's first source and target. No step up to RelativeXPlacer reads sections.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import type { Spacing } from '../../src/core/math/Spacing.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { InternalProperties } from '../../src/alg/vertiflex/InternalProperties.js';
import { VertiFlexMetaDataProvider } from '../../src/alg/vertiflex/options/VertiFlexMetaDataProvider.js';
import { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
import { OutlineNode } from '../../src/alg/vertiflex/p2relative/OutlineNode.js';
import {
  decodeHex,
  encodeHex,
  isHex,
  PROP_NAMES,
  previousStep,
  stateAfter,
  type BoxEntry,
  type Dump,
  type EdgeEntry,
  type GraphEntry,
  type HexPoint,
  type HexQuad,
  type NodeEntry,
  type PropName,
  type PropsEntry,
  type PropValue,
  type SectionEntry,
  type StopsRow,
} from './vertiflex-replay-rows.js';

/** The tolerance of AD-4 for numeric coordinates and sizes. */
export const TOLERANCE = 1e-6;

const PROBE_OPTION = 'org.eclipse.elk.vertiflex.layoutStrategy';

/** Registers the VertiFlex option model once per module registry (the service keeps the core options only). */
export function registerVertiFlex(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new VertiFlexMetaDataProvider(), new VertiFlexOptions());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph) with VertiFlex registered. */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerVertiFlex();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

// ------------------------------------------------------------------------------------------------------------
// dump

const id = (element: ElkGraphElement): string => {
  const identifier = element.getIdentifier();
  if (identifier === null || identifier === '') {
    throw new Error(`element without identifier: ${String(element)}`);
  }
  return identifier;
};

const point = (x: number, y: number): HexPoint => [encodeHex(x), encodeHex(y)];
const quad = (s: Spacing): HexQuad => [encodeHex(s.top), encodeHex(s.right), encodeHex(s.bottom), encodeHex(s.left)];
const box = (
  e: ElkGraphElement & { getX(): number; getY(): number; getWidth(): number; getHeight(): number },
): BoxEntry => ({
  id: id(e),
  x: encodeHex(e.getX()),
  y: encodeHex(e.getY()),
  w: encodeHex(e.getWidth()),
  h: encodeHex(e.getHeight()),
});

const MAX_OUTLINE_LENGTH = 100000;

function outlineList(head: OutlineNode): HexPoint[] {
  const points: HexPoint[] = [];
  for (let o: OutlineNode | null = head; o !== null; o = o.getNext()) {
    if (points.length > MAX_OUTLINE_LENGTH) {
      throw new Error('outline chain does not end');
    }
    points.push(point(o.getRelativeX(), o.getAbsoluteY()));
  }
  return points;
}

/** The double-valued InternalProperties, with the key they are dumped under. */
const DOUBLE_PROPS: readonly (readonly [PropName, IProperty<number>])[] = [
  ['OUTLINE_MAX_DEPTH', InternalProperties.OUTLINE_MAX_DEPTH],
  ['MIN_X', InternalProperties.MIN_X],
  ['MAX_X', InternalProperties.MAX_X],
  ['MIN_Y', InternalProperties.MIN_Y],
  ['MAX_Y', InternalProperties.MAX_Y],
  ['EDGE_BEND_HEIGHT', InternalProperties.EDGE_BEND_HEIGHT],
];

function propsOf(node: ElkNode): PropsEntry | null {
  const props: Partial<Record<PropName, PropValue>> = {};
  for (const [name, property] of [
    ['LEFT_OUTLINE', InternalProperties.LEFT_OUTLINE],
    ['RIGHT_OUTLINE', InternalProperties.RIGHT_OUTLINE],
  ] as const) {
    if (node.hasProperty(property)) {
      props[name] = outlineList(node.getProperty(property));
    }
  }
  for (const [name, property] of DOUBLE_PROPS.slice(0, 5)) {
    if (node.hasProperty(property)) {
      props[name] = encodeHex(node.getProperty(property));
    }
  }
  if (node.hasProperty(InternalProperties.ROOT_NODE)) {
    props.ROOT_NODE = id(node.getProperty(InternalProperties.ROOT_NODE));
  }
  if (node.hasProperty(DOUBLE_PROPS[5]![1])) {
    props.EDGE_BEND_HEIGHT = encodeHex(node.getProperty(DOUBLE_PROPS[5]![1]));
  }
  if (node.hasProperty(InternalProperties.NODE_MODEL_ORDER)) {
    props.NODE_MODEL_ORDER = node.getProperty(InternalProperties.NODE_MODEL_ORDER);
  }
  return Object.keys(props).length === 0 ? null : { id: id(node), props: orderProps(props) };
}

/** The props in the recorder's key order. */
function orderProps(props: Partial<Record<PropName, PropValue>>): Partial<Record<PropName, PropValue>> {
  const ordered: Partial<Record<PropName, PropValue>> = {};
  for (const name of PROP_NAMES) {
    if (name in props) {
      ordered[name] = props[name]!;
    }
  }
  return ordered;
}

function sectionEntry(section: {
  getStartX(): number;
  getStartY(): number;
  getEndX(): number;
  getEndY(): number;
  getBendPoints(): Iterable<{ getX(): number; getY(): number }>;
}): SectionEntry {
  return {
    start: point(section.getStartX(), section.getStartY()),
    end: point(section.getEndX(), section.getEndY()),
    bends: [...section.getBendPoints()].map((b) => point(b.getX(), b.getY())),
  };
}

interface Collector {
  readonly nodes: NodeEntry[];
  readonly ports: BoxEntry[];
  readonly labels: BoxEntry[];
  readonly edges: EdgeEntry[];
  readonly props: PropsEntry[];
}

function collectLabels(labels: Iterable<ElkLabel>, out: Collector): void {
  for (const label of labels) {
    out.labels.push(box(label));
    collectLabels(label.getLabels(), out);
  }
}

function collectNode(node: ElkNode, out: Collector): void {
  out.nodes.push({
    ...box(node),
    margins: quad(node.getProperty(CoreOptions.MARGINS)),
    padding: quad(node.getProperty(CoreOptions.PADDING)),
  });
  const props = propsOf(node);
  if (props !== null) {
    out.props.push(props);
  }
  collectLabels(node.getLabels(), out);
  for (const port of node.getPorts() as Iterable<ElkPort>) {
    out.ports.push(box(port));
    collectLabels(port.getLabels(), out);
  }
  visit(node, out);
}

function visit(parent: ElkNode, out: Collector): void {
  for (const child of parent.getChildren()) {
    collectNode(child, out);
  }
  for (const edge of parent.getContainedEdges() as Iterable<ElkEdge>) {
    out.edges.push({ id: id(edge), sections: [...edge.getSections()].map(sectionEntry) });
    collectLabels(edge.getLabels(), out);
  }
}

/** The dump of a graph in the recorder's format: every entry, in traversal order. */
export function dumpVertiFlex(graph: ElkNode): Dump {
  const out: Collector = { nodes: [], ports: [], labels: [], edges: [], props: [] };
  const graphEntry: GraphEntry = {
    id: id(graph),
    x: encodeHex(graph.getX()),
    y: encodeHex(graph.getY()),
    w: encodeHex(graph.getWidth()),
    h: encodeHex(graph.getHeight()),
    padding: quad(graph.getProperty(CoreOptions.PADDING)),
  };
  const rootProps = propsOf(graph);
  if (rootProps !== null) {
    out.props.push(rootProps);
  }
  visit(graph, out);
  return { graph: graphEntry, ...out };
}

// ------------------------------------------------------------------------------------------------------------
// apply

interface Elements {
  readonly nodes: Map<string, ElkNode>;
  readonly ports: Map<string, ElkPort>;
  readonly labels: Map<string, ElkLabel>;
  readonly edges: Map<string, ElkEdge>;
}

function indexLabels(labels: Iterable<ElkLabel>, into: Elements): void {
  for (const label of labels) {
    into.labels.set(id(label), label);
    indexLabels(label.getLabels(), into);
  }
}

function indexElements(node: ElkNode, into: Elements): void {
  for (const child of node.getChildren()) {
    into.nodes.set(id(child), child);
    indexLabels(child.getLabels(), into);
    for (const port of child.getPorts() as Iterable<ElkPort>) {
      into.ports.set(id(port), port);
      indexLabels(port.getLabels(), into);
    }
    indexElements(child, into);
  }
  for (const edge of node.getContainedEdges() as Iterable<ElkEdge>) {
    into.edges.set(id(edge), edge);
    indexLabels(edge.getLabels(), into);
  }
}

function lookup<T>(map: Map<string, T>, kind: string, key: string): T {
  const found = map.get(key);
  if (found === undefined) {
    throw new Error(`recorded ${kind} ${key} is not in the imported graph`);
  }
  return found;
}

type Shape = { setX(v: number): void; setY(v: number): void; setWidth(v: number): void; setHeight(v: number): void };

function applyBox(shape: Shape, entry: BoxEntry): void {
  shape.setX(decodeHex(entry.x));
  shape.setY(decodeHex(entry.y));
  shape.setWidth(decodeHex(entry.w));
  shape.setHeight(decodeHex(entry.h));
}

const decodeQuad = (q: HexQuad): [number, number, number, number] => [
  decodeHex(q[0]),
  decodeHex(q[1]),
  decodeHex(q[2]),
  decodeHex(q[3]),
];

function applySections(edge: ElkEdge, entry: EdgeEntry): void {
  const sections = edge.getSections();
  if (sections.size() !== entry.sections.length) {
    sections.clear();
    for (const _ of entry.sections) {
      const section = ElkGraphUtil.createEdgeSection(edge);
      section.setOutgoingShape(edge.getSources().isEmpty() ? null : edge.getSources().get(0)!);
      section.setIncomingShape(edge.getTargets().isEmpty() ? null : edge.getTargets().get(0)!);
    }
  }
  entry.sections.forEach((recorded, i) => {
    const section = sections.get(i);
    section.setStartLocation(decodeHex(recorded.start[0]), decodeHex(recorded.start[1]));
    section.setEndLocation(decodeHex(recorded.end[0]), decodeHex(recorded.end[1]));
    section.getBendPoints().clear();
    for (const bend of recorded.bends) {
      ElkGraphUtil.createBendPoint(section, decodeHex(bend[0]), decodeHex(bend[1]));
    }
  });
}

/** An OutlineNode chain from its point list (the recorder lists the head first, following `next`). */
export function buildOutline(points: readonly HexPoint[]): OutlineNode {
  let next: OutlineNode | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    next = new OutlineNode(decodeHex(points[i]![0]), decodeHex(points[i]![1]), next);
  }
  if (next === null) {
    throw new Error('an outline has at least one point');
  }
  return next;
}

function applyProps(node: ElkNode, entry: PropsEntry, nodes: Map<string, ElkNode>, root: ElkNode): void {
  const { props } = entry;
  const set = <T>(property: IProperty<T>, value: T): void => {
    node.setProperty(property, value);
  };
  if (props.LEFT_OUTLINE !== undefined)
    set(InternalProperties.LEFT_OUTLINE, buildOutline(props.LEFT_OUTLINE as HexPoint[]));
  if (props.RIGHT_OUTLINE !== undefined)
    set(InternalProperties.RIGHT_OUTLINE, buildOutline(props.RIGHT_OUTLINE as HexPoint[]));
  for (const [name, property] of DOUBLE_PROPS) {
    if (props[name] !== undefined) set(property, decodeHex(props[name] as string));
  }
  if (props.ROOT_NODE !== undefined) {
    const rootId = props.ROOT_NODE as string;
    set(InternalProperties.ROOT_NODE, rootId === id(root) ? root : lookup(nodes, 'node', rootId));
  }
  if (props.NODE_MODEL_ORDER !== undefined) set(InternalProperties.NODE_MODEL_ORDER, props.NODE_MODEL_ORDER as number);
}

/**
 * Writes the recorded `state` onto `root`, a re-import of the row's input. Every entry of the state is applied (geometry, margins and
 * padding as set properties, sections, internal properties); an id the graph does not have is an error.
 */
export function applyDump(root: ElkNode, state: Dump): void {
  const elements: Elements = { nodes: new Map(), ports: new Map(), labels: new Map(), edges: new Map() };
  indexElements(root, elements);
  if (id(root) !== state.graph.id) {
    throw new Error(`the recorded graph is ${state.graph.id}, the imported root ${id(root)}`);
  }
  applyBox(root, state.graph);
  root.setProperty(CoreOptions.PADDING, new ElkPadding(...decodeQuad(state.graph.padding)));
  for (const entry of state.nodes) {
    const node = lookup(elements.nodes, 'node', entry.id);
    applyBox(node, entry);
    node.setProperty(CoreOptions.MARGINS, new ElkMargin(...decodeQuad(entry.margins)));
    node.setProperty(CoreOptions.PADDING, new ElkPadding(...decodeQuad(entry.padding)));
  }
  for (const entry of state.ports) applyBox(lookup(elements.ports, 'port', entry.id), entry);
  for (const entry of state.labels) applyBox(lookup(elements.labels, 'label', entry.id), entry);
  for (const entry of state.edges) applySections(lookup(elements.edges, 'edge', entry.id), entry);
  for (const entry of state.props) {
    const node = entry.id === id(root) ? root : lookup(elements.nodes, 'node', entry.id);
    applyProps(node, entry, elements.nodes, root);
  }
}

/** The graph of a stops row in the state recorded after `step`: the input re-imported, then the accumulated state applied. */
export function rebuildStop(row: StopsRow, step: string): ElkNode {
  const root = importInput(row);
  applyDump(root, stateAfter(row, step));
  return root;
}

/** The graph a step starts from: the state recorded after the step before it. */
export const rebuildBefore = (row: StopsRow, step: string): ElkNode => rebuildStop(row, previousStep(row, step));

// ------------------------------------------------------------------------------------------------------------
// compare

export interface Difference {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function sameDouble(a: number, b: number, tolerance: number): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b);
  return a === b || Math.abs(a - b) <= tolerance;
}

function elementLabel(element: unknown, index: number): string {
  return isRecord(element) && typeof element.id === 'string' ? `[${element.id}]` : `[${String(index)}]`;
}

function compareValue(path: string, expected: unknown, actual: unknown, tolerance: number, out: Difference[]): void {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    compareArray(path, expected, actual, tolerance, out);
  } else if (isRecord(expected) && isRecord(actual)) {
    compareRecord(path, expected, actual, tolerance, out);
  } else if (isHex(expected) && isHex(actual)) {
    if (!sameDouble(decodeHex(expected), decodeHex(actual), tolerance)) {
      out.push({ path, expected: decodeHex(expected), actual: decodeHex(actual) });
    }
  } else if (expected !== actual) {
    out.push({ path, expected, actual });
  }
}

function compareArray(
  path: string,
  expected: unknown[],
  actual: unknown[],
  tolerance: number,
  out: Difference[],
): void {
  if (expected.length !== actual.length) {
    out.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
  }
  for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
    const e = expected[i];
    const a = actual[i];
    if (isRecord(e) && isRecord(a) && typeof e.id === 'string' && e.id !== a.id) {
      out.push({ path: `${path}[${String(i)}].id`, expected: e.id, actual: a.id });
    } else {
      compareValue(`${path}${elementLabel(e, i)}`, e, a, tolerance, out);
    }
  }
}

function compareRecord(
  path: string,
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  tolerance: number,
  out: Difference[],
): void {
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  if (expectedKeys.join() !== actualKeys.join()) {
    out.push({ path: `${path}.<keys>`, expected: expectedKeys, actual: actualKeys });
    return;
  }
  for (const key of expectedKeys) {
    compareValue(`${path}.${key}`, expected[key], actual[key], tolerance, out);
  }
}

/** The differences between two full dumps (expected first); empty when they are equal within `tolerance`. */
export function compareStop(expected: Dump, actual: Dump, tolerance: number = TOLERANCE): Difference[] {
  const out: Difference[] = [];
  compareValue('dump', expected, actual, tolerance, out);
  return out;
}

/** One line per difference, at most `limit` of them: `path: expected E, actual A`. */
export function formatDifferences(differences: readonly Difference[], limit = 10): string {
  const shown = differences
    .slice(0, limit)
    .map((d) => `${d.path}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`);
  const more = differences.length > limit ? [`... ${String(differences.length - limit)} more`] : [];
  return [...shown, ...more].join('\n');
}
