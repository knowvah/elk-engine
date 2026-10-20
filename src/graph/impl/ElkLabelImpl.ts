// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkLabel } from '../ElkLabel.js';
import { ElkShapeImpl } from './ElkShapeImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Label</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications (incl. the `else eNotify`
 * arm of `setParent`), The `NotificationChain`
 * returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java
 */
export class ElkLabelImpl extends ElkShapeImpl implements ElkLabel {
  /**
   * The default value of the '{@link getText() <em>Text</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java
   */
  protected static readonly TEXT_EDEFAULT: string | null = '';

  /**
   * The cached value of the '{@link getText() <em>Text</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java
   */
  protected text: string | null = ElkLabelImpl.TEXT_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_LABEL;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  getParent(): ElkGraphElement | null {
    if (this.eContainerFeatureID() !== ElkGraphPackage.ELK_LABEL__PARENT) return null;
    return this.eInternalContainer() as ElkGraphElement | null;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  basicSetParent(newParent: ElkGraphElement | null): void {
    this.eBasicSetContainer(newParent, ElkGraphPackage.ELK_LABEL__PARENT);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  setParent(newParent: ElkGraphElement | null): void {
    if (
      newParent !== this.eInternalContainer() ||
      (this.eContainerFeatureID() !== ElkGraphPackage.ELK_LABEL__PARENT && newParent !== null)
    ) {
      if (EcoreUtil.isAncestor(this, newParent))
        throw new IllegalArgumentException(`Recursive containment not allowed for ${this.toString()}`);
      if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
      if (newParent !== null) newParent.eInverseAdd(this, ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS);
      this.basicSetParent(newParent);
    }
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  getText(): string | null {
    return this.text;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  setText(newText: string | null): void {
    this.text = newText;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_LABEL__PARENT:
        if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
        this.basicSetParent(otherEnd as ElkGraphElement);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_LABEL__PARENT:
        this.basicSetParent(null);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /**
   * Callers reach this only with a container set (`eBasicRemoveFromContainer`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java
   */
  override eBasicRemoveFromContainerFeature(): void {
    switch (this.eContainerFeatureID()) {
      case ElkGraphPackage.ELK_LABEL__PARENT:
        (this.eInternalContainer() as InternalEObject).eInverseRemove(this, ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS);
        return;
    }
    super.eBasicRemoveFromContainerFeature();
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * Hand-written in the Java: `ElkLabel "text" (x,y | width,height)`, the text part omitted when the
   * text is null or empty (`Strings.isNullOrEmpty`); doubles as Java's `Double.toString`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkLabelImpl.java
   */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    let builder = 'ElkLabel';
    // Label text
    if (!(this.text === null || this.text === '')) {
      builder += ` "${this.text}"`;
    }
    // Position
    builder +=
      ` (${doubleToString(this.x)},${doubleToString(this.y)} | ` +
      `${doubleToString(this.width)},${doubleToString(this.height)})`;
    return builder;
  }
}

registerImpl('ElkLabel', ElkLabelImpl);
