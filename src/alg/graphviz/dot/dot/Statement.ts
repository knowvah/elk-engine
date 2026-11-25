// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { implClassName, noGeneratedCase } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';

/**
 * A representation of the model object '<em><b>Statement</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Statement.java
 */
export type Statement = DotEObject;

/**
 * An implementation of the model object '<em><b>Statement</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`, which carries the container
 * storage. Not ported: `eSet`, `eUnset`, notifications.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/StatementImpl.java
 */
export class StatementImpl extends BasicEObjectImpl implements Statement {
  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/StatementImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.STATEMENT;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** The `BasicEObjectImpl` end of the generated `eGet` chain: no statement feature (see `noGeneratedCase`). */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    throw noGeneratedCase('eGet', featureID);
  }

  /** The `BasicEObjectImpl` end of the generated `eIsSet` chain: no statement feature (see `noGeneratedCase`). */
  eIsSet(featureID: number): boolean {
    throw noGeneratedCase('eIsSet', featureID);
  }

  /**
   * Java inherits the metamodel-driven base (not ported). Every DOT containment has no opposite, so a
   * contained object's container feature id is negative and `eBasicRemoveFromContainer` never comes here.
   */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** A statement has no containment feature; each statement kind lists its own. */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }
}
