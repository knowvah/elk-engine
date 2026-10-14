// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import type { ElkGraphElement } from '../../ElkGraphElement.js';
import type { ElkLabel } from '../../ElkLabel.js';
import type { ElkNode } from '../../ElkNode.js';
import type { ElkPort } from '../../ElkPort.js';
import { parse } from './ElkGraphParser.js';
import type { ParseResult } from './ParseRecords.js';

const PARSE_REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-text-parse.json', import.meta.url));
const SERVICES = new ElkGraphValueConverterService();

interface RecordedDiagnostic {
  readonly kind: string;
  readonly message: string;
  readonly line: number;
}

interface RecordedProperty {
  readonly path: string;
  readonly key: string;
  readonly keyClass: string;
  readonly valueClass: string | null;
  readonly value: string | null;
}

interface RecordedSection {
  readonly identifier: string | null;
  readonly startX: string;
  readonly startY: string;
  readonly endX: string;
  readonly endY: string;
  readonly bendPoints: ReadonlyArray<{ readonly x: string; readonly y: string }>;
  readonly outgoingShape: unknown;
  readonly incomingShape: unknown;
  readonly outgoingSections: readonly unknown[];
}

interface RecordedElement {
  readonly identifier: string | null;
  readonly x?: string;
  readonly y?: string;
  readonly width?: string;
  readonly height?: string;
  readonly text?: string;
  readonly labels: readonly RecordedElement[];
  readonly ports?: readonly RecordedElement[];
  readonly children?: readonly RecordedElement[];
  readonly edges?: readonly RecordedEdge[];
}

interface RecordedEdge {
  readonly identifier: string | null;
  readonly sources: readonly unknown[];
  readonly targets: readonly unknown[];
  readonly labels: readonly RecordedElement[];
  readonly sections: readonly RecordedSection[];
}

interface RecordedConnection {
  readonly path: string;
  readonly sources?: readonly unknown[];
  readonly targets?: readonly unknown[];
  readonly incomingShape?: unknown;
  readonly outgoingShape?: unknown;
  readonly outgoingSections?: readonly unknown[];
}

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly diagnostics: readonly RecordedDiagnostic[];
  readonly graph: RecordedElement;
  readonly properties: readonly RecordedProperty[];
  readonly connections: readonly RecordedConnection[];
}

const cases = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const hasSyntaxError = (c: RecordedCase): boolean => c.diagnostics.some((d) => d.kind === 'syntax');
const exactCases = cases.filter((c) => !hasSyntaxError(c));
const syntaxCases = cases.filter(hasSyntaxError);

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

function root(text: string): ElkNode {
  const result = run(text);
  expect(result.diagnostics).toEqual([]);
  return result.root as ElkNode;
}

// ---- normalised graph shapes, actual and recorded ----

interface Shape {
  identifier: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  labels: Shape[];
  ports?: Shape[];
  children?: Shape[];
  edges?: EdgeShape[];
}

interface EdgeShape {
  identifier: string | null;
  labels: Shape[];
  sections: SectionShape[];
}

interface SectionShape {
  identifier: string | null;
  start: [number, number];
  end: [number, number];
  bends: Array<[number, number]>;
}

function labelShape(l: ElkLabel): Shape {
  return {
    identifier: l.getIdentifier(),
    x: l.getX(),
    y: l.getY(),
    width: l.getWidth(),
    height: l.getHeight(),
    text: l.getText() as string,
    labels: [...l.getLabels()].map(labelShape),
  };
}

function portShape(p: ElkPort): Shape {
  return {
    identifier: p.getIdentifier(),
    x: p.getX(),
    y: p.getY(),
    width: p.getWidth(),
    height: p.getHeight(),
    labels: [...p.getLabels()].map(labelShape),
  };
}

function sectionShape(s: ElkEdgeSection): SectionShape {
  return {
    identifier: s.getIdentifier(),
    start: [s.getStartX(), s.getStartY()],
    end: [s.getEndX(), s.getEndY()],
    bends: [...s.getBendPoints()].map((b) => [b.getX(), b.getY()]),
  };
}

function edgeShape(e: ElkEdge): EdgeShape {
  return {
    identifier: e.getIdentifier(),
    labels: [...e.getLabels()].map(labelShape),
    sections: [...e.getSections()].map(sectionShape),
  };
}

function nodeShape(n: ElkNode): Shape {
  return {
    identifier: n.getIdentifier(),
    x: n.getX(),
    y: n.getY(),
    width: n.getWidth(),
    height: n.getHeight(),
    labels: [...n.getLabels()].map(labelShape),
    ports: [...n.getPorts()].map(portShape),
    children: [...n.getChildren()].map(nodeShape),
    edges: [...n.getContainedEdges()].map(edgeShape),
  };
}

function recordedElement(e: RecordedElement): Shape {
  const shape: Shape = { identifier: e.identifier, labels: e.labels.map(recordedElement) };
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    if (e[key] !== undefined) shape[key] = Number(e[key]);
  }
  if (e.text !== undefined) shape.text = e.text;
  if (e.ports !== undefined) shape.ports = e.ports.map(recordedElement);
  if (e.children !== undefined) shape.children = e.children.map(recordedElement);
  if (e.edges !== undefined) shape.edges = e.edges.map(recordedEdge);
  return shape;
}

function recordedEdge(e: RecordedEdge): EdgeShape {
  return {
    identifier: e.identifier,
    labels: e.labels.map(recordedElement),
    sections: e.sections.map((s) => ({
      identifier: s.identifier,
      start: [Number(s.startX), Number(s.startY)],
      end: [Number(s.endX), Number(s.endY)],
      bends: s.bendPoints.map((b) => [Number(b.x), Number(b.y)]),
    })),
  };
}

// ---- properties in the recorder's order: node, labels, ports (+labels), children, edges (+labels, sections) ----

interface Row {
  path: string;
  holder: ElkGraphElement | ElkEdgeSection;
}

function labelRows(parent: ElkGraphElement, prefix: string): Row[] {
  return [...parent.getLabels()].flatMap((l, i) => {
    const p = `${prefix}labels[${i}]`;
    return [{ path: p, holder: l }, ...labelRows(l, `${p}/`)];
  });
}

function rows(node: ElkNode, prefix = ''): Row[] {
  const self = prefix === '' ? '' : prefix.slice(0, -1);
  const out: Row[] = [{ path: self, holder: node }, ...labelRows(node, prefix)];
  [...node.getPorts()].forEach((port, i) => {
    out.push({ path: `${prefix}ports[${i}]`, holder: port }, ...labelRows(port, `${prefix}ports[${i}]/`));
  });
  [...node.getChildren()].forEach((child, i) => out.push(...rows(child, `${prefix}children[${i}]/`)));
  [...node.getContainedEdges()].forEach((edge, i) => {
    const p = `${prefix}containedEdges[${i}]`;
    out.push({ path: p, holder: edge }, ...labelRows(edge, `${p}/`));
    [...edge.getSections()].forEach((s, j) => out.push({ path: `${p}/sections[${j}]`, holder: s }));
  });
  return out;
}

function propertyRows(result: ParseResult): Array<RecordedProperty & { actual: unknown }> {
  return rows(result.root as ElkNode).flatMap(({ path: p, holder }) =>
    [...holder.getProperties().entryList()].map((entry) => ({
      path: p,
      key: entry.getKey().getId(),
      keyClass: entry.getKey() instanceof LayoutOptionData ? 'LayoutOptionData' : 'Property',
      valueClass: null,
      value: null,
      actual: entry.getValue(),
    })),
  );
}

/** Whether a parsed value is the recorded one; the class is compared where the TS value model carries it. */
function valueMatches(actual: unknown, recorded: RecordedProperty): boolean {
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

function connectionCount(c: RecordedConnection): number {
  const shapes = [c.incomingShape, c.outgoingShape].filter((s) => s !== null && s !== undefined).length;
  return (c.sources?.length ?? 0) + (c.targets?.length ?? 0) + shapes + (c.outgoingSections?.length ?? 0);
}

const LINK_MESSAGE = /^Couldn't resolve reference to \w+ '(.*)'\.$/s;

describe('ElkGraphParser: replay of the recorded JVM parse cases (without linking)', () => {
  it('replays 301 recorded cases, 99 of them with syntax errors', () => {
    expect(cases).toHaveLength(301);
    expect(syntaxCases).toHaveLength(99);
  });

  describe.each(exactCases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const result = run(c.input);

    it('produces the recorded conversion diagnostics and no syntax error', () => {
      expect(result.diagnostics).toEqual(
        c.diagnostics
          .filter((d) => d.kind === 'conversion')
          .map((d) => ({ kind: d.kind, message: d.message, line: d.line })),
      );
    });

    it('builds the recorded graph', () => {
      expect(nodeShape(result.root as ElkNode)).toEqual(recordedElement(c.graph));
    });

    it('builds the recorded properties in order, with the recorded keys and values', () => {
      const actual = propertyRows(result);
      expect(actual.map(({ path: p, key, keyClass }) => ({ path: p, key, keyClass }))).toEqual(
        c.properties.map(({ path: p, key, keyClass }) => ({ path: p, key, keyClass })),
      );
      c.properties.forEach((recorded, i) => {
        expect(valueMatches(actual[i]?.actual, recorded), `${recorded.key} = ${recorded.value}`).toBe(true);
      });
    });

    it('records one reference per resolved or unresolved link, with the recorded text and line', () => {
      const unresolved = c.diagnostics.filter((d) => d.kind === 'linking');
      const resolved = c.connections.reduce((n, conn) => n + connectionCount(conn), 0);
      expect(result.references).toHaveLength(resolved + unresolved.length);
      for (const d of unresolved) {
        const text = LINK_MESSAGE.exec(d.message)?.[1];
        expect(
          result.references.some((r) => r.text === text && r.line === d.line),
          d.message,
        ).toBe(true);
      }
    });
  });

  it.each(syntaxCases.map((c) => [c.id, c.input] as const))('reports a syntax error for %s', (_id, input) => {
    expect(run(input).diagnostics.some((d) => d.kind === 'syntax')).toBe(true);
  });
});
