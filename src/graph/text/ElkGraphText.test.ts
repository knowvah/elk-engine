// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportLikeOracle } from '../../../test/helpers/graph-json-oracle.js';
import { compareLayout, formatDiffs } from '../../../test/golden/compare-json.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { Severity } from '../../xtext/diagnostics/Severity.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { LayoutOptionProxy } from '../../core/util/internal/LayoutOptionProxy.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphSerializationError } from './serializer/ElkGraphSerializationError.js';
import { ElkGraphText, LinkingCollector, SerializationException } from './ElkGraphText.js';
import { type RegisteredAfterLoad, registerAfterLoad } from '../../../test/helpers/elkt-validate-mutations.js';

const VALIDATE_REF = fileURLToPath(new URL('../../../test/golden/refs/java/graph-text-validate.json', import.meta.url));
const PARSE_REF = fileURLToPath(new URL('../../../test/golden/refs/java/graph-text-parse.json', import.meta.url));
const SYNTAX = 'syntax';
const NULL_POINTER = 'java.lang.NullPointerException';

interface RecordedDiagnostic {
  readonly kind: string;
  readonly severity: string;
  readonly message: string;
  readonly line: number;
}

interface RecordedThrow {
  readonly throws: { readonly cls: string };
}
type RecordedExport = RecordedThrow | Record<string, unknown>;

interface RecordedCase {
  readonly id: string;
  readonly input: string;
  readonly diagnostics: readonly RecordedDiagnostic[];
  readonly json: string | RecordedExport;
}

const cases = (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedCase[] }).cases;
const hasSyntax = (c: RecordedCase): boolean => c.diagnostics.some((d) => d.kind === SYNTAX);
const exact = cases.filter((c) => !hasSyntax(c));
const syntactic = cases.filter(hasSyntax);

const strip = (d: { kind: string; severity: string; message: string; line: number }) => ({
  kind: d.kind,
  severity: d.severity,
  message: d.message,
  line: d.line,
});

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

describe('ElkGraphText.load: replay of the recorded JVM cases', () => {
  it('covers 301 cases, 99 with syntax errors', () => {
    expect(cases).toHaveLength(301);
    expect(syntactic).toHaveLength(99);
  });

  describe.each(exact.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it('reports the recorded diagnostics in Xtext order', () => {
      expect(ElkGraphText.load(c.input).errors).toEqual(c.diagnostics.map(strip));
    });

    it('builds the recorded model, properties included (an NPE of the exporter is a TypeError)', () => {
      const { root } = ElkGraphText.load(c.input);
      const recorded = typeof c.json === 'string' ? (JSON.parse(c.json) as RecordedExport) : c.json;
      if ('throws' in recorded) {
        expect((recorded as RecordedThrow).throws.cls).toBe(NULL_POINTER);
        expect(() => exportLikeOracle(root as never)).toThrow(TypeError);
        return;
      }
      const result = compareLayout(recorded, JSON.parse(exportLikeOracle(root as never)));
      expect(result.ok, formatDiffs(result.diffs)).toBe(true);
    });
  });

  describe.each(syntactic.map((c) => [c.id, c] as const))('%s (syntax error)', (_id, c) => {
    it('reports a syntax error (presence only, G5) before any linking diagnostic', () => {
      const { errors } = ElkGraphText.load(c.input);
      const kinds = errors.map((e) => e.kind);
      expect(kinds).toContain(SYNTAX);
      expect(kinds.lastIndexOf(SYNTAX)).toBeLessThan(
        kinds.indexOf('linking') === -1 ? Infinity : kinds.indexOf('linking'),
      );
    });
  });
});

describe('ElkGraphText.load: bad input', () => {
  it.each(['', '{', 'node', 'edge -> ->', '\u0000\u0001', 'node a { layout [ size: 1e ] }'])(
    'does not throw for %j',
    (text) => {
      const result = ElkGraphText.load(text);
      expect(Array.isArray(result.errors)).toBe(true);
    },
  );

  it('returns the partial model of the parse with the syntax error', () => {
    const { root, errors } = ElkGraphText.load('{');
    expect(root?.getChildren().size()).toBe(0);
    expect(errors.map((e) => e.kind)).toEqual([SYNTAX]);
    expect(errors[0]?.severity).toBe('error');
  });

  it('links after a syntax error and lists the syntax error first', () => {
    const { errors } = ElkGraphText.load('node a\nedge a -> zz\nnode {');
    expect(errors.map((e) => e.kind)).toEqual([SYNTAX, 'linking']);
  });

  it('returns a clean result for a valid model', () => {
    const { root, errors } = ElkGraphText.load('node a\nnode b\nedge a -> b\n');
    expect(errors).toEqual([]);
    expect(root?.getChildren().size()).toBe(2);
  });
});

describe('ElkGraphText.load: linking diagnostics collector', () => {
  it('reports the unresolved reference as a linking error and keeps the model', () => {
    const { root, errors } = ElkGraphText.load('node a\nedge a -> zz\n');
    expect(errors).toEqual([
      {
        kind: 'linking',
        severity: 'error',
        message: "Couldn't resolve reference to ElkConnectableShape 'zz'.",
        line: 2,
      },
    ]);
    expect(root?.getContainedEdges().size()).toBe(1);
  });
});

describe('LinkingCollector', () => {
  const diagnostic = { getMessage: () => 'm', getLine: () => 7 } as never;

  it('records a warning and an error with their severity text', () => {
    const collector = new LinkingCollector();
    collector.consume(diagnostic, Severity.WARNING);
    expect(collector.diagnostics).toEqual([{ kind: 'linking', severity: 'warning', message: 'm', line: 7 }]);
    expect(collector.hasConsumedDiagnostics(Severity.WARNING)).toBe(true);
    expect(collector.hasConsumedDiagnostics(Severity.ERROR)).toBe(false);
  });
});

interface RecordedIssue {
  readonly severity: string;
  readonly message: string;
  readonly line: number;
  readonly code: string | null;
}

interface ValidateCase {
  readonly id: string;
  readonly input: string;
  readonly deferred?: string;
  readonly registeredAfterLoad?: RegisteredAfterLoad;
  readonly issues: readonly RecordedIssue[];
}

const CODE_SYNTAX = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';
const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const sortedIssues = (issues: readonly RecordedIssue[]): RecordedIssue[] =>
  [...issues].sort(
    (a, b) =>
      a.line - b.line || text(a.severity, b.severity) || text(a.code ?? '', b.code ?? '') || text(a.message, b.message),
  );

const validateCases = (JSON.parse(readFileSync(VALIDATE_REF, 'utf8')) as { cases: ValidateCase[] }).cases.filter(
  (c) => c.deferred === undefined && !c.issues.some((i) => i.code === CODE_SYNTAX),
);

describe('ElkGraphText.validate against graph-text-validate.json', () => {
  it.each(validateCases.map((c) => [c.id, c] as const))('%s', (_id, recorded) => {
    const { root } = ElkGraphText.load(recorded.input);
    // @register-after-load: the recorder registers the option between loading and validating
    if (recorded.registeredAfterLoad !== undefined) {
      registerAfterLoad(recorded.registeredAfterLoad);
    }
    expect(sortedIssues(ElkGraphText.validate(root as ElkNode))).toEqual(recorded.issues);
  });

  it('reports a graph that was not loaded at line 0, without load diagnostics', () => {
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(CoreOptions.SPACING_NODE_NODE, new LayoutOptionProxy('abc'));
    expect(ElkGraphText.validate(root)).toEqual([
      { severity: 'error', message: 'Expected value of type Double.', line: 0, code: null },
    ]);
  });
});

describe('ElkGraphText.validate failures', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs a failing validator as structured JSON and reports it as an issue', () => {
    const logged: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((line: string) => void logged.push(line));
    const root = ElkGraphUtil.createGraph();
    root.getProperties().put(CoreOptions.SPACING_NODE_NODE, {
      resolveValue: () => {
        throw new RangeError('boom');
      },
    });
    expect(ElkGraphText.validate(root)).toEqual([
      expect.objectContaining({ severity: 'error', message: 'Error executing EValidator', line: 0 }),
    ]);
    expect(logged.map((l) => JSON.parse(l))).toEqual([
      expect.objectContaining({ level: 'error', msg: 'Error executing EValidator', service: 'elk-engine' }),
    ]);
  });
});

describe('ElkGraphText.serialize', () => {
  const PROXY_TEXT = '5';

  it('leaves the proxy property values of the original untouched', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('g');
    const proxy = new LayoutOptionProxy(PROXY_TEXT);
    root.getProperties().put(CoreOptions.PRIORITY, proxy);
    expect(ElkGraphText.serialize(root)).toBe('graph g\npriority: 5\n');
    expect(root.getProperties().get(CoreOptions.PRIORITY)).toBe(proxy);
  });

  it('throws the serialization exception for a node without identifier', () => {
    const root = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(root);
    expect(() => ElkGraphText.serialize(root)).toThrow(ElkGraphSerializationError);
    expect(SerializationException).toBe(ElkGraphSerializationError);
  });

  it('remaps the edge ends into the copy and leaves the original edge connected', () => {
    const root = ElkGraphUtil.createGraph();
    root.setIdentifier('g');
    const a = ElkGraphUtil.createNode(root);
    a.setIdentifier('a');
    const edge = ElkGraphUtil.createEdge(root);
    edge.setIdentifier('e');
    edge.getSources().add(a);
    edge.getTargets().add(a);
    expect(ElkGraphText.serialize(root)).toContain('edge e: a -> a');
    expect(root.getContainedEdges().get(0).getTargets().size()).toBe(1);
  });
});
