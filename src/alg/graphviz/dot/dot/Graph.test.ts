// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { URI } from '../../../../emf/common/util/URI.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { DotFactory } from './DotFactory.js';
import { DotPackage } from './DotPackage.js';
import { GraphImpl } from './Graph.js';
import { GraphType } from './GraphType.js';
import { GraphvizModelImpl } from './GraphvizModel.js';

// Expected values: GraphImpl.java (EDEFAULTs, setType's null-to-default, eGet/eIsSet switch, toString) and
// GraphvizModelImpl.java.

const F = DotFactory.eINSTANCE;
const IMPL = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

describe('GraphImpl defaults', () => {
  it('reads as GraphImpl declares when fresh', () => {
    const graph = F.createGraph();
    expect(graph).toBeInstanceOf(GraphImpl);
    expect(graph.isStrict()).toBe(false);
    expect(graph.getType()).toBe(GraphType.GRAPH);
    expect(graph.getName()).toBeNull();
    expect(graph.getStatements().isEmpty()).toBe(true);
    expect(graph.eClass()).toBe(DotPackage.Literals.GRAPH);
    expect(graph.eContainer()).toBeNull();
  });

  it('has no feature set when fresh', () => {
    const graph = F.createGraph();
    expect([0, 1, 2, 3].map((id) => graph.eIsSet(id))).toEqual([false, false, false, false]);
  });

  it('eGet returns the defaults, and the statements list itself', () => {
    const graph = F.createGraph();
    expect(graph.eGet(DotPackage.GRAPH__STRICT, true, true)).toBe(false);
    expect(graph.eGet(DotPackage.GRAPH__TYPE, true, true)).toBe(GraphType.GRAPH);
    expect(graph.eGet(DotPackage.GRAPH__NAME, true, true)).toBeNull();
    expect(graph.eGet(DotPackage.GRAPH__STATEMENTS, true, true)).toBe(graph.getStatements());
  });
});

describe('GraphImpl features', () => {
  it('sets and reads each attribute; eIsSet follows', () => {
    const graph = F.createGraph();
    graph.setStrict(true);
    graph.setType(GraphType.DIGRAPH);
    graph.setName('G');
    expect([graph.isStrict(), graph.getType(), graph.getName()]).toEqual([true, GraphType.DIGRAPH, 'G']);
    expect([0, 1, 2, 3].map((id) => graph.eIsSet(id))).toEqual([true, true, true, false]);
    expect(graph.eGet(DotPackage.GRAPH__STRICT, true, true)).toBe(true);
    expect(graph.eGet(DotPackage.GRAPH__TYPE, true, true)).toBe(GraphType.DIGRAPH);
    expect(graph.eGet(DotPackage.GRAPH__NAME, true, true)).toBe('G');
  });

  it('setType(null) stores the default; a value equal to the default is unset', () => {
    const graph = F.createGraph();
    graph.setType(GraphType.DIGRAPH);
    graph.setType(null);
    expect(graph.getType()).toBe(GraphType.GRAPH);
    expect(graph.eIsSet(DotPackage.GRAPH__TYPE)).toBe(false);
    graph.setStrict(false);
    graph.setName(null);
    expect(graph.eIsSet(DotPackage.GRAPH__STRICT)).toBe(false);
    expect(graph.eIsSet(DotPackage.GRAPH__NAME)).toBe(false);
  });

  it('an empty name is set (only null is the default)', () => {
    const graph = F.createGraph();
    graph.setName('');
    expect(graph.eIsSet(DotPackage.GRAPH__NAME)).toBe(true);
  });

  it('throws for a feature id outside the generated switch', () => {
    const graph = F.createGraph();
    expect(() => graph.eGet(4, true, true)).toThrow(UnsupportedOperationException);
    expect(() => graph.eIsSet(4)).toThrow(UnsupportedOperationException);
  });
});

describe('GraphImpl containment', () => {
  it('contains its statements: container, eContents and eIsSet', () => {
    const graph = F.createGraph();
    const a = F.createNodeStatement();
    const b = F.createAttribute();
    graph.getStatements().add(a);
    graph.getStatements().add(b);
    expect(a.eContainer()).toBe(graph);
    expect(b.eContainer()).toBe(graph);
    expect(graph.eContents().toArray()).toEqual([a, b]);
    expect(graph.eIsSet(DotPackage.GRAPH__STATEMENTS)).toBe(true);
  });

  it('a statement added to a subgraph leaves the graph', () => {
    const graph = F.createGraph();
    const subgraph = F.createSubgraph();
    const statement = F.createEdgeStatement();
    graph.getStatements().add(statement);
    subgraph.getStatements().add(statement);
    expect(graph.getStatements().isEmpty()).toBe(true);
    expect(statement.eContainer()).toBe(subgraph);
  });

  it('removing a statement clears its container', () => {
    const graph = F.createGraph();
    const statement = F.createAttributeStatement();
    graph.getStatements().add(statement);
    graph.getStatements().remove(statement);
    expect(statement.eContainer()).toBeNull();
    expect(graph.eIsSet(DotPackage.GRAPH__STATEMENTS)).toBe(false);
  });

  it('eInverseRemove with an id outside the generated switch falls through to the base', () => {
    const graph = F.createGraph();
    expect(() => graph.eInverseRemove(F.createNode(), 7)).toThrow(UnsupportedOperationException);
  });
});

describe('GraphvizModelImpl', () => {
  it('is empty and unset when fresh', () => {
    const model = F.createGraphvizModel();
    expect(model.getGraphs().isEmpty()).toBe(true);
    expect(model.eIsSet(DotPackage.GRAPHVIZ_MODEL__GRAPHS)).toBe(false);
    expect(model.eGet(DotPackage.GRAPHVIZ_MODEL__GRAPHS, true, true)).toBe(model.getGraphs());
    expect(model.eClass()).toBe(DotPackage.Literals.GRAPHVIZ_MODEL);
    expect(model.toString()).toBe(`${IMPL}GraphvizModelImpl`);
  });

  it('contains its graphs; a graph moved to another model leaves the first', () => {
    const first = F.createGraphvizModel();
    const second = F.createGraphvizModel();
    const graph = F.createGraph();
    first.getGraphs().add(graph);
    expect(graph.eContainer()).toBe(first);
    expect(first.eContents().toArray()).toEqual([graph]);
    expect(first.eIsSet(DotPackage.GRAPHVIZ_MODEL__GRAPHS)).toBe(true);
    second.getGraphs().add(graph);
    expect(first.getGraphs().isEmpty()).toBe(true);
    expect(graph.eContainer()).toBe(second);
    expect([...second.eAllContents()]).toEqual([graph]);
  });

  it('throws for ids outside the generated switches and for the unreachable feature removal', () => {
    const model = F.createGraphvizModel();
    expect(() => model.eGet(1, true, true)).toThrow(UnsupportedOperationException);
    expect(() => model.eIsSet(1)).toThrow(UnsupportedOperationException);
    expect(() => model.eInverseRemove(F.createGraph(), 1)).toThrow(UnsupportedOperationException);
    expect(() => (model as GraphvizModelImpl).eBasicRemoveFromContainerFeature()).toThrow(
      UnsupportedOperationException,
    );
  });
});

describe('GraphImpl toString', () => {
  it('appends strict, type and name as GraphImpl.toString does', () => {
    const graph = F.createGraph();
    expect(graph.toString()).toBe(`${IMPL}GraphImpl (strict: false, type: graph, name: null)`);
    graph.setStrict(true);
    graph.setType(GraphType.DIGRAPH);
    graph.setName('G');
    expect(graph.toString()).toBe(`${IMPL}GraphImpl (strict: true, type: digraph, name: G)`);
  });

  it('a proxy prints the base form only', () => {
    const graph = F.createGraph();
    graph.eSetProxyURI(URI.createURI('a.dot#/0'));
    expect(graph.toString()).toBe(`${IMPL}GraphImpl (eProxyURI: a.dot#/0)`);
    expect(() => (graph as GraphImpl).eBasicRemoveFromContainerFeature()).toThrow(UnsupportedOperationException);
  });
});
