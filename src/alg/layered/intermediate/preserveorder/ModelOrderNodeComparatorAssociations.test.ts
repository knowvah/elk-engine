// SPDX-License-Identifier: EPL-2.0
// Structural cases of the Java `NullPointerException` sites of ModelOrderNodeComparator.java:292-300 and :503, :523
// (unboxing a missing MODEL_ORDER, dereferencing a missing port): the oracle recorder records no row for a throwing
// step, so the cases follow the Java code (mission 7c, T12b; AD-16: the NPE is a `TypeError`).
import { describe, expect, it } from 'vitest';
import { LGraph } from '../../graph/LGraph.js';
import { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LongEdgeOrderingStrategy } from '../../options/LongEdgeOrderingStrategy.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import {
  getFirstIncomingSourcePortOfNode,
  getFirstOutgoingTargetPortOfNode,
  getModelOrderFromConnectedEdges,
} from './ModelOrderNodeComparatorAssociations.js';
import { ModelOrderNodeComparatorState } from './ModelOrderNodeComparatorState.js';

const MODEL_ORDER_OF_EDGE = 7;

function setup() {
  const graph = new LGraph();
  const state = new ModelOrderNodeComparatorState(
    graph,
    OrderingStrategy.PREFER_NODES,
    LongEdgeOrderingStrategy.EQUAL,
    GroupOrderStrategy.ONLY_WITHIN_GROUP,
    false,
  );
  const source = addNode(graph);
  const target = addNode(graph);
  const sourcePort = addPort(source);
  const targetPort = addPort(target);
  const edge = connect(sourcePort, targetPort);
  return { state, source, target, sourcePort, targetPort, edge };
}

describe('ModelOrderNodeComparatorAssociations (Java NullPointerException sites)', () => {
  it('returns the model order of the first incoming edge', () => {
    const { state, target, edge } = setup();
    edge.setProperty(InternalProperties.MODEL_ORDER, MODEL_ORDER_OF_EDGE);
    expect(getModelOrderFromConnectedEdges(state, target)).toBe(MODEL_ORDER_OF_EDGE);
  });

  it('throws a TypeError when the first incoming edge has no model order (java:296-299 unboxes the Integer)', () => {
    const { state, target } = setup();
    expect(() => getModelOrderFromConnectedEdges(state, target)).toThrow(TypeError);
  });

  it('throws a TypeError for the first incoming source port of a node without incoming edges (java:503)', () => {
    const { source, target, sourcePort } = setup();
    expect(getFirstIncomingSourcePortOfNode(target)).toBe(sourcePort);
    expect(() => getFirstIncomingSourcePortOfNode(source)).toThrow(TypeError);
  });

  it('throws a TypeError for the first outgoing target port of a node without outgoing edges (java:523)', () => {
    const { source, target, targetPort } = setup();
    expect(getFirstOutgoingTargetPortOfNode(source)).toBe(targetPort);
    expect(() => getFirstOutgoingTargetPortOfNode(target)).toThrow(TypeError);
  });
});
