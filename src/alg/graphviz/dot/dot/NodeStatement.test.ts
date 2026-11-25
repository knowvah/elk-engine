// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { DotFactory } from './DotFactory.js';
import { DotPackage } from './DotPackage.js';
import { NodeImpl } from './Node.js';
import { NodeStatementImpl } from './NodeStatement.js';
import { PortImpl } from './Port.js';

// Expected values: NodeStatementImpl.java, NodeImpl.java and PortImpl.java (EDEFAULTs, the single-valued
// containment setters with EOPPOSITE_FEATURE_BASE, eInverseRemove/eGet/eIsSet switches, toString).

const F = DotFactory.eINSTANCE;
const IMPL = 'org.eclipse.elk.alg.graphviz.dot.dot.impl.';

describe('NodeStatementImpl features', () => {
  it('reads no node and no attributes when fresh, both unset', () => {
    const statement = F.createNodeStatement();
    expect(statement).toBeInstanceOf(NodeStatementImpl);
    expect(statement.getNode()).toBeNull();
    expect(statement.getAttributes().isEmpty()).toBe(true);
    expect([statement.eIsSet(0), statement.eIsSet(1)]).toEqual([false, false]);
    expect(statement.eGet(DotPackage.NODE_STATEMENT__NODE, true, true)).toBeNull();
    expect(statement.eGet(DotPackage.NODE_STATEMENT__ATTRIBUTES, true, true)).toBe(statement.getAttributes());
    expect(statement.eContents().isEmpty()).toBe(true);
    expect(statement.toString()).toBe(`${IMPL}NodeStatementImpl`);
  });

  it('contains its node and attributes, in feature order', () => {
    const statement = F.createNodeStatement();
    const node = F.createNode();
    const attribute = F.createAttribute();
    statement.getAttributes().add(attribute);
    statement.setNode(node);
    expect(statement.getNode()).toBe(node);
    expect(node.eContainer()).toBe(statement);
    expect(attribute.eContainer()).toBe(statement);
    expect([statement.eIsSet(0), statement.eIsSet(1)]).toEqual([true, true]);
    expect(statement.eGet(DotPackage.NODE_STATEMENT__NODE, true, true)).toBe(node);
    expect(statement.eContents().toArray()).toEqual([node, attribute]);
  });

  it('falls through to the statement base for an unknown id', () => {
    const statement = F.createNodeStatement();
    expect(() => statement.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => statement.eIsSet(2)).toThrow(UnsupportedOperationException);
    expect(() => statement.eInverseRemove(F.createNode(), 2)).toThrow(UnsupportedOperationException);
  });
});

describe('NodeStatementImpl.setNode', () => {
  it('replacing the node releases the old one', () => {
    const statement = F.createNodeStatement();
    const first = F.createNode();
    const second = F.createNode();
    statement.setNode(first);
    statement.setNode(second);
    expect(first.eContainer()).toBeNull();
    expect(second.eContainer()).toBe(statement);
    statement.setNode(null);
    expect(second.eContainer()).toBeNull();
    expect(statement.eIsSet(DotPackage.NODE_STATEMENT__NODE)).toBe(false);
  });

  it('setting the same node again changes nothing', () => {
    const statement = F.createNodeStatement();
    const node = F.createNode();
    statement.setNode(node);
    statement.setNode(node);
    expect(statement.getNode()).toBe(node);
    expect(node.eContainer()).toBe(statement);
  });

  it('a node taken by another statement leaves the first (eInverseRemove NODE_STATEMENT__NODE)', () => {
    const first = F.createNodeStatement();
    const second = F.createNodeStatement();
    const node = F.createNode();
    first.setNode(node);
    second.setNode(node);
    expect(first.getNode()).toBeNull();
    expect(second.getNode()).toBe(node);
    expect(node.eContainer()).toBe(second);
  });

  it('an attribute taken by another statement leaves the first (eInverseRemove NODE_STATEMENT__ATTRIBUTES)', () => {
    const first = F.createNodeStatement();
    const second = F.createEdgeStatement();
    const attribute = F.createAttribute();
    first.getAttributes().add(attribute);
    second.getAttributes().add(attribute);
    expect(first.getAttributes().isEmpty()).toBe(true);
    expect(attribute.eContainer()).toBe(second);
  });
});

describe('NodeImpl', () => {
  it('reads a null name and no port when fresh, both unset', () => {
    const node = F.createNode();
    expect(node).toBeInstanceOf(NodeImpl);
    expect([node.getName(), node.getPort()]).toEqual([null, null]);
    expect([node.eIsSet(0), node.eIsSet(1)]).toEqual([false, false]);
    expect(node.eGet(DotPackage.NODE__NAME, true, true)).toBeNull();
    expect(node.eGet(DotPackage.NODE__PORT, true, true)).toBeNull();
    expect(node.eClass()).toBe(DotPackage.Literals.NODE);
    expect(node.toString()).toBe(`${IMPL}NodeImpl (name: null)`);
  });

  it('sets the name and contains the port', () => {
    const node = F.createNode();
    const port = F.createPort();
    node.setName('a');
    node.setPort(port);
    expect([node.getName(), node.getPort()]).toEqual(['a', port]);
    expect(port.eContainer()).toBe(node);
    expect([node.eIsSet(0), node.eIsSet(1)]).toEqual([true, true]);
    expect(node.eGet(DotPackage.NODE__NAME, true, true)).toBe('a');
    expect(node.eGet(DotPackage.NODE__PORT, true, true)).toBe(port);
    expect(node.eContents().toArray()).toEqual([port]);
    expect(node.toString()).toBe(`${IMPL}NodeImpl (name: a)`);
  });

  it('replaces, re-sets and loses its port as the generated setter does', () => {
    const first = F.createNode();
    const second = F.createNode();
    const port = F.createPort();
    const other = F.createPort();
    first.setPort(port);
    first.setPort(port);
    expect(port.eContainer()).toBe(first);
    second.setPort(port);
    expect(first.getPort()).toBeNull();
    second.setPort(other);
    expect(port.eContainer()).toBeNull();
    second.setPort(null);
    expect(other.eContainer()).toBeNull();
  });

  it('throws for ids outside the generated switches and for the unreachable feature removal', () => {
    const node = F.createNode();
    expect(() => node.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => node.eIsSet(2)).toThrow(UnsupportedOperationException);
    expect(() => node.eInverseRemove(F.createPort(), 0)).toThrow(UnsupportedOperationException);
    expect(() => (node as NodeImpl).eBasicRemoveFromContainerFeature()).toThrow(UnsupportedOperationException);
  });
});

describe('PortImpl', () => {
  it('reads null name and compass_pt when fresh, both unset', () => {
    const port = F.createPort();
    expect(port).toBeInstanceOf(PortImpl);
    expect([port.getName(), port.getCompass_pt()]).toEqual([null, null]);
    expect([port.eIsSet(0), port.eIsSet(1)]).toEqual([false, false]);
    expect(port.eClass()).toBe(DotPackage.Literals.PORT);
    expect(port.eContents().isEmpty()).toBe(true);
    expect(port.toString()).toBe(`${IMPL}PortImpl (name: null, compass_pt: null)`);
  });

  it('sets and reads name and compass_pt; eGet, eIsSet and toString follow', () => {
    const port = F.createPort();
    port.setName('p');
    port.setCompass_pt('ne');
    expect([port.getName(), port.getCompass_pt()]).toEqual(['p', 'ne']);
    expect([port.eIsSet(0), port.eIsSet(1)]).toEqual([true, true]);
    expect(port.eGet(DotPackage.PORT__NAME, true, true)).toBe('p');
    expect(port.eGet(DotPackage.PORT__COMPASS_PT, true, true)).toBe('ne');
    expect(port.toString()).toBe(`${IMPL}PortImpl (name: p, compass_pt: ne)`);
  });

  it('throws for ids outside the generated switches and for the unreachable feature removal', () => {
    const port = F.createPort();
    expect(() => port.eGet(2, true, true)).toThrow(UnsupportedOperationException);
    expect(() => port.eIsSet(2)).toThrow(UnsupportedOperationException);
    expect(() => (port as PortImpl).eBasicRemoveFromContainerFeature()).toThrow(UnsupportedOperationException);
  });
});
