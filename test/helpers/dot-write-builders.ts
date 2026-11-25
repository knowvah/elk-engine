// SPDX-License-Identifier: EPL-2.0
// The model builders of tools/vectors/DotWriteVectors/DotWriteModels.java (class `B`), made with
// DotFactory.eINSTANCE only, so the built rows of graphviz-dot-write.json can be rebuilt one to one.
import type { Attribute } from '../../src/alg/graphviz/dot/dot/Attribute.js';
import type { AttributeStatement } from '../../src/alg/graphviz/dot/dot/AttributeStatement.js';
import type { AttributeType } from '../../src/alg/graphviz/dot/dot/AttributeType.js';
import { DotFactory } from '../../src/alg/graphviz/dot/dot/DotFactory.js';
import { EdgeOperator } from '../../src/alg/graphviz/dot/dot/EdgeOperator.js';
import type { EdgeStatement } from '../../src/alg/graphviz/dot/dot/EdgeStatement.js';
import type { EdgeTarget } from '../../src/alg/graphviz/dot/dot/EdgeTarget.js';
import type { Graph } from '../../src/alg/graphviz/dot/dot/Graph.js';
import { GraphType } from '../../src/alg/graphviz/dot/dot/GraphType.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';
import type { Node } from '../../src/alg/graphviz/dot/dot/Node.js';
import type { NodeStatement } from '../../src/alg/graphviz/dot/dot/NodeStatement.js';
import type { Port } from '../../src/alg/graphviz/dot/dot/Port.js';
import type { Statement } from '../../src/alg/graphviz/dot/dot/Statement.js';
import type { Subgraph } from '../../src/alg/graphviz/dot/dot/Subgraph.js';

const F = (): DotFactory => DotFactory.eINSTANCE;

/** `B.model(graphs...)`. */
export function model(...graphs: Graph[]): GraphvizModel {
  const m = F().createGraphvizModel();
  m.getGraphs().addAll(graphs);
  return m;
}

/** `B.graph(t, name, statements...)`: the type is left unset when `t` is GRAPH (the EMF default). */
export function graph(t: GraphType, name: string | null, ...statements: Statement[]): Graph {
  const g = F().createGraph();
  if (t !== GraphType.GRAPH) {
    g.setType(t);
  }
  g.setName(name);
  g.getStatements().addAll(statements);
  return g;
}

/** `B.strict(g)`. */
export function strict(g: Graph): Graph {
  g.setStrict(true);
  return g;
}

/** `B.digraph(statements...)`: `digraph G { ... }`. */
export function digraph(...statements: Statement[]): GraphvizModel {
  return model(graph(GraphType.DIGRAPH, 'G', ...statements));
}

/** `B.node(name, port)`. */
export function node(name: string | null, port: Port | null): Node {
  const n = F().createNode();
  n.setName(name);
  n.setPort(port);
  return n;
}

/** `B.port(name, compass)`. */
export function port(name: string | null, compass: string | null): Port {
  const p = F().createPort();
  p.setName(name);
  p.setCompass_pt(compass);
  return p;
}

/** `B.n(String name, attributes...)` and `B.n(Node node, attributes...)`. */
export function n(nameOrNode: string | Node | null, ...attributes: Attribute[]): NodeStatement {
  const s = F().createNodeStatement();
  s.setNode(typeof nameOrNode === 'string' ? node(nameOrNode, null) : nameOrNode);
  s.getAttributes().addAll(attributes);
  return s;
}

/** `B.n((String) null)`: a node statement whose node has no name. */
export function nUnnamed(): NodeStatement {
  return n(node(null, null));
}

/** `B.a(name, value)`. */
export function a(name: string | null, value: string | null): Attribute {
  const attribute = F().createAttribute();
  attribute.setName(name);
  attribute.setValue(value);
  return attribute;
}

/** `B.as(type, attributes...)`. */
export function as(type: AttributeType | null, ...attributes: Attribute[]): AttributeStatement {
  const s = F().createAttributeStatement();
  s.setType(type);
  s.getAttributes().addAll(attributes);
  return s;
}

/** `B.to(op, target)`. */
export function to(op: EdgeOperator, target: Node): EdgeTarget {
  const t = F().createEdgeTarget();
  t.setOperator(op);
  t.setTargetnode(target);
  return t;
}

/** `B.toSub(op, target)`. */
export function toSub(op: EdgeOperator, target: Subgraph): EdgeTarget {
  const t = F().createEdgeTarget();
  t.setOperator(op);
  t.setTargetSubgraph(target);
  return t;
}

/** `B.e(source, attributes, targets...)`. */
export function e(source: Node | null, attributes: readonly Attribute[], ...targets: EdgeTarget[]): EdgeStatement {
  const s = F().createEdgeStatement();
  s.setSourceNode(source);
  s.getEdgeTargets().addAll(targets);
  s.getAttributes().addAll(attributes);
  return s;
}

/** `B.arrow(source, target, attributes...)`: `source -> target` with the attributes. */
export function arrow(source: string, target: string, ...attributes: Attribute[]): EdgeStatement {
  return e(node(source, null), attributes, to(EdgeOperator.DIRECTED, node(target, null)));
}

/** `B.sub(name, statements...)`. */
export function sub(name: string | null, ...statements: Statement[]): Subgraph {
  const s = F().createSubgraph();
  s.setName(name);
  s.getStatements().addAll(statements);
  return s;
}

/** `B.repeat(unit, times)`. */
export function repeat(unit: string, times: number): string {
  return unit.repeat(times);
}

/** Java `String.format("%0<width>d", i)` for a non-negative `i`. */
export function pad(i: number, width: number): string {
  return String(i).padStart(width, '0');
}

/** `B.attrs(prefix, count, value)`: attributes `<prefix>NN` = `value(NN)`. */
export function attrs(prefix: string, count: number, value: (i: number) => string): Attribute[] {
  return Array.from({ length: count }, (_, i) => a(`${prefix}${pad(i, 2)}`, value(i)));
}

/** `B.DotFactoryTargets.empty()`: an undirected target with neither node nor subgraph. */
export function targetEmpty(): EdgeTarget {
  const t = F().createEdgeTarget();
  t.setOperator(EdgeOperator.UNDIRECTED);
  return t;
}

/** `B.DotFactoryTargets.both()`: a target with a node and a subgraph. */
export function targetBoth(): EdgeTarget {
  const t = to(EdgeOperator.DIRECTED, node('b', null));
  t.setTargetSubgraph(sub(null, n('c')));
  return t;
}

/** `B.DotFactoryTargets.operatorUnset()`: a target node with the operator left at its default. */
export function targetOperatorUnset(): EdgeTarget {
  const t = F().createEdgeTarget();
  t.setTargetnode(node('b', null));
  return t;
}

/** `B.F.createStatement()`: a bare `Statement`, which no grammar rule produces. */
export function bareStatement(): Statement {
  return F().createStatement();
}
