// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import { type DotEClass, DotPackage } from './DotPackage.js';
import { type Statement, StatementImpl } from './Statement.js';

/**
 * A representation of the model object '<em><b>Subgraph</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Subgraph.java
 */
export interface Subgraph extends Statement {
  /** Returns the value of the '<em><b>Name</b></em>' attribute. */
  getName(): string | null;
  /** Sets the value of the '{@link getName() <em>Name</em>}' attribute. */
  setName(value: string | null): void;
  /** Returns the value of the '<em><b>Statements</b></em>' containment reference list. */
  getStatements(): EList<Statement>;
}

/**
 * An implementation of the model object '<em><b>Subgraph</b></em>'. Not ported: `eSet`, `eUnset`,
 * notifications; the `NotificationChain` returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java
 */
export class SubgraphImpl extends StatementImpl implements Subgraph {
  /** The default value of the '{@link getName() <em>Name</em>}' attribute. */
  protected static readonly NAME_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getName() <em>Name</em>}' attribute. */
  protected name: string | null = SubgraphImpl.NAME_EDEFAULT;
  /** The cached value of the '{@link getStatements() <em>Statements</em>}' containment reference list. */
  protected statements: EObjectContainmentEList<Statement> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  protected override eStaticClass(): DotEClass {
    return DotPackage.Literals.SUBGRAPH;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  getName(): string | null {
    return this.name;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  setName(newName: string | null): void {
    this.name = newName;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  getStatements(): EObjectContainmentEList<Statement> {
    if (this.statements === null) {
      this.statements = new EObjectContainmentEList<Statement>(this, DotPackage.SUBGRAPH__STATEMENTS);
    }
    return this.statements;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.SUBGRAPH__STATEMENTS:
        this.getStatements().basicRemove(otherEnd as Statement);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  override eGet(featureID: number, resolve: boolean, coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.SUBGRAPH__NAME:
        return this.getName();
      case DotPackage.SUBGRAPH__STATEMENTS:
        return this.getStatements();
    }
    return super.eGet(featureID, resolve, coreType);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  override eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.SUBGRAPH__NAME:
        return SubgraphImpl.NAME_EDEFAULT === null ? this.name !== null : SubgraphImpl.NAME_EDEFAULT !== this.name;
      case DotPackage.SUBGRAPH__STATEMENTS:
        return this.statements !== null && !this.statements.isEmpty();
    }
    return super.eIsSet(featureID);
  }

  /** The containment lists in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected override eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [...super.eContainmentFeatures(), this.getStatements()];
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/SubgraphImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (name: ${this.name})`;
  }
}
