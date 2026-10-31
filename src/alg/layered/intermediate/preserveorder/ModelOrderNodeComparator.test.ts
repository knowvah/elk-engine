// SPDX-License-Identifier: EPL-2.0
// Contract cases whose expectations follow from the Java code by inspection (ModelOrderNodeComparator.java:117-283,
// :309-328, :530); the comparator is proven on the oracle rows by the order replay (mission 7c, T7/T8).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { GroupOrderStrategy } from '../../options/GroupOrderStrategy.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LongEdgeOrderingStrategy } from '../../options/LongEdgeOrderingStrategy.js';
import { OrderingStrategy } from '../../options/OrderingStrategy.js';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { ModelOrderNodeComparator } from './ModelOrderNodeComparator.js';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import { orderDump } from '../../../../../test/helpers/layered-order-replay-dump.js';
import {
  loadOrderRows,
  type OrderExpected,
  type OrderRow,
} from '../../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../../test/helpers/layered-phase-replay-rows.js';
import { IntermediateProcessorStrategy } from '../IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';

const SITE_ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-order.json`;
const SITE_PHASE_CYCLE = 'P1_CYCLE_BREAKING';
const SITE_PHASE_LAYERING = 'P2_LAYERING';

const siteFactories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) =>
    phase === SITE_PHASE_CYCLE
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : phase === SITE_PHASE_LAYERING
        ? LayeringStrategy.valueOf(strategy).create()
        : CrossingMinimizationStrategy.valueOf(strategy).create(),
};

let siteRows: OrderRow[] | undefined;

/** Replays a T11 site row through the 7c classes and dumps the layers and ports (the order replay's dump). */
function replaySite(id: string): OrderExpected {
  siteRows ??= loadOrderRows(SITE_ROWS_FILE);
  const row = siteRows.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error(`site row ${id} is not in layered-order.json`);
  }
  return orderDump(runSteps(row, siteFactories), importRow(row).importDump);
}

const OPTIONS = { groupOrderStrategy: GroupOrderStrategy.ONLY_WITHIN_GROUP, beforePorts: false };

function graphWithEnforcedOrders(): LGraph {
  const graph = new LGraph();
  // the Java reads the list before any branch; its default needs the ElkReflect registration of `Array`
  graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS, []);
  return graph;
}

function comparator(graph: LGraph, previousLayer: LNode[], strategy: OrderingStrategy): ModelOrderNodeComparator {
  return new ModelOrderNodeComparator(graph, previousLayer, strategy, LongEdgeOrderingStrategy.EQUAL, OPTIONS);
}

function nodeWithModelOrder(graph: LGraph, modelOrder: number): LNode {
  const node = addNode(graph);
  node.setProperty(InternalProperties.MODEL_ORDER, modelOrder);
  return node;
}

describe('ModelOrderNodeComparator by model order', () => {
  const setup = () => {
    const graph = graphWithEnforcedOrders();
    const [a, b, c] = [1, 2, 3].map((order) => nodeWithModelOrder(graph, order)) as [LNode, LNode, LNode];
    return { graph, a, b, c, cmp: comparator(graph, [], OrderingStrategy.PREFER_NODES) };
  };

  it('orders by MODEL_ORDER: the smaller model order is -1', () => {
    const { a, b, cmp } = setup();
    expect(cmp.compare(a, b)).toBe(-1);
  });

  it('answers the opposite from the recorded bigger/smaller association', () => {
    const { a, b, cmp } = setup();
    cmp.compare(a, b);
    expect(cmp.compare(b, a)).toBe(1);
  });

  it('is not reflexive: a first self comparison is -1 and the recorded association makes the second 1', () => {
    // n1ModelOrder > n2ModelOrder is false for equal orders, so the else arm records (n2 bigger than n1) = (a, a)
    const { a, cmp } = setup();
    expect(cmp.compare(a, a)).toBe(-1);
    expect(cmp.compare(a, a)).toBe(1);
  });

  it('propagates the association transitively (a < b, b < c records c > a)', () => {
    const { a, b, c, cmp } = setup();
    cmp.compare(a, b);
    cmp.compare(b, c);
    // a changed model order, but the recorded association c > a answers before any property is read
    a.setProperty(InternalProperties.MODEL_ORDER, 100);
    expect(cmp.compare(c, a)).toBe(1);
  });

  it('clearTransitiveOrdering drops the recorded associations', () => {
    const { a, b, c, cmp } = setup();
    cmp.compare(a, b);
    cmp.compare(b, c);
    a.setProperty(InternalProperties.MODEL_ORDER, 100);
    cmp.clearTransitiveOrdering();
    // now recomputed from the properties: c (3) is not bigger than a (100)
    expect(cmp.compare(c, a)).toBe(-1);
  });

  it('orders by an enforced group id when the graph enforces group model order', () => {
    const graph = graphWithEnforcedOrders();
    graph.setProperty(
      LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY,
      GroupOrderStrategy.ENFORCED,
    );
    graph.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_ENFORCED_GROUP_ORDERS, [1, 2]);
    graph.setProperty(InternalProperties.MAX_MODEL_ORDER_NODES, 10);
    const high = nodeWithModelOrder(graph, 0);
    high.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID, 2);
    const low = nodeWithModelOrder(graph, 9);
    low.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID, 1);
    // 10 * 2 + 0 = 20 against 10 * 1 + 9 = 19
    expect(comparator(graph, [], OrderingStrategy.PREFER_NODES).compare(high, low)).toBe(1);
  });

  it('puts the first argument before the second when neither has a model order and no layer connects them', () => {
    const graph = graphWithEnforcedOrders();
    const x = addNode(graph);
    const y = addNode(graph);
    const left = addLayer(graph);
    x.setLayer(left);
    y.setLayer(left);
    left.id = 0;
    // no incoming edges: both unconnected, both NORMAL -> handleHelperDummyNodes answers 0 -> the fallback arm
    expect(comparator(graph, [], OrderingStrategy.PREFER_NODES).compare(x, y)).toBe(-1);
  });
});

describe('ModelOrderNodeComparator by the previous layer', () => {
  /** Previous layer [a, b]; x connects from a, y from b (a port each), x and y in the next layer. */
  const setup = (previousOrder: 'ab' | 'ba') => {
    const graph = graphWithEnforcedOrders();
    const previous = addLayer(graph);
    const next = addLayer(graph);
    previous.id = 0;
    next.id = 1;
    const [a, b, x, y] = [addNode(graph), addNode(graph), addNode(graph), addNode(graph)];
    a.setLayer(previous);
    b.setLayer(previous);
    x.setLayer(next);
    y.setLayer(next);
    connect(addPort(a, PortSide.EAST), addPort(x, PortSide.WEST));
    connect(addPort(b, PortSide.EAST), addPort(y, PortSide.WEST));
    const previousNodes = previousOrder === 'ab' ? [a, b] : [b, a];
    return { graph, x, y, previousNodes };
  };

  it('PREFER_EDGES orders by the position of the source nodes in the previous layer', () => {
    const { graph, x, y, previousNodes } = setup('ab');
    expect(comparator(graph, previousNodes, OrderingStrategy.PREFER_EDGES).compare(x, y)).toBe(-1);
  });

  it('PREFER_EDGES follows a reversed previous layer', () => {
    const { graph, x, y, previousNodes } = setup('ba');
    expect(comparator(graph, previousNodes, OrderingStrategy.PREFER_EDGES).compare(x, y)).toBe(1);
  });

  it('accepts the previous layer as a Layer and reads its nodes in order', () => {
    const { graph, x, y } = setup('ab');
    const layer = x.getGraph()!.getLayers()[0]!;
    const cmp = new ModelOrderNodeComparator(
      graph,
      layer,
      OrderingStrategy.PREFER_EDGES,
      LongEdgeOrderingStrategy.EQUAL,
      OPTIONS,
    );
    expect(cmp.compare(x, y)).toBe(-1);
  });
});

describe('ModelOrderNodeComparator on the site rows', () => {
  it('answers a recorded smaller-than association when the crossing counter compares nodes a second time', () => {
    // oracle: sites/ModelOrder/transitive/counting; ModelOrderNodeComparator.java:133-135
    const result = replaySite('sites/ModelOrder/transitive/counting');
    expect(result.layers).toEqual([
      ['g0/n0', 'g0/n1'],
      ['g0/n4', 'g0/n6', 'g0/n8', 'g0/n3', 'g0/n2', 'g0/n5', 'g0/n7', 'g0/n9'],
    ]);
  });

  it('orders long-edge dummies through the state.compare closure and keeps the swept layers', () => {
    // oracle: sites/ModelOrder/zeroCrossings/afterSweep; ModelOrderNodeComparator.java:117 (the closure of the helper-dummy ordering, ModelOrderNodeComparator.java:330)
    const result = replaySite('sites/ModelOrder/zeroCrossings/afterSweep');
    expect(result.layers).toEqual([['g0/n0'], ['new/n0', 'g0/n1', 'g0/n2', 'new/n1'], ['g0/n3']]);
  });

  it('orders the long-edge dummies of one reference node through the state.compare closure', () => {
    // oracle: sites/ModelOrder/feedback/sameNode; ModelOrderNodeComparator.java:117 (the closure of the helper-dummy ordering, ModelOrderNodeComparator.java:330)
    const result = replaySite('sites/ModelOrder/feedback/sameNode');
    expect(result.layers).toEqual([
      ['new/n0', 'g0/n0'],
      ['g0/n5', 'new/n1', 'new/n2', 'new/n3'],
      ['new/n4', 'new/n5', 'g0/n1', 'new/n6', 'new/n7', 'new/n8', 'new/n9'],
      ['new/n10', 'new/n11', 'g0/n2'],
      ['new/n12', 'g0/n3', 'new/n13', 'new/n14', 'new/n15'],
      ['g0/n6', 'new/n16', 'new/n17'],
      ['g0/n4'],
    ]);
  });

  it('records an arbitrary decision for a node without model order', () => {
    // oracle: sites/ModelOrder/externalPorts; ModelOrderNodeComparator.java:278-282
    const result = replaySite('sites/ModelOrder/externalPorts');
    expect(result.layers).toEqual([
      ['g0/n0', 'g0/n1'],
      ['g0/n4', 'g0/n5'],
      ['g0/n6', 'g0/n7'],
      ['g0/n8', 'g0/n3'],
      ['g0/n2'],
    ]);
  });
});
