// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { implClassName, noGeneratedCase } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';

/**
 * A representation of the model object '<em><b>Port</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Port.java
 */
export interface Port extends DotEObject {
  /** Returns the value of the '<em><b>Name</b></em>' attribute. */
  getName(): string | null;
  /** Sets the value of the '{@link getName() <em>Name</em>}' attribute. */
  setName(value: string | null): void;
  /** Returns the value of the '<em><b>Compass pt</b></em>' attribute. */
  getCompass_pt(): string | null;
  /** Sets the value of the '{@link getCompass_pt() <em>Compass pt</em>}' attribute. */
  setCompass_pt(value: string | null): void;
}

/**
 * An implementation of the model object '<em><b>Port</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`. Not ported: `eSet`,
 * `eUnset`, notifications.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java
 */
export class PortImpl extends BasicEObjectImpl implements Port {
  /** The default value of the '{@link getName() <em>Name</em>}' attribute. */
  protected static readonly NAME_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getName() <em>Name</em>}' attribute. */
  protected name: string | null = PortImpl.NAME_EDEFAULT;
  /** The default value of the '{@link getCompass_pt() <em>Compass pt</em>}' attribute. */
  protected static readonly COMPASS_PT_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getCompass_pt() <em>Compass pt</em>}' attribute. */
  protected compass_pt: string | null = PortImpl.COMPASS_PT_EDEFAULT;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.PORT;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  getName(): string | null {
    return this.name;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  setName(newName: string | null): void {
    this.name = newName;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  getCompass_pt(): string | null {
    return this.compass_pt;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  setCompass_pt(newCompass_pt: string | null): void {
    this.compass_pt = newCompass_pt;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.PORT__NAME:
        return this.getName();
      case DotPackage.PORT__COMPASS_PT:
        return this.getCompass_pt();
    }
    throw noGeneratedCase('eGet', featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.PORT__NAME:
        return PortImpl.NAME_EDEFAULT === null ? this.name !== null : PortImpl.NAME_EDEFAULT !== this.name;
      case DotPackage.PORT__COMPASS_PT:
        return PortImpl.COMPASS_PT_EDEFAULT === null
          ? this.compass_pt !== null
          : PortImpl.COMPASS_PT_EDEFAULT !== this.compass_pt;
    }
    throw noGeneratedCase('eIsSet', featureID);
  }

  /** Not generated (the model has no opposite references); see `StatementImpl.eBasicRemoveFromContainerFeature`. */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** A port has no containment feature. */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/PortImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (name: ${this.name}, compass_pt: ${this.compass_pt})`;
  }
}
