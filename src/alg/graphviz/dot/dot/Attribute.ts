// SPDX-License-Identifier: EPL-2.0
import { type DotEClass, DotPackage } from './DotPackage.js';
import { type Statement, StatementImpl } from './Statement.js';

/**
 * A representation of the model object '<em><b>Attribute</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Attribute.java
 */
export interface Attribute extends Statement {
  /** Returns the value of the '<em><b>Name</b></em>' attribute. */
  getName(): string | null;
  /** Sets the value of the '{@link getName() <em>Name</em>}' attribute. */
  setName(value: string | null): void;
  /** Returns the value of the '<em><b>Value</b></em>' attribute. */
  getValue(): string | null;
  /** Sets the value of the '{@link getValue() <em>Value</em>}' attribute. */
  setValue(value: string | null): void;
}

/**
 * An implementation of the model object '<em><b>Attribute</b></em>'. Not ported: `eSet`, `eUnset`,
 * notifications.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java
 */
export class AttributeImpl extends StatementImpl implements Attribute {
  /** The default value of the '{@link getName() <em>Name</em>}' attribute. */
  protected static readonly NAME_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getName() <em>Name</em>}' attribute. */
  protected name: string | null = AttributeImpl.NAME_EDEFAULT;
  /** The default value of the '{@link getValue() <em>Value</em>}' attribute. */
  protected static readonly VALUE_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getValue() <em>Value</em>}' attribute. */
  protected value: string | null = AttributeImpl.VALUE_EDEFAULT;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  protected override eStaticClass(): DotEClass {
    return DotPackage.Literals.ATTRIBUTE;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  getName(): string | null {
    return this.name;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  setName(newName: string | null): void {
    this.name = newName;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  getValue(): string | null {
    return this.value;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  setValue(newValue: string | null): void {
    this.value = newValue;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  override eGet(featureID: number, resolve: boolean, coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.ATTRIBUTE__NAME:
        return this.getName();
      case DotPackage.ATTRIBUTE__VALUE:
        return this.getValue();
    }
    return super.eGet(featureID, resolve, coreType);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  override eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.ATTRIBUTE__NAME:
        return AttributeImpl.NAME_EDEFAULT === null ? this.name !== null : AttributeImpl.NAME_EDEFAULT !== this.name;
      case DotPackage.ATTRIBUTE__VALUE:
        return AttributeImpl.VALUE_EDEFAULT === null
          ? this.value !== null
          : AttributeImpl.VALUE_EDEFAULT !== this.value;
    }
    return super.eIsSet(featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/AttributeImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (name: ${this.name}, value: ${this.value})`;
  }
}
