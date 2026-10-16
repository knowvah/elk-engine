// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../../core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../../../core/util/internal/LayoutOptionProxy.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkGraphElement } from '../../../ElkGraphElement.js';
import type { ElkLabel } from '../../../ElkLabel.js';
import type { ElkNode } from '../../../ElkNode.js';
import type { ElkPort } from '../../../ElkPort.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from './ElkGraphJsonParser.js';
import type { ParseResult } from './ElkGraphJsonRecords.js';

const PARSE_REF = fileURLToPath(
  new URL('../../../../../test/golden/refs/java/graph-json-text-parse.json', import.meta.url),
);
const SERVICES = new ElkGraphJsonValueConverterService();
const SYNTAX = 'syntax';
const CONVERSION = 'conversion';

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

interface RecordedElement {
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

interface RecordedEdge {
  readonly identifier: string | null;
  readonly labels: readonly RecordedElement[];
  readonly sections: readonly unknown[];
}

interface RecordedProxies {
  readonly path: string;
  readonly sources: readonly string[];
  readonly targets: readonly string[];
}

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly diagnosticsAtLoad: readonly RecordedDiagnostic[];
  readonly graph: RecordedElement;
  readonly properties: readonly RecordedProperty[];
  readonly proxiesAtLoad: readonly RecordedProxies[];
}

const cases = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const hasSyntaxError = (c: RecordedCase): boolean => c.diagnosticsAtLoad.some((d) => d.kind === SYNTAX);
const exactCases = cases.filter((c) => !hasSyntaxError(c));
const syntaxCases = cases.filter(hasSyntaxError);

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

// ---- the parsed graph in the recorded shape (numbers instead of the recorded decimal strings) ----

interface Shape {
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

interface EdgeShape {
  identifier: string | null;
  labels: Shape[];
  sections: unknown[];
}

function labelShape(l: ElkLabel | ElkPort | ElkNode): Shape {
  return {
    identifier: l.getIdentifier(),
    x: l.getX(),
    y: l.getY(),
    width: l.getWidth(),
    height: l.getHeight(),
    labels: [...l.getLabels()].map(labelShape),
  };
}

function textShape(l: ElkLabel): Shape {
  return { ...labelShape(l), text: l.getText() as string, labels: [...l.getLabels()].map(textShape) };
}

function edgeShape(e: ElkEdge): EdgeShape {
  return { identifier: e.getIdentifier(), labels: [...e.getLabels()].map(textShape), sections: [...e.getSections()] };
}

function nodeShape(n: ElkNode): Shape {
  return {
    ...labelShape(n),
    labels: [...n.getLabels()].map(textShape),
    ports: [...n.getPorts()].map((p) => ({ ...labelShape(p), labels: [...p.getLabels()].map(textShape) })),
    children: [...n.getChildren()].map(nodeShape),
    edges: [...n.getContainedEdges()].map(edgeShape),
  };
}

function recordedShape(e: RecordedElement): Shape {
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

function listOf(owner: ElkGraphElement, feature: string): readonly ElkGraphElement[] {
  const node = owner as ElkNode;
  const lists: Record<string, () => readonly ElkGraphElement[]> = {
    labels: () => [...node.getLabels()],
    ports: () => [...node.getPorts()],
    children: () => [...node.getChildren()],
    containedEdges: () => [...node.getContainedEdges()],
  };
  return (lists[feature] as () => readonly ElkGraphElement[])();
}

function objectAt(root: ElkNode, path: string): ElkGraphElement {
  let current: ElkGraphElement = root;
  for (const segment of path === '' ? [] : path.split('/')) {
    const match = PATH_SEGMENT.exec(segment) as RegExpExecArray;
    current = listOf(current, match[1] as string)[Number(match[2])] as ElkGraphElement;
  }
  return current;
}

function propertyRows(result: ParseResult, recorded: readonly RecordedProperty[]): unknown[] {
  const paths = [...new Set(recorded.map((p) => p.path))];
  const byPath = new Map(paths.map((p) => [p, objectAt(result.root as ElkNode, p)] as const));
  return recorded.map((r, i) => {
    const holder = byPath.get(r.path) as ElkGraphElement;
    const index = recorded.slice(0, i).filter((p) => p.path === r.path).length;
    return [...holder.getProperties().entryList()][index];
  });
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

describe('ElkGraphJsonParser: replay of the recorded JVM parse cases (without linking)', () => {
  it('replays 439 recorded cases, 157 of them with syntax errors', () => {
    expect(cases).toHaveLength(439);
    expect(syntaxCases).toHaveLength(157);
  });

  describe.each(exactCases.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it('produces the recorded conversion diagnostics and no syntax error', () => {
      expect(run(c.input).diagnostics).toEqual(
        c.diagnosticsAtLoad
          .filter((d) => d.kind === CONVERSION)
          .map((d) => ({ kind: d.kind, message: d.message, line: d.line })),
      );
    });

    it('builds the recorded graph', () => {
      expect(nodeShape(run(c.input).root as ElkNode)).toEqual(recordedShape(c.graph));
    });

    it('builds the recorded properties in list order, with the recorded keys and values', () => {
      const result = run(c.input);
      const entries = propertyRows(result, c.properties) as Array<{
        getKey(): { getId(): string };
        getValue(): unknown;
      }>;
      expect(
        entries.map((e) => ({ key: e.getKey().getId(), keyClass: e.getKey() instanceof LayoutOptionData })),
      ).toEqual(c.properties.map((p) => ({ key: p.key, keyClass: p.keyClass === 'LayoutOptionData' })));
      c.properties.forEach((recorded, i) => {
        expect(valueMatches(entries[i]?.getValue(), recorded), `${recorded.key} = ${recorded.value}`).toBe(true);
      });
    });

    it('records the recorded number of references per edge and feature, in list order', () => {
      const result = run(c.input);
      const recordedCount = c.proxiesAtLoad.reduce((n, p) => n + p.sources.length + p.targets.length, 0);
      expect(result.references).toHaveLength(recordedCount);
      for (const proxies of c.proxiesAtLoad) {
        const edge = objectAt(result.root as ElkNode, proxies.path);
        for (const [feature, fragments] of [
          ['sources', proxies.sources],
          ['targets', proxies.targets],
        ] as const) {
          const recorded = result.references.filter((r) => r.owner === edge && r.feature === feature);
          expect(recorded.map((r) => r.index)).toEqual(fragments.map((_f, i) => i));
        }
      }
    });
  });

  it.each(syntaxCases.map((c) => [c.id, c.input] as const))('reports a syntax error for %s', (_id, input) => {
    expect(run(input).diagnostics.some((d) => d.kind === SYNTAX)).toBe(true);
  });
});
