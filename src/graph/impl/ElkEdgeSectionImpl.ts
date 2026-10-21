// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EObjectContainmentEList } from '../../emf/ecore/util/EObjectContainmentEList.js';
import { ManyInverse } from '../../emf/ecore/util/EObjectWithInverseEList.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkBendPoint } from '../ElkBendPoint.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import { EMapPropertyHolderImpl } from './EMapPropertyHolderImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Edge Section</b></em>'. The section lists are
 * `EObjectWithInverseResolvingEList.ManyInverse` in Java; proxy resolution is not ported, leaving
 * `ManyInverse`, and the shape getters skip their `eIsProxy()` resolution arm. Not ported (D4):
 * `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications (incl. the `else eNotify` arm of `setParent`).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java
 */
export class ElkEdgeSectionImpl extends EMapPropertyHolderImpl implements ElkEdgeSection {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected static readonly START_X_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected startX: number = ElkEdgeSectionImpl.START_X_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected static readonly START_Y_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected startY: number = ElkEdgeSectionImpl.START_Y_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected static readonly END_X_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected endX: number = ElkEdgeSectionImpl.END_X_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected static readonly END_Y_EDEFAULT = 0.0;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected endY: number = ElkEdgeSectionImpl.END_Y_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected bendPoints: EObjectContainmentEList<ElkBendPoint> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected outgoingShape: ElkConnectableShape | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected incomingShape: ElkConnectableShape | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected outgoingSections: ManyInverse<ElkEdgeSection> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected incomingSections: ManyInverse<ElkEdgeSection> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected static readonly IDENTIFIER_EDEFAULT: string | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected identifier: string | null = ElkEdgeSectionImpl.IDENTIFIER_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_EDGE_SECTION;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getStartX(): number {
    return this.startX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setStartX(newStartX: number): void {
    this.startX = newStartX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getStartY(): number {
    return this.startY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setStartY(newStartY: number): void {
    this.startY = newStartY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getEndX(): number {
    return this.endX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setEndX(newEndX: number): void {
    this.endX = newEndX;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getEndY(): number {
    return this.endY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setEndY(newEndY: number): void {
    this.endY = newEndY;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getBendPoints(): EObjectContainmentEList<ElkBendPoint> {
    if (this.bendPoints === null) {
      this.bendPoints = new EObjectContainmentEList<ElkBendPoint>(this, ElkGraphPackage.ELK_EDGE_SECTION__BEND_POINTS);
    }
    return this.bendPoints;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getParent(): ElkEdge | null {
    if (this.eContainerFeatureID() !== ElkGraphPackage.ELK_EDGE_SECTION__PARENT) return null;
    return this.eInternalContainer() as ElkEdge | null;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  basicSetParent(newParent: ElkEdge | null): void {
    this.eBasicSetContainer(newParent, ElkGraphPackage.ELK_EDGE_SECTION__PARENT);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setParent(newParent: ElkEdge | null): void {
    if (
      newParent !== this.eInternalContainer() ||
      (this.eContainerFeatureID() !== ElkGraphPackage.ELK_EDGE_SECTION__PARENT && newParent !== null)
    ) {
      if (EcoreUtil.isAncestor(this, newParent))
        throw new IllegalArgumentException(`Recursive containment not allowed for ${this.toString()}`);
      if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
      if (newParent !== null) newParent.eInverseAdd(this, ElkGraphPackage.ELK_EDGE__SECTIONS);
      this.basicSetParent(newParent);
    }
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getOutgoingShape(): ElkConnectableShape | null {
    return this.outgoingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  basicGetOutgoingShape(): ElkConnectableShape | null {
    return this.outgoingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setOutgoingShape(newOutgoingShape: ElkConnectableShape | null): void {
    this.outgoingShape = newOutgoingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getIncomingShape(): ElkConnectableShape | null {
    return this.incomingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  basicGetIncomingShape(): ElkConnectableShape | null {
    return this.incomingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setIncomingShape(newIncomingShape: ElkConnectableShape | null): void {
    this.incomingShape = newIncomingShape;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getOutgoingSections(): ManyInverse<ElkEdgeSection> {
    if (this.outgoingSections === null) {
      this.outgoingSections = new ManyInverse<ElkEdgeSection>(
        this,
        ElkGraphPackage.ELK_EDGE_SECTION__OUTGOING_SECTIONS,
        ElkGraphPackage.ELK_EDGE_SECTION__INCOMING_SECTIONS,
      );
    }
    return this.outgoingSections;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getIncomingSections(): ManyInverse<ElkEdgeSection> {
    if (this.incomingSections === null) {
      this.incomingSections = new ManyInverse<ElkEdgeSection>(
        this,
        ElkGraphPackage.ELK_EDGE_SECTION__INCOMING_SECTIONS,
        ElkGraphPackage.ELK_EDGE_SECTION__OUTGOING_SECTIONS,
      );
    }
    return this.incomingSections;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  getIdentifier(): string | null {
    return this.identifier;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setIdentifier(newIdentifier: string | null): void {
    this.identifier = newIdentifier;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setStartLocation(x: number, y: number): void {
    this.setStartX(x);
    this.setStartY(y);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  setEndLocation(x: number, y: number): void {
    this.setEndX(x);
    this.setEndY(y);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_EDGE_SECTION__PARENT:
        if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
        this.basicSetParent(otherEnd as ElkEdge);
        return;
      case ElkGraphPackage.ELK_EDGE_SECTION__OUTGOING_SECTIONS:
        this.getOutgoingSections().basicAdd(otherEnd as ElkEdgeSection);
        return;
      case ElkGraphPackage.ELK_EDGE_SECTION__INCOMING_SECTIONS:
        this.getIncomingSections().basicAdd(otherEnd as ElkEdgeSection);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /**
   * The `BEND_POINTS` case is reached through `EOPPOSITE_FEATURE_BASE - id` when a bend point leaves
   * this section (opposite-less containment).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java
   */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_EDGE_SECTION__BEND_POINTS:
        this.getBendPoints().basicRemove(otherEnd as ElkBendPoint);
        return;
      case ElkGraphPackage.ELK_EDGE_SECTION__PARENT:
        this.basicSetParent(null);
        return;
      case ElkGraphPackage.ELK_EDGE_SECTION__OUTGOING_SECTIONS:
        this.getOutgoingSections().basicRemove(otherEnd as ElkEdgeSection);
        return;
      case ElkGraphPackage.ELK_EDGE_SECTION__INCOMING_SECTIONS:
        this.getIncomingSections().basicRemove(otherEnd as ElkEdgeSection);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /**
   * Callers reach this only with a container set (`eBasicRemoveFromContainer`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java
   */
  override eBasicRemoveFromContainerFeature(): void {
    switch (this.eContainerFeatureID()) {
      case ElkGraphPackage.ELK_EDGE_SECTION__PARENT:
        (this.eInternalContainer() as InternalEObject).eInverseRemove(this, ElkGraphPackage.ELK_EDGE__SECTIONS);
        return;
    }
    super.eBasicRemoveFromContainerFeature();
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * The generated `StringBuffer` body after `super.toString()` (D10: no `@identityHash`);
   * `append(double)` writes Java's `Double.toString`, `append(String)` writes `null` as `"null"`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java
   */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return (
      `${super.toString()} (startX: ${doubleToString(this.startX)}, startY: ${doubleToString(this.startY)}, ` +
      `endX: ${doubleToString(this.endX)}, endY: ${doubleToString(this.endY)}, identifier: ${this.identifier})`
    );
  }

  /**
   * The containment features in `elkgraph.ecore` declaration order: `properties`, `bendPoints` (D4).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeSectionImpl.java
   */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getBendPoints()];
  }
}

registerImpl('ElkEdgeSection', ElkEdgeSectionImpl);
