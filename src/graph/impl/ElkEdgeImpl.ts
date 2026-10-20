// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { EObjectContainmentWithInverseEList } from '../../emf/ecore/util/EObjectContainmentWithInverseEList.js';
import { ManyInverse } from '../../emf/ecore/util/EObjectWithInverseResolvingEList.js';
import { EcoreUtil } from '../../emf/ecore/util/EcoreUtil.js';
import * as Joiner from '../../guava/Joiner.js';
import * as Strings from '../../guava/Strings.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { ElkConnectableShape } from '../ElkConnectableShape.js';
import type { ElkEdge } from '../ElkEdge.js';
import type { ElkEdgeSection } from '../ElkEdgeSection.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { ElkNode } from '../ElkNode.js';
import { ElkGraphUtil } from '../util/ElkGraphUtil.js';
import { ElkGraphElementImpl } from './ElkGraphElementImpl.js';

/**
 * An implementation of the model object '<em><b>Elk Edge</b></em>'. `sources`/`targets` are
 * `EObjectWithInverseResolvingEList.ManyInverse` as in Java (D13): `get` resolves proxy endpoints.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications (incl. the `else eNotify` arm
 * of `setContainingNode`).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java
 */
export class ElkEdgeImpl extends ElkGraphElementImpl implements ElkEdge {
  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected sources: ManyInverse<ElkConnectableShape> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected targets: ManyInverse<ElkConnectableShape> | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected sections: EObjectContainmentWithInverseEList<ElkEdgeSection> | null = null;

  /** Default of the derived `hyperedge` attribute (read by the unported `eIsSet`). @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected static readonly HYPEREDGE_EDEFAULT: boolean = false;

  /** Default of the derived `hierarchical` attribute. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected static readonly HIERARCHICAL_EDEFAULT: boolean = false;

  /** Default of the derived `selfloop` attribute. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected static readonly SELFLOOP_EDEFAULT: boolean = false;

  /** Default of the derived `connected` attribute. @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected static readonly CONNECTED_EDEFAULT: boolean = false;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  protected override eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_EDGE;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  getContainingNode(): ElkNode | null {
    if (this.eContainerFeatureID() !== ElkGraphPackage.ELK_EDGE__CONTAINING_NODE) return null;
    return this.eInternalContainer() as ElkNode | null;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  basicSetContainingNode(newContainingNode: ElkNode | null): void {
    this.eBasicSetContainer(newContainingNode, ElkGraphPackage.ELK_EDGE__CONTAINING_NODE);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  setContainingNode(newContainingNode: ElkNode | null): void {
    if (
      newContainingNode !== this.eInternalContainer() ||
      (this.eContainerFeatureID() !== ElkGraphPackage.ELK_EDGE__CONTAINING_NODE && newContainingNode !== null)
    ) {
      if (EcoreUtil.isAncestor(this, newContainingNode))
        throw new IllegalArgumentException(`Recursive containment not allowed for ${this.toString()}`);
      if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
      if (newContainingNode !== null) newContainingNode.eInverseAdd(this, ElkGraphPackage.ELK_NODE__CONTAINED_EDGES);
      this.basicSetContainingNode(newContainingNode);
    }
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  getSources(): ManyInverse<ElkConnectableShape> {
    if (this.sources === null) {
      this.sources = new ManyInverse<ElkConnectableShape>(
        this,
        ElkGraphPackage.ELK_EDGE__SOURCES,
        ElkGraphPackage.ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES,
      );
    }
    return this.sources;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  getTargets(): ManyInverse<ElkConnectableShape> {
    if (this.targets === null) {
      this.targets = new ManyInverse<ElkConnectableShape>(
        this,
        ElkGraphPackage.ELK_EDGE__TARGETS,
        ElkGraphPackage.ELK_CONNECTABLE_SHAPE__INCOMING_EDGES,
      );
    }
    return this.targets;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  getSections(): EObjectContainmentWithInverseEList<ElkEdgeSection> {
    if (this.sections === null) {
      this.sections = new EObjectContainmentWithInverseEList<ElkEdgeSection>(
        this,
        ElkGraphPackage.ELK_EDGE__SECTIONS,
        ElkGraphPackage.ELK_EDGE_SECTION__PARENT,
      );
    }
    return this.sections;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  isHyperedge(): boolean {
    return !(this.getSources().size() <= 1 && this.getTargets().size() <= 1);
  }

  /**
   * A port without a parent node fails at `shapeNode.getParent()` with a `TypeError`, as Java's NPE.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java
   */
  isHierarchical(): boolean {
    let commonRepresentingNode: ElkNode | null = null;
    for (const incidentShape of ElkGraphUtil.allIncidentShapes(this)) {
      const shapeNode = ElkGraphUtil.connectableShapeToNode(incidentShape) as ElkNode;
      if (commonRepresentingNode === null) {
        commonRepresentingNode = shapeNode.getParent();
      } else if (commonRepresentingNode !== shapeNode.getParent()) {
        return true;
      }
    }
    return false;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  isSelfloop(): boolean {
    let commonNode: ElkNode | null = null;
    for (const incidentShape of ElkGraphUtil.allIncidentShapes(this)) {
      const shapeNode = ElkGraphUtil.connectableShapeToNode(incidentShape);
      if (commonNode === null) {
        commonNode = shapeNode;
      } else if (commonNode !== shapeNode) {
        return false;
      }
    }
    return true;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  isConnected(): boolean {
    return !this.getSources().isEmpty() && !this.getTargets().isEmpty();
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  override eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_EDGE__CONTAINING_NODE:
        if (this.eInternalContainer() !== null) this.eBasicRemoveFromContainer();
        this.basicSetContainingNode(otherEnd as ElkNode);
        return;
      case ElkGraphPackage.ELK_EDGE__SOURCES:
        this.getSources().basicAdd(otherEnd as ElkConnectableShape);
        return;
      case ElkGraphPackage.ELK_EDGE__TARGETS:
        this.getTargets().basicAdd(otherEnd as ElkConnectableShape);
        return;
      case ElkGraphPackage.ELK_EDGE__SECTIONS:
        this.getSections().basicAdd(otherEnd as ElkEdgeSection);
        return;
    }
    super.eInverseAdd(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.ELK_EDGE__CONTAINING_NODE:
        this.basicSetContainingNode(null);
        return;
      case ElkGraphPackage.ELK_EDGE__SOURCES:
        this.getSources().basicRemove(otherEnd as ElkConnectableShape);
        return;
      case ElkGraphPackage.ELK_EDGE__TARGETS:
        this.getTargets().basicRemove(otherEnd as ElkConnectableShape);
        return;
      case ElkGraphPackage.ELK_EDGE__SECTIONS:
        this.getSections().basicRemove(otherEnd as ElkEdgeSection);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /**
   * Callers reach this only with a container set (`eBasicRemoveFromContainer`).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java
   */
  override eBasicRemoveFromContainerFeature(): void {
    switch (this.eContainerFeatureID()) {
      case ElkGraphPackage.ELK_EDGE__CONTAINING_NODE:
        (this.eInternalContainer() as InternalEObject).eInverseRemove(this, ElkGraphPackage.ELK_NODE__CONTAINED_EDGES);
        return;
    }
    super.eBasicRemoveFromContainerFeature();
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * Hand-written in the Java: `ElkEdge "id" src -> tgt`, endpoints joined by `Joiner.on(", ")` and
   * bracketed for a hyperedge. Java joins the `sources`/`targets` fields, which `isHyperedge()` has
   * initialized by then.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java
   */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    let builder = 'ElkEdge';
    const id = this.getIdentifier();
    if (!Strings.isNullOrEmpty(id)) {
      builder += ` "${id}"`;
    } else if (this.getLabels().size() > 0) {
      const text = this.getLabels().get(0).getText();
      if (!Strings.isNullOrEmpty(text)) {
        builder += ` "${text}"`;
      }
    }
    const hyperedge = this.isHyperedge();
    // Java's if/else: ' [' for a hyperedge, ' ' otherwise (a conditional keeps the 30-NLOC limit)
    builder += hyperedge ? ' [' : ' ';
    builder += Joiner.on(', ').join(this.sources as ManyInverse<ElkConnectableShape>);
    if (hyperedge) {
      builder += ']';
    }
    builder += ' -> ';
    if (hyperedge) {
      builder += '[';
    }
    builder += Joiner.on(', ').join(this.targets as ManyInverse<ElkConnectableShape>);
    if (hyperedge) {
      builder += ']';
    }
    return builder;
  }

  /**
   * The containment features in `elkgraph.ecore` declaration order: `properties`, `labels`,
   * `sections` (D4).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkEdgeImpl.java
   */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getSections()];
  }
}

registerImpl('ElkEdge', ElkEdgeImpl);
