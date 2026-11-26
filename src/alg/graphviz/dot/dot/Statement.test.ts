// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { AttributeImpl } from './Attribute.js';
import { AttributeStatementImpl } from './AttributeStatement.js';
import { AttributeType } from './AttributeType.js';
import { DotFactory } from './DotFactory.js';
import { DotPackage } from './DotPackage.js';
import { StatementImpl } from './Statement.js';
import { SubgraphImpl } from './Subgraph.js';

// Expected values: StatementImpl.java, AttributeImpl.java, AttributeStatementImpl.java and SubgraphImpl.java
// (EDEFAULTs, setType's null-to-default, eGet/eIsSet switches, toString).

const F = DotFactory.eINSTANCE;
const IMPL = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

describe('StatementImpl', () => {
  it('has no feature and no content', () => {
    const statement = F.createStatement();
    expect(statement).toBeInstanceOf(StatementImpl);
    expect(statement.eClass()).toBe(DotPackage.Literals.STATEMENT);
    expect(statement.eContents().isEmpty()).toBe(true);
    expect(statement.toString()).toBe(`${IMPL}StatementImpl`);
  });

  it('throws for every feature id and for the unreachable feature removal', () => {
    const statement = F.createStatement();
    expect(() => statement.eGet(0, true, true)).toThrow(UnsupportedOperationException);
    expect(() => statement.eIsSet(0)).toThrow(UnsupportedOperationException);
    expect(() => (statement as StatementImpl).eBasicRemoveFromContainerFeature()).toThrow(
      UnsupportedOperationException,
    );
  });
});

describe('AttributeImpl', () => {
  it('reads null name and value when fresh, both unset', () => {
    const attribute = F.createAttribute();
    expect(attribute).toBeInstanceOf(AttributeImpl);
    expect(attribute).toBeInstanceOf(StatementImpl);
    expect([attribute.getName(), attribute.getValue()]).toEqual([null, null]);
    expect([attribute.eIsSet(0), attribute.eIsSet(1)]).toEqual([false, false]);
    expect(attribute.eClass()).toBe(DotPackage.Literals.ATTRIBUTE);
    expect(attribute.toString()).toBe(`${IMPL}AttributeImpl (name: null, value: null)`);
  });

  it('sets and reads name and value; eGet, eIsSet and toString follow', () => {
    const attribute = F.createAttribute();
    attribute.setName('label');
    attribute.setValue('"x"');
    expect([attribute.getName(), attribute.getValue()]).toEqual(['label', '"x"']);
    expect([attribute.eIsSet(0), attribute.eIsSet(1)]).toEqual([true, true]);
    expect(attribute.eGet(DotPackage.ATTRIBUTE__NAME, true, true)).toBe('label');
    expect(attribute.eGet(DotPackage.ATTRIBUTE__VALUE, true, true)).toBe('"x"');
    expect(attribute.toString()).toBe(`${IMPL}AttributeImpl (name: label, value: "x")`);
  });

  it('falls through to the statement base for an unknown id', () => {
    const attribute = F.createAttribute();
    expect(() => attribute.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => attribute.eIsSet(2)).toThrow(UnsupportedOperationException);
  });
});

describe('AttributeStatementImpl', () => {
  it('reads type GRAPH and no attributes when fresh, both unset', () => {
    const statement = F.createAttributeStatement();
    expect(statement).toBeInstanceOf(AttributeStatementImpl);
    expect(statement.getType()).toBe(AttributeType.GRAPH);
    expect(statement.getAttributes().isEmpty()).toBe(true);
    expect([statement.eIsSet(0), statement.eIsSet(1)]).toEqual([false, false]);
    expect(statement.eGet(DotPackage.ATTRIBUTE_STATEMENT__TYPE, true, true)).toBe(AttributeType.GRAPH);
    expect(statement.eGet(DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES, true, true)).toBe(statement.getAttributes());
    expect(statement.toString()).toBe(`${IMPL}AttributeStatementImpl (type: graph)`);
  });

  it('setType sets; setType(null) stores GRAPH', () => {
    const statement = F.createAttributeStatement();
    statement.setType(AttributeType.EDGE);
    expect(statement.getType()).toBe(AttributeType.EDGE);
    expect(statement.eIsSet(DotPackage.ATTRIBUTE_STATEMENT__TYPE)).toBe(true);
    expect(statement.toString()).toBe(`${IMPL}AttributeStatementImpl (type: edge)`);
    statement.setType(null);
    expect(statement.getType()).toBe(AttributeType.GRAPH);
    expect(statement.eIsSet(DotPackage.ATTRIBUTE_STATEMENT__TYPE)).toBe(false);
  });

  it('contains its attributes; an attribute moved to another statement leaves the first', () => {
    const first = F.createAttributeStatement();
    const second = F.createNodeStatement();
    const attribute = F.createAttribute();
    first.getAttributes().add(attribute);
    expect(attribute.eContainer()).toBe(first);
    expect(first.eContents().toArray()).toEqual([attribute]);
    expect(first.eIsSet(DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES)).toBe(true);
    second.getAttributes().add(attribute);
    expect(first.getAttributes().isEmpty()).toBe(true);
    expect(attribute.eContainer()).toBe(second);
  });

  it('falls through to the statement base for an unknown id', () => {
    const statement = F.createAttributeStatement();
    expect(() => statement.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => statement.eIsSet(2)).toThrow(UnsupportedOperationException);
    expect(() => statement.eInverseRemove(F.createAttribute(), 0)).toThrow(UnsupportedOperationException);
  });
});

describe('SubgraphImpl', () => {
  it('reads a null name and no statements when fresh, both unset', () => {
    const subgraph = F.createSubgraph();
    expect(subgraph).toBeInstanceOf(SubgraphImpl);
    expect(subgraph.getName()).toBeNull();
    expect(subgraph.getStatements().isEmpty()).toBe(true);
    expect([subgraph.eIsSet(0), subgraph.eIsSet(1)]).toEqual([false, false]);
    expect(subgraph.eGet(DotPackage.SUBGRAPH__NAME, true, true)).toBeNull();
    expect(subgraph.eGet(DotPackage.SUBGRAPH__STATEMENTS, true, true)).toBe(subgraph.getStatements());
    expect(subgraph.toString()).toBe(`${IMPL}SubgraphImpl (name: null)`);
  });

  it('sets the name and contains statements, nested subgraphs included', () => {
    const subgraph = F.createSubgraph();
    const inner = F.createSubgraph();
    const attribute = F.createAttribute();
    subgraph.setName('cluster_0');
    subgraph.getStatements().add(inner);
    inner.getStatements().add(attribute);
    expect(subgraph.getName()).toBe('cluster_0');
    expect([subgraph.eIsSet(0), subgraph.eIsSet(1)]).toEqual([true, true]);
    expect(inner.eContainer()).toBe(subgraph);
    expect([...subgraph.eAllContents()]).toEqual([inner, attribute]);
    expect(subgraph.toString()).toBe(`${IMPL}SubgraphImpl (name: cluster_0)`);
  });

  it('a statement moved to a graph leaves the subgraph; unknown ids fall through', () => {
    const subgraph = F.createSubgraph();
    const graph = F.createGraph();
    const statement = F.createNodeStatement();
    subgraph.getStatements().add(statement);
    graph.getStatements().add(statement);
    expect(subgraph.getStatements().isEmpty()).toBe(true);
    expect(() => subgraph.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => subgraph.eIsSet(2)).toThrow(UnsupportedOperationException);
    expect(() => subgraph.eInverseRemove(statement, 0)).toThrow(UnsupportedOperationException);
  });
});
