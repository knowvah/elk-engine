// SPDX-License-Identifier: EPL-2.0
/*
 * Port of ModelOrderLayerAssignmentTest (mission 7f, T12a): the model order layer assignment together with model order
 * node promotion on selected examples. Seven `@Test`s (7 runs), each laying a hand-built graph out through
 * `LayeredLayoutProvider` and asserting node positions within 0.1. The graph builder only factors out the Java's
 * repeated statements: nodes and edges are created in the Java's order, every node 30x30 with a label `n<i>`.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p2layers/ModelOrderLayerAssignmentTest.java
 */
import { describe, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { layout } from '../../../../test/helpers/layout-test-runner.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';

const DELTA = 0.1;
const NODE_SIZE = 30;

/** An edge as the 1-based numbers of its source and target node. */
type EdgeSpec = readonly [number, number];

/** The nodes `n1..nN` of a laid-out graph. */
type Nodes = readonly ElkNode[];

/** Creates the nodes, the options and the edges of a test graph, in the Java's order, and lays it out. */
function layoutGraph(
  nodeCount: number,
  layeringStrategy: LayeringStrategy,
  promotionStrategy: NodePromotionStrategy,
  edges: readonly EdgeSpec[],
): Nodes {
  const parent = ElkGraphUtil.createGraph();
  const nodes: ElkNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const node = ElkGraphUtil.createNode(parent);
    node.setDimensions(NODE_SIZE, NODE_SIZE);
    ElkGraphUtil.createLabelWithText(`n${i + 1}`, node);
    nodes.push(node);
  }

  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  parent.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
  parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_EDGES);
  parent.setProperty(LayeredOptions.LAYERING_STRATEGY, layeringStrategy);
  parent.setProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY, promotionStrategy);
  parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
  parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
  parent.setProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 20.0);

  for (const [source, target] of edges) {
    ElkGraphUtil.createSimpleEdge(nodes[source - 1], nodes[target - 1]);
  }

  layout(parent);
  return nodes;
}

/** `assertEquals("n<i> on wrong <axis> coordinate", x, node.getX(), 0.1)` and the same for y. */
function assertPosition(nodes: Nodes, number: number, x: number, y: number): void {
  const node = nodes[number - 1];
  assertEqualsWithin(`n${number} on wrong x coordinate`, x, node.getX(), DELTA);
  assertEqualsWithin(`n${number} on wrong y coordinate`, y, node.getY(), DELTA);
}

describe('ModelOrderLayerAssignmentTest', () => {
  it('testForwardPromotionDisregardsEdgeLength', () => {
    // Desired layout
    // n1 -> n2 -> n3 -> n5
    //    =======> n4 ->
    const nodes = layoutGraph(
      5,
      LayeringStrategy.LONGEST_PATH_SOURCE,
      NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT,
      [
        [1, 2],
        [1, 4],
        [1, 4],
        [2, 3],
        [3, 5],
        [4, 5],
      ],
    );

    assertPosition(nodes, 1, 0, 7.5);
    // Check whether position is node size of n1 + 3*edgeEdge spacing.
    assertPosition(nodes, 2, 30 + 30, 0);
    // Check whether position is node size of n1 + 3*edgeEdge spacing + node size of n2 + between layer spacing.
    assertPosition(nodes, 3, 30 + 30 + 30 + 20, 0);
    // Check whether n4 aligns with n3.
    assertPosition(nodes, 4, 110, 30 + 10);
    assertPosition(nodes, 5, 30 + 30 + 30 + 20 + 30 + 20, 5);
  });

  it('testBackwardPromotionDisregardsEdgeLength', () => {
    // Desired layout
    // n1 -> n2 =======> n5
    //    -> n3 -> n4 ->
    const nodes = layoutGraph(5, LayeringStrategy.LONGEST_PATH, NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT, [
      [1, 2],
      [1, 3],
      [2, 5],
      [2, 5],
      [3, 4],
      [4, 5],
    ]);

    assertPosition(nodes, 1, 0, 5);
    assertPosition(nodes, 2, 30 + 20, 0);
    // n3 aligns wit n2.
    assertPosition(nodes, 3, 50, 30 + 10);
    assertPosition(nodes, 4, 60 + 10 + 30, 40);
    assertPosition(nodes, 5, 150, 6);
  });

  it('testForwardPromotionMoreNodes', () => {
    // Desired layout
    // n1 -> n2 -> n3 ->
    //    =======> n4 -> n6
    //    -------> n5 ->
    const nodes = layoutGraph(
      6,
      LayeringStrategy.LONGEST_PATH_SOURCE,
      NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT,
      [
        [1, 2],
        [1, 4],
        [1, 4],
        [1, 5],
        [2, 3],
        [3, 6],
        [4, 6],
        [5, 6],
      ],
    );

    assertPosition(nodes, 1, 0, 9);
    // Check whether position is node size of n1 + 4*edgeEdge spacing.
    assertPosition(nodes, 2, 30 + 40, 0);
    // Check whether position is node size of n1 + 4*edgeEdge spacing + node size of n2 + between layer spacing.
    assertPosition(nodes, 3, 70 + 30 + 20, 0);
    // Check whether n4 aligns with n3.
    assertPosition(nodes, 4, 120, 30 + 10);
    // Check whether n5 aligns with n4 and n3.
    assertPosition(nodes, 5, 120, 40 + 30 + 10);
    assertPosition(nodes, 6, 170, 40);
  });

  it('testBackwardPromotionMoreNodes', () => {
    // Desired layout
    // n1 -> n2 =======>
    //    -> n3 -------> n6
    //    -> n4 -> n5 ->
    const nodes = layoutGraph(6, LayeringStrategy.LONGEST_PATH, NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT, [
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 6],
      [2, 6],
      [3, 6],
      [4, 5],
      [5, 6],
    ]);

    assertPosition(nodes, 1, 0, 7.5);
    assertPosition(nodes, 2, 60, 0);
    assertPosition(nodes, 3, 60, 40);
    assertPosition(nodes, 4, 60, 80);
    assertPosition(nodes, 5, 110, 80);
    assertPosition(nodes, 6, 170, 9);
  });

  it('testForwardPromotionNoEndNode', () => {
    // Desired layout
    // n1 -> n2 -> n3
    //    =======> n4
    const nodes = layoutGraph(
      4,
      LayeringStrategy.LONGEST_PATH_SOURCE,
      NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT,
      [
        [1, 2],
        [1, 4],
        [1, 4],
        [2, 3],
      ],
    );

    assertPosition(nodes, 1, 0, 7.5);
    // Check whether position is node size of n1 + 4*edgeEdge spacing.
    assertPosition(nodes, 2, 30 + 30, 0);
    // Check whether position is node size of n1 + 4*edgeEdge spacing + node size of n2 + between layer spacing.
    assertPosition(nodes, 3, 60 + 30 + 20, 0);
    // Check whether n4 aligns with n3.
    assertPosition(nodes, 4, 110, 30 + 10);
  });

  it('testBackwardPromotionNoEndNode', () => {
    // Desired layout
    // n1 =======> n4
    // n2 -> n3 ->
    const nodes = layoutGraph(4, LayeringStrategy.LONGEST_PATH, NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT, [
      [1, 4],
      [1, 4],
      [2, 3],
      [3, 4],
    ]);

    assertPosition(nodes, 1, 0, 0);
    assertPosition(nodes, 2, 0, 40);
    assertPosition(nodes, 3, 50, 40);
    assertPosition(nodes, 4, 100, 6);
  });

  it('testBackwardPromotionNoEndNode2', () => {
    // Desired layout
    // n1 -> n2
    //    -> n3 -> n4
    const nodes = layoutGraph(4, LayeringStrategy.LONGEST_PATH, NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT, [
      [1, 2],
      [1, 3],
      [3, 4],
    ]);

    assertPosition(nodes, 1, 0, 5);
    assertPosition(nodes, 2, 50, 0);
    assertPosition(nodes, 3, 50, 40);
    assertPosition(nodes, 4, 100, 40);
  });
});
