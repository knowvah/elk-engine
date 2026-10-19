// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { ElkNode } from '../../ElkNode.js';
import { ElkPropertyToValueMapEntryImpl } from '../../impl/ElkPropertyToValueMapEntryImpl.js';
import { Property } from '../../properties/Property.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { ElkGraphJsonText, type ElkJsonTextIssue } from './ElkGraphJsonText.js';

const REF = fileURLToPath(new URL('../../../../test/golden/refs/java/graph-json-text-validate.json', import.meta.url));
const STAGE_SYNTAX = 'syntax';
const CODE_LINKING = 'org.eclipse.xtext.diagnostics.Diagnostic.Linking';

interface RefIssue extends ElkJsonTextIssue {
  readonly stage: string;
}
interface RefCase {
  readonly id: string;
  readonly input: string;
  readonly issues: readonly RefIssue[];
  readonly mutations: readonly unknown[];
}

const cases = (JSON.parse(readFileSync(REF, 'utf8')) as { cases: RefCase[] }).cases;
const caseById = (id: string): RefCase => cases.find((c) => c.id === id) as RefCase;

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The recorder's order: line, severity, code (null as ''), message. */
function sorted(issues: readonly ElkJsonTextIssue[]): ElkJsonTextIssue[] {
  return [...issues].sort(
    (a, b) =>
      a.line - b.line || text(a.severity, b.severity) || text(a.code ?? '', b.code ?? '') || text(a.message, b.message),
  );
}

/** Load and validate; a document without a model has only its load diagnostics (the reader's `errors`). */
function issuesOf(input: string): ElkJsonTextIssue[] {
  const loaded = ElkGraphJsonText.load(input);
  if (loaded.root === null) {
    return loaded.errors.map((e) => ({ severity: e.severity, message: e.message, line: e.line, code: null }));
  }
  return sorted(ElkGraphJsonText.validate(loaded.root));
}

const exact = (issues: readonly RefIssue[]): ElkJsonTextIssue[] =>
  issues.map(({ severity, message, line, code }) => ({ severity, message, line, code }));

describe('replaying graph-json-text-validate.json', () => {
  it('has the 28 recorded rows', () => {
    expect(cases).toHaveLength(28);
  });

  describe.each(cases.filter((c) => c.issues.every((i) => i.stage !== STAGE_SYNTAX)))('$id', (c) => {
    it('reports exactly the recorded issues', () => {
      expect(issuesOf(c.input)).toEqual(exact(c.issues));
    });
  });

  describe.each(cases.filter((c) => c.issues.some((i) => i.stage === STAGE_SYNTAX)))('$id (syntax: presence)', (c) => {
    it('reports a syntax error where one is recorded (D6: presence only, not lines or messages)', () => {
      const got = issuesOf(c.input);
      expect(got.length).toBeGreaterThan(0);
      expect(new Set(got.map((i) => i.severity))).toEqual(new Set(c.issues.map((i) => i.severity)));
    });
  });

  it('records no value mutation for any row', () => {
    expect(cases.flatMap((c) => c.mutations)).toEqual([]);
    for (const c of cases) {
      const loaded = ElkGraphJsonText.load(c.input);
      if (loaded.root !== null) {
        ElkGraphJsonText.validate(loaded.root);
      }
    }
  });
});

describe('ElkGraphJsonText.validate', () => {
  it('reports no validator issue for an invalid option value', () => {
    expect(caseById('option-invalid-value').issues).toEqual([]);
    expect(issuesOf(caseById('option-invalid-value').input)).toEqual([]);
  });

  it('reports a map key collision once per collision (the EObjectValidator is registered once)', () => {
    const issues = issuesOf(caseById('dup-property-key').input);
    expect(issues.map((i) => i.line)).toEqual([5, 5, 10, 10]);
    expect(issues.every((i) => i.code === 'org.eclipse.emf.ecore.14')).toBe(true);
  });

  it('adds each linking diagnostic exactly once, at the recorded line and code', () => {
    const issues = issuesOf(caseById('ref-unresolved').input);
    expect(issues).toHaveLength(5);
    expect(issues.every((i) => i.code === CODE_LINKING)).toBe(true);
    expect(issues.map((i) => i.line)).toEqual([6, 7, 8, 8, 8]);
  });

  it('resolves lazily: the live resource has no linking error before validate, and not twice after two calls', () => {
    const loaded = ElkGraphJsonText.load(caseById('ref-unresolved').input);
    expect(loaded.resource.getErrors().size()).toBe(0);
    const first = ElkGraphJsonText.validate(loaded.root as never);
    expect(loaded.resource.getErrors().size()).toBe(5);
    const second = ElkGraphJsonText.validate(loaded.root as never);
    expect(loaded.resource.getErrors().size()).toBe(5);
    expect(second).toEqual(first);
    expect(loaded.errors).toEqual([]);
  });

  it('puts the syntax diagnostics of a partial model first, with the Xtext syntax code', () => {
    const loaded = ElkGraphJsonText.load(caseById('syntax-bad-token').input);
    expect(loaded.root).not.toBeNull();
    const issues = ElkGraphJsonText.validate(loaded.root as never);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe('org.eclipse.xtext.diagnostics.Diagnostic.Syntax');
    expect(issues[0]?.severity).toBe('error');
  });

  it('validates a subtree through its resource: the resource diagnostics keep their lines', () => {
    const loaded = ElkGraphJsonText.load(caseById('ref-unresolved').input);
    const issues = ElkGraphJsonText.validate((loaded.root as ElkNode).getChildren().get(0));
    expect(issues).toHaveLength(5);
    expect(sorted(issues).map((i) => i.line)).toEqual([6, 7, 8, 8, 8]);
    expect(new Set(issues.map((i) => i.code))).toEqual(new Set([CODE_LINKING]));
  });

  it('locates the issues of a graph without node model at line 0', () => {
    const graph = ElkGraphUtil.createGraph();
    const entries = graph.getProperties().entryList();
    for (const value of [1, 2]) {
      const entry = new ElkPropertyToValueMapEntryImpl();
      entry.setKey(new Property<number>('org.example.dup'));
      entry.setValue(value);
      entries.add(entry);
    }
    const issues = ElkGraphJsonText.validate(graph);
    expect(issues.map((i) => [i.line, i.code])).toEqual([[0, 'org.eclipse.emf.ecore.14']]);
  });

  it('validates a graph that was not loaded: no resource diagnostics and no lines', () => {
    const graph = ElkGraphUtil.createGraph();
    ElkGraphUtil.createNode(graph);
    expect(ElkGraphJsonText.validate(graph)).toEqual([]);
  });
});
