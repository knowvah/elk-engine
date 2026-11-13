// SPDX-License-Identifier: EPL-2.0
// ELK side of the rectpacking replay (mission 8c, T6): registers the providers the recorder registered, imports a row's input, finds
// the layout node, dumps an ELK graph in the shape of the recorder's `dumpBody` / `stateBody` (tools/vectors/RectPackingVectors.java;
// the header of that file is the contract) and restores a recorded stop state onto an imported graph.
//   dumpElk     graph, nodes (descendants: each node, its extras, its labels, its ports, then its children), ports, labels, extras;
//   dumpState   dumpElk plus `props` (InternalProperties, hex or null when not set) and `padding` (the explicit padding or null);
//   restore*    the inverse for the p2 stops: boxes, extras, InternalProperties and padding from a stop state.
// Properties are read with `hasProperty` and `getAllProperties()`, never `getProperty` of an option with a cloneable default
// (`ElkPadding`): `getProperty` stores a copy on the element and changes the run.
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayeredMetaDataProvider } from '../../src/alg/layered/options/LayeredMetaDataProvider.js';
import { InternalProperties } from '../../src/alg/rectpacking/options/InternalProperties.js';
import { RectPackingMetaDataProvider } from '../../src/alg/rectpacking/options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from '../../src/alg/rectpacking/options/RectPackingOptions.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import {
  decodeHex,
  encodeHex,
  type BoxEntry,
  type ElkDump,
  type ExtrasEntry,
  type Hex,
  type PaddingEntry,
  type PropsEntry,
  type StopState,
} from './rectpacking-replay-rows.js';

const RECTPACKING_PROBE_OPTION = 'org.eclipse.elk.rectpacking.widthApproximation.strategy';
const LAYERED_PROBE_OPTION = 'org.eclipse.elk.layered.spacing.baseValue';

/** Registers what the recorder registered: rectpacking (metadata and options) and layered (the layered options of corpus rows). */
export function registerRectPackingEngine(): void {
  const service = LayoutMetaDataService.getInstance();
  if (service.getOptionData(RECTPACKING_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new RectPackingMetaDataProvider(), new RectPackingOptions());
  }
  if (service.getOptionData(LAYERED_PROBE_OPTION) === null) {
    service.registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
  }
}

/** Imports a row's ELK JSON input (the root of the prepared graph). */
export function importInput(row: { readonly input: Readonly<Record<string, unknown>> }): ElkNode {
  registerRectPackingEngine();
  return ElkGraphJson.forGraph(JSON.stringify(row.input)).toElk();
}

/** The layout node of a graph run: the root, or the descendant with the recorded id (breadth-first, ids are unique). */
export function layoutNodeOf(root: ElkNode, layoutId: string): ElkNode {
  const queue: ElkNode[] = [root];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    if (next.getIdentifier() === layoutId) {
      return next;
    }
    queue.push(...next.getChildren());
  }
  throw new Error(`no layout node ${layoutId}`);
}

const idOf = (element: ElkGraphElement): string => {
  const identifier = element.getIdentifier();
  if (identifier === null || identifier === '') {
    throw new Error(`element without identifier: ${String(element)}`);
  }
  return identifier;
};

type Boxed = ElkGraphElement & ElkShape;

const box = (e: Boxed): BoxEntry => ({
  id: idOf(e),
  x: encodeHex(e.getX()),
  y: encodeHex(e.getY()),
  w: encodeHex(e.getWidth()),
  h: encodeHex(e.getHeight()),
});

class Dump {
  graph!: BoxEntry;
  readonly nodes: BoxEntry[] = [];
  readonly ports: BoxEntry[] = [];
  readonly labels: BoxEntry[] = [];
  readonly extras: ExtrasEntry[] = [];

  run(top: ElkNode): void {
    this.graph = box(top);
    this.labelsOf(top.getLabels());
    this.portsOf(top);
    this.visit(top);
  }

  private portsOf(node: ElkNode): void {
    for (const port of node.getPorts()) {
      this.ports.push(box(port));
      this.labelsOf(port.getLabels());
    }
  }

  private visit(parent: ElkNode): void {
    for (const node of parent.getChildren()) {
      this.nodes.push(box(node));
      this.extrasOf(node);
      this.labelsOf(node.getLabels());
      this.portsOf(node);
      this.visit(node);
    }
  }

  private extrasOf(node: ElkNode): void {
    const positionSet = node.hasProperty(RectPackingOptions.CURRENT_POSITION);
    const prioritySet = node.hasProperty(CoreOptions.PRIORITY);
    if (positionSet || prioritySet) {
      this.extras.push({
        id: idOf(node),
        currentPosition: positionSet ? node.getProperty(RectPackingOptions.CURRENT_POSITION) : null,
        priority: prioritySet ? node.getProperty(CoreOptions.PRIORITY) : null,
      });
    }
  }

  private labelsOf(labels: Iterable<ElkLabel>): void {
    for (const label of labels) {
      this.labels.push(box(label));
      this.labelsOf(label.getLabels());
    }
  }
}

/** The recorder's ELK dump of `top` (the root for a full row, the layout node for a stop). */
export function dumpElk(top: ElkNode): ElkDump {
  const dump = new Dump();
  dump.run(top);
  return { graph: dump.graph, nodes: dump.nodes, ports: dump.ports, labels: dump.labels, extras: dump.extras };
}

/** The InternalProperties of `PropsEntry` in the recorder's key order, with the property each key reads. */
export const PROP_KEYS: readonly (readonly [keyof PropsEntry, IProperty<number>])[] = [
  ['additionalHeight', InternalProperties.ADDITIONAL_HEIGHT],
  ['drawingHeight', InternalProperties.DRAWING_HEIGHT],
  ['drawingWidth', InternalProperties.DRAWING_WIDTH],
  ['minHeight', InternalProperties.MIN_HEIGHT],
  ['minWidth', InternalProperties.MIN_WIDTH],
  ['targetWidth', InternalProperties.TARGET_WIDTH],
  ['minRowIncrease', InternalProperties.MIN_ROW_INCREASE],
  ['maxRowIncrease', InternalProperties.MAX_ROW_INCREASE],
  ['minRowDecrease', InternalProperties.MIN_ROW_DECREASE],
  ['maxRowDecrease', InternalProperties.MAX_ROW_DECREASE],
];

/** The recorder's `props`: each InternalProperty as hex, or `null` when not set (`hasProperty`, which stores nothing). */
export function dumpProps(g: ElkNode): PropsEntry {
  const entries = PROP_KEYS.map(([key, property]) => [
    key,
    g.hasProperty(property) ? encodeHex(g.getProperty(property)) : null,
  ]);
  return Object.fromEntries(entries) as unknown as PropsEntry;
}

/** The stored padding without `getProperty` (which would store a copy of the default on the element), or `null`. */
export function explicitPadding(g: ElkNode): PaddingEntry | null {
  for (const [property, value] of g.getAllProperties()) {
    if (property.getId() === CoreOptions.PADDING.getId()) {
      return value instanceof ElkPadding
        ? [encodeHex(value.top), encodeHex(value.right), encodeHex(value.bottom), encodeHex(value.left)]
        : null;
    }
  }
  return null;
}

/** The ELK part of a stop state (`graph`, `nodes`, `ports`, `labels`, `extras`, `props`, `padding`); `rows` is dumped by the dump helper. */
export function dumpState(g: ElkNode): Omit<StopState, 'rows' | 'drawing'> {
  return { ...dumpElk(g), props: dumpProps(g), padding: explicitPadding(g) };
}

const elementsById = (layout: ElkNode): Map<string, Boxed> => {
  const byId = new Map<string, Boxed>();
  const addLabels = (labels: Iterable<ElkLabel>): void => {
    for (const label of labels) {
      byId.set(idOf(label), label);
      addLabels(label.getLabels());
    }
  };
  const addNode = (node: ElkNode): void => {
    byId.set(idOf(node), node);
    addLabels(node.getLabels());
    for (const port of node.getPorts()) {
      byId.set(idOf(port), port);
      addLabels(port.getLabels());
    }
    for (const child of node.getChildren()) {
      addNode(child);
    }
  };
  addNode(layout);
  return byId;
};

/** Every node of the layout node's subtree by identifier (the layout node included). */
export function nodesById(layout: ElkNode): Map<string, ElkNode> {
  const byId = new Map<string, ElkNode>();
  const add = (node: ElkNode): void => {
    byId.set(idOf(node), node);
    for (const child of node.getChildren()) {
      add(child);
    }
  };
  add(layout);
  return byId;
}

function setBox(element: Boxed | undefined, entry: BoxEntry): void {
  if (element === undefined) {
    throw new Error(`no element ${entry.id} in the imported graph`);
  }
  element.setLocation(decodeHex(entry.x), decodeHex(entry.y));
  element.setDimensions(decodeHex(entry.w), decodeHex(entry.h));
}

/** Moves the children of every parent into the order in which the dump lists them (the reorderers change it). */
function restoreChildOrder(layout: ElkNode, dump: ElkDump): void {
  const byId = nodesById(layout);
  const orders = new Map<ElkNode, ElkNode[]>();
  for (const entry of dump.nodes) {
    const node = byId.get(entry.id);
    const parent = node?.getParent() ?? null;
    if (node !== undefined && parent !== null) {
      orders.set(parent, [...(orders.get(parent) ?? []), node]);
    }
  }
  for (const [parent, order] of orders) {
    const children = parent.getChildren();
    order.forEach((node, position) => {
      children.move(position, children.indexOf(node));
    });
  }
}

/**
 * Restores the boxes of a recorded dump (`graph`, `nodes`, `ports`, `labels`), the order of the children and the `extras` onto the
 * imported layout node.
 */
export function restoreElk(layout: ElkNode, dump: ElkDump): void {
  restoreChildOrder(layout, dump);
  const byId = elementsById(layout);
  setBox(byId.get(dump.graph.id), dump.graph);
  for (const entry of [...dump.nodes, ...dump.ports, ...dump.labels]) {
    setBox(byId.get(entry.id), entry);
  }
  const nodes = nodesById(layout);
  for (const extra of dump.extras) {
    const node = nodes.get(extra.id);
    if (node === undefined) {
      throw new Error(`no node ${extra.id} for the extras`);
    }
    if (extra.currentPosition !== null) {
      node.setProperty(RectPackingOptions.CURRENT_POSITION, extra.currentPosition);
    }
    if (extra.priority !== null) {
      node.setProperty(CoreOptions.PRIORITY, extra.priority);
    }
  }
}

/** Restores the InternalProperties that the stop recorded as set, and the explicit padding. */
export function restoreProps(layout: ElkNode, state: Pick<StopState, 'props' | 'padding'>): void {
  for (const [key, property] of PROP_KEYS) {
    const value: Hex | null = state.props[key];
    if (value !== null) {
      layout.setProperty(property, decodeHex(value));
    }
  }
  if (state.padding !== null) {
    const [top, right, bottom, left] = state.padding.map(decodeHex) as [number, number, number, number];
    layout.setProperty(CoreOptions.PADDING, new ElkPadding(top, right, bottom, left));
  }
}
