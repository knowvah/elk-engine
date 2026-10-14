// SPDX-License-Identifier: EPL-2.0
// Shared by JsonImporter.test.ts and ElkGraphJson.test.ts: the recorded `import` rows of
// test/golden/refs/java/graph-json.json and the canonical ElkGraph tree <G> (GraphJsonVectors.java header).
import { readFileSync } from 'node:fs';
import { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import * as DoubleToString from '../../src/java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../src/java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../src/java/lang/IllegalStateException.js';
import { NumberFormatException } from '../../src/java/lang/NumberFormatException.js';
import { UnsupportedOperationException } from '../../src/java/lang/UnsupportedOperationException.js';
import { JsonIOException } from '../../src/gson/JsonIOException.js';
import type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { isElkPort } from '../../src/graph/ElkPort.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { JsonImportException } from '../../src/graph/json/JsonImportException.js';

const VECTORS_URL = new URL('../golden/refs/java/graph-json.json', import.meta.url);
const SCENARIOS_URL = new URL('../../tools/vectors/graph-json-scenarios/', import.meta.url);
export const PARSE_ERROR_CLASS = 'JsonIOException';
export const TOP_LEVEL_MESSAGE = 'Top-level element of the graph must be a json object.';
const DOUBLE_OPTION_TYPE = 'DOUBLE';

/** Java exception simple name -> the port's class (a Java NPE is a TypeError, D10). */
export const EXCEPTION_CLASSES: Readonly<Record<string, new (...a: never[]) => Error>> = {
  IllegalStateException,
  IllegalArgumentException,
  NumberFormatException,
  UnsupportedOperationException,
  JsonImportException,
  JsonIOException,
  NullPointerException: TypeError,
};

export interface Thrown {
  readonly class: string;
  readonly message: string | null;
  readonly cause?: Thrown;
}

export interface ImportRow {
  readonly id: string;
  readonly input: string;
  readonly lenient: boolean;
  readonly graph?: unknown;
  readonly throws?: Thrown;
}

export const importRows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { import: ImportRow[] }).import;

export function simpleName(javaClass: string): string {
  return javaClass.slice(javaClass.lastIndexOf('.') + 1);
}

export function fixtureText(row: { readonly input: string }): string {
  return readFileSync(new URL(row.input, SCENARIOS_URL), 'utf8');
}

export const isParsePhase = (row: ImportRow): boolean =>
  row.throws !== undefined && simpleName(row.throws.class) === PARSE_ERROR_CLASS;
// A row whose expected value depends on the JVM's System.identityHashCode (AD-10: not reproducible; journaled for the
// user, AD-13 STOP): HashMultimap<ElkEdgeSection, Object> iterates its section keys by identity hash, so the order in
// which the incoming-section back-links fill ElkEdgeSection.outgoingSections differs. Asserted up to that order.
export const IDENTITY_HASH_ORDER = 'ok-sections-linked';

/** IDENTITY_HASH_ORDER treatment: the canonical tree with every section's outgoingSections sorted. */
export function sortOutgoing(g: unknown): unknown {
  const copy = structuredClone(g) as { edges: { sections: { outgoingSections: string[] }[] }[] };
  for (const edge of copy.edges) for (const s of edge.sections) s.outgoingSections.sort();
  return copy;
}

// ---- the canonical tree <G>

function valueText(key: { getId(): string }, value: unknown): string {
  const data = key instanceof LayoutOptionData ? key : null;
  if (typeof value === 'number' && data?.getType()?.name() === DOUBLE_OPTION_TYPE) {
    return DoubleToString.toString(value);
  }
  return String(value);
}

function props(holder: IPropertyHolder): unknown[] {
  return [...holder.getAllProperties()].map(([key, value]) => ({ id: key.getId(), text: valueText(key, value) }));
}

function shape(s: ElkShape): Record<string, string> {
  return {
    x: DoubleToString.toString(s.getX()),
    y: DoubleToString.toString(s.getY()),
    width: DoubleToString.toString(s.getWidth()),
    height: DoubleToString.toString(s.getHeight()),
  };
}

function labels(list: Iterable<ElkLabel>): unknown[] {
  return [...list].map((l) => ({
    text: l.getText(), // the canonical label has no identifier key (GraphJsonVectors.java Canon.labels removes it)
    ...shape(l),
    properties: props(l),
    labels: labels(l.getLabels()),
  }));
}

export function canonNode(n: ElkNode): unknown {
  return {
    identifier: n.getIdentifier(),
    ...shape(n),
    properties: props(n),
    labels: labels(n.getLabels()),
    ports: [...n.getPorts()].map((p) => ({
      identifier: p.getIdentifier(),
      ...shape(p),
      properties: props(p),
      labels: labels(p.getLabels()),
    })),
    children: [...n.getChildren()].map(canonNode),
    edges: [...n.getContainedEdges()].map(canonEdge),
  };
}

function ref(s: ElkConnectableShape): unknown {
  return { kind: isElkPort(s) ? 'port' : 'node', id: (s as ElkGraphElement).getIdentifier() };
}

function canonSection(s: ElkEdgeSection): unknown {
  return {
    identifier: s.getIdentifier(),
    startX: DoubleToString.toString(s.getStartX()),
    startY: DoubleToString.toString(s.getStartY()),
    endX: DoubleToString.toString(s.getEndX()),
    endY: DoubleToString.toString(s.getEndY()),
    bendPoints: [...s.getBendPoints()].map((b) => ({
      x: DoubleToString.toString(b.getX()),
      y: DoubleToString.toString(b.getY()),
    })),
    incomingShape: s.getIncomingShape() === null ? null : ref(s.getIncomingShape() as ElkConnectableShape),
    outgoingShape: s.getOutgoingShape() === null ? null : ref(s.getOutgoingShape() as ElkConnectableShape),
    incomingSections: [...s.getIncomingSections()].map((o) => o.getIdentifier()),
    outgoingSections: [...s.getOutgoingSections()].map((o) => o.getIdentifier()),
    properties: props(s),
  };
}

function canonEdge(e: ElkEdge): unknown {
  return {
    identifier: e.getIdentifier(),
    sources: [...e.getSources()].map(ref),
    targets: [...e.getTargets()].map(ref),
    properties: props(e),
    labels: labels(e.getLabels()),
    sections: [...e.getSections()].map(canonSection),
  };
}
