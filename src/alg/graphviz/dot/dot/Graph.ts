// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../../../emf/common/util/EList.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../../../emf/ecore/impl/BasicEObjectImpl.js';
import { EObjectContainmentEList } from '../../../../emf/ecore/util/EObjectContainmentEList.js';
import { implClassName, noGeneratedCase } from './DotEObjectSupport.js';
import { type DotEClass, type DotEObject, DotPackage } from './DotPackage.js';
import { GraphType } from './GraphType.js';
import type { Statement } from './Statement.js';

/**
 * A representation of the model object '<em><b>Graph</b></em>'.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/Graph.java
 */
export interface Graph extends DotEObject {
  /** Returns the value of the '<em><b>Strict</b></em>' attribute. */
  isStrict(): boolean;
  /** Sets the value of the '{@link isStrict() <em>Strict</em>}' attribute. */
  setStrict(value: boolean): void;
  /** Returns the value of the '<em><b>Type</b></em>' attribute. */
  getType(): GraphType;
  /** Sets the value of the '{@link getType() <em>Type</em>}' attribute (`null` stores the default). */
  setType(value: GraphType | null): void;
  /** Returns the value of the '<em><b>Name</b></em>' attribute. */
  getName(): string | null;
  /** Sets the value of the '{@link getName() <em>Name</em>}' attribute. */
  setName(value: string | null): void;
  /** Returns the value of the '<em><b>Statements</b></em>' containment reference list. */
  getStatements(): EList<Statement>;
}

/**
 * An implementation of the model object '<em><b>Graph</b></em>'. Java extends EMF's
 * `MinimalEObjectImpl.Container`; the port extends `src/emf`'s `BasicEObjectImpl`. Not ported: `eSet`,
 * `eUnset`, notifications; the `NotificationChain` returns are dropped with `src/emf`'s.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java
 */
export class GraphImpl extends BasicEObjectImpl implements Graph {
  /** The default value of the '{@link isStrict() <em>Strict</em>}' attribute. */
  protected static readonly STRICT_EDEFAULT: boolean = false;
  /** The cached value of the '{@link isStrict() <em>Strict</em>}' attribute. */
  protected strict: boolean = GraphImpl.STRICT_EDEFAULT;
  /** The default value of the '{@link getType() <em>Type</em>}' attribute. */
  protected static readonly TYPE_EDEFAULT: GraphType = GraphType.GRAPH;
  /** The cached value of the '{@link getType() <em>Type</em>}' attribute. */
  protected type: GraphType = GraphImpl.TYPE_EDEFAULT;
  /** The default value of the '{@link getName() <em>Name</em>}' attribute. */
  protected static readonly NAME_EDEFAULT: string | null = null;
  /** The cached value of the '{@link getName() <em>Name</em>}' attribute. */
  protected name: string | null = GraphImpl.NAME_EDEFAULT;
  /** The cached value of the '{@link getStatements() <em>Statements</em>}' containment reference list. */
  protected statements: EObjectContainmentEList<Statement> | null = null;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  protected eStaticClass(): DotEClass {
    return DotPackage.Literals.GRAPH;
  }

  /** `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port). */
  eClass(): DotEClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  isStrict(): boolean {
    return this.strict;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  setStrict(newStrict: boolean): void {
    this.strict = newStrict;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  getType(): GraphType {
    return this.type;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  setType(newType: GraphType | null): void {
    this.type = newType === null ? GraphImpl.TYPE_EDEFAULT : newType;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  getName(): string | null {
    return this.name;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  setName(newName: string | null): void {
    this.name = newName;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  getStatements(): EObjectContainmentEList<Statement> {
    if (this.statements === null) {
      this.statements = new EObjectContainmentEList<Statement>(this, DotPackage.GRAPH__STATEMENTS);
    }
    return this.statements;
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case DotPackage.GRAPH__STATEMENTS:
        this.getStatements().basicRemove(otherEnd as Statement);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  eGet(featureID: number, _resolve: boolean, _coreType: boolean): unknown {
    switch (featureID) {
      case DotPackage.GRAPH__STRICT:
        return this.isStrict();
      case DotPackage.GRAPH__TYPE:
        return this.getType();
      case DotPackage.GRAPH__NAME:
        return this.getName();
      case DotPackage.GRAPH__STATEMENTS:
        return this.getStatements();
    }
    throw noGeneratedCase('eGet', featureID);
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  eIsSet(featureID: number): boolean {
    switch (featureID) {
      case DotPackage.GRAPH__STRICT:
        return this.strict !== GraphImpl.STRICT_EDEFAULT;
      case DotPackage.GRAPH__TYPE:
        return this.type !== GraphImpl.TYPE_EDEFAULT;
      case DotPackage.GRAPH__NAME:
        return GraphImpl.NAME_EDEFAULT === null ? this.name !== null : GraphImpl.NAME_EDEFAULT !== this.name;
      case DotPackage.GRAPH__STATEMENTS:
        return this.statements !== null && !this.statements.isEmpty();
    }
    throw noGeneratedCase('eIsSet', featureID);
  }

  /** Not generated (the model has no opposite references); see `StatementImpl.eBasicRemoveFromContainerFeature`. */
  eBasicRemoveFromContainerFeature(): void {
    throw noGeneratedCase('eBasicRemoveFromContainerFeature', this.eContainerFeatureID());
  }

  /** The containment lists in feature order (EMF reads `eClass().getEAllContainments()`). */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.getStatements()];
  }

  /** Java `getClass().getName()`. */
  protected override javaClassName(): string {
    return implClassName(this.eClass());
  }

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/impl/GraphImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${super.toString()} (strict: ${this.strict}, type: ${this.type.toString()}, name: ${this.name})`;
  }
}
