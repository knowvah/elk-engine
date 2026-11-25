// SPDX-License-Identifier: EPL-2.0
// The autowrap/* and width/* families of tools/vectors/DotWriteVectors/DotWriteModels.java (`Autowrap`, `Widths`):
// statements whose single-line form exceeds the 255-character line width of GraphvizDotSerializer, and sweeps
// around that boundary. Part of the built-model table of dot-write-models.ts.
import type { Attribute } from '../../src/alg/graphviz/dot/dot/Attribute.js';
import { AttributeType } from '../../src/alg/graphviz/dot/dot/AttributeType.js';
import { EdgeOperator } from '../../src/alg/graphviz/dot/dot/EdgeOperator.js';
import type { EdgeStatement } from '../../src/alg/graphviz/dot/dot/EdgeStatement.js';
import type { EdgeTarget } from '../../src/alg/graphviz/dot/dot/EdgeTarget.js';
import { GraphType } from '../../src/alg/graphviz/dot/dot/GraphType.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import type { Statement } from '../../src/alg/graphviz/dot/dot/Statement.js';
import { toString as doubleToString } from '../../src/java/lang/DoubleToString.js';
import {
  a,
  arrow,
  as,
  attrs,
  digraph,
  e,
  graph,
  model,
  n,
  node,
  pad,
  port,
  repeat,
  sub,
  to,
  toSub,
} from './dot-write-builders.js';

type ModelTable = Map<string, () => GraphvizModel>;

const quoted = (text: string): string => `"${text}"`;

/** `Autowrap.chain(length, attributes...)`: `n00 -> n01 -> ... -> n<length-1>`. */
function chain(length: number, ...attributes: Attribute[]): EdgeStatement {
  const targets: EdgeTarget[] = [];
  for (let i = 1; i < length; i++) {
    targets.push(to(EdgeOperator.DIRECTED, node(`n${pad(i, 2)}`, null)));
  }
  return e(node('n00', null), attributes, ...targets);
}

/** `Autowrap.nested()`: five nested clusters, each with a long node statement. */
function nested(): GraphvizModel {
  let inner: Statement = n('deep', ...attrs('d', 30, (i) => quoted(String(i))));
  for (let level = 4; level >= 0; level--) {
    inner = sub(`cluster_${level}`, n(`n${level}`, ...attrs('a', 25, (i) => `v${i}`)), inner);
  }
  return digraph(inner);
}

/** `Autowrap.subgraphTargets()`: six subgraph targets of eight nodes each. */
function subgraphTargets(): GraphvizModel {
  const targets: EdgeTarget[] = [];
  for (let i = 0; i < 6; i++) {
    const nodes: Statement[] = [];
    for (let j = 0; j < 8; j++) {
      nodes.push(n(`node_${i}_${j}`));
    }
    targets.push(toSub(EdgeOperator.DIRECTED, sub(null, ...nodes)));
  }
  return digraph(e(node('src', null), [], ...targets));
}

/** `Autowrap.exporterPos()`: a `pos` value as `DotExporter` writes it (Java `StringBuilder.append(double)`). */
function exporterPos(): GraphvizModel {
  let pos = '"';
  for (let i = 0; i < 40; i++) {
    pos += `${i === 0 ? '' : ' '}${doubleToString(10.5 + i * 3.25)},${doubleToString(20.0 + i * 7.125)}`;
  }
  return digraph(arrow('node1', 'node2', a('comment', '"e1"'), a('pos', `${pos}"`)));
}

const AUTOWRAP: ReadonlyArray<readonly [string, () => GraphvizModel]> = [
  ['long-quoted-value-no-break', () => digraph(n('a', a('label', quoted(repeat('x', 300)))))],
  ['long-quoted-value-with-spaces', () => digraph(n('a', a('label', quoted(repeat('word ', 80).trim()))))],
  ['long-bare-value', () => digraph(n('a', a('label', repeat('y', 300))))],
  ['many-attributes', () => digraph(n('a', ...attrs('attr', 40, (i) => `value${i}`)))],
  ['many-quoted-attributes', () => digraph(n('a', ...attrs('k', 30, (i) => quoted(`quoted value ${i}`))))],
];

const CHAINS: ReadonlyArray<readonly [string, () => GraphvizModel]> = [
  ['long-edge-chain', () => digraph(chain(80))],
  ['edge-chain-with-attributes', () => digraph(chain(30, ...attrs('e', 20, (i) => quoted(`v${i}`))))],
  ['nested-subgraphs', nested],
  ['long-attribute-statement', () => digraph(as(AttributeType.GRAPH, ...attrs('g', 40, (i) => quoted(String(i)))))],
  ['long-graph-name', () => model(graph(GraphType.DIGRAPH, quoted(repeat('n', 300)), n('a')))],
  ['two-long-tokens', () => digraph(n(repeat('p', 200), a('label', quoted(repeat('q', 200)))))],
  ['long-token-after-short', () => digraph(n('a', a('w', '1'), a('label', quoted(repeat('z', 260))), a('h', '2')))],
  ['subgraph-chain-targets', subgraphTargets],
  [
    'two-long-graphs',
    () =>
      model(
        graph(GraphType.DIGRAPH, 'A', n('a', ...attrs('a', 30, (i) => `x${i}`))),
        graph(GraphType.GRAPH, 'B', n('b', ...attrs('b', 30, (i) => `y${i}`))),
      ),
  ],
  ['exporter-edge-pos', exporterPos],
  [
    'long-port-names',
    () =>
      digraph(
        e(
          node('a', port(repeat('s', 140), 'n')),
          [],
          to(EdgeOperator.DIRECTED, node('b', port(repeat('t', 140), 's'))),
        ),
      ),
  ],
  ['statement-attribute', () => digraph(a('label', quoted(repeat('w', 280))))],
  ['three-wraps', () => digraph(n('a', ...attrs('long_attribute_', 60, (i) => `v${i}`)))],
];

/** `Autowrap.add` then `Autowrap.addChains`. */
export function addAutowrap(t: ModelTable): void {
  for (const [name, build] of [...AUTOWRAP, ...CHAINS]) t.set(`built/autowrap/${name}`, build);
}

/** `Widths.spaced(k)`: k characters `x x x ...` (a space every other character). */
function spaced(k: number): string {
  return Array.from({ length: k }, (_, i) => (i % 2 === 0 ? 'x' : ' ')).join('');
}

const WIDTH_SHAPES: ReadonlyArray<readonly [string, (k: number, x: string) => GraphvizModel]> = [
  ['node-label', (_k, x) => digraph(n('n', a('label', x)))],
  ['statement-value', (_k, x) => digraph(a('label', x))],
  ['nested3', (_k, x) => digraph(sub('s1', sub('s2', n('n', a('label', x)))))],
  ['spaced', (k) => digraph(n('n', a('label', quoted(spaced(k)))))],
  ['two-attributes', (k) => digraph(n('n', a('a', repeat('x', k - 120)), a('b', repeat('y', 110))))],
];

/** `Widths.add`: k = 228..250, the five shapes per k. */
export function addWidths(t: ModelTable): void {
  for (let width = 228; width <= 250; width++) {
    const k = width;
    const x = quoted(repeat('x', k));
    for (const [shape, build] of WIDTH_SHAPES) t.set(`built/width/${shape}/${pad(k, 3)}`, () => build(k, x));
  }
}
