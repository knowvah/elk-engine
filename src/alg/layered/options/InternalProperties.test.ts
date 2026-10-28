// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { EdgeConstraint } from './EdgeConstraint.js';
import { InLayerConstraint } from './InLayerConstraint.js';
import { InternalProperties } from './InternalProperties.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

type Name = Exclude<keyof typeof InternalProperties, 'prototype'>;

/** Every property of `InternalProperties.java` with its verbatim id, in Java declaration order. */
const IDS: Record<Name, string> = {
  ORIGIN: 'origin',
  COORDINATE_SYSTEM_ORIGIN: 'coordinateOrigin',
  PROCESSORS: 'processors',
  COMPOUND_NODE: 'compoundNode',
  INSIDE_CONNECTIONS: 'insideConnections',
  ORIGINAL_BENDPOINTS: 'originalBendpoints',
  ORIGINAL_DUMMY_NODE_POSITION: 'originalDummyNodePosition',
  ORIGINAL_LABEL_EDGE: 'originalLabelEdge',
  REPRESENTED_LABELS: 'representedLabels',
  END_LABELS: 'endLabels',
  END_LABEL_EDGE: 'endLabel.origin',
  LABEL_SIDE: 'labelSide',
  MAX_EDGE_THICKNESS: 'maxEdgeThickness',
  REVERSED: 'reversed',
  RANDOM: 'random',
  LONG_EDGE_SOURCE: 'longEdgeSource',
  LONG_EDGE_TARGET: 'longEdgeTarget',
  LONG_EDGE_HAS_LABEL_DUMMIES: 'longEdgeHasLabelDummies',
  LONG_EDGE_BEFORE_LABEL_DUMMY: 'longEdgeBeforeLabelDummy',
  EDGE_CONSTRAINT: 'edgeConstraint',
  IN_LAYER_LAYOUT_UNIT: 'inLayerLayoutUnit',
  IN_LAYER_CONSTRAINT: 'inLayerConstraint',
  IN_LAYER_SUCCESSOR_CONSTRAINTS: 'inLayerSuccessorConstraint',
  IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES: 'inLayerSuccessorConstraintBetweenNonDummies',
  PORT_DUMMY: 'portDummy',
  CROSSING_HINT: 'crossingHint',
  GRAPH_PROPERTIES: 'graphProperties',
  EXT_PORT_SIDE: 'externalPortSide',
  EXT_PORT_SIZE: 'externalPortSize',
  EXT_PORT_REPLACED_DUMMIES: 'externalPortReplacedDummies',
  EXT_PORT_REPLACED_DUMMY: 'externalPortReplacedDummy',
  EXT_PORT_CONNECTIONS: 'externalPortConnections',
  PORT_RATIO_OR_POSITION: 'portRatioOrPosition',
  BARYCENTER_ASSOCIATES: 'barycenterAssociates',
  TOP_COMMENTS: 'TopSideComments',
  BOTTOM_COMMENTS: 'BottomSideComments',
  COMMENT_CONN_PORT: 'CommentConnectionPort',
  INPUT_COLLECT: 'inputCollect',
  OUTPUT_COLLECT: 'outputCollect',
  CYCLIC: 'cyclic',
  CROSS_HIERARCHY_MAP: 'crossHierarchyMap',
  TARGET_OFFSET: 'targetOffset',
  SPLINE_LABEL_SIZE: 'splineLabelSize',
  SPACINGS: 'spacings',
  PARTITION_DUMMY: 'partitionConstraint',
  BREAKING_POINT_INFO: 'breakingPoint.info',
  SPLINE_SURVIVING_EDGE: 'splines.survivingEdge',
  SPLINE_ROUTE_START: 'splines.route.start',
  SPLINE_EDGE_CHAIN: 'splines.edgeChain',
  ORIGINAL_PORT_CONSTRAINTS: 'originalPortConstraints',
  SELF_LOOP_HOLDER: 'selfLoopHolder',
  SPLINE_NS_PORT_Y_COORD: 'splines.nsPortY',
  MODEL_ORDER: 'modelOrder',
  MAX_MODEL_ORDER_NODES: 'modelOrder.maximum',
  CB_NUM_MODEL_ORDER_GROUPS: 'modelOrderGroups.cb.number',
  LONG_EDGE_TARGET_NODE: 'longEdgeTargetNode',
  FIRST_TRY_WITH_INITIAL_ORDER: 'firstTryWithInitialOrder',
  // Java gives both properties the same id (verbatim)
  SECOND_TRY_WITH_INITIAL_ORDER: 'firstTryWithInitialOrder',
  HIDDEN_NODES: 'layerConstraints.hiddenNodes',
  ORIGINAL_OPPOSITE_PORT: 'layerConstraints.opposidePort',
  TARGET_NODE_MODEL_ORDER: 'targetNode.modelOrder',
  TARJAN_LOWLINK: 'tarjan.lowlink',
  TARJAN_ID: 'tarjan.id',
  TARJAN_ON_STACK: 'tarjan.onstack',
  IS_PART_OF_CYCLE: 'partOfCycle',
  WEIGHT: 'medianHeuristic.weight',
};

/** Properties whose Java default is a `false` / `0` / enum-constant value, compared by identity or equality. */
const SCALAR_DEFAULTS: [Name, unknown][] = [
  ['COMPOUND_NODE', false],
  ['INSIDE_CONNECTIONS', false],
  ['LABEL_SIDE', LabelSide.UNKNOWN],
  ['MAX_EDGE_THICKNESS', 0],
  ['REVERSED', false],
  ['LONG_EDGE_HAS_LABEL_DUMMIES', false],
  ['LONG_EDGE_BEFORE_LABEL_DUMMY', false],
  ['EDGE_CONSTRAINT', EdgeConstraint.NONE],
  ['IN_LAYER_CONSTRAINT', InLayerConstraint.NONE],
  ['IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES', false],
  ['CROSSING_HINT', 0],
  ['EXT_PORT_SIDE', PortSide.UNDEFINED],
  ['PORT_RATIO_OR_POSITION', 0],
  ['INPUT_COLLECT', false],
  ['OUTPUT_COLLECT', false],
  ['CYCLIC', false],
  ['PARTITION_DUMMY', false],
  ['FIRST_TRY_WITH_INITIAL_ORDER', false],
  ['SECOND_TRY_WITH_INITIAL_ORDER', false],
  ['TARJAN_LOWLINK', JavaInteger.MAX_VALUE],
  ['TARJAN_ID', -1],
  ['TARJAN_ON_STACK', false],
  ['IS_PART_OF_CYCLE', false],
];

/** Properties with a cloneable default: an empty collection or a zero vector, fresh for every read. */
const CLONED_DEFAULTS: Name[] = [
  'IN_LAYER_SUCCESSOR_CONSTRAINTS',
  'GRAPH_PROPERTIES',
  'EXT_PORT_SIZE',
  'EXT_PORT_CONNECTIONS',
  'SPLINE_LABEL_SIZE',
];

function property(name: Name): IProperty<unknown> {
  return InternalProperties[name] as IProperty<unknown>;
}

describe('InternalProperties', () => {
  it('declares exactly the Java properties', () => {
    const declared = Object.getOwnPropertyNames(InternalProperties).filter(
      (key) => !['length', 'name', 'prototype'].includes(key),
    );
    expect(declared.sort()).toEqual(Object.keys(IDS).sort());
  });

  it('uses the Java id of every property', () => {
    for (const [name, id] of Object.entries(IDS) as [Name, string][]) {
      expect(property(name).getId(), name).toBe(id);
    }
  });

  it('has the Java scalar and enum defaults', () => {
    for (const [name, expected] of SCALAR_DEFAULTS) {
      expect(property(name).getDefault(), name).toBe(expected);
    }
  });

  it('has no default (null) for every other property but the cloned ones', () => {
    const withDefault = new Set<Name>([...SCALAR_DEFAULTS.map(([name]) => name), ...CLONED_DEFAULTS]);
    for (const name of Object.keys(IDS) as Name[]) {
      if (!withDefault.has(name)) {
        expect(property(name).getDefault(), name).toBeNull();
      }
    }
  });

  it('has empty collections and zero vectors as cloned defaults, fresh for every read', () => {
    expect(InternalProperties.IN_LAYER_SUCCESSOR_CONSTRAINTS.getDefault()).toEqual([]);
    expect([...InternalProperties.GRAPH_PROPERTIES.getDefault()]).toEqual([]);
    expect([...InternalProperties.EXT_PORT_CONNECTIONS.getDefault()]).toEqual([]);
    for (const name of ['EXT_PORT_SIZE', 'SPLINE_LABEL_SIZE'] as const) {
      const first = InternalProperties[name].getDefault();
      expect(first).toBeInstanceOf(KVector);
      expect([first.x, first.y]).toEqual([0, 0]);
      expect(InternalProperties[name].getDefault()).not.toBe(first);
    }
    for (const name of CLONED_DEFAULTS) {
      expect(property(name).getDefault(), name).not.toBe(property(name).getDefault());
    }
  });
});
