// SPDX-License-Identifier: EPL-2.0
/*
 * Port of NestedModelOrderConfigurationTest: ELK Layered refuses model order strategies configured on a nested graph that
 * is laid out as part of its parent's hierarchy (HierarchyHandling.INCLUDE_CHILDREN). The model order information these
 * strategies read is only computed for the top-level graph of such a hierarchy, and model order strategies are not
 * supported with INCLUDE_CHILDREN. Before the check, these configurations failed with a NullPointerException from deep
 * inside a layout phase. The Java's `PlainJavaInitialization.initializePlainJavaLayout()` is the explicit layered
 * registration.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/NestedModelOrderConfigurationTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedConfigurationException } from '../../core/UnsupportedConfigurationException.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { GroupOrderStrategy } from './options/GroupOrderStrategy.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { OrderingStrategy } from './options/OrderingStrategy.js';

const NESTED_ID = 'p';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Graphs

/** A root graph with the given hierarchy handling. */
function root(hierarchyHandling: HierarchyHandling): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  graph.setProperty(CoreOptions.HIERARCHY_HANDLING, hierarchyHandling);
  return graph;
}

function node(parent: ElkNode, id: string): ElkNode {
  const created = ElkGraphUtil.createNode(parent);
  created.setIdentifier(id);
  created.setDimensions(30, 30);
  return created;
}

/** A node `p` in the given graph with `nodes` children `n0`, `n1`, .... */
function nested(graph: ElkNode, nodes: number): ElkNode {
  const nestedNode = node(graph, NESTED_ID);
  for (let i = 0; i < nodes; i++) {
    node(nestedNode, `n${String(i)}`);
  }
  return nestedNode;
}

/** Connects the first two children of the given node with `n0 -> n1` and, if requested, `n1 -> n0`. */
function connect(parent: ElkNode, cycle: boolean): void {
  const n0 = parent.getChildren().get(0);
  const n1 = parent.getChildren().get(1);
  ElkGraphUtil.createSimpleEdge(n0, n1);
  if (cycle) {
    ElkGraphUtil.createSimpleEdge(n1, n0);
  }
}

function layout(graph: ElkNode): void {
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
}

/** JUnit `assertThrows(UnsupportedConfigurationException.class, ...)`: the thrown exception, which must be of that class. */
function thrownBy(run: () => void): UnsupportedConfigurationException {
  let thrown: unknown = null;
  try {
    run();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(UnsupportedConfigurationException);
  return thrown as UnsupportedConfigurationException;
}

function assertRefused(graph: ElkNode, option: IProperty<unknown>, value: { toString(): string }): void {
  const e = thrownBy(() => {
    layout(graph);
  });
  const message = e.message;
  expect(message.startsWith(`Node '${NESTED_ID}' sets ${option.getId()} ${value.toString()}`), message).toBe(true);
  expect(message.includes(HierarchyHandling.INCLUDE_CHILDREN.toString()), message).toBe(true);
  expect(message.includes(HierarchyHandling.SEPARATE_CHILDREN.toString()), message).toBe(true);
}

describe('NestedModelOrderConfigurationTest', () => {
  beforeAll(() => {
    registerLayered();
  });

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Refused configurations

  it('testModelOrderCycleBreakingRefused', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 1);
    nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);
    assertRefused(graph, LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);
  });

  it('testOtherModelOrderCycleBreakersRefused', () => {
    for (const strategy of [
      CycleBreakingStrategy.GREEDY_MODEL_ORDER,
      CycleBreakingStrategy.SCC_CONNECTIVITY,
      CycleBreakingStrategy.SCC_NODE_TYPE,
    ]) {
      const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
      const nestedNode = nested(graph, 2);
      connect(nestedNode, true);
      nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, strategy);
      assertRefused(graph, LayeredOptions.CYCLE_BREAKING_STRATEGY, strategy);
    }
  });

  it('testDepthFirstNodeOrderWithEnforcedGroupOrderRefused', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 2);
    connect(nestedNode, false);
    nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.DFS_NODE_ORDER);
    nestedNode.setProperty(
      LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY,
      GroupOrderStrategy.ENFORCED,
    );
    assertRefused(graph, LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.DFS_NODE_ORDER);
  });

  it('testBreadthFirstNodeOrderWithEnforcedGroupOrderRefused', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 2);
    connect(nestedNode, true);
    nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.BFS_NODE_ORDER);
    nestedNode.setProperty(
      LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY,
      GroupOrderStrategy.ENFORCED,
    );
    assertRefused(graph, LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.BFS_NODE_ORDER);
  });

  it('testConsiderModelOrderRefused', () => {
    for (const strategy of [
      OrderingStrategy.NODES_AND_EDGES,
      OrderingStrategy.PREFER_EDGES,
      OrderingStrategy.PREFER_NODES,
    ]) {
      const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
      const nestedNode = nested(graph, 2);
      nestedNode.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, strategy);
      assertRefused(graph, LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, strategy);
    }
  });

  /**
   * A single nested node never makes the model order readers compare two nodes, so this configuration used to lay
   * out. It is refused now as well, since the configuration is the same one that fails as soon as there are two.
   */
  it('testConsiderModelOrderWithSingleNodeRefused', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 1);
    nestedNode.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_NODES);
    assertRefused(graph, LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_NODES);
  });

  it('testForceNodeModelOrderRefused', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 2);
    nestedNode.setProperty(LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, true);
    assertRefused(graph, LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, true);
  });

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Supported configurations

  /** The top-level graph of an INCLUDE_CHILDREN hierarchy has its model order data. */
  it('testModelOrderCycleBreakingOnRootLaysOut', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    graph.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);
    nested(graph, 2);
    node(graph, 'a');
    node(graph, 'b');
    const a = graph.getChildren().get(1);
    const b = graph.getChildren().get(2);
    ElkGraphUtil.createSimpleEdge(a, b);
    ElkGraphUtil.createSimpleEdge(b, a);

    layout(graph);

    // The model order cycle breaker reverses b -> a, the edge against the model order
    expect(a.getX() < b.getX()).toBe(true);
  });

  /** A nested graph laid out on its own is imported flat and has its model order data. */
  it('testModelOrderCycleBreakingWithSeparateChildrenLaysOut', () => {
    const graph = root(HierarchyHandling.SEPARATE_CHILDREN);
    const nestedNode = nested(graph, 2);
    connect(nestedNode, true);
    nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);

    layout(graph);

    // The model order cycle breaker reverses n1 -> n0, the edge against the model order
    expect(nestedNode.getChildren().get(0).getX() < nestedNode.getChildren().get(1).getX()).toBe(true);
  });

  /** Without the enforced group order, the node order cycle breakers read only the node model order. */
  it('testDepthFirstNodeOrderWithoutEnforcedGroupOrderLaysOut', () => {
    const graph = root(HierarchyHandling.INCLUDE_CHILDREN);
    const nestedNode = nested(graph, 2);
    connect(nestedNode, false);
    nestedNode.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.DFS_NODE_ORDER);

    layout(graph);

    expect(nestedNode.getChildren().get(0).getX() < nestedNode.getChildren().get(1).getX()).toBe(true);
  });
});
