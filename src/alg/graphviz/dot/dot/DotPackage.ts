// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../../../emf/ecore/EClass.js';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { InternalEObject } from '../../../../emf/ecore/InternalEObject.js';
import type { FeatureRef } from '../../../../xtext/formatting2/regionaccess/FeatureRef.js';

/**
 * A structural feature literal: the `FeatureRef` the formatter passes to `regionFor.feature(...)`, plus EMF's
 * `getFeatureID()`, which keys the generated `eGet`/`eIsSet` of the model classes.
 *
 * @see org.eclipse.emf.ecore.EStructuralFeature
 */
export interface DotFeature extends FeatureRef {
  /** `EStructuralFeature.getFeatureID()`. */
  readonly featureID: number;
}

/**
 * The `EClass` members the port reads: the name, the classifier id (`DotSwitch`, `DotFactoryImpl.create`), the
 * supertypes, `getEAllStructuralFeatures()` in EMF order (a dump of the model enumerates features with it),
 * and `isInstance` (the containing-class test of a feature).
 *
 * @see org.eclipse.emf.ecore.EClass
 */
export interface DotEClass extends EClass {
  getClassifierID(): number;
  getESuperTypes(): readonly DotEClass[];
  getEAllStructuralFeatures(): readonly DotFeature[];
  /** `EClassifier.isInstance`: the object's class is this class or a subclass of it. */
  isInstance(object: EObject): boolean;
}

/**
 * The `InternalEObject` surface every DOT object has: the `src/emf` protocol (container, contents, inverse
 * add/remove), its `DotEClass`, and the generated, feature-id keyed `eGet`/`eIsSet` of `InternalEObject`
 * (`src/emf` does not port those, D4 of the ElkGraph port).
 *
 * @see org.eclipse.emf.ecore.InternalEObject
 */
export interface DotEObject extends InternalEObject {
  eClass(): DotEClass;
  /** @see org.eclipse.emf.ecore.InternalEObject#eGet(int, boolean, boolean) */
  eGet(featureID: number, resolve: boolean, coreType: boolean): unknown;
  /** @see org.eclipse.emf.ecore.InternalEObject#eIsSet(int) */
  eIsSet(featureID: number): boolean;
}

/** `EClass.isSuperTypeOf`: `someClass` is `eClass` or one of its (transitive) subclasses. */
function isSuperTypeOf(eClass: DotEClass, someClass: EClass): boolean {
  return (
    someClass === eClass ||
    (isDotEClass(someClass) && someClass.getESuperTypes().some((superType) => isSuperTypeOf(eClass, superType)))
  );
}

/** A feature literal of the class `eContainingClass()` returns (a thunk: features are declared before classes). */
function newFeature(
  name: string,
  featureID: number,
  isContainment: boolean,
  eContainingClass: () => DotEClass,
): DotFeature {
  return { name, featureID, isContainment, isInstance: (object) => eContainingClass().isInstance(object) };
}

/** A class literal; `eAllStructuralFeatures` are the supertypes' followed by the class's own, as EMF orders them. */
function newEClass(
  name: string,
  classifierID: number,
  eSuperTypes: readonly DotEClass[],
  eStructuralFeatures: readonly DotFeature[],
): DotEClass {
  const eAllStructuralFeatures = Object.freeze([
    ...eSuperTypes.flatMap((superType) => superType.getEAllStructuralFeatures()),
    ...eStructuralFeatures,
  ]);
  const frozenSuperTypes = Object.freeze([...eSuperTypes]);
  const eClass: DotEClass = {
    getName: () => name,
    getClassifierID: () => classifierID,
    getESuperTypes: () => frozenSuperTypes,
    getEAllStructuralFeatures: () => eAllStructuralFeatures,
    isInstance: (object) => isSuperTypeOf(eClass, object.eClass()),
  };
  return eClass;
}

// The feature literals (DotPackageImpl.createPackageContents order); every EReference is a containment.
const GRAPHVIZ_MODEL__GRAPHS = newFeature('graphs', 0, true, () => GRAPHVIZ_MODEL);
const GRAPH__STRICT = newFeature('strict', 0, false, () => GRAPH);
const GRAPH__TYPE = newFeature('type', 1, false, () => GRAPH);
const GRAPH__NAME = newFeature('name', 2, false, () => GRAPH);
const GRAPH__STATEMENTS = newFeature('statements', 3, true, () => GRAPH);
const ATTRIBUTE__NAME = newFeature('name', 0, false, () => ATTRIBUTE);
const ATTRIBUTE__VALUE = newFeature('value', 1, false, () => ATTRIBUTE);
const NODE_STATEMENT__NODE = newFeature('node', 0, true, () => NODE_STATEMENT);
const NODE_STATEMENT__ATTRIBUTES = newFeature('attributes', 1, true, () => NODE_STATEMENT);
const NODE__NAME = newFeature('name', 0, false, () => NODE);
const NODE__PORT = newFeature('port', 1, true, () => NODE);
const EDGE_STATEMENT__SOURCE_NODE = newFeature('sourceNode', 0, true, () => EDGE_STATEMENT);
const EDGE_STATEMENT__EDGE_TARGETS = newFeature('edgeTargets', 1, true, () => EDGE_STATEMENT);
const EDGE_STATEMENT__ATTRIBUTES = newFeature('attributes', 2, true, () => EDGE_STATEMENT);
const EDGE_TARGET__OPERATOR = newFeature('operator', 0, false, () => EDGE_TARGET);
const EDGE_TARGET__TARGET_SUBGRAPH = newFeature('targetSubgraph', 1, true, () => EDGE_TARGET);
const EDGE_TARGET__TARGETNODE = newFeature('targetnode', 2, true, () => EDGE_TARGET);
const ATTRIBUTE_STATEMENT__TYPE = newFeature('type', 0, false, () => ATTRIBUTE_STATEMENT);
const ATTRIBUTE_STATEMENT__ATTRIBUTES = newFeature('attributes', 1, true, () => ATTRIBUTE_STATEMENT);
const SUBGRAPH__NAME = newFeature('name', 0, false, () => SUBGRAPH);
const SUBGRAPH__STATEMENTS = newFeature('statements', 1, true, () => SUBGRAPH);
const PORT__NAME = newFeature('name', 0, false, () => PORT);
const PORT__COMPASS_PT = newFeature('compass_pt', 1, false, () => PORT);

// The class literals; the five statement kinds have Statement as supertype (initializePackageContents).
const GRAPHVIZ_MODEL = newEClass('GraphvizModel', 0, [], [GRAPHVIZ_MODEL__GRAPHS]);
const GRAPH = newEClass('Graph', 1, [], [GRAPH__STRICT, GRAPH__TYPE, GRAPH__NAME, GRAPH__STATEMENTS]);
const STATEMENT = newEClass('Statement', 2, [], []);
const ATTRIBUTE = newEClass('Attribute', 3, [STATEMENT], [ATTRIBUTE__NAME, ATTRIBUTE__VALUE]);
const NODE_STATEMENT = newEClass('NodeStatement', 4, [STATEMENT], [NODE_STATEMENT__NODE, NODE_STATEMENT__ATTRIBUTES]);
const NODE = newEClass('Node', 5, [], [NODE__NAME, NODE__PORT]);
const EDGE_STATEMENT = newEClass(
  'EdgeStatement',
  6,
  [STATEMENT],
  [EDGE_STATEMENT__SOURCE_NODE, EDGE_STATEMENT__EDGE_TARGETS, EDGE_STATEMENT__ATTRIBUTES],
);
const EDGE_TARGET = newEClass(
  'EdgeTarget',
  7,
  [],
  [EDGE_TARGET__OPERATOR, EDGE_TARGET__TARGET_SUBGRAPH, EDGE_TARGET__TARGETNODE],
);
const ATTRIBUTE_STATEMENT = newEClass(
  'AttributeStatement',
  8,
  [STATEMENT],
  [ATTRIBUTE_STATEMENT__TYPE, ATTRIBUTE_STATEMENT__ATTRIBUTES],
);
const SUBGRAPH = newEClass('Subgraph', 9, [STATEMENT], [SUBGRAPH__NAME, SUBGRAPH__STATEMENTS]);
const PORT = newEClass('Port', 10, [], [PORT__NAME, PORT__COMPASS_PT]);

/** The classes of this package: `eClass.getEPackage() == DotPackage.eINSTANCE` becomes membership here. */
const ECLASSES: ReadonlySet<EClass> = new Set<EClass>([
  GRAPHVIZ_MODEL,
  GRAPH,
  STATEMENT,
  ATTRIBUTE,
  NODE_STATEMENT,
  NODE,
  EDGE_STATEMENT,
  EDGE_TARGET,
  ATTRIBUTE_STATEMENT,
  SUBGRAPH,
  PORT,
]);

/**
 * Whether `eClass` belongs to this package (EMF compares `eClass.getEPackage()` with `DotPackage.eINSTANCE`,
 * as `DotSwitch.isSwitchFor` does).
 *
 * @internal
 */
export function isDotEClass(eClass: EClass): eClass is DotEClass {
  return ECLASSES.has(eClass);
}

/**
 * The `Literals` of the generated package: a `DotEClass` per class and a `DotFeature` per structural feature.
 * The three `EEnum` literals are not ported (no caller).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/DotPackage.java
 */
const LITERALS = {
  GRAPHVIZ_MODEL,
  GRAPHVIZ_MODEL__GRAPHS,
  GRAPH,
  GRAPH__STRICT,
  GRAPH__TYPE,
  GRAPH__NAME,
  GRAPH__STATEMENTS,
  STATEMENT,
  ATTRIBUTE,
  ATTRIBUTE__NAME,
  ATTRIBUTE__VALUE,
  NODE_STATEMENT,
  NODE_STATEMENT__NODE,
  NODE_STATEMENT__ATTRIBUTES,
  NODE,
  NODE__NAME,
  NODE__PORT,
  EDGE_STATEMENT,
  EDGE_STATEMENT__SOURCE_NODE,
  EDGE_STATEMENT__EDGE_TARGETS,
  EDGE_STATEMENT__ATTRIBUTES,
  EDGE_TARGET,
  EDGE_TARGET__OPERATOR,
  EDGE_TARGET__TARGET_SUBGRAPH,
  EDGE_TARGET__TARGETNODE,
  ATTRIBUTE_STATEMENT,
  ATTRIBUTE_STATEMENT__TYPE,
  ATTRIBUTE_STATEMENT__ATTRIBUTES,
  SUBGRAPH,
  SUBGRAPH__NAME,
  SUBGRAPH__STATEMENTS,
  PORT,
  PORT__NAME,
  PORT__COMPASS_PT,
} as const;

/**
 * The generated package interface, ported as constants (as `ElkGraphPackage` is): the names, the classifier
 * and feature ids with their defining expressions, so the generated `switch` bodies stay 1:1, and
 * {@link DotPackage.Literals}. `eINSTANCE` and the `get*()` metamodel accessors are not ported.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/DotPackage.java
 */
export abstract class DotPackage {
  static readonly eNAME: string = 'dot';
  static readonly eNS_URI: string = 'http://www.eclipse.org/elk/GraphvizDot';
  static readonly eNS_PREFIX: string = 'dot';
  static readonly GRAPHVIZ_MODEL: number = 0;
  static readonly GRAPHVIZ_MODEL__GRAPHS: number = 0;
  static readonly GRAPHVIZ_MODEL_FEATURE_COUNT: number = 1;
  static readonly GRAPH: number = 1;
  static readonly GRAPH__STRICT: number = 0;
  static readonly GRAPH__TYPE: number = 1;
  static readonly GRAPH__NAME: number = 2;
  static readonly GRAPH__STATEMENTS: number = 3;
  static readonly GRAPH_FEATURE_COUNT: number = 4;
  static readonly STATEMENT: number = 2;
  static readonly STATEMENT_FEATURE_COUNT: number = 0;
  static readonly ATTRIBUTE: number = 3;
  static readonly ATTRIBUTE__NAME: number = DotPackage.STATEMENT_FEATURE_COUNT + 0;
  static readonly ATTRIBUTE__VALUE: number = DotPackage.STATEMENT_FEATURE_COUNT + 1;
  static readonly ATTRIBUTE_FEATURE_COUNT: number = DotPackage.STATEMENT_FEATURE_COUNT + 2;
  static readonly NODE_STATEMENT: number = 4;
  static readonly NODE_STATEMENT__NODE: number = DotPackage.STATEMENT_FEATURE_COUNT + 0;
  static readonly NODE_STATEMENT__ATTRIBUTES: number = DotPackage.STATEMENT_FEATURE_COUNT + 1;
  static readonly NODE_STATEMENT_FEATURE_COUNT: number = DotPackage.STATEMENT_FEATURE_COUNT + 2;
  static readonly NODE: number = 5;
  static readonly NODE__NAME: number = 0;
  static readonly NODE__PORT: number = 1;
  static readonly NODE_FEATURE_COUNT: number = 2;
  static readonly EDGE_STATEMENT: number = 6;
  static readonly EDGE_STATEMENT__SOURCE_NODE: number = DotPackage.STATEMENT_FEATURE_COUNT + 0;
  static readonly EDGE_STATEMENT__EDGE_TARGETS: number = DotPackage.STATEMENT_FEATURE_COUNT + 1;
  static readonly EDGE_STATEMENT__ATTRIBUTES: number = DotPackage.STATEMENT_FEATURE_COUNT + 2;
  static readonly EDGE_STATEMENT_FEATURE_COUNT: number = DotPackage.STATEMENT_FEATURE_COUNT + 3;
  static readonly EDGE_TARGET: number = 7;
  static readonly EDGE_TARGET__OPERATOR: number = 0;
  static readonly EDGE_TARGET__TARGET_SUBGRAPH: number = 1;
  static readonly EDGE_TARGET__TARGETNODE: number = 2;
  static readonly EDGE_TARGET_FEATURE_COUNT: number = 3;
  static readonly ATTRIBUTE_STATEMENT: number = 8;
  static readonly ATTRIBUTE_STATEMENT__TYPE: number = DotPackage.STATEMENT_FEATURE_COUNT + 0;
  static readonly ATTRIBUTE_STATEMENT__ATTRIBUTES: number = DotPackage.STATEMENT_FEATURE_COUNT + 1;
  static readonly ATTRIBUTE_STATEMENT_FEATURE_COUNT: number = DotPackage.STATEMENT_FEATURE_COUNT + 2;
  static readonly SUBGRAPH: number = 9;
  static readonly SUBGRAPH__NAME: number = DotPackage.STATEMENT_FEATURE_COUNT + 0;
  static readonly SUBGRAPH__STATEMENTS: number = DotPackage.STATEMENT_FEATURE_COUNT + 1;
  static readonly SUBGRAPH_FEATURE_COUNT: number = DotPackage.STATEMENT_FEATURE_COUNT + 2;
  static readonly PORT: number = 10;
  static readonly PORT__NAME: number = 0;
  static readonly PORT__COMPASS_PT: number = 1;
  static readonly PORT_FEATURE_COUNT: number = 2;
  static readonly EDGE_OPERATOR: number = 11;
  static readonly GRAPH_TYPE: number = 12;
  static readonly ATTRIBUTE_TYPE: number = 13;

  /** @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/dot/DotPackage.java */
  static readonly Literals: typeof LITERALS = LITERALS;
}
