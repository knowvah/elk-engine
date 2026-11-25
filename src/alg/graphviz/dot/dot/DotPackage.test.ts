// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { DotFactory } from './DotFactory.js';
import { type DotEClass, DotPackage, isDotEClass } from './DotPackage.js';

// Expected values: DotPackage.java (ids, feature ids, eNAME/eNS_URI/eNS_PREFIX) and DotPackageImpl.java
// createPackageContents/initializePackageContents (class names, feature names, containment, supertypes).

const L = DotPackage.Literals;
const F = DotFactory.eINSTANCE;

/** [literal, name, classifier id, eAllStructuralFeatures names] from DotPackageImpl. */
const CLASSES: ReadonlyArray<readonly [DotEClass, string, number, readonly string[]]> = [
  [L.GRAPHVIZ_MODEL, 'GraphvizModel', 0, ['graphs']],
  [L.GRAPH, 'Graph', 1, ['strict', 'type', 'name', 'statements']],
  [L.STATEMENT, 'Statement', 2, []],
  [L.ATTRIBUTE, 'Attribute', 3, ['name', 'value']],
  [L.NODE_STATEMENT, 'NodeStatement', 4, ['node', 'attributes']],
  [L.NODE, 'Node', 5, ['name', 'port']],
  [L.EDGE_STATEMENT, 'EdgeStatement', 6, ['sourceNode', 'edgeTargets', 'attributes']],
  [L.EDGE_TARGET, 'EdgeTarget', 7, ['operator', 'targetSubgraph', 'targetnode']],
  [L.ATTRIBUTE_STATEMENT, 'AttributeStatement', 8, ['type', 'attributes']],
  [L.SUBGRAPH, 'Subgraph', 9, ['name', 'statements']],
  [L.PORT, 'Port', 10, ['name', 'compass_pt']],
];

/** The classifier ids in DotPackage.java declaration order. */
const CLASSIFIER_IDS: readonly number[] = [
  DotPackage.GRAPHVIZ_MODEL,
  DotPackage.GRAPH,
  DotPackage.STATEMENT,
  DotPackage.ATTRIBUTE,
  DotPackage.NODE_STATEMENT,
  DotPackage.NODE,
  DotPackage.EDGE_STATEMENT,
  DotPackage.EDGE_TARGET,
  DotPackage.ATTRIBUTE_STATEMENT,
  DotPackage.SUBGRAPH,
  DotPackage.PORT,
  DotPackage.EDGE_OPERATOR,
  DotPackage.GRAPH_TYPE,
  DotPackage.ATTRIBUTE_TYPE,
];

/** [label, generated ids in declaration order ending with the *_FEATURE_COUNT]. */
const FEATURE_IDS: ReadonlyArray<readonly [string, readonly number[]]> = [
  ['GraphvizModel', [DotPackage.GRAPHVIZ_MODEL__GRAPHS, DotPackage.GRAPHVIZ_MODEL_FEATURE_COUNT]],
  [
    'Graph',
    [
      DotPackage.GRAPH__STRICT,
      DotPackage.GRAPH__TYPE,
      DotPackage.GRAPH__NAME,
      DotPackage.GRAPH__STATEMENTS,
      DotPackage.GRAPH_FEATURE_COUNT,
    ],
  ],
  ['Statement', [DotPackage.STATEMENT_FEATURE_COUNT]],
  ['Attribute', [DotPackage.ATTRIBUTE__NAME, DotPackage.ATTRIBUTE__VALUE, DotPackage.ATTRIBUTE_FEATURE_COUNT]],
  [
    'NodeStatement',
    [DotPackage.NODE_STATEMENT__NODE, DotPackage.NODE_STATEMENT__ATTRIBUTES, DotPackage.NODE_STATEMENT_FEATURE_COUNT],
  ],
  ['Node', [DotPackage.NODE__NAME, DotPackage.NODE__PORT, DotPackage.NODE_FEATURE_COUNT]],
  [
    'EdgeStatement',
    [
      DotPackage.EDGE_STATEMENT__SOURCE_NODE,
      DotPackage.EDGE_STATEMENT__EDGE_TARGETS,
      DotPackage.EDGE_STATEMENT__ATTRIBUTES,
      DotPackage.EDGE_STATEMENT_FEATURE_COUNT,
    ],
  ],
  [
    'EdgeTarget',
    [
      DotPackage.EDGE_TARGET__OPERATOR,
      DotPackage.EDGE_TARGET__TARGET_SUBGRAPH,
      DotPackage.EDGE_TARGET__TARGETNODE,
      DotPackage.EDGE_TARGET_FEATURE_COUNT,
    ],
  ],
  [
    'AttributeStatement',
    [
      DotPackage.ATTRIBUTE_STATEMENT__TYPE,
      DotPackage.ATTRIBUTE_STATEMENT__ATTRIBUTES,
      DotPackage.ATTRIBUTE_STATEMENT_FEATURE_COUNT,
    ],
  ],
  ['Subgraph', [DotPackage.SUBGRAPH__NAME, DotPackage.SUBGRAPH__STATEMENTS, DotPackage.SUBGRAPH_FEATURE_COUNT]],
  ['Port', [DotPackage.PORT__NAME, DotPackage.PORT__COMPASS_PT, DotPackage.PORT_FEATURE_COUNT]],
];

describe('DotPackage constants', () => {
  it('carries the generated package names', () => {
    expect(DotPackage.eNAME).toBe('dot');
    expect(DotPackage.eNS_URI).toBe('http://www.eclipse.org/elk/GraphvizDot');
    expect(DotPackage.eNS_PREFIX).toBe('dot');
  });

  it('carries the generated classifier ids', () => {
    expect(CLASSIFIER_IDS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it.each(FEATURE_IDS)('carries the generated feature ids and feature count of %s', (_label, ids) => {
    expect(ids).toEqual(ids.map((_id, i) => i));
  });
});

describe('DotPackage.Literals classes', () => {
  it.each(CLASSES)(
    '%s is named, numbered and lists its features in eAllStructuralFeatures order',
    (eClass, name, id, features) => {
      expect(eClass.getName()).toBe(name);
      expect(eClass.getClassifierID()).toBe(id);
      expect(eClass.getEAllStructuralFeatures().map((f) => f.name)).toEqual(features);
      expect(eClass.getEAllStructuralFeatures().map((f) => f.featureID)).toEqual(features.map((_f, i) => i));
      expect(isDotEClass(eClass)).toBe(true);
    },
  );

  it('gives the five statement kinds Statement as their only supertype, and the others none', () => {
    const statements = [L.ATTRIBUTE, L.NODE_STATEMENT, L.EDGE_STATEMENT, L.ATTRIBUTE_STATEMENT, L.SUBGRAPH];
    for (const eClass of statements) expect(eClass.getESuperTypes()).toEqual([L.STATEMENT]);
    for (const eClass of [L.GRAPHVIZ_MODEL, L.GRAPH, L.STATEMENT, L.NODE, L.EDGE_TARGET, L.PORT]) {
      expect(eClass.getESuperTypes()).toEqual([]);
    }
  });

  it('isInstance holds for the class and its subclasses only', () => {
    const attribute = F.createAttribute();
    expect(L.ATTRIBUTE.isInstance(attribute)).toBe(true);
    expect(L.STATEMENT.isInstance(attribute)).toBe(true);
    expect(L.STATEMENT.isInstance(F.createSubgraph())).toBe(true);
    expect(L.ATTRIBUTE.isInstance(F.createStatement())).toBe(false);
    expect(L.STATEMENT.isInstance(F.createGraph())).toBe(false);
    expect(L.NODE.isInstance(F.createPort())).toBe(false);
  });

  it('isInstance and isDotEClass reject an object of another package', () => {
    const foreignClass = { getName: () => 'Graph' };
    const foreign: EObject = {
      eClass: () => foreignClass,
      eContainer: () => null,
      eContents: () => F.createGraph().eContents(),
      eAllContents: () => [][Symbol.iterator](),
    };
    expect(L.GRAPH.isInstance(foreign)).toBe(false);
    expect(isDotEClass(foreignClass)).toBe(false);
  });
});

/** [literal, name, feature id, containment] from DotPackageImpl (every EReference is IS_COMPOSITE). */
const FEATURES = [
  [L.GRAPHVIZ_MODEL__GRAPHS, 'graphs', 0, true],
  [L.GRAPH__STRICT, 'strict', 0, false],
  [L.GRAPH__TYPE, 'type', 1, false],
  [L.GRAPH__NAME, 'name', 2, false],
  [L.GRAPH__STATEMENTS, 'statements', 3, true],
  [L.ATTRIBUTE__NAME, 'name', 0, false],
  [L.ATTRIBUTE__VALUE, 'value', 1, false],
  [L.NODE_STATEMENT__NODE, 'node', 0, true],
  [L.NODE_STATEMENT__ATTRIBUTES, 'attributes', 1, true],
  [L.NODE__NAME, 'name', 0, false],
  [L.NODE__PORT, 'port', 1, true],
  [L.EDGE_STATEMENT__SOURCE_NODE, 'sourceNode', 0, true],
  [L.EDGE_STATEMENT__EDGE_TARGETS, 'edgeTargets', 1, true],
  [L.EDGE_STATEMENT__ATTRIBUTES, 'attributes', 2, true],
  [L.EDGE_TARGET__OPERATOR, 'operator', 0, false],
  [L.EDGE_TARGET__TARGET_SUBGRAPH, 'targetSubgraph', 1, true],
  [L.EDGE_TARGET__TARGETNODE, 'targetnode', 2, true],
  [L.ATTRIBUTE_STATEMENT__TYPE, 'type', 0, false],
  [L.ATTRIBUTE_STATEMENT__ATTRIBUTES, 'attributes', 1, true],
  [L.SUBGRAPH__NAME, 'name', 0, false],
  [L.SUBGRAPH__STATEMENTS, 'statements', 1, true],
  [L.PORT__NAME, 'name', 0, false],
  [L.PORT__COMPASS_PT, 'compass_pt', 1, false],
] as const;

describe('DotPackage.Literals features', () => {
  it.each(FEATURES)('%#: %s has the generated name, id and containment', (feature, name, id, containment) => {
    expect(feature.name).toBe(name);
    expect(feature.featureID).toBe(id);
    expect(feature.isContainment).toBe(containment);
  });

  it('lists every feature literal in its class, so the class list and the literals are the same objects', () => {
    const listed = CLASSES.flatMap(([eClass]) => eClass.getEAllStructuralFeatures());
    expect(listed).toEqual(FEATURES.map(([feature]) => feature));
    for (const [feature] of FEATURES) expect(listed.filter((f) => f === feature)).toHaveLength(1);
  });

  it('isInstance tests the containing class of the feature', () => {
    expect(L.GRAPH__TYPE.isInstance(F.createGraph())).toBe(true);
    expect(L.GRAPH__TYPE.isInstance(F.createAttributeStatement())).toBe(false);
    expect(L.EDGE_TARGET__OPERATOR.isInstance(F.createEdgeTarget())).toBe(true);
    expect(L.EDGE_TARGET__OPERATOR.isInstance(F.createEdgeStatement())).toBe(false);
    expect(L.ATTRIBUTE__NAME.isInstance(F.createAttribute())).toBe(true);
    expect(L.ATTRIBUTE__NAME.isInstance(F.createNode())).toBe(false);
  });
});

/** [class, a fresh instance of it]: every feature of the class must accept the instance. */
const INSTANCES: ReadonlyArray<readonly [DotEClass, () => EObject]> = [
  [L.GRAPHVIZ_MODEL, () => F.createGraphvizModel()],
  [L.GRAPH, () => F.createGraph()],
  [L.ATTRIBUTE, () => F.createAttribute()],
  [L.NODE_STATEMENT, () => F.createNodeStatement()],
  [L.NODE, () => F.createNode()],
  [L.EDGE_STATEMENT, () => F.createEdgeStatement()],
  [L.EDGE_TARGET, () => F.createEdgeTarget()],
  [L.ATTRIBUTE_STATEMENT, () => F.createAttributeStatement()],
  [L.SUBGRAPH, () => F.createSubgraph()],
  [L.PORT, () => F.createPort()],
];

describe('DotPackage.Literals feature containing classes', () => {
  it.each(INSTANCES)(
    'every feature of %s accepts an instance of its class and rejects a bare Statement',
    (eClass, create) => {
      const object = create();
      const statement = F.createStatement();
      for (const feature of eClass.getEAllStructuralFeatures()) {
        expect(feature.isInstance(object)).toBe(true);
        expect(feature.isInstance(statement)).toBe(false);
      }
    },
  );
});
