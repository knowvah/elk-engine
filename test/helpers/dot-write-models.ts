// SPDX-License-Identifier: EPL-2.0
// The TS twin of tools/vectors/DotWriteVectors/DotWriteModels.java: the table of built models (id -> fresh model
// supplier, in recording order), generated from the same loops and tables as the Java so the ids of the built rows
// of graphviz-dot-write.json line up one to one. Families stmt, value and null live here; autowrap and width in
// dot-write-models-wide.ts.
import { AttributeType } from '../../src/alg/graphviz/dot/dot/AttributeType.js';
import { EdgeOperator } from '../../src/alg/graphviz/dot/dot/EdgeOperator.js';
import { GraphType } from '../../src/alg/graphviz/dot/dot/GraphType.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import {
  a,
  arrow,
  as,
  bareStatement,
  digraph,
  e,
  graph,
  model,
  n,
  node,
  nUnnamed,
  port,
  strict,
  sub,
  targetBoth,
  targetEmpty,
  targetOperatorUnset,
  to,
  toSub,
} from './dot-write-builders.js';
import { addAutowrap, addWidths } from './dot-write-models-wide.js';

/** id -> fresh model supplier. */
export type ModelTable = Map<string, () => GraphvizModel>;

const { DIRECTED, UNDIRECTED } = EdgeOperator;

/** `DotWriteModels.table()`. */
export function dotWriteModels(): ModelTable {
  const t: ModelTable = new Map();
  addStatements(t);
  addValues(t);
  addNulls(t);
  addAutowrap(t);
  addWidths(t);
  return t;
}

// ---- stmt/*: every statement kind and graph option (`Statements`) ----

function allKinds(): GraphvizModel {
  return digraph(
    as(AttributeType.GRAPH, a('rankdir', 'LR')),
    as(AttributeType.NODE, a('shape', 'box')),
    as(AttributeType.EDGE, a('dir', 'none')),
    n('a'),
    n(node('a', port('p', 'n'))),
    n('b', a('label', '"B"'), a('width', '0.5')),
    arrow('a', 'b'),
    e(node('a', null), [], to(UNDIRECTED, node('b', null))),
    a('x', 'y'),
    sub('cluster_0', n('c')),
    sub(null, n('d')),
    e(node('a', null), [a('color', 'red')], toSub(DIRECTED, sub(null, n('e')))),
  );
}

function edgeToSubgraphs(): GraphvizModel {
  return digraph(
    e(
      node('a', null),
      [a('label', '"chain"')],
      toSub(DIRECTED, sub('s', n('b'), n('c'))),
      toSub(DIRECTED, sub(null, n('d'))),
      to(DIRECTED, node('e', null)),
    ),
  );
}

function ports(): GraphvizModel {
  return digraph(
    n(node('a', port('n', null))),
    n(node('a', port('p', 'ne'))),
    n(node('a', port('"port name"', 's'))),
    n(node('a', port('1', '_'))),
    e(node('a', port('p', 'c')), [], to(DIRECTED, node('b', port('q', 'sw')))),
  );
}

function exporterShape(): GraphvizModel {
  return digraph(
    as(AttributeType.GRAPH, a('compound', 'true')),
    as(AttributeType.NODE, a('shape', 'box'), a('fixedsize', 'true')),
    as(AttributeType.EDGE, a('dir', 'none')),
    n('node1', a('width', '"0.4166666666666667"'), a('height', '"0.2777777777777778"'), a('label', '"n1"')),
    n('node2', a('width', '"0.4166666666666667"'), a('height', '"0.2777777777777778"')),
    arrow('node1', 'node2', a('comment', '"e1"'), a('pos', '"10.0,20.0 30.0,40.0"')),
  );
}

const STATEMENTS: ReadonlyArray<readonly [string, () => GraphvizModel]> = [
  ['all-kinds', allKinds],
  ['strict-graph', () => model(strict(graph(GraphType.GRAPH, 'g', n('a'))))],
  ['strict-digraph-unnamed', () => model(strict(graph(GraphType.DIGRAPH, null)))],
  ['unnamed-graph', () => model(graph(GraphType.GRAPH, null, n('a')))],
  ['two-graphs', () => model(graph(GraphType.GRAPH, 'A', n('a')), graph(GraphType.DIGRAPH, 'B', n('b')))],
  [
    'undirected-chain',
    () =>
      model(
        graph(
          GraphType.GRAPH,
          'g',
          e(node('a', null), [], to(UNDIRECTED, node('b', null)), to(UNDIRECTED, node('c', null))),
        ),
      ),
  ],
  [
    'mixed-operators',
    () => digraph(e(node('a', null), [], to(DIRECTED, node('b', null)), to(UNDIRECTED, node('c', null)))),
  ],
  ['edge-to-subgraphs', edgeToSubgraphs],
  ['ports', ports],
  [
    'nested-subgraphs',
    () =>
      digraph(
        sub(
          'cluster_0',
          sub('cluster_1', sub(null, n('a'), arrow('a', 'b')), n('c')),
          as(AttributeType.GRAPH, a('label', 'x')),
        ),
      ),
  ],
  [
    'attribute-types',
    () =>
      digraph(
        as(AttributeType.GRAPH, a('rankdir', 'LR')),
        as(AttributeType.NODE, a('shape', 'box'), a('fixedsize', 'true')),
        as(AttributeType.EDGE, a('dir', 'none')),
      ),
  ],
  ['exporter-shape', exporterShape],
];

function addStatements(t: ModelTable): void {
  for (const [name, build] of STATEMENTS) t.set(`built/stmt/${name}`, build);
}

// ---- value/<position>/<label>: one model per value in one position (`Values`) ----

/** `Values.VALUES`: DotID values. */
export const VALUES: ReadonlyArray<readonly [string, string]> = [
  ['plain', 'a'],
  ['space', 'a b'],
  ['float', '1.5'],
  ['negative-int', '-3'],
  ['leading-zero', '007'],
  ['negative-zero', '-0'],
  ['dot-float', '.5'],
  ['trailing-dot', '1.'],
  ['quoted', '"quoted"'],
  ['quoted-empty', '""'],
  ['empty', ''],
  ['keyword-node', 'node'],
  ['keyword-graph', 'graph'],
  ['keyword-strict', 'strict'],
  ['keyword-subgraph', 'subgraph'],
  ['keyword-case', 'Graph'],
  ['quoted-escaped-quote', '"a\\"b"'],
  ['bare-quote', 'a"b'],
  ['quoted-newline', '"line\nbreak"'],
  ['bare-newline', 'line\nbreak'],
  ['caret', '^a'],
  ['minus', '-'],
  ['non-ascii', 'café'],
  ['html', '<b>x</b>'],
  ['unterminated', '"open'],
  ['semicolon', 'a;b'],
  ['equals', 'a=b'],
  ['brace', '{'],
  ['comment', '/* c */'],
  ['hash', '# x'],
  ['line-comment', '// x'],
  ['hyphenated', 'a-b'],
  ['arrow', 'a->b'],
  ['underscore', '_'],
  ['tab', 'a\tb'],
];

/** `Values.ID_VALUES`: ID values. */
export const ID_VALUES: ReadonlyArray<readonly [string, string]> = [
  ['plain', 'cluster_0'],
  ['compass', 'ne'],
  ['underscore', '_'],
  ['keyword-node', 'node'],
  ['keyword-subgraph', 'subgraph'],
  ['keyword-case', 'Node'],
  ['space', 'a b'],
  ['int', '1'],
  ['quoted', '"q"'],
  ['caret', '^x'],
  ['empty', ''],
  ['non-ascii', 'café'],
];

function addValues(t: ModelTable): void {
  for (const [label, x] of VALUES) {
    t.set(`built/value/graph-name/${label}`, () => model(graph(GraphType.DIGRAPH, x, n('a'))));
    t.set(`built/value/node-name/${label}`, () => digraph(n(x)));
    t.set(`built/value/port-name/${label}`, () => digraph(n(node('a', port(x, null)))));
    t.set(`built/value/attribute-name/${label}`, () => digraph(n('a', a(x, 'v'))));
    t.set(`built/value/attribute-value/${label}`, () => digraph(n('a', a('label', x))));
    t.set(`built/value/statement-value/${label}`, () => digraph(a('label', x)));
  }
  for (const [label, x] of ID_VALUES) {
    t.set(`built/value/subgraph-name/${label}`, () => digraph(sub(x, n('a'))));
    t.set(`built/value/compass/${label}`, () => digraph(n(node('a', port('p', x)))));
  }
}

// ---- null/*: null or unset features, empty lists (`Nulls`) ----

const NULLS: ReadonlyArray<readonly [string, () => GraphvizModel]> = [
  ['empty-model', () => model()],
  ['empty-graph', () => model(graph(GraphType.GRAPH, null))],
  ['empty-digraph-named', () => model(graph(GraphType.DIGRAPH, 'G'))],
  ['list-attribute-without-value', () => digraph(n('a', a('fixedsize', null)))],
  ['list-attributes-mixed-values', () => digraph(n('a', a('x', null), a('y', '1'), a('z', null)))],
  ['statement-attribute-without-value', () => digraph(a('x', null))],
  ['attribute-without-name', () => digraph(n('a', a(null, 'v')))],
  ['statement-attribute-without-name', () => digraph(a(null, 'v'))],
  ['node-without-name', () => digraph(nUnnamed())],
  ['node-statement-without-node', () => digraph(n(null))],
  ['port-without-compass', () => digraph(n(node('a', port('p', null))))],
  ['port-without-name', () => digraph(n(node('a', port(null, 'n'))))],
  ['subgraph-without-name', () => digraph(sub(null, n('a')))],
  ['empty-subgraph', () => digraph(sub(null))],
  ['empty-named-subgraph', () => digraph(sub('s'))],
  ['empty-attribute-statement', () => digraph(as(AttributeType.NODE))],
  ['attribute-statement-type-unset', () => digraph(as(null, a('x', '1')))],
  ['edge-without-targets', () => digraph(e(node('a', null), []))],
  ['edge-without-source', () => digraph(e(null, [], to(DIRECTED, node('b', null))))],
  ['edge-target-empty', () => digraph(e(node('a', null), [], targetEmpty()))],
  ['edge-target-both', () => digraph(e(node('a', null), [], targetBoth()))],
  ['edge-operator-unset', () => digraph(e(node('a', null), [], targetOperatorUnset()))],
  ['bare-statement', () => digraph(bareStatement())],
];

function addNulls(t: ModelTable): void {
  for (const [name, build] of NULLS) t.set(`built/null/${name}`, build);
}
