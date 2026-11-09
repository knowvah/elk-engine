// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue871Test (mission 7f2, T13b): model order layer assignment together with model order node promotion on
 * selected examples. Three `@Test`s (3 oracle runs), each laying a hand-built 30x30-node graph out through
 * `LayeredLayoutProvider`. The Java sizes no label (the graphs are not run by the `LayoutTestRunner`), so the labels
 * here stay zero-sized as well; `testNoFeedbackEdgesStillWorking` has edge labels, so its plan holds the label dummy
 * inserter. The `(non-vacuity)` case checks that each graph was spread over layers (the nodes did not all stay at 0).
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/issues/Issue871Test.java
 */
import { describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { layout } from '../../../../test/helpers/layout-test-runner.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { GreedySwitchType } from '../options/GreedySwitchType.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';

const DELTA = 0.1;
const NODE_SIZE = 30;

/** A graph under test: its parent and its nodes `n1..nN`. */
interface Fixture {
  readonly parent: ElkNode;
  readonly nodes: readonly ElkNode[];
}

/** `ElkGraphUtil.createNode` x `count` with `setDimensions(30, 30)`, in the Java's order (all created first). */
function createNodes(count: number): Fixture {
  const parent = ElkGraphUtil.createGraph();
  const nodes = Array.from({ length: count }, () => ElkGraphUtil.createNode(parent));
  for (const node of nodes) {
    node.setDimensions(NODE_SIZE, NODE_SIZE);
  }
  return { parent, nodes };
}

/** The options the three Java tests share; `feedbackEdges` is set by the two tests that have a feedback edge. */
function configure(parent: ElkNode, feedbackEdges: boolean): void {
  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  parent.setProperty(CoreOptions.DIRECTION, Direction.RIGHT);
  parent.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.MODEL_ORDER);
  parent.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_EDGES);
  parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.NONE);
  parent.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, GreedySwitchType.OFF);
  parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
  parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
  parent.setProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 20.0);
  if (feedbackEdges) {
    parent.setProperty(LayeredOptions.FEEDBACK_EDGES, true);
  }
}

/** The `n<i>` labels the Java creates on every node after its edges. */
function labelNodes(nodes: readonly ElkNode[]): void {
  nodes.forEach((node, index) => ElkGraphUtil.createLabelWithText(`n${index + 1}`, node));
}

function feedbackEdgeBelow(): Fixture {
  // Desired layout
  // n1 -> n2 -> n4 -
  //    -> n3       |
  //   |____________|
  const fixture = createNodes(4);
  const [n1, n2, n3, n4] = fixture.nodes;
  configure(fixture.parent, true);

  ElkGraphUtil.createSimpleEdge(n1, n2);
  ElkGraphUtil.createSimpleEdge(n1, n3);
  ElkGraphUtil.createSimpleEdge(n2, n4);
  ElkGraphUtil.createSimpleEdge(n4, n3); // Feedback edge
  labelNodes(fixture.nodes);
  return fixture;
}

function feedbackEdgeBasic(): Fixture {
  // Desired layout
  // n1 -> n2 -> n3-
  //   |____________|
  const fixture = createNodes(3);
  const [n1, n2, n3] = fixture.nodes;
  configure(fixture.parent, true);

  ElkGraphUtil.createSimpleEdge(n1, n2);
  ElkGraphUtil.createSimpleEdge(n2, n3);
  ElkGraphUtil.createSimpleEdge(n3, n2); // Feedback edge
  labelNodes(fixture.nodes);
  return fixture;
}

function noFeedbackEdges(): Fixture {
  // Desired layout
  // n1 -1-> n2 ------>
  //           <- n3 -> n4
  //   --2------------>
  const fixture = createNodes(4);
  const [n1, n2, n3, n4] = fixture.nodes;
  configure(fixture.parent, false);

  const e1 = ElkGraphUtil.createSimpleEdge(n1, n2);
  ElkGraphUtil.createLabelWithText('1', e1);
  const e2 = ElkGraphUtil.createSimpleEdge(n1, n4);
  ElkGraphUtil.createLabelWithText('2', e2);
  ElkGraphUtil.createSimpleEdge(n2, n4);
  ElkGraphUtil.createSimpleEdge(n3, n2);
  ElkGraphUtil.createSimpleEdge(n3, n4);
  labelNodes(fixture.nodes);
  return fixture;
}

/** `new LayeredLayoutProvider().layout(parent, new BasicProgressMonitor())` */
function laidOut(build: () => Fixture): readonly ElkNode[] {
  const fixture = build();
  layout(fixture.parent);
  return fixture.nodes;
}

describe('Issue871Test', () => {
  it('testFeedbackEdgeBelow', () => {
    const [, n2, , n4] = laidOut(feedbackEdgeBelow);

    // Check whether n4 aligns with n2.
    assertEqualsWithin('n4 and n2 should align', n2.getY(), n4.getY(), DELTA);
  });

  it('testFeedbackEdgeBasic', () => {
    const [, n2, n3] = laidOut(feedbackEdgeBasic);

    // Check whether n3 aligns with n2.
    assertEqualsWithin('n3 and n2 should align', n2.getY(), n3.getY(), DELTA);
  });

  it('testNoFeedbackEdgesStillWorking', () => {
    const [n1, n2, n3, n4] = laidOut(noFeedbackEdges);

    // Check whether nodes are on the expected positions.
    assertEqualsWithin('n1 X coordinate is wrong', 0, n1.getX(), DELTA);
    assertEqualsWithin('n1 Y coordinate is wrong', 31, n1.getY(), DELTA);
    assertEqualsWithin('n2 X coordinate is wrong', 70.0, n2.getX(), DELTA);
    assertEqualsWithin('n2 Y coordinate is wrong', 6, n2.getY(), DELTA);
    assertEqualsWithin('n3 X coordinate is wrong', 120, n3.getX(), DELTA);
    assertEqualsWithin('n3 Y coordinate is wrong', 11, n3.getY(), DELTA);
    assertEqualsWithin('n4 X coordinate is wrong', 170, n4.getX(), DELTA);
    assertEqualsWithin('n4 Y coordinate is wrong', 11, n4.getY(), DELTA);
  });
});

describe('Issue871Test (non-vacuity)', () => {
  it('(non-vacuity)', () => {
    for (const build of [feedbackEdgeBelow, feedbackEdgeBasic, noFeedbackEdges]) {
      const nodes = laidOut(build);
      // the layout spread the nodes over several layers: the first node is left of the last one
      expect(nodes[0].getX()).toBeLessThan(nodes[nodes.length - 1].getX());
    }
  });
});
