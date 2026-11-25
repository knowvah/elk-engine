// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import type { Attribute } from './Attribute.js';
import { singleContainment } from './DotEObjectSupport.js';
import { type DotEClass, DotPackage } from './DotPackage.js';
import type { Node } from './Node.js';
import { type Statement, StatementImpl } from './Statement.js';

/**
 * A representation of the model object '<em><b>Node Statement</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/NodeStatement.java
 */
export interface NodeStatement extends Statement {
  /** Returns the value of the '<em><b>Node</b></em>' containment reference. */
  getNode(): Node | null;
  /** Sets the value of the '{@link getNode() <em>Node</em>}' containment reference. */
  setNode(value: Node | null): void;
  /** Returns the value of the '<em><b>Attributes</b></em>' containment reference list. */
  getAttributes(): EList<Attribute>;
}

/**
 * An implementation of the model object '<em><b>Node Statement</b></em>'. Not ported: `eSet`, `eUnset`,
 * notifications (incl. the `else eNotify` arm of `setNode`); the `NotificationChain` returns are dropped with
 * `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java
 */
export class NodeStatementImpl extends StatementImpl implements NodeStatement {
  /** The cached value of the '{@link getNode() <em>Node</em>}' containment reference. */
  protected node: Node | null = null;
  /** The cached value of the '{@link getAttributes() <em>Attributes</em>}' containment reference list. */
  protected attributes: EObjectContainmentEList<Attribute> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  protected override eStaticClass(): DotEClass {
    return DotPackage.Literals.NODE_STATEMENT;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  getNode(): Node | null {
    return this.node;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  basicSetNode(newNode: Node | null): void {
    this.node = newNode;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  setNode(newNode: Node | null): void {
    if (newNode !== this.node) {
      if (this.node !== null) this.node.eInverseRemove(this, EOPPOSITE_FEATURE_BASE - DotPackage.NODE_STATEMENT__NODE);
      if (newNode !== null) newNode.eInverseAdd(this, EOPPOSITE_FEATURE_BASE - DotPackage.NODE_STATEMENT__NODE);
      this.basicSetNode(newNode);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  getAttributes(): EObjectContainmentEList<Attribute> {
    if (this.attributes === null) {
      this.attributes = new EObjectContainmentEList<Attribute>(this, DotPackage.NODE_STATEMENT__ATTRIBUTES);
    }
    return this.attributes;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.NODE_STATEMENT__NODE:
        this.basicSetNode(null);
        return;
      case DotPackage.NODE_STATEMENT__ATTRIBUTES:
        this.getAttributes().basicRemove(otherEnd as Attribute);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  override eGet(featureID: number, resolve: boolean, coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.NODE_STATEMENT__NODE:
        return this.getNode();
      case DotPackage.NODE_STATEMENT__ATTRIBUTES:
        return this.getAttributes();
    }
    return super.eGet(featureID, resolve, coreType);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeStatementImpl.java */
  override eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.NODE_STATEMENT__NODE:
        return this.node !== null;
      case DotPackage.NODE_STATEMENT__ATTRIBUTES:
        return this.attributes !== null && !this.attributes.isEmpty();
    }
    return super.eIsSet(featureID);
  }

  /** The containments in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), singleContainment(this.node), this.getAttributes()];
  }
}
