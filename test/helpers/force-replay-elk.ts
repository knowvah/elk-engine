// SPDX-License-Identifier: EPL-2.0
// The TS twin of the two remaining dumps of tools/vectors/ForceVectors.java (mission 8b, T8), plus the field tally of the replay:
//   dumpElk(root)      `elkDump`: { graph, nodes, ports, labels, edges } of an ELK graph after a run, elements in the recorder's traversal order
//                      (the root's children in model order, each node followed by its labels, its ports with their labels, then its children;
//                      edges per containing node, each followed by its labels). Margins and paddings are read WITHOUT `getProperty` (the
//                      recorder's `effective`: the first read of a cloneable default stores a copy on the element and changes what later code
//                      reads), `childArea` is null while the provider has not set CoreOptions.CHILD_AREA_WIDTH/HEIGHT;
//   dumpModel(model)   `modelDump`: the class name and every instance field of the concrete model plus `dispBound`, keys in the recorder's
//                      (sorted) order, ints as numbers, doubles as hex;
//   tallyHex(...)      how many hex doubles of two recorded-format values are raw-bit identical, within the tolerance only, or differ.
import { type ElkMargin } from '../../src/core/math/ElkMargin.js';
import { type ElkPadding } from '../../src/core/math/ElkPadding.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { EadesModel } from '../../src/alg/force/model/EadesModel.js';
import type { AbstractForceModel } from '../../src/alg/force/model/AbstractForceModel.js';
import { numbersEqual, TOLERANCE, HEX_KEYS, type CompareOptions } from './force-replay-dump.js';
import { decodeHex, hexOf, type ElkDump, type Hex, type HexQuad, type HexVec } from './force-replay-rows.js';

/** More keys whose strings are hex doubles: the ELK dump, the model dump and the stress matrices (`w` is above, `apsp` here). */
export const ELK_HEX_KEYS: ReadonlySet<string> = new Set([
  'x',
  'y',
  'w',
  'h',
  'margins',
  'childArea',
  'start',
  'end',
  'dispBound',
  'repulsionFactor',
  'springLength',
  'k',
  'threshold',
  'apsp',
]);

/** The comparison options of the ELK dump, the model dump and the states together. */
export const FORCE_COMPARE: CompareOptions = { extraHexKeys: ELK_HEX_KEYS };

const pair = (x: number, y: number): HexVec => [hexOf(x), hexOf(y)];
const quad = (a: number, b: number, c: number, d: number): HexQuad => [hexOf(a), hexOf(b), hexOf(c), hexOf(d)];
const box = (id: string, x: number, y: number, w: number, h: number): Record<string, unknown> => ({
  id,
  x: hexOf(x),
  y: hexOf(y),
  w: hexOf(w),
  h: hexOf(h),
});

/** `ForceVectors.effective`: the explicit value, else the default, never stored in the element. */
function effective<T>(node: ElkNode, property: IProperty<T>): T {
  const value = node.getAllProperties().get(property);
  return value !== undefined && value !== null ? (value as T) : property.getDefault();
}

const paddingOf = (node: ElkNode): HexQuad => {
  const p: ElkPadding = effective(node, CoreOptions.PADDING);
  return quad(p.top, p.right, p.bottom, p.left);
};
const marginOf = (node: ElkNode): HexQuad => {
  const m: ElkMargin = effective(node, CoreOptions.MARGINS);
  return quad(m.top, m.right, m.bottom, m.left);
};

function childAreaOf(node: ElkNode): HexVec | null {
  const w = node.getProperty(CoreOptions.CHILD_AREA_WIDTH) as number | null;
  const h = node.getProperty(CoreOptions.CHILD_AREA_HEIGHT) as number | null;
  return w === null || h === null ? null : pair(w, h);
}

const idOf = (element: { getIdentifier(): string | null }): string => {
  const id = element.getIdentifier();
  if (id === null || id === '') {
    throw new Error(`element without identifier: ${String(element)}`);
  }
  return id;
};

type Lists = Record<'nodes' | 'ports' | 'labels' | 'edges', Record<string, unknown>[]>;

function dumpLabels(labels: Iterable<ElkLabel>, out: Record<string, unknown>[]): void {
  for (const label of labels) {
    out.push(box(idOf(label), label.getX(), label.getY(), label.getWidth(), label.getHeight()));
    dumpLabels(label.getLabels() as Iterable<ElkLabel>, out);
  }
}

function dumpEdges(parent: ElkNode, lists: Lists): void {
  for (const edge of parent.getContainedEdges()) {
    const sections = [...edge.getSections()].map((section) => ({
      start: pair(section.getStartX(), section.getStartY()),
      end: pair(section.getEndX(), section.getEndY()),
      bends: [...section.getBendPoints()].map((b) => pair(b.getX(), b.getY())),
    }));
    lists.edges.push({ id: idOf(edge), sections });
    dumpLabels(edge.getLabels() as Iterable<ElkLabel>, lists.labels);
  }
}

function visit(parent: ElkNode, lists: Lists): void {
  for (const n of parent.getChildren()) {
    const entry: Record<string, unknown> = {
      ...box(idOf(n), n.getX(), n.getY(), n.getWidth(), n.getHeight()),
      margins: marginOf(n),
      padding: paddingOf(n),
    };
    if (!n.getChildren().isEmpty()) {
      entry.childArea = childAreaOf(n);
    }
    lists.nodes.push(entry);
    dumpLabels(n.getLabels() as Iterable<ElkLabel>, lists.labels);
    for (const port of n.getPorts()) {
      lists.ports.push(box(idOf(port), port.getX(), port.getY(), port.getWidth(), port.getHeight()));
      dumpLabels(port.getLabels() as Iterable<ElkLabel>, lists.labels);
    }
    visit(n, lists);
  }
  dumpEdges(parent, lists);
}

/** An ELK graph in the recorder's `elkDump` format. */
export function dumpElk(root: ElkNode): ElkDump {
  const lists: Lists = { nodes: [], ports: [], labels: [], edges: [] };
  const graph = {
    id: idOf(root),
    x: hexOf(root.getX()),
    y: hexOf(root.getY()),
    w: hexOf(root.getWidth()),
    h: hexOf(root.getHeight()),
    padding: paddingOf(root),
    childArea: childAreaOf(root),
  };
  visit(root, lists);
  return { graph, nodes: lists.nodes, ports: lists.ports, labels: lists.labels, edges: lists.edges };
}

/** The `modelDump` of a model: `class`, then the fields sorted by name. */
export function dumpModel(model: AbstractForceModel): Record<string, string | number> {
  const fields = model as unknown as Record<string, number>;
  const names = (
    model instanceof EadesModel
      ? ['dispBound', 'maxIterations', 'repulsionFactor', 'springLength']
      : ['dispBound', 'k', 'temperature', 'threshold']
  ).sort();
  const out: Record<string, string | number> = { class: model.constructor.name };
  for (const name of names) {
    // maxIterations is the one `int` field; every other one is a double
    out[name] = name === 'maxIterations' ? fields[name]! : hexOf(fields[name]!);
  }
  return out;
}

/** How many hex doubles are identical (same raw bits), within the tolerance only, or differ. */
export interface Tally {
  identical: number;
  within: number;
  differs: number;
}

const isHexText = (value: unknown): value is Hex => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);

/** Counts the hex doubles of `expected` against `actual` (same shape; a shape difference counts the whole subtree as differing once). */
export function tallyHex(
  expected: unknown,
  actual: unknown,
  tally: Tally = { identical: 0, within: 0, differs: 0 },
  inHex = false,
  tol: number = TOLERANCE,
): Tally {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      tally.differs++;
    } else {
      expected.forEach((item, i) => tallyHex(item, actual[i], tally, inHex, tol));
    }
  } else if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
      tally.differs++;
      return tally;
    }
    for (const [key, value] of Object.entries(expected)) {
      const below = inHex || HEX_KEYS.has(key) || ELK_HEX_KEYS.has(key);
      tallyHex(value, (actual as Record<string, unknown>)[key], tally, below, tol);
    }
  } else if (inHex && isHexText(expected)) {
    if (expected === actual) {
      tally.identical++;
    } else if (isHexText(actual) && numbersEqual(decodeHex(expected), decodeHex(actual), tol)) {
      tally.within++;
    } else {
      tally.differs++;
    }
  }
  return tally;
}
