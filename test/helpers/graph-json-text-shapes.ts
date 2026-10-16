// SPDX-License-Identifier: EPL-2.0
// Shared by the .elkj entry-point replay (T13): the recorded graph and property rows of graph-json-text-parse.json
// (ElkjParseVectors.java header) and their counterparts read off a loaded model. Same logic as the parser replay.
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';

export interface RecordedProperty {
  readonly path: string;
  readonly key: string;
  readonly keyClass: string;
  readonly valueClass: string | null;
  readonly value: string | null;
}

export interface RecordedElement {
  readonly identifier: string | null;
  readonly x: string;
  readonly y: string;
  readonly width: string;
  readonly height: string;
  readonly text?: string;
  readonly labels: readonly RecordedElement[];
  readonly ports?: readonly RecordedElement[];
  readonly children?: readonly RecordedElement[];
  readonly edges?: readonly RecordedEdge[];
}

export interface RecordedEdge {
  readonly identifier: string | null;
  readonly labels: readonly RecordedElement[];
  readonly sections: readonly unknown[];
}

// ---- the parsed graph in the recorded shape (numbers instead of the recorded decimal strings) ----

export interface Shape {
  identifier: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  labels: Shape[];
  ports?: Shape[];
  children?: Shape[];
  edges?: EdgeShape[];
}

export interface EdgeShape {
  identifier: string | null;
  labels: Shape[];
  sections: unknown[];
}

export function labelShape(l: ElkLabel | ElkPort | ElkNode): Shape {
  return {
    identifier: l.getIdentifier(),
    x: l.getX(),
    y: l.getY(),
    width: l.getWidth(),
    height: l.getHeight(),
    labels: [...l.getLabels()].map(labelShape),
  };
}

export function textShape(l: ElkLabel): Shape {
  return { ...labelShape(l), text: l.getText() as string, labels: [...l.getLabels()].map(textShape) };
}

export function edgeShape(e: ElkEdge): EdgeShape {
  return { identifier: e.getIdentifier(), labels: [...e.getLabels()].map(textShape), sections: [...e.getSections()] };
}

export function nodeShape(n: ElkNode): Shape {
  return {
    ...labelShape(n),
    labels: [...n.getLabels()].map(textShape),
    ports: [...n.getPorts()].map((p) => ({ ...labelShape(p), labels: [...p.getLabels()].map(textShape) })),
    children: [...n.getChildren()].map(nodeShape),
    edges: [...n.getContainedEdges()].map(edgeShape),
  };
}

export function recordedShape(e: RecordedElement): Shape {
  const shape: Shape = {
    identifier: e.identifier,
    x: Number(e.x),
    y: Number(e.y),
    width: Number(e.width),
    height: Number(e.height),
    labels: e.labels.map(recordedShape),
  };
  if (e.text !== undefined) shape.text = e.text;
  if (e.ports !== undefined) shape.ports = e.ports.map(recordedShape);
  if (e.children !== undefined) shape.children = e.children.map(recordedShape);
  if (e.edges !== undefined) {
    shape.edges = e.edges.map((edge) => ({
      identifier: edge.identifier,
      labels: edge.labels.map(recordedShape),
      sections: [...edge.sections],
    }));
  }
  return shape;
}

// ---- object paths of the recorder: `children[i]/ports[j]/labels[k]`, `containedEdges[i]` ----

const PATH_SEGMENT = /^(\w+)\[(\d+)\]$/;

export function listOf(owner: ElkGraphElement, feature: string): readonly ElkGraphElement[] {
  const node = owner as ElkNode;
  const lists: Record<string, () => readonly ElkGraphElement[]> = {
    labels: () => [...node.getLabels()],
    ports: () => [...node.getPorts()],
    children: () => [...node.getChildren()],
    containedEdges: () => [...node.getContainedEdges()],
  };
  return (lists[feature] as () => readonly ElkGraphElement[])();
}

export function objectAt(root: ElkNode, path: string): ElkGraphElement {
  let current: ElkGraphElement = root;
  for (const segment of path === '' ? [] : path.split('/')) {
    const match = PATH_SEGMENT.exec(segment) as RegExpExecArray;
    current = listOf(current, match[1] as string)[Number(match[2])] as ElkGraphElement;
  }
  return current;
}

export function propertyRows(root: ElkNode, recorded: readonly RecordedProperty[]): unknown[] {
  const paths = [...new Set(recorded.map((p) => p.path))];
  const byPath = new Map(paths.map((p) => [p, objectAt(root, p)] as const));
  return recorded.map((r, i) => {
    const holder = byPath.get(r.path) as ElkGraphElement;
    const index = recorded.slice(0, i).filter((p) => p.path === r.path).length;
    return [...holder.getProperties().entryList()][index];
  });
}

/** Whether a parsed value is the recorded one; the class is compared where the TS value model carries it. */
export function valueMatches(actual: unknown, recorded: RecordedProperty): boolean {
  if (recorded.valueClass === null) return actual === null;
  if (recorded.valueClass === 'LayoutOptionProxy') {
    return actual instanceof LayoutOptionProxy && actual.toString() === recorded.value;
  }
  if (recorded.valueClass === 'Double' || recorded.valueClass === 'Integer') {
    return typeof actual === 'number' && actual === Number(recorded.value);
  }
  if (recorded.valueClass === 'Boolean') return actual === (recorded.value === 'true');
  if (recorded.valueClass === 'String') return actual === recorded.value;
  if (recorded.valueClass === 'RegularEnumSet') return String(actual) === recorded.value;
  return typeof actual === 'object' && actual !== null && actual.constructor.name === recorded.valueClass;
}
