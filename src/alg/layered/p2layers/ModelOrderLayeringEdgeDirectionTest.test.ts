// SPDX-License-Identifier: EPL-2.0
/*
 * Port of ModelOrderLayeringEdgeDirectionTest: the BF and DF model order layer assigners refuse a layering whose edges do
 * not all point to a later layer. Such edges arise when an edge runs against the model order, which a cycle breaker other
 * than the model order one leaves in place. Before the check, they reached crossing minimization and could fail there with
 * an `IndexOutOfBoundsException`. The Java's `PlainJavaInitialization.initializePlainJavaLayout()` is the explicit layered
 * registration; `assertThrows(UnsupportedGraphException.class, ...)` is one layout call whose caught exception must be an
 * `UnsupportedGraphException`, followed by the Java's message checks.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/p2layers/ModelOrderLayeringEdgeDirectionTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { RecursiveGraphLayoutEngine } from '../../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedGraphException } from '../../../core/UnsupportedGraphException.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';

function graph(layering: LayeringStrategy, cycles: CycleBreakingStrategy): ElkNode {
  const parent = ElkGraphUtil.createGraph();
  parent.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  parent.setProperty(LayeredOptions.LAYERING_STRATEGY, layering);
  parent.setProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY, cycles);
  return parent;
}

function node(parent: ElkNode): ElkNode {
  const result = ElkGraphUtil.createNode(parent);
  result.setDimensions(30, 30);
  return result;
}

/** Two nodes and one edge from the second to the first node in model order: `n0 <- n1`. */
function backwardEdgeGraph(layering: LayeringStrategy, cycles: CycleBreakingStrategy): ElkNode {
  const parent = graph(layering, cycles);
  const n0 = node(parent);
  const n1 = node(parent);
  ElkGraphUtil.createSimpleEdge(n1, n0);
  return parent;
}

/** `n0 -> n1 <- n2`: BF puts n2 into the layer of n1, DF starts a new strip with n2 in the first layer. */
function joiningEdgeGraph(layering: LayeringStrategy): ElkNode {
  const parent = graph(layering, CycleBreakingStrategy.GREEDY);
  const n0 = node(parent);
  const n1 = node(parent);
  const n2 = node(parent);
  ElkGraphUtil.createSimpleEdge(n0, n1);
  ElkGraphUtil.createSimpleEdge(n2, n1);
  return parent;
}

function layout(parent: ElkNode): void {
  new RecursiveGraphLayoutEngine().layout(parent, new BasicProgressMonitor());
}

function assertRefused(parent: ElkNode, layerer: string): void {
  let caught: unknown = null;
  try {
    layout(parent);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(UnsupportedGraphException);
  const message = (caught as UnsupportedGraphException).message;
  expect(message.startsWith(`The ${layerer} model order layer assigner`), message).toBe(true);
  expect(message.includes(LayeredOptions.CYCLE_BREAKING_STRATEGY.getId()), message).toBe(true);
}

describe('ModelOrderLayeringEdgeDirectionTest', () => {
  beforeAll(() => {
    registerLayered();
  });

  it('testBreadthFirstRefusesBackwardEdge', () => {
    assertRefused(backwardEdgeGraph(LayeringStrategy.BF_MODEL_ORDER, CycleBreakingStrategy.GREEDY), 'BF');
  });

  it('testDepthFirstRefusesBackwardEdge', () => {
    assertRefused(backwardEdgeGraph(LayeringStrategy.DF_MODEL_ORDER, CycleBreakingStrategy.GREEDY), 'DF');
  });

  it('testBreadthFirstRefusesJoiningEdge', () => {
    assertRefused(joiningEdgeGraph(LayeringStrategy.BF_MODEL_ORDER), 'BF');
  });

  it('testDepthFirstKeepsValidLayeringOfJoiningEdge', () => {
    // n2 has no incoming edge and starts a new strip in the first layer, so its edge still points forward
    const parent = joiningEdgeGraph(LayeringStrategy.DF_MODEL_ORDER);
    layout(parent);
    const n1 = parent.getChildren().get(1);
    const n2 = parent.getChildren().get(2);
    expect(n2.getX() < n1.getX()).toBe(true);
  });

  it('testModelOrderCycleBreakingReversesBackwardEdge', () => {
    for (const layering of [LayeringStrategy.BF_MODEL_ORDER, LayeringStrategy.DF_MODEL_ORDER]) {
      const parent = backwardEdgeGraph(layering, CycleBreakingStrategy.MODEL_ORDER);
      layout(parent);
      const n0 = parent.getChildren().get(0);
      const n1 = parent.getChildren().get(1);
      expect(n0.getX() < n1.getX(), layering.toString()).toBe(true);
    }
  });
});
