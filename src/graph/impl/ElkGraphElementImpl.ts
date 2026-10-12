// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EObjectContainmentWithInverseEList } from '../../emf/ecore/util/EObjectContainmentWithInverseEList.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkLabel } from '../ElkLabel.js';
import { EMapPropertyHolderImpl } from './EMapPropertyHolderImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Graph Element</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications, the `eIsProxy()` arm of
 * `toString` (no proxies).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
 */
export abstract class ElkGraphElementImpl extends EMapPropertyHolderImpl implements ElkGraphElement {
  /**
   * The cached value of the '{@link getLabels() <em>Labels</em>}' containment reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  protected labels: EObjectContainmentWithInverseEList<ElkLabel> | null = null;

  /**
   * The default value of the '{@link getIdentifier() <em>Identifier</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  protected static readonly IDENTIFIER_EDEFAULT: string | null = null;

  /**
   * The cached value of the '{@link getIdentifier() <em>Identifier</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  protected identifier: string | null = ElkGraphElementImpl.IDENTIFIER_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_GRAPH_ELEMENT;
  }

  /**
   * Returns the list class (a subtype of the interface's `EList<ElkLabel>`), so the generated
   * `basicAdd`/`basicRemove` calls need no `InternalEList` cast.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  getLabels(): EObjectContainmentWithInverseEList<ElkLabel> {
    if (this.labels === null) {
      this.labels = new EObjectContainmentWithInverseEList<ElkLabel>(
        this,
        ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS,
        ElkGraphPackage.ELK_LABEL__PARENT,
      );
    }
    return this.labels;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java */
  getIdentifier(): string | null {
    return this.identifier;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java */
  setIdentifier(newIdentifier: string | null): void {
    this.identifier = newIdentifier;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS:
        this.getLabels().basicAdd(otherEnd as ElkLabel);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_GRAPH_ELEMENT__LABELS:
        this.getLabels().basicRemove(otherEnd as ElkLabel);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * `StringBuffer.append(String)` writes `null` as `"null"`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  override toString(): string {
    return `${super.toString()} (identifier: ${this.identifier})`;
  }

  /**
   * The containment features in `elkgraph.ecore` declaration order: `properties`, `labels` (D4).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphElementImpl.java
   */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getLabels()];
  }
}

registerImpl('ElkGraphElement', ElkGraphElementImpl);
