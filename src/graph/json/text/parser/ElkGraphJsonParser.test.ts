// SPDX-License-Identifier: EPL-2.0

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { resolveModelsDir } from '../../../../../test/corpus/corpus.js';
import { isCoverageRun } from '../../../../../test/helpers/coverage-run.js';
import type { ElkEdge } from '../../../ElkEdge.js';
import type { ElkNode } from '../../../ElkNode.js';
import { ElkGraphJsonValueConverterService } from '../conversion/ElkGraphJsonValueConverterService.js';
import { parse } from './ElkGraphJsonParser.js';
import type { ParseResult } from './ElkGraphJsonRecords.js';

const SERVICES = new ElkGraphJsonValueConverterService();
const MODEL_RELATIVE_PATH = 'realworld/ptolemy/hierarchical/de_trilateration_Trilateration.json';
const BUDGET_MS = 1000;
const INSTRUMENTED_BUDGET_MS = 4000;
const RUNS = 3;
const GENERATED_NODES = 4000;
const SYNTAX = 'syntax';

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

function run(text: string): ParseResult {
  return parse(text, SERVICES);
}

/** The parse of a document that must be free of diagnostics. */
function clean(text: string): ElkNode {
  const result = run(text);
  expect(result.diagnostics).toEqual([]);
  return result.root as ElkNode;
}

function syntaxErrors(text: string): number {
  return run(text).diagnostics.filter((d) => d.kind === SYNTAX).length;
}

describe('ElkGraphJsonParser: ElkNode', () => {
  it('accepts an empty object and one holding only a comma', () => {
    expect(clean('{}').getChildren().size()).toBe(0);
    expect(clean('{ , }').getChildren().size()).toBe(0);
  });

  it('accepts a trailing comma after the last element but not a second comma', () => {
    expect(clean('{ "id": "a", }').getIdentifier()).toBe('a');
    expect(syntaxErrors('{ "id": "a", , }')).toBe(1);
    expect(syntaxErrors('{ , , }')).toBe(1);
  });

  it('requires the comma between elements', () => {
    expect(syntaxErrors('{ "id": "a" "x": 1 }')).toBe(1);
  });

  it('reads id and the four shape members in any order and spelling', () => {
    const node = clean(`{ 'height': 4, width: 3, "y": 2.5, x: -1e1, id: "r" }`);
    expect([node.getIdentifier(), node.getX(), node.getY(), node.getWidth(), node.getHeight()]).toEqual([
      'r',
      -10,
      2.5,
      3,
      4,
    ]);
  });

  it('appends children, ports, labels and edges in source order', () => {
    const node = clean(
      `{ children: [ { id: "c1" }, { id: "c2" } ], ports: [ { id: "p" } ], labels: [ { text: "t" } ],
         edges: [ { id: "e", sources: ["c1"], targets: ["c2"] } ] }`,
    );
    expect([...node.getChildren()].map((c) => c.getIdentifier())).toEqual(['c1', 'c2']);
    expect([...node.getPorts()].map((p) => p.getIdentifier())).toEqual(['p']);
    expect([...node.getLabels()].map((l) => l.getText())).toEqual(['t']);
    expect([...node.getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['e']);
  });

  it('accepts empty and comma-terminated lists', () => {
    expect(clean('{ children: [], ports: [ , ], labels: [ ], edges: [ , ] }').getChildren().size()).toBe(0);
    expect(clean('{ children: [ { id: "a" }, ] }').getChildren().size()).toBe(1);
    expect(syntaxErrors('{ children: [ , , ] }')).toBe(1);
  });

  it('rejects text, sources and targets as node members', () => {
    for (const key of ['text', 'sources', 'targets']) {
      expect(syntaxErrors(`{ ${key}: "a" }`)).toBe(1);
    }
  });

  it('reports the extra token after the root object', () => {
    const result = run('{ } }');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.kind).toBe(SYNTAX);
  });

  it('yields an empty root and a syntax error for an empty file', () => {
    const result = run('');
    expect(result.root?.getChildren().size()).toBe(0);
    expect(result.diagnostics.map((d) => [d.kind, d.line])).toEqual([[SYNTAX, 1]]);
  });
});

describe('ElkGraphJsonParser: ElkPort, ElkLabel and ElkEdge', () => {
  it('requires one element in a port, a label and an edge', () => {
    expect(syntaxErrors('{ ports: [ { } ] }')).toBe(1);
    expect(syntaxErrors('{ labels: [ { } ] }')).toBe(1);
    expect(syntaxErrors('{ edges: [ { } ] }')).toBe(1);
    expect(syntaxErrors('{ ports: [ { , } ] }')).toBe(1);
  });

  it('accepts a trailing comma in each of them', () => {
    const node = clean('{ ports: [ { id: "p", } ], labels: [ { id: "l", } ], edges: [ { id: "e", } ] }');
    expect([...node.getPorts()].map((p) => p.getIdentifier())).toEqual(['p']);
    expect([...node.getLabels()].map((l) => l.getIdentifier())).toEqual(['l']);
    expect([...node.getContainedEdges()].map((e) => e.getIdentifier())).toEqual(['e']);
  });

  it('gives a port shape members, labels and layout options but no children', () => {
    const node = clean('{ ports: [ { id: "p", x: 1, y: 2, width: 3, height: 4, labels: [ { text: "q" } ] } ] }');
    const port = [...node.getPorts()][0];
    expect([port?.getX(), port?.getY(), port?.getWidth(), port?.getHeight()]).toEqual([1, 2, 3, 4]);
    expect([...(port?.getLabels() ?? [])].map((l) => l.getText())).toEqual(['q']);
    expect(syntaxErrors('{ ports: [ { children: [] } ] }')).toBe(1);
    expect(syntaxErrors('{ ports: [ { text: "t" } ] }')).toBe(1);
  });

  it('gives a label text, shape members, nested labels and layout options', () => {
    const node = clean(
      '{ labels: [ { id: "l", text: "t", x: 1, labels: [ { text: "inner" } ], layoutOptions: {} } ] }',
    );
    const label = [...node.getLabels()][0];
    expect([label?.getIdentifier(), label?.getText(), label?.getX()]).toEqual(['l', 't', 1]);
    expect([...(label?.getLabels() ?? [])].map((l) => l.getText())).toEqual(['inner']);
    expect(syntaxErrors('{ labels: [ { text: 5 } ] }')).toBe(1);
  });

  it('keeps shape members out of an edge', () => {
    for (const key of ['x', 'y', 'width', 'height', 'text', 'children', 'ports', 'edges']) {
      expect(syntaxErrors(`{ edges: [ { ${key}: 1 } ] }`)).toBe(1);
    }
  });

  it('records one reference per source and target with the raw token text, line and list index', () => {
    const result = run('{\n edges: [ { sources: [\n"a", \'b\' ],\n targets: ["c"] } ] }');
    expect(result.diagnostics).toEqual([]);
    const edge = [...(result.root as ElkNode).getContainedEdges()][0];
    expect(result.references.map((r) => [r.owner, r.feature, r.index, r.ruleName, r.text, r.line])).toEqual([
      [edge, 'sources', 0, 'STRING', '"a"', 3],
      [edge, 'sources', 1, 'STRING', "'b'", 3],
      [edge, 'targets', 0, 'STRING', '"c"', 4],
    ]);
    expect(edge?.getSources().size()).toBe(0);
    expect(edge?.getTargets().size()).toBe(0);
  });

  it('continues the list index when a key repeats and counts edges apart', () => {
    const result = run('{ edges: [ { sources: ["a"], sources: ["b", "c"] }, { sources: ["d"] } ] }');
    expect(result.references.map((r) => [r.text, r.index])).toEqual([
      ['"a"', 0],
      ['"b"', 1],
      ['"c"', 2],
      ['"d"', 0],
    ]);
  });

  it('requires a string for each reference', () => {
    for (const reference of ['a', '1', '{}', 'null']) {
      expect(syntaxErrors(`{ edges: [ { sources: [${reference}] } ] }`)).toBe(1);
    }
  });
});

describe('ElkGraphJsonParser: Property', () => {
  const OPTION = 'org.eclipse.elk.priority';

  function entries(text: string): Array<[string, unknown]> {
    return [...clean(text).getProperties().entryList()].map((e) => [e.getKey().getId(), e.getValue()]);
  }

  it('reads string, number and boolean values for quoted and bare keys', () => {
    expect(entries(`{ layoutOptions: { "${OPTION}": 3, bare: "val" } }`)).toHaveLength(2);
    expect(entries(`{ properties: { "${OPTION}": 3 } }`)).toEqual([[OPTION, 3]]);
    expect(entries(`{ layoutOptions: { 'org.eclipse.elk.separateConnectedComponents': true } }`)[0]?.[1]).toBe(true);
  });

  it('keeps both entries of a duplicate key in source order', () => {
    expect(entries(`{ layoutOptions: { "${OPTION}": 1, "${OPTION}": 2 } }`)).toEqual([
      [OPTION, 1],
      [OPTION, 2],
    ]);
  });

  it('keeps the quotes of an unknown key', () => {
    expect(entries(`{ layoutOptions: { "custom.key": 1 } }`)[0]?.[0]).toBe('"custom.key"');
  });

  it('rejects a null value, a missing value, and an object or array value', () => {
    for (const value of ['null', '', '{}', '[]']) {
      expect(syntaxErrors(`{ layoutOptions: { "k": ${value} } }`)).toBe(1);
    }
  });

  it('rejects a key that is a number, a keyword or a bare dotted name', () => {
    for (const key of ['1', 'true', 'id', 'a.b']) {
      expect(syntaxErrors(`{ layoutOptions: { ${key}: 1 } }`)).toBe(1);
    }
  });

  it('requires the layout options to be an object', () => {
    expect(syntaxErrors('{ layoutOptions: [] }')).toBe(1);
    expect(clean('{ layoutOptions: { } }').getProperties().size()).toBe(0);
    expect(clean('{ layoutOptions: { , } }').getProperties().size()).toBe(0);
  });

  it('holds properties of every kind of element', () => {
    const node = clean(
      `{ layoutOptions: { "${OPTION}": 1 }, labels: [ { text: "t", layoutOptions: { "${OPTION}": 2 } } ],
         ports: [ { id: "p", layoutOptions: { "${OPTION}": 3 } } ],
         edges: [ { id: "e", layoutOptions: { "${OPTION}": 4 } } ] }`,
    );
    expect(node.getProperties().size()).toBe(1);
    expect([...node.getLabels()][0]?.getProperties().size()).toBe(1);
    expect([...node.getPorts()][0]?.getProperties().size()).toBe(1);
    expect([...node.getContainedEdges()][0]?.getProperties().size()).toBe(1);
  });
});

describe('ElkGraphJsonParser: JsonMember, JsonValue', () => {
  it('parses and discards unknown members of every value kind', () => {
    const node = clean(
      `{ "a": "s", b: 1, 'c': -2.5e3, "d": true, "e": false, "f": null, "g": { "h": [1, {"i": []}, ], }, "j": [ ],
         "k": [ , ], "l": { , }, id: "kept" }`,
    );
    expect(node.getIdentifier()).toBe('kept');
  });

  it('accepts unknown members in a port, label and edge', () => {
    expect(clean('{ ports: [ { "u": 1 } ], labels: [ { "u": [] } ], edges: [ { "u": {} } ] }').getPorts().size()).toBe(
      1,
    );
  });

  it('rejects a member without colon, value or a proper name', () => {
    for (const member of ['"a" 1', '"a":', '1: 2', '{}: 1', '"a": ]', '"a": :', '"a": +', '"a": "id"', '"a": x']) {
      expect(syntaxErrors(`{ ${member} }`), member).toBe(1);
    }
  });

  it('rejects a value that is a bare word or an unclosed container', () => {
    expect(syntaxErrors('{ "a": [ 1 }')).toBe(1);
    expect(syntaxErrors('{ "a": { "b": 1 ] }')).toBe(1);
    expect(syntaxErrors('{ "a": [ , , ] }')).toBe(1);
  });

  it('never converts the value of an unknown member', () => {
    expect(run('{ "a": 1e400, "b": "\\q" }').diagnostics).toEqual([]);
  });
});

describe('ElkGraphJsonParser: conversion diagnostics and recovery', () => {
  const MISSING_NUMBER = 'Cannot convert empty string to a double value.';

  it('converts a missing number before a comma or closing brace and goes on', () => {
    const result = run('{\n"x": ,\n"y": 1 }');
    expect(result.diagnostics).toEqual([{ kind: 'conversion', message: MISSING_NUMBER, line: 2 }]);
    expect((result.root as ElkNode).getY()).toBe(1);
    expect(run('{ "width": }').diagnostics.map((d) => d.message)).toEqual([MISSING_NUMBER]);
  });

  it('stops at a missing number that nothing in the grammar can follow', () => {
    expect(syntaxErrors('{ "x": ] }')).toBe(1);
    expect(syntaxErrors('{ "x": "a" }')).toBe(1);
  });

  it('reports invalid escapes of an id and a text', () => {
    const result = run('{ id: "a\\qb", labels: [ { text: "\\q" } ] }');
    expect(result.diagnostics.map((d) => d.kind)).toEqual(['conversion', 'conversion']);
  });

  it('records a syntax error with the line of the offending token and stops', () => {
    const result = run('{\n "id": "a",\n "x": ]\n, "id": "b" }');
    expect(result.diagnostics.map((d) => [d.kind, d.line])).toEqual([[SYNTAX, 3]]);
    expect((result.root as ElkNode).getIdentifier()).toBe('a');
  });

  it('reports a lexer error even where the parser accepts the tokens', () => {
    const result = run('{ "id": "a" } \u0000');
    expect(result.diagnostics.some((d) => d.kind === SYNTAX)).toBe(true);
  });

  it('lets a failure that is no syntax error escape, as a nesting beyond the call stack', () => {
    const deep = `{ "a": ${'['.repeat(200_000)}`;
    expect(() => run(deep)).toThrow(RangeError);
  });

  it('reports an unterminated string', () => {
    expect(syntaxErrors('{ "id": "abc }')).toBeGreaterThan(0);
  });
});

describe('ElkGraphJsonParser: positions', () => {
  it('records the start line of every object and the containment slot of each child', () => {
    const result = run('{\n children: [\n {id: "a"},\n {id: "b"} ] }');
    const root = result.root as ElkNode;
    const [a, b] = [...root.getChildren()];
    expect(result.positions.objectStartLine(root)).toBe(1);
    expect([a, b].map((c) => result.positions.objectStartLine(c as ElkNode))).toEqual([3, 4]);
    expect([a, b].map((c) => result.positions.containingSlot(c as ElkNode).index)).toEqual([0, 1]);
    expect(result.positions.containingSlot(a as ElkNode).feature.getName()).toBe('children');
  });

  it('records the feature lines of assignments', () => {
    const result = run('{\n"id": "a",\n"x": 1 }');
    const root = result.root as ElkNode;
    expect(result.positions.featureStartLines(root, 'identifier')).toEqual([2]);
    expect(result.positions.featureStartLines(root, 'x')).toEqual([3]);
  });

  it('serves the reference nodes of an edge from the node model', () => {
    const result = run('{ edges: [ { sources: ["a"], targets: ["b"] } ] }');
    const edge = [...(result.root as ElkNode).getContainedEdges()][0];
    expect(result.nodeModel.getCrossReferenceNodes(edge as ElkEdge)?.map((n) => n.getText())).toEqual(['"a"', '"b"']);
  });
});

describe('ElkGraphJsonParser performance', () => {
  const models = resolveModelsDir();
  const skipReason = 'skip' in models ? models.skip : '';
  const budget = isCoverageRun() ? INSTRUMENTED_BUDGET_MS : BUDGET_MS;

  function bestOf(text: string): number {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now();
      run(text);
      best = Math.min(best, performance.now() - start);
    }
    return best;
  }

  it.skipIf(skipReason !== '')(
    `parses the 712 KB Trilateration .json as .elkj in under ${BUDGET_MS} ms${skipReason === '' ? '' : ` (skipped: ${skipReason})`}`,
    () => {
      const text = readFileSync(path.join((models as { dir: string }).dir, MODEL_RELATIVE_PATH), 'utf8');
      expect(bestOf(text)).toBeLessThan(budget);
    },
  );

  it(`parses a generated valid document of ${GENERATED_NODES} nodes and edges in under ${BUDGET_MS} ms`, () => {
    const nodes = Array.from(
      { length: GENERATED_NODES },
      (_v, i) => `{ id: "n${i}", x: ${i}, y: 1.5, width: 10, height: 10, layoutOptions: { "k": ${i} } }`,
    );
    const edges = Array.from(
      { length: GENERATED_NODES },
      (_v, i) => `{ id: "e${i}", sources: ["n${i}"], targets: ["n${(i + 1) % GENERATED_NODES}"] }`,
    );
    const text = `{ id: "root", children: [ ${nodes.join(',')} ], edges: [ ${edges.join(',')} ] }`;
    expect(clean(text).getChildren().size()).toBe(GENERATED_NODES);
    expect(bestOf(text)).toBeLessThan(budget);
  });
});
