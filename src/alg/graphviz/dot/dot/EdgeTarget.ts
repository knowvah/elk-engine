// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { implClassName, noGeneratedCase, singleContainment } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';
import { EdgeOperator } from './EdgeOperator.js';
import type { Node } from './Node.js';
import type { Subgraph } from './Subgraph.js';

/**
 * A representation of the model object '<em><b>Edge Target</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/EdgeTarget.java
 */
export interface EdgeTarget extends DotEObject {
  /** Returns the value of the '<em><b>Operator</b></em>' attribute. */
  getOperator(): EdgeOperator;
  /** Sets the value of the '{@link getOperator() <em>Operator</em>}' attribute (`null` stores the default). */
  setOperator(value: EdgeOperator | null): void;
  /** Returns the value of the '<em><b>Target Subgraph</b></em>' containment reference. */
  getTargetSubgraph(): Subgraph | null;
  /** Sets the value of the '{@link getTargetSubgraph() <em>Target Subgraph</em>}' containment reference. */
  setTargetSubgraph(value: Subgraph | null): void;
  /** Returns the value of the '<em><b>Targetnode</b></em>' containment reference. */
  getTargetnode(): Node | null;
  /** Sets the value of the '{@link getTargetnode() <em>Targetnode</em>}' containment reference. */
  setTargetnode(value: Node | null): void;
}

/**
 * An implementation of the model object '<em><b>Edge Target</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`. Not ported: `eSet`,
 * `eUnset`, notifications (incl. the `else eNotify` arms of the setters); the `NotificationChain` returns are
 * dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java
 */
export class EdgeTargetImpl extends BasicEObjectImpl implements EdgeTarget {
  /** The default value of the '{@link getOperator() <em>Operator</em>}' attribute. */
  protected static readonly OPERATOR_EDEFAULT: EdgeOperator = EdgeOperator.DIRECTED;
  /** The cached value of the '{@link getOperator() <em>Operator</em>}' attribute. */
  protected operator: EdgeOperator = EdgeTargetImpl.OPERATOR_EDEFAULT;
  /** The cached value of the '{@link getTargetSubgraph() <em>Target Subgraph</em>}' containment reference. */
  protected targetSubgraph: Subgraph | null = null;
  /** The cached value of the '{@link getTargetnode() <em>Targetnode</em>}' containment reference. */
  protected targetnode: Node | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.EDGE_TARGET;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  getOperator(): EdgeOperator {
    return this.operator;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  setOperator(newOperator: EdgeOperator | null): void {
    this.operator = newOperator === null ? EdgeTargetImpl.OPERATOR_EDEFAULT : newOperator;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  getTargetSubgraph(): Subgraph | null {
    return this.targetSubgraph;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  basicSetTargetSubgraph(newTargetSubgraph: Subgraph | null): void {
    this.targetSubgraph = newTargetSubgraph;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  setTargetSubgraph(newTargetSubgraph: Subgraph | null): void {
    if (newTargetSubgraph !== this.targetSubgraph) {
      if (this.targetSubgraph !== null) {
        this.targetSubgraph.eInverseRemove(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_TARGET__TARGET_SUBGRAPH);
      }
      if (newTargetSubgraph !== null) {
        newTargetSubgraph.eInverseAdd(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_TARGET__TARGET_SUBGRAPH);
      }
      this.basicSetTargetSubgraph(newTargetSubgraph);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  getTargetnode(): Node | null {
    return this.targetnode;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  basicSetTargetnode(newTargetnode: Node | null): void {
    this.targetnode = newTargetnode;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  setTargetnode(newTargetnode: Node | null): void {
    if (newTargetnode !== this.targetnode) {
      if (this.targetnode !== null) {
        this.targetnode.eInverseRemove(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_TARGET__TARGETNODE);
      }
      if (newTargetnode !== null) {
        newTargetnode.eInverseAdd(this, EOPPOSITE_FEATURE_BASE - DotPackage.EDGE_TARGET__TARGETNODE);
      }
      this.basicSetTargetnode(newTargetnode);
    }
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.EDGE_TARGET__TARGET_SUBGRAPH:
        this.basicSetTargetSubgraph(null);
        return;
      case DotPackage.EDGE_TARGET__TARGETNODE:
        this.basicSetTargetnode(null);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.EDGE_TARGET__OPERATOR:
        return this.getOperator();
      case DotPackage.EDGE_TARGET__TARGET_SUBGRAPH:
        return this.getTargetSubgraph();
      case DotPackage.EDGE_TARGET__TARGETNODE:
        return this.getTargetnode();
    }
    throw noGeneratedCase('eGet', featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.EDGE_TARGET__OPERATOR:
        return this.operator !== EdgeTargetImpl.OPERATOR_EDEFAULT;
      case DotPackage.EDGE_TARGET__TARGET_SUBGRAPH:
        return this.targetSubgraph !== null;
      case DotPackage.EDGE_TARGET__TARGETNODE:
        return this.targetnode !== null;
    }
    throw noGeneratedCase('eIsSet', featureID);
  }

  /** Not generated (the model has no opposite references); see `StatementImpl.eBasicRemoveFromContainerFeature`. */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** The containments in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [singleContainment(this.targetSubgraph), singleContainment(this.targetnode)];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/EdgeTargetImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (operator: ${this.operator.toString()})`;
  }
}
