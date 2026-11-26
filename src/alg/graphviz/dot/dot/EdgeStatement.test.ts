// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { DotFactory } from './DotFactory.js';
import { DotPackage } from './DotPackage.js';
import { EdgeOperator } from './EdgeOperator.js';
import { EdgeStatementImpl } from './EdgeStatement.js';
import { EdgeTargetImpl } from './EdgeTarget.js';

// Expected values: EdgeStatementImpl.java and EdgeTargetImpl.java (EDEFAULTs, setOperator's null-to-default,
// the single-valued containment setters, eInverseRemove/eGet/eIsSet switches, toString).

const F = DotFactory.eINSTANCE;
const IMPL = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

describe('EdgeStatementImpl features', () => {
  it('reads no source, no targets and no attributes when fresh, all unset', () => {
    const statement = F.createEdgeStatement();
    expect(statement).toBeInstanceOf(EdgeStatementImpl);
    expect(statement.getSourceNode()).toBeNull();
    expect(statement.getEdgeTargets().isEmpty()).toBe(true);
    expect(statement.getAttributes().isEmpty()).toBe(true);
    expect([0, 1, 2].map((id) => statement.eIsSet(id))).toEqual([false, false, false]);
    expect(statement.eGet(DotPackage.EDGE_STATEMENT__SOURCE_NODE, true, true)).toBeNull();
    expect(statement.eGet(DotPackage.EDGE_STATEMENT__EDGE_TARGETS, true, true)).toBe(statement.getEdgeTargets());
    expect(statement.eGet(DotPackage.EDGE_STATEMENT__ATTRIBUTES, true, true)).toBe(statement.getAttributes());
    expect(statement.toString()).toBe(`${IMPL}EdgeStatementImpl`);
  });

  it('contains source, targets and attributes, in feature order', () => {
    const statement = F.createEdgeStatement();
    const source = F.createNode();
    const target = F.createEdgeTarget();
    const attribute = F.createAttribute();
    statement.getAttributes().add(attribute);
    statement.getEdgeTargets().add(target);
    statement.setSourceNode(source);
    expect([source, target, attribute].map((o) => o.eContainer())).toEqual([statement, statement, statement]);
    expect([0, 1, 2].map((id) => statement.eIsSet(id))).toEqual([true, true, true]);
    expect(statement.eGet(DotPackage.EDGE_STATEMENT__SOURCE_NODE, true, true)).toBe(source);
    expect(statement.eContents().toArray()).toEqual([source, target, attribute]);
  });

  it('falls through to the statement base for an unknown id', () => {
    const statement = F.createEdgeStatement();
    expect(() => statement.eGet(3, true, true)).toThrow(UnsupportedOperationException);
    expect(() => statement.eIsSet(3)).toThrow(UnsupportedOperationException);
    expect(() => statement.eInverseRemove(F.createNode(), 3)).toThrow(UnsupportedOperationException);
  });
});

describe('EdgeStatementImpl containment moves', () => {
  it('replaces, re-sets and loses its source node as the generated setter does', () => {
    const first = F.createEdgeStatement();
    const second = F.createEdgeStatement();
    const node = F.createNode();
    const other = F.createNode();
    first.setSourceNode(node);
    first.setSourceNode(node);
    expect(node.eContainer()).toBe(first);
    second.setSourceNode(node);
    expect(first.getSourceNode()).toBeNull();
    second.setSourceNode(other);
    expect(node.eContainer()).toBeNull();
    second.setSourceNode(null);
    expect(other.eContainer()).toBeNull();
  });

  it('a target or an attribute taken by another statement leaves the first', () => {
    const first = F.createEdgeStatement();
    const second = F.createEdgeStatement();
    const target = F.createEdgeTarget();
    const attribute = F.createAttribute();
    first.getEdgeTargets().add(target);
    first.getAttributes().add(attribute);
    second.getEdgeTargets().add(target);
    second.getAttributes().add(attribute);
    expect(first.getEdgeTargets().isEmpty()).toBe(true);
    expect(first.getAttributes().isEmpty()).toBe(true);
    expect([target.eContainer(), attribute.eContainer()]).toEqual([second, second]);
  });

  it('a statement removed from its graph has no container (DotImporter.applyLayout)', () => {
    const graph = F.createGraph();
    const statement = F.createEdgeStatement();
    expect(statement.eContainer()).toBeNull();
    graph.getStatements().add(statement);
    expect(statement.eContainer()).toBe(graph);
  });
});

describe('EdgeTargetImpl features', () => {
  it('reads operator DIRECTED and no targets when fresh, all unset', () => {
    const target = F.createEdgeTarget();
    expect(target).toBeInstanceOf(EdgeTargetImpl);
    expect(target.getOperator()).toBe(EdgeOperator.DIRECTED);
    expect([target.getTargetSubgraph(), target.getTargetnode()]).toEqual([null, null]);
    expect([0, 1, 2].map((id) => target.eIsSet(id))).toEqual([false, false, false]);
    expect(target.eGet(DotPackage.EDGE_TARGET__OPERATOR, true, true)).toBe(EdgeOperator.DIRECTED);
    expect(target.eGet(DotPackage.EDGE_TARGET__TARGET_SUBGRAPH, true, true)).toBeNull();
    expect(target.eGet(DotPackage.EDGE_TARGET__TARGETNODE, true, true)).toBeNull();
    expect(target.eClass()).toBe(DotPackage.Literals.EDGE_TARGET);
    expect(target.toString()).toBe(`${IMPL}EdgeTargetImpl (operator: ->)`);
  });

  it('setOperator sets; setOperator(null) stores DIRECTED', () => {
    const target = F.createEdgeTarget();
    target.setOperator(EdgeOperator.UNDIRECTED);
    expect(target.getOperator()).toBe(EdgeOperator.UNDIRECTED);
    expect(target.eIsSet(DotPackage.EDGE_TARGET__OPERATOR)).toBe(true);
    expect(target.toString()).toBe(`${IMPL}EdgeTargetImpl (operator: --)`);
    target.setOperator(null);
    expect(target.getOperator()).toBe(EdgeOperator.DIRECTED);
    expect(target.eIsSet(DotPackage.EDGE_TARGET__OPERATOR)).toBe(false);
  });

  it('contains its target subgraph and node, in feature order', () => {
    const target = F.createEdgeTarget();
    const subgraph = F.createSubgraph();
    const node = F.createNode();
    target.setTargetnode(node);
    target.setTargetSubgraph(subgraph);
    expect([subgraph.eContainer(), node.eContainer()]).toEqual([target, target]);
    expect([0, 1, 2].map((id) => target.eIsSet(id))).toEqual([false, true, true]);
    expect(target.eGet(DotPackage.EDGE_TARGET__TARGET_SUBGRAPH, true, true)).toBe(subgraph);
    expect(target.eGet(DotPackage.EDGE_TARGET__TARGETNODE, true, true)).toBe(node);
    expect(target.eContents().toArray()).toEqual([subgraph, node]);
  });

  it('throws for ids outside the generated switches and for the unreachable feature removal', () => {
    const target = F.createEdgeTarget();
    expect(() => target.eGet(3, true, true)).toThrow(UnsupportedOperationException);
    expect(() => target.eIsSet(3)).toThrow(UnsupportedOperationException);
    expect(() => target.eInverseRemove(F.createNode(), 0)).toThrow(UnsupportedOperationException);
    expect(() => (target as EdgeTargetImpl).eBasicRemoveFromContainerFeature()).toThrow(UnsupportedOperationException);
  });
});

describe('EdgeTargetImpl containment moves', () => {
  it('replaces, re-sets and loses its target subgraph as the generated setter does', () => {
    const first = F.createEdgeTarget();
    const second = F.createEdgeTarget();
    const subgraph = F.createSubgraph();
    const other = F.createSubgraph();
    first.setTargetSubgraph(subgraph);
    first.setTargetSubgraph(subgraph);
    expect(subgraph.eContainer()).toBe(first);
    second.setTargetSubgraph(subgraph);
    expect(first.getTargetSubgraph()).toBeNull();
    second.setTargetSubgraph(other);
    expect(subgraph.eContainer()).toBeNull();
    second.setTargetSubgraph(null);
    expect(other.eContainer()).toBeNull();
  });

  it('replaces, re-sets and loses its target node as the generated setter does', () => {
    const first = F.createEdgeTarget();
    const second = F.createEdgeTarget();
    const node = F.createNode();
    const other = F.createNode();
    first.setTargetnode(node);
    first.setTargetnode(node);
    expect(node.eContainer()).toBe(first);
    second.setTargetnode(node);
    expect(first.getTargetnode()).toBeNull();
    second.setTargetnode(other);
    expect(node.eContainer()).toBeNull();
    second.setTargetnode(null);
    expect(other.eContainer()).toBeNull();
  });
});
