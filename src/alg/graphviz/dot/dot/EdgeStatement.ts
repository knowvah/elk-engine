// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import type { Attribute } from './Attribute.js';
import { singleContainment } from './DotEObjectSupport.js';
import { type DotEClass, DotPackage } from './DotPackage.js';
import type { EdgeTarget } from './EdgeTarget.js';
import type { Node } from './Node.js';
import { type Statement, StatementImpl } from './Statement.js';

/**
 * A representation of the model object '<em><b>Edge Statement</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/EdgeStatement.java
 */
export interface EdgeStatement extends Statement {
  /** Returns the value of the '<em><b>Source Node</b></em>' containment reference. */
  getSourceNode(): Node | null;
  /** Sets the value of the '{@link getSourceNode() <em>Source Node</em>}' containment reference. */
  setSourceNode(value: Node | null): void;
  /** Returns the value of the '<em><b>Edge Targets</b></em>' containment reference list. */
  getEdgeTargets(): EList<EdgeTarget>;
  /** Returns the value of the '<em><b>Attributes</b></em>' containment reference list. */
  getAttributes(): EList<Attribute>;
}

/**
 * An implementation of the model object '<em><b>Edge Statement</b></em>'. Not ported: `eSet`, `eUnset`,
 * notifications (incl. the `else eNotify` arm of `setSourceNode`); the `NotificationChain` returns are
 * dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java
 */
export class EdgeStatementImpl extends StatementImpl implements EdgeStatement {
  /** The cached value of the '{@link getSourceNode() <em>Source Node</em>}' containment reference. */
  protected sourceNode: Node | null = null;
  /** The cached value of the '{@link getEdgeTargets() <em>Edge Targets</em>}' containment reference list. */
  protected edgeTargets: EObjectContainmentEList<EdgeTarget> | null = null;
  /** The cached value of the '{@link getAttributes() <em>Attributes</em>}' containment reference list. */
  protected attributes: EObjectContainmentEList<Attribute> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  protected override eStaticClass(): DotEClass {
    return DotPackage.Literals.EDGE_STATEMENT;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  getSourceNode(): Node | null {
    return this.sourceNode;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  basicSetSourceNode(newSourceNode: Node | null): void {
    this.sourceNode = newSourceNode;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  setSourceNode(newSourceNode: Node | null): void {
    if (newSourceNode !== this.sourceNode) {
      if (this.sourceNode !== null) {
        this.sourceNode.eInverseRemove(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_STATEMENT__SOURCE_NODE);
      }
      if (newSourceNode !== null) {
        newSourceNode.eInverseAdd(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_STATEMENT__SOURCE_NODE);
      }
      this.basicSetSourceNode(newSourceNode);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  getEdgeTargets(): EObjectContainmentEList<EdgeTarget> {
    if (this.edgeTargets === null) {
      this.edgeTargets = new EObjectContainmentEList<EdgeTarget>(this, DotPackage.EDGE_STATEMENT__EDGE_TARGETS);
    }
    return this.edgeTargets;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  getAttributes(): EObjectContainmentEList<Attribute> {
    if (this.attributes === null) {
      this.attributes = new EObjectContainmentEList<Attribute>(this, DotPackage.EDGE_STATEMENT__ATTRIBUTES);
    }
    return this.attributes;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.EDGE_STATEMENT__SOURCE_NODE:
        this.basicSetSourceNode(null);
        return;
      case DotPackage.EDGE_STATEMENT__EDGE_TARGETS:
        this.getEdgeTargets().basicRemove(otherEnd as EdgeTarget);
        return;
      case DotPackage.EDGE_STATEMENT__ATTRIBUTES:
        this.getAttributes().basicRemove(otherEnd as Attribute);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  override eGet(featureID: number, resolve: boolean, coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.EDGE_STATEMENT__SOURCE_NODE:
        return this.getSourceNode();
      case DotPackage.EDGE_STATEMENT__EDGE_TARGETS:
        return this.getEdgeTargets();
      case DotPackage.EDGE_STATEMENT__ATTRIBUTES:
        return this.getAttributes();
    }
    return super.eGet(featureID, resolve, coreType);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeStatementImpl.java */
  override eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.EDGE_STATEMENT__SOURCE_NODE:
        return this.sourceNode !== null;
      case DotPackage.EDGE_STATEMENT__EDGE_TARGETS:
        return this.edgeTargets !== null && !this.edgeTargets.isEmpty();
      case DotPackage.EDGE_STATEMENT__ATTRIBUTES:
        return this.attributes !== null && !this.attributes.isEmpty();
    }
    return super.eIsSet(featureID);
  }

  /** The containments in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [
      ...super.eContainmentFeatures(),
      singleContainment(this.sourceNode),
      this.getEdgeTargets(),
      this.getAttributes(),
    ];
  }
}
