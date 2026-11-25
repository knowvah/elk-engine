// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { implClassName, noGeneratedCase, singleContainment } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';
import type { Port } from './Port.js';

/**
 * A representation of the model object '<em><b>Node</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Node.java
 */
export interface Node extends DotEObject {
  /** Returns the value of the '<em><b>Name</b></em>' attribute. */
  getName(): string | null;
  /** Sets the value of the '{@link getName() <em>Name</em>}' attribute. */
  setName(value: string | null): void;
  /** Returns the value of the '<em><b>Port</b></em>' containment reference. */
  getPort(): Port | null;
  /** Sets the value of the '{@link getPort() <em>Port</em>}' containment reference. */
  setPort(value: Port | null): void;
}

/**
 * An implementation of the model object '<em><b>Node</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`. Not ported: `eSet`,
 * `eUnset`, notifications (incl. the `else eNotify` arm of `setPort`); the `NotificationChain` returns are
 * dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java
 */
export class NodeImpl extends BasicEObjectImpl implements Node {
  /** The default value of the '{@link getName() <em>Name</em>}' attribute. */
  protected static readonly NAME_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getName() <em>Name</em>}' attribute. */
  protected name: string | null = NodeImpl.NAME_EDEFAULT;
  /** The cached value of the '{@link getPort() <em>Port</em>}' containment reference. */
  protected port: Port | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.NODE;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  getName(): string | null {
    return this.name;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  setName(newName: string | null): void {
    this.name = newName;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  getPort(): Port | null {
    return this.port;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  basicSetPort(newPort: Port | null): void {
    this.port = newPort;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  setPort(newPort: Port | null): void {
    if (newPort !== this.port) {
      if (this.port !== null) this.port.eInverseRemove(this, EOPPOSITE_FEATURE_BASE - DotPackage.NODE__PORT);
      if (newPort !== null) newPort.eInverseAdd(this, EOPPOSITE_FEATURE_BASE - DotPackage.NODE__PORT);
      this.basicSetPort(newPort);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.NODE__PORT:
        this.basicSetPort(null);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.NODE__NAME:
        return this.getName();
      case DotPackage.NODE__PORT:
        return this.getPort();
    }
    throw noGeneratedCase('eGet', featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.NODE__NAME:
        return NodeImpl.NAME_EDEFAULT === null ? this.name !== null : NodeImpl.NAME_EDEFAULT !== this.name;
      case DotPackage.NODE__PORT:
        return this.port !== null;
    }
    throw noGeneratedCase('eIsSet', featureID);
  }

  /** Not generated (the model has no opposite references); see `StatementImpl.eBasicRemoveFromContainerFeature`. */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** The containments in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [singleContainment(this.port)];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/NodeImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (name: ${this.name})`;
  }
}
