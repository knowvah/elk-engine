// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import * as Strings from '../../guava/Strings.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import { ElkConnectableShapeImpl } from './ElkConnectableShapeImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Port</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications (incl. the `else eNotify`
 * arm of `setParent`), the `eIsProxy()` arm of `toString` (no proxies). The `NotificationChain`
 * returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java
 */
export class ElkPortImpl extends ElkConnectableShapeImpl implements ElkPort {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_PORT;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  getParent(): ElkNode | null {
    if (this.eContainerFeatureID() !== ElkGraphPackage.ELK_PORT__PARENT) return null;
    return this.eInternalContainer() as ElkNode | null;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  basicSetParent(newParent: ElkNode | null): void {
    this.eBasicSetContainer(newParent, ElkGraphPackage.ELK_PORT__PARENT);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  setParent(newParent: ElkNode | null): void {
    if (
      newParent !== this.eInternalContainer() ||
      (this.eContainerFeatureID() !== ElkGraphPackage.ELK_PORT__PARENT && newParent !== null)
    ) {
      if (EcoreUtil.isAncestor(this, newParent))
        throw new IllegalArgumentException(`Recursive containment not allowed for ${this.toString()}`);
      if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
      if (newParent !== null) newParent.eInverseAdd(this, ElkGraphPackage.ELK_NODE__PORTS);
      this.basicSetParent(newParent);
    }
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_PORT__PARENT:
        if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
        this.basicSetParent(otherEnd as ElkNode);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_PORT__PARENT:
        this.basicSetParent(null);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /**
   * Callers reach this only with a container set (`eBasicRemoveFromContainer`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java
   */
  override eBasicRemoveFromContainerFeature(): void {
    switch (this.eContainerFeatureID()) {
      case ElkGraphPackage.ELK_PORT__PARENT:
        (this.eInternalContainer() as InternalEObject).eInverseRemove(this, ElkGraphPackage.ELK_NODE__PORTS);
        return;
    }
    super.eBasicRemoveFromContainerFeature();
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * Hand-written in the Java: `ElkPort "id" (x,y | width,height)`, the first label's text standing
   * in for an empty identifier; doubles as Java's `Double.toString`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPortImpl.java
   */
  override toString(): string {
    let builder = 'ElkPort';
    const id = this.getIdentifier();
    if (!Strings.isNullOrEmpty(id)) {
      builder += ` "${id}"`;
    } else if (this.getLabels().size() > 0) {
      const text = this.getLabels().get(0).getText();
      if (!Strings.isNullOrEmpty(text)) {
        builder += ` "${text}"`;
      }
    }
    builder +=
      ` (${doubleToString(this.x)},${doubleToString(this.y)} | ` +
      `${doubleToString(this.width)},${doubleToString(this.height)})`;
    return builder;
  }
}

registerImpl('ElkPort', ElkPortImpl);
