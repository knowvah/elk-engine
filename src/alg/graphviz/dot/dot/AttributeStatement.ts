// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import type { Attribute } from './Attribute.js';
import { AttributeType } from './AttributeType.js';
import { type DotEClass, DotPackage } from './DotPackage.js';
import { type Statement, StatementImpl } from './Statement.js';

/**
 * A representation of the model object '<em><b>Attribute Statement</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/AttributeStatement.java
 */
export interface AttributeStatement extends Statement {
  /** Returns the value of the '<em><b>Type</b></em>' attribute. */
  getType(): AttributeType;
  /** Sets the value of the '{@link getType() <em>Type</em>}' attribute (`null` stores the default). */
  setType(value: AttributeType | null): void;
  /** Returns the value of the '<em><b>Attributes</b></em>' containment reference list. */
  getAttributes(): EList<Attribute>;
}

/**
 * An implementation of the model object '<em><b>Attribute Statement</b></em>'. Not ported: `eSet`, `eUnset`,
 * notifications; the `NotificationChain` returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java
 */
export class AttributeStatementImpl extends StatementImpl implements AttributeStatement {
  /** The default value of the '{@link getType() <em>Type</em>}' attribute. */
  protected static readonly TYPE_EDEFAULT: AttributeType = AttributeType.GRAPH;
  /** The cached value of the '{@link getType() <em>Type</em>}' attribute. */
  protected type: AttributeType = AttributeStatementImpl.TYPE_EDEFAULT;
  /** The cached value of the '{@link getAttributes() <em>Attributes</em>}' containment reference list. */
  protected attributes: EObjectContainmentEList<Attribute> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  protected override eStaticClass(): DotEClass {
    return DotPackage.Literals.ATTRIBUTE_STATEMENT;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  getType(): AttributeType {
    return this.type;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  setType(newType: AttributeType | null): void {
    this.type = newType === null ? AttributeStatementImpl.TYPE_EDEFAULT : newType;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  getAttributes(): EObjectContainmentEList<Attribute> {
    if (this.attributes === null) {
      this.attributes = new EObjectContainmentEList<Attribute>(this, DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES);
    }
    return this.attributes;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES:
        this.getAttributes().basicRemove(otherEnd as Attribute);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  override eGet(featureID: number, resolve: boolean, coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.ATTRIBUTE_STATEMENT__TYPE:
        return this.getType();
      case DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES:
        return this.getAttributes();
    }
    return super.eGet(featureID, resolve, coreType);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  override eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.ATTRIBUTE_STATEMENT__TYPE:
        return this.type !== AttributeStatementImpl.TYPE_EDEFAULT;
      case DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES:
        return this.attributes !== null && !this.attributes.isEmpty();
    }
    return super.eIsSet(featureID);
  }

  /** The containment lists in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getAttributes()];
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeStatementImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (type: ${this.type.toString()})`;
  }
}
