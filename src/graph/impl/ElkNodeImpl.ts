// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EObjectContainmentWithInverseEList } from '../../emf/ecore/util/EObjectContainmentWithInverseEList.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import * as Strings from '../../guava/Strings.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkEdge } from '../ElkEdge.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkNode } from '../ElkNode.js';
import type { ElkPort } from '../ElkPort.js';
import { ElkConnectableShapeImpl } from './ElkConnectableShapeImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Node</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications (incl. the `else eNotify`
 * arm of `setParent`), The `NotificationChain`
 * returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
 */
export class ElkNodeImpl extends ElkConnectableShapeImpl implements ElkNode {
  /**
   * The cached value of the '{@link getPorts() <em>Ports</em>}' containment reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  protected ports: EObjectContainmentWithInverseEList<ElkPort> | null = null;

  /**
   * The cached value of the '{@link getChildren() <em>Children</em>}' containment reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  protected children: EObjectContainmentWithInverseEList<ElkNode> | null = null;

  /**
   * The cached value of the '{@link getContainedEdges() <em>Contained Edges</em>}' containment
   * reference list.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  protected containedEdges: EObjectContainmentWithInverseEList<ElkEdge> | null = null;

  /**
   * The default value of the '{@link isHierarchical() <em>Hierarchical</em>}' attribute (read by the
   * unported `eIsSet`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  protected static readonly HIERARCHICAL_EDEFAULT: boolean = false;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_NODE;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  getPorts(): EObjectContainmentWithInverseEList<ElkPort> {
    if (this.ports === null) {
      this.ports = new EObjectContainmentWithInverseEList<ElkPort>(
        this,
        ElkGraphPackage.ELK_NODE__PORTS,
        ElkGraphPackage.ELK_PORT__PARENT,
      );
    }
    return this.ports;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  getChildren(): EObjectContainmentWithInverseEList<ElkNode> {
    if (this.children === null) {
      this.children = new EObjectContainmentWithInverseEList<ElkNode>(
        this,
        ElkGraphPackage.ELK_NODE__CHILDREN,
        ElkGraphPackage.ELK_NODE__PARENT,
      );
    }
    return this.children;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  getParent(): ElkNode | null {
    if (this.eContainerFeatureID() !== ElkGraphPackage.ELK_NODE__PARENT) return null;
    return this.eInternalContainer() as ElkNode | null;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  basicSetParent(newParent: ElkNode | null): void {
    this.eBasicSetContainer(newParent, ElkGraphPackage.ELK_NODE__PARENT);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  setParent(newParent: ElkNode | null): void {
    if (
      newParent !== this.eInternalContainer() ||
      (this.eContainerFeatureID() !== ElkGraphPackage.ELK_NODE__PARENT && newParent !== null)
    ) {
      if (EcoreUtil.isAncestor(this, newParent))
        throw new IllegalArgumentException(`Recursive containment not allowed for ${this.toString()}`);
      if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
      if (newParent !== null) newParent.eInverseAdd(this, ElkGraphPackage.ELK_NODE__CHILDREN);
      this.basicSetParent(newParent);
    }
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  getContainedEdges(): EObjectContainmentWithInverseEList<ElkEdge> {
    if (this.containedEdges === null) {
      this.containedEdges = new EObjectContainmentWithInverseEList<ElkEdge>(
        this,
        ElkGraphPackage.ELK_NODE__CONTAINED_EDGES,
        ElkGraphPackage.ELK_EDGE__CONTAINING_NODE,
      );
    }
    return this.containedEdges;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  isHierarchical(): boolean {
    return this.getChildren().size() > 0;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_NODE__PORTS:
        this.getPorts().basicAdd(otherEnd as ElkPort);
        return;
      case ElkGraphPackage.ELK_NODE__CHILDREN:
        this.getChildren().basicAdd(otherEnd as ElkNode);
        return;
      case ElkGraphPackage.ELK_NODE__PARENT:
        if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
        this.basicSetParent(otherEnd as ElkNode);
        return;
      case ElkGraphPackage.ELK_NODE__CONTAINED_EDGES:
        this.getContainedEdges().basicAdd(otherEnd as ElkEdge);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_NODE__PORTS:
        this.getPorts().basicRemove(otherEnd as ElkPort);
        return;
      case ElkGraphPackage.ELK_NODE__CHILDREN:
        this.getChildren().basicRemove(otherEnd as ElkNode);
        return;
      case ElkGraphPackage.ELK_NODE__PARENT:
        this.basicSetParent(null);
        return;
      case ElkGraphPackage.ELK_NODE__CONTAINED_EDGES:
        this.getContainedEdges().basicRemove(otherEnd as ElkEdge);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /**
   * Callers reach this only with a container set (`eBasicRemoveFromContainer`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  override eBasicRemoveFromContainerFeature(): void {
    switch (this.eContainerFeatureID()) {
      case ElkGraphPackage.ELK_NODE__PARENT:
        (this.eInternalContainer() as InternalEObject).eInverseRemove(this, ElkGraphPackage.ELK_NODE__CHILDREN);
        return;
    }
    super.eBasicRemoveFromContainerFeature();
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * Hand-written in the Java: `ElkNode "id" (x,y | width,height)`, the first label's text standing
   * in for an empty identifier; doubles as Java's `Double.toString`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    let builder = 'ElkNode';
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

  /**
   * The containment features in `elkgraph.ecore` declaration order: `properties`, `labels`, `ports`,
   * `children`, `containedEdges` (D4).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkNodeImpl.java
   */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getPorts(), this.getChildren(), this.getContainedEdges()];
  }
}

registerImpl('ElkNode', ElkNodeImpl);
