// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ElkGraphValueConverterService } from '../conversion/ElkGraphValueConverterService.js';
import { resolveModelsDir } from '../../../../test/corpus/corpus.js';
import { isCoverageRun } from '../../../../test/helpers/coverage-run.js';
import type { ElkEdge } from '../../ElkEdge.js';
import type { ElkLabel } from '../../ElkLabel.js';
import type { ElkNode } from '../../ElkNode.js';
import { parse } from './ElkGraphParser.js';
import type { ParseResult } from './ParseRecords.js';

const MODEL_RELATIVE_PATH = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt';
const BUDGET_MS = 500;
const INSTRUMENTED_BUDGET_MS = 2000;
const RUNS = 5;

const SERVICES = new ElkGraphValueConverterService();

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

function root(text: string): ElkNode {
  const result = run(text);
  expect(result.diagnostics).toEqual([]);
  return result.root as ElkNode;
}

function geometry(n: ElkNode): number[] {
  return [n.getX(), n.getY(), n.getWidth(), n.getHeight()];
}

describe('ElkGraphParser: shape layout', () => {
  it('accepts position and size in either order with equal geometry', () => {
    const a = geometry(root('layout [ position: 1, 2 size: 3, 4 ]'));
    const b = geometry(root('layout [ size: 3, 4 position: 1, 2 ]'));
    expect(a).toEqual(b);
    expect(a).toEqual([1, 2, 3, 4]);
  });

  it('accepts either member alone and the empty group', () => {
    expect(root('layout [ size: 3, 4 ]').getWidth()).toBe(3);
    expect(root('layout [ position: 1, 2 ]').getY()).toBe(2);
    expect(root('layout [ ]').getX()).toBe(0);
  });

  it.each(['layout [ position: 1, 2 position: 3, 4 ]', 'layout [ size: 1, 2 size: 3, 4 ]'])(
    'rejects a repeated member: %s',
    (text) => {
      expect(run(text).diagnostics.map((d) => d.kind)).toEqual(['syntax']);
    },
  );

  it('rejects a layout after a property and a property after a child', () => {
    expect(run('a: 1 layout [ ]').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
    expect(run('node a b: 1').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
  });
});

describe('ElkGraphParser: grammar entry points', () => {
  it('gives a root with only `graph g` the identifier g', () => {
    const node = root('graph g');
    expect(node.getIdentifier()).toBe('g');
    expect([...node.getChildren()]).toHaveLength(0);
  });

  it('gives an empty text and a comment-only text a bare root', () => {
    expect(root('').getIdentifier()).toBeNull();
    expect(root('// nothing\n/* here */').getIdentifier()).toBeNull();
  });

  it('parses nested nodes, ports, labels (with ids) and edges in source order', () => {
    const node = root(
      'node a { port p { label "pl" } label l1: "x" { label "inner" } node b edge e: b -> p, a.b { label "el" } }',
    );
    const a = [...node.getChildren()][0] as ElkNode;
    expect([...a.getPorts()].map((p) => p.getIdentifier())).toEqual(['p']);
    expect([...a.getLabels()].map((l) => [l.getIdentifier(), l.getText()])).toEqual([['l1', 'x']]);
    expect([...([...a.getContainedEdges()][0] as ElkEdge).getLabels()].map((l) => l.getText())).toEqual(['el']);
    expect([...([...a.getLabels()][0] as ElkLabel).getLabels()].map((l) => l.getText())).toEqual(['inner']);
    expect([...a.getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['e']);
  });

  it('decides the edge identifier by the ID COLON lookahead', () => {
    const result = run('node a edge e1: a -> a edge a.b -> a edge x , y -> z');
    expect(result.diagnostics).toEqual([]);
    expect([...(result.root as ElkNode).getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['e1', null, null]);
    expect(result.references.map((r) => `${r.feature}${r.index}:${r.text}`)).toEqual([
      'sources0:a',
      'targets0:a',
      'sources0:a.b',
      'targets0:a',
      'sources0:x',
      'sources1:y',
      'targets0:z',
    ]);
  });

  it('reports unexpected tokens at the top level and at end of input', () => {
    expect(run('}').diagnostics[0]?.line).toBe(1);
    expect(run('node a {').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
    expect(run('edge a ->').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
    expect(run('x: ').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
  });

  it('reports a lexer error once as a syntax error even when parsing succeeds', () => {
    const result = run('node a\n/* unterminated');
    expect(result.diagnostics).toEqual([
      { kind: 'syntax', message: 'The lexer could not tokenize the input.', line: 2 },
    ]);
    expect(run('node a $').diagnostics.map((d) => d.kind)).toEqual(['syntax']);
  });
});

describe('ElkGraphParser: properties and PropertyKey hidden()', () => {
  const keys = (text: string): string[] => [...root(text).getProperties().entryList()].map((e) => e.getKey().getId());

  it('keeps both entries of a duplicate key, in order', () => {
    const entries = [...root('a.b: 1 a.b: 2').getProperties().entryList()];
    expect(entries.map((e) => String(e.getValue()))).toEqual(['1', '2']);
  });

  it.each([['a .b: 1'], ['a. b: 1'], ['a /* c */ .b: 1'], ['a./* c */b: 1'], ['a.: 1'], ['a.node: 1']])(
    'ends the key at a hidden token or a bad segment: %s',
    (text) => {
      expect(run(text).diagnostics.map((d) => d.kind)).toEqual(['syntax']);
    },
  );

  it('joins contiguous segments including escaped ones', () => {
    expect(keys('foo.bar.baz: 1')).toEqual(['foo.bar.baz']);
    expect(keys('^node.x: 1')).toEqual(['^node.x']);
  });

  it('chooses the value alternative by token type', () => {
    const values = [
      ...root('a: "s" b: x.y c: 1.5 d: true e: false f: null g: -2 h: x . y').getProperties().entryList(),
    ].map((e) => e.getValue());
    expect(values.map((v) => (v === null ? null : (v as { toString(): string }).toString()))).toEqual([
      's',
      'x.y',
      '1.5',
      'true',
      'false',
      null,
      '-2',
      'x.y',
    ]);
  });

  it('rejects a keyword and a missing value', () => {
    expect(run('a: node').diagnostics[0]?.kind).toBe('syntax');
    expect(run('a: ,').diagnostics[0]?.kind).toBe('syntax');
  });
});

describe('ElkGraphParser performance', () => {
  const models = resolveModelsDir();
  const skipReason = 'skip' in models ? models.skip : '';
  it.skipIf(skipReason !== '')(
    `parses the 253 KB Trilateration model in under ${BUDGET_MS} ms${skipReason === '' ? '' : ` (skipped: ${skipReason})`}`,
    () => {
      const modelText = readFileSync(path.join((models as { dir: string }).dir, MODEL_RELATIVE_PATH), 'utf8');
      const durations: number[] = [];
      let last: ParseResult | null = null;
      for (let i = 0; i < RUNS; i++) {
        const start = performance.now();
        last = run(modelText);
        durations.push(performance.now() - start);
      }
      const median = [...durations].sort((a, b) => a - b)[Math.floor(RUNS / 2)] as number;
      expect(last?.diagnostics).toEqual([]);
      expect(median).toBeLessThan(isCoverageRun() ? INSTRUMENTED_BUDGET_MS : BUDGET_MS);
    },
  );
});
