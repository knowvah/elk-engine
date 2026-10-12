// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../emf/ecore/impl/BasicEObjectImpl.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { ElkBendPoint } from '../ElkBendPoint.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';

/** No contents: a bend point has no containment feature. */
const NO_CONTAINMENTS: ReadonlyArray<EList<InternalEObject>> = [];

/**
 * An implementation of the model object '<em><b>Elk Bend Point</b></em>'. Java extends
 * `MinimalEObjectImpl.Container`. A section contains its bend points without an opposite, so the
 * base `eInverseAdd`/`eInverseRemove` handle containment. Not ported (D4): `eGet`, `eSet`,
 * `eUnset`, `eIsSet`, notifications, the `eIsProxy()` arm of `toString` (no proxies).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java
 */
export class ElkBendPointImpl extends BasicEObjectImpl implements ElkBendPoint {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  protected static readonly X_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  protected x: number = ElkBendPointImpl.X_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  protected static readonly Y_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  protected y: number = ElkBendPointImpl.Y_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  protected eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_BEND_POINT;
  }

  /**
   * `MinimalEObjectImpl.eClass()`: the static class.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java
   */
  eClass(): EClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  getX(): number {
    return this.x;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  setX(newX: number): void {
    this.x = newX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  getY(): number {
    return this.y;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  setY(newY: number): void {
    this.y = newY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  set(x: number, y: number): void {
    this.setX(x);
    this.setY(y);
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java */
  override toString(): string {
    return `${super.toString()} (x: ${doubleToString(this.x)}, y: ${doubleToString(this.y)})`;
  }

  /**
   * Java inherits the metamodel-driven base (not ported, D3/D4); a bend point's container feature
   * id is always negative (opposite-less containment), so this is never reached from
   * `eBasicRemoveFromContainer`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java
   */
  eBasicRemoveFromContainerFeature(): void {
    throw new UnsupportedOperationException(
      `eBasicRemoveFromContainerFeature: no generated case for feature ${this.eContainerFeatureID()}`,
    );
  }

  /**
   * A bend point has no containment feature.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkBendPointImpl.java
   */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return NO_CONTAINMENTS;
  }
}

registerImpl('ElkBendPoint', ElkBendPointImpl);
