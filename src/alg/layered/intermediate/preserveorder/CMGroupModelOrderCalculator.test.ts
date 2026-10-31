// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { CMGroupModelOrderCalculator } from './CMGroupModelOrderCalculator.js';

const GROUP_ID = LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID;
const OFFSET = 10;
const MODEL_ORDER = 3;
// the group ids of the CM_ENFORCED_GROUP_ORDERS list every graph below sets (the Java reads it before any branch, and
// the default needs the ElkReflect registration of `Array`)
const ENFORCED_ID = 2;
const OTHER_ENFORCED_ID = 6;
const NOT_ENFORCED_ID = 3;

function newGraph(): LGraph {
  const graph = new LGraph();
  graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS, [
    ENFORCED_ID,
    OTHER_ENFORCED_ID,
  ]);
  return graph;
}

function node(graph: LGraph, modelOrder: number | null, groupId: number): LNode {
  const n = new LNode(graph);
  if (modelOrder !== null) {
    n.setProperty(InternalProperties.MODEL_ORDER, modelOrder);
  }
  n.setProperty(GROUP_ID, groupId);
  return n;
}

function enforcingGraph(): LGraph {
  const graph = newGraph();
  graph.setProperty(
    LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY,
    GroupOrderStrategy.ENFORCED,
  );
  return graph;
}

describe('CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder', () => {
  it('answers -1 for an element without model order, enforced or not', () => {
    const element = node(newGraph(), null, ENFORCED_ID);
    const other = node(newGraph(), MODEL_ORDER, ENFORCED_ID);
    expect(CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, newGraph(), OFFSET)).toBe(
      -1,
    );
    expect(
      CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, enforcingGraph(), OFFSET),
    ).toBe(-1);
  });

  it('answers the plain model order when the group order is not enforced', () => {
    const graph = newGraph();
    const element = node(graph, MODEL_ORDER, ENFORCED_ID);
    const other = node(graph, 0, OTHER_ENFORCED_ID);
    expect(CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, graph, OFFSET)).toBe(
      MODEL_ORDER,
    );
  });

  it('answers offset * groupId + model order when the order is enforced and both ids are enforced', () => {
    const graph = enforcingGraph();
    const element = node(graph, MODEL_ORDER, ENFORCED_ID);
    const other = node(graph, 0, OTHER_ENFORCED_ID);
    // CMGroupModelOrderCalculator.java:42-45: 10 * 2 + 3
    expect(CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, graph, OFFSET)).toBe(23);
  });

  it('falls through to the plain model order when the other id is not enforced', () => {
    const graph = enforcingGraph();
    const element = node(graph, MODEL_ORDER, ENFORCED_ID);
    const other = node(graph, 0, NOT_ENFORCED_ID);
    expect(CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, graph, OFFSET)).toBe(
      MODEL_ORDER,
    );
  });

  it('falls through to the plain model order when the element id is not enforced', () => {
    const graph = enforcingGraph();
    const element = node(graph, MODEL_ORDER, NOT_ENFORCED_ID);
    const other = node(graph, 0, ENFORCED_ID);
    expect(CMGroupModelOrderCalculator.calculateModelOrderOrGroupModelOrder(element, other, graph, OFFSET)).toBe(
      MODEL_ORDER,
    );
  });
});
