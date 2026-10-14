// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveModelsDir } from '../../../../test/corpus/corpus.js';
import { isCoverageRun } from '../../../../test/helpers/coverage-run.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { Diagnostic } from '../../../xtext/diagnostics/Diagnostic.js';
import type { IDiagnosticConsumer } from '../../../xtext/diagnostics/IDiagnosticConsumer.js';
import type { Severity } from '../../../xtext/diagnostics/Severity.js';
import { DefaultLinkingService } from '../../../xtext/linking/impl/DefaultLinkingService.js';
import { LinkingDiagnosticMessageProvider } from '../../../xtext/linking/impl/LinkingDiagnosticMessageProvider.js';
import { LinkingHelper } from '../../../xtext/linking/impl/LinkingHelper.js';
import { CaseInsensitivityHelper } from '../../../xtext/scoping/impl/CaseInsensitivityHelper.js';
import { ImportedNamespaceAwareLocalScopeProvider } from '../../../xtext/scoping/impl/ImportedNamespaceAwareLocalScopeProvider.js';
import { SingleResourceGlobalScopeProvider } from '../../../xtext/scoping/impl/SingleResourceGlobalScopeProvider.js';
import { ResourceScopeCache } from '../../../xtext/util/ResourceScopeCache.js';
import type { ElkConnectableShape } from '../../ElkConnectableShape.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkEdgeSection } from '../../ElkEdgeSection.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import { ElkGraphQualifiedNameConverter } from '../naming/ElkGraphQualifiedNameConverter.js';
import { ElkGraphQualifiedNameProvider } from '../naming/ElkGraphQualifiedNameProvider.js';
import { tokenize } from '../parser/ElkGraphLexer.js';
import { parse } from '../parser/ElkGraphParser.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphScopeProvider } from '../scoping/ElkGraphScopeProvider.js';
import { ElkGraphLinker } from './ElkGraphLinker.js';
import { ElkGraphReferences } from './ElkGraphReferences.js';

const PARSE_REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-text-parse.json', import.meta.url));
const MODEL_RELATIVE_PATH = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt';
const SERVICES = new ElkGraphValueConverterService();
const LINKING = 'linking';
const LINK_BUDGET_MS = 1000;
const LINK_BUDGET_COVERAGE_MS = 4000;

interface LinkDiagnostic {
  readonly severity: string;
  readonly message: string | null;
  readonly line: number;
}

class Collector implements IDiagnosticConsumer {
  readonly diagnostics: LinkDiagnostic[] = [];

  consume(diagnostic: Diagnostic, severity: Severity): void {
    this.diagnostics.push({
      severity: severity.name().toLowerCase(),
      message: diagnostic.getMessage(),
      line: diagnostic.getLine(),
    });
  }

  hasConsumedDiagnostics(severity: Severity): boolean {
    return this.diagnostics.some((d) => d.severity === severity.name().toLowerCase());
  }
}

/** The language services of `.elkt`, wired as T18 wires them. */
function link(text: string): { root: ElkNode; diagnostics: LinkDiagnostic[]; syntaxErrors: number } {
  const result = parse(text, SERVICES);
  const converter = new ElkGraphQualifiedNameConverter(tokenize, ELK_GRAPH_KEYWORDS);
  const cache = new ResourceScopeCache();
  const names = new ElkGraphQualifiedNameProvider(converter, cache);
  const local = new ImportedNamespaceAwareLocalScopeProvider(
    new SingleResourceGlobalScopeProvider(),
    names,
    converter,
    new CaseInsensitivityHelper(),
    cache,
  );
  const helper = new LinkingHelper(SERVICES);
  const linker = new ElkGraphLinker(
    new DefaultLinkingService(new ElkGraphScopeProvider(local), helper, converter),
    new LinkingDiagnosticMessageProvider(),
    helper,
    new ElkGraphReferences(),
    result.nodeModel,
  );
  const consumer = new Collector();
  const root = result.root as ElkNode;
  linker.linkModel(root, consumer);
  return {
    root,
    diagnostics: consumer.diagnostics,
    syntaxErrors: result.diagnostics.filter((d) => d.kind === 'syntax').length,
  };
}

// ---- recorded connections ----

interface RecordedDiagnostic {
  readonly kind: string;
  readonly severity?: string;
  readonly message: string;
  readonly line: number;
}

interface RecordedConnection {
  readonly path: string;
  readonly [key: string]: unknown;
}

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly diagnostics: readonly RecordedDiagnostic[];
  readonly connections: readonly RecordedConnection[];
}

const cases = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const linkable = cases.filter((c) => !c.diagnostics.some((d) => d.kind === 'syntax'));

/** The recorder's path of every node, port, edge and section: `children[0]/ports[1]`, `containedEdges[0]/sections[0]`. */
function pathsOf(node: ElkNode, prefix = '', out = new Map<EObject, string>()): Map<EObject, string> {
  out.set(node, prefix === '' ? '' : prefix.slice(0, -1));
  [...node.getPorts()].forEach((port, i) => out.set(port, `${prefix}ports[${i}]`));
  [...node.getChildren()].forEach((child, i) => pathsOf(child, `${prefix}children[${i}]/`, out));
  [...node.getContainedEdges()].forEach((edge, i) => {
    const p = `${prefix}containedEdges[${i}]`;
    out.set(edge, p);
    [...edge.getSections()].forEach((section, j) => out.set(section, `${p}/sections[${j}]`));
  });
  return out;
}

type Getters = Record<string, () => unknown>;

/** The recorded key's value as paths: a list of paths, or a path / `null` for a single value. */
function actualValue(obj: EObject, key: string, paths: Map<EObject, string>): unknown {
  const getter = `get${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const value = (obj as unknown as Getters)[getter]!.call(obj);
  const pathOf = (o: EObject): string => paths.get(o) ?? `<unknown ${String(o)}>`;
  if (value === null) return null;
  if (Symbol.iterator in (value as object)) return [...(value as Iterable<EObject>)].map(pathOf);
  return pathOf(value as EObject);
}

describe('ElkGraphLinker: replay of the recorded JVM cases', () => {
  it('replays the cases without syntax errors, 47 of the 301 with linking diagnostics', () => {
    expect(cases.filter((c) => c.diagnostics.some((d) => d.kind === LINKING))).toHaveLength(47);
    expect(linkable.length).toBeGreaterThan(150);
  });

  describe.each(linkable.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    const { root, diagnostics } = link(c.input);

    it('reports the recorded linking diagnostics in the recorded order', () => {
      expect(diagnostics).toEqual(
        c.diagnostics
          .filter((d) => d.kind === LINKING)
          .map((d) => ({ severity: d.severity, message: d.message, line: d.line })),
      );
    });

    it('resolves every reference to the recorded target', () => {
      const paths = pathsOf(root);
      const objects = new Map([...paths].map(([obj, p]) => [p, obj] as const));
      for (const connection of c.connections) {
        const owner = objects.get(connection.path);
        expect(owner, connection.path).toBeDefined();
        for (const [key, recorded] of Object.entries(connection)) {
          if (key === 'path') continue;
          expect(actualValue(owner as EObject, key, paths), `${connection.path} ${key}`).toEqual(recorded);
        }
      }
    });
  });
});

describe('ElkGraphLinker: opposite ends (ELK #170)', () => {
  it('keeps the incoming and outgoing edges of the endpoints, once each', () => {
    const { root, diagnostics } = link('node a\nnode b\nedge a -> b\nedge a -> b\n');
    const [a, b] = [...root.getChildren()];
    const [e1, e2] = [...root.getContainedEdges()] as [ElkEdge, ElkEdge];
    expect(diagnostics).toEqual([]);
    expect([...(a as ElkNode).getOutgoingEdges()]).toEqual([e1, e2]);
    expect([...(b as ElkNode).getIncomingEdges()]).toEqual([e1, e2]);
    expect([...(a as ElkNode).getIncomingEdges()]).toEqual([]);
  });

  it('fills the incoming sections of a section chain', () => {
    const { root, diagnostics } = link(
      'node a\nnode b\nedge e : a -> b { layout [ section s1 -> s2 [ ] section s2 [ ] ] }\n',
    );
    const [s1, s2] = [...([...root.getContainedEdges()][0] as ElkEdge).getSections()] as [
      ElkEdgeSection,
      ElkEdgeSection,
    ];
    expect(diagnostics).toEqual([]);
    expect([...s1.getOutgoingSections()]).toEqual([s2]);
    expect([...s2.getIncomingSections()]).toEqual([s1]);
    expect([...s1.getIncomingSections()]).toEqual([]);
  });

  it('keeps links made from objects visited earlier when later objects are cleared', () => {
    const { root } = link('node n { edge a -> b }\nnode a\nnode b\n');
    const [n, a, b] = [...root.getChildren()] as [ElkNode, ElkNode, ElkNode];
    const edge = [...n.getContainedEdges()][0] as ElkEdge;
    expect([...edge.getSources()]).toEqual([a]);
    expect([...a.getOutgoingEdges()]).toEqual([edge]);
    expect([...b.getIncomingEdges()]).toEqual([edge]);
  });
});

describe('ElkGraphScopeProvider: section references', () => {
  it('resolves outgoing sections among the sections of the same edge', () => {
    const { root, diagnostics } = link(
      'node a\nnode b\nedge e1 : a -> b { layout [ section s1 -> s2 [ ] section s2 [ ] ] }\n' +
        'edge e2 : a -> b { layout [ section s2 [ ] ] }\n',
    );
    const [e1, e2] = [...root.getContainedEdges()] as [ElkEdge, ElkEdge];
    const [s1, s2] = [...e1.getSections()] as [ElkEdgeSection, ElkEdgeSection];
    expect(diagnostics).toEqual([]);
    expect([...s1.getOutgoingSections()]).toEqual([s2]);
    expect([...e2.getSections().get(0).getIncomingSections()]).toEqual([]);
  });

  it('does not resolve the section of another edge', () => {
    const { diagnostics } = link(
      'node a\nnode b\nedge e1 : a -> b { layout [ section s1 [ ] ] }\n' +
        'edge e2 : a -> b { layout [ section s2 -> s1 [ ] ] }\n',
    );
    expect(diagnostics).toEqual([
      { severity: 'error', message: "Couldn't resolve reference to ElkEdgeSection 's1'.", line: 4 },
    ]);
  });

  it('does not fall through to nodes: a node id is no section', () => {
    const { root, diagnostics } = link('node a\nedge e : a -> a { layout [ section s -> a [ ] ] }\n');
    const section = [...([...root.getContainedEdges()][0] as ElkEdge).getSections()][0] as ElkEdgeSection;
    expect(diagnostics.map((d) => d.message)).toEqual(["Couldn't resolve reference to ElkEdgeSection 'a'."]);
    expect([...section.getOutgoingSections()]).toEqual([]);
  });

  it('resolves a shape from an edge section through the edge scope', () => {
    const { root, diagnostics } = link('node a\nnode b\nedge e : a -> b { layout [ incoming: a outgoing: b ] }\n');
    const section = [...([...root.getContainedEdges()][0] as ElkEdge).getSections()][0] as ElkEdgeSection;
    const [a, b] = [...root.getChildren()] as unknown as [ElkConnectableShape, ElkConnectableShape];
    expect(diagnostics).toEqual([]);
    expect(section.getIncomingShape()).toBe(a);
    expect(section.getOutgoingShape()).toBe(b);
  });
});

describe('ElkGraphLinker: scope cache', () => {
  const models = resolveModelsDir();
  const skipReason = 'skip' in models ? models.skip : '';
  it.skipIf(skipReason !== '')(
    `parses and links the 253 KB Trilateration model in under ${LINK_BUDGET_MS} ms${skipReason === '' ? '' : ` (skipped: ${skipReason})`}`,
    () => {
      const text = readFileSync(path.join((models as { dir: string }).dir, MODEL_RELATIVE_PATH), 'utf8');
      const started = performance.now();
      const { diagnostics, syntaxErrors } = link(text);
      const elapsed = performance.now() - started;
      expect(syntaxErrors).toBe(0);
      expect(diagnostics).toEqual([]);
      expect(elapsed).toBeLessThan(isCoverageRun() ? LINK_BUDGET_COVERAGE_MS : LINK_BUDGET_MS);
    },
  );
});
