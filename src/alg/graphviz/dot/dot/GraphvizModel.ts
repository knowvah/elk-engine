// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import { implClassName, noGeneratedCase } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';
import type { Graph } from './Graph.js';

/**
 * A representation of the model object '<em><b>Graphviz Model</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/GraphvizModel.java
 */
export interface GraphvizModel extends DotEObject {
  /** Returns the value of the '<em><b>Graphs</b></em>' containment reference list. */
  getGraphs(): EList<Graph>;
}

/**
 * An implementation of the model object '<em><b>Graphviz Model</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`. Not ported: `eSet`,
 * `eUnset`, notifications; the `NotificationChain` returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java
 */
export class GraphvizModelImpl extends BasicEObjectImpl implements GraphvizModel {
  /** The cached value of the '{@link getGraphs() <em>Graphs</em>}' containment reference list. */
  protected graphs: EObjectContainmentEList<Graph> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.GRAPHVIZ_MODEL;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java */
  getGraphs(): EObjectContainmentEList<Graph> {
    if (this.graphs === null) {
      this.graphs = new EObjectContainmentEList<Graph>(this, DotPackage.GRAPHVIZ_MODEL__GRAPHS);
    }
    return this.graphs;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.GRAPHVIZ_MODEL__GRAPHS:
        this.getGraphs().basicRemove(otherEnd as Graph);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.GRAPHVIZ_MODEL__GRAPHS:
        return this.getGraphs();
    }
    throw noGeneratedCase('eGet', featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphvizModelImpl.java */
  eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.GRAPHVIZ_MODEL__GRAPHS:
        return this.graphs !== null && !this.graphs.isEmpty();
    }
    throw noGeneratedCase('eIsSet', featureID);
  }

  /** Not generated (the model has no opposite references); see `StatementImpl.eBasicRemoveFromContainerFeature`. */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** The containment lists in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.getGraphs()];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }
}
