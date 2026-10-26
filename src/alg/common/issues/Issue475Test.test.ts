// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.common.test Issue475Test: the fixed layouter must honour (or grow to fit) compound node
 * sizes. Each Java `@Configurator` becomes one `layoutElkt` run followed by the `@Test` body.
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/issues/Issue475Test.java
 */
import { describe, expect, it } from 'vitest';
import { layoutElkt } from '../../../../test/helpers/elkt-layout-harness.js';
import { FixedLayouterOptions } from '../../../core/options/FixedLayouterOptions.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const MODEL = 'tickets/core/475_fixedLayoutWithLongLabels.elkt';

/** Default compound node size. */
const SIZE = 20;

function configureFixedGraphSize(graph: ElkNode): void {
  for (const child of graph.getChildren()) {
    // Make sure we know the size the node shall have
    child.setProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child.setHeight(SIZE);
    child.setWidth(SIZE);
  }
}

function configureNoFixedGraphSize(graph: ElkNode): void {
  for (const node of graph.getChildren()) {
    node.setProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE, false);
  }
}

function doTestCompoundNodeSize(node: ElkNode): void {
  if (node.getProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
    // The node's size should not have changed
    expect(node.getWidth()).toBe(SIZE);
    expect(node.getHeight()).toBe(SIZE);
  } else {
    let maxX = 0;
    let maxY = 0;

    for (const child of node.getChildren()) {
      maxX = Math.max(maxX, child.getX() + child.getWidth());
      maxY = Math.max(maxY, child.getY() + child.getHeight());
    }

    expect(node.getWidth()).toBeGreaterThanOrEqual(maxX);
    expect(node.getHeight()).toBeGreaterThanOrEqual(maxY);
  }
}

function testCompoundNodeSize(graph: ElkNode, expectFixed: boolean): void {
  expect(graph.getChildren().size()).toBeGreaterThan(0);
  for (const node of graph.getChildren()) {
    expect(node.getProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE)).toBe(expectFixed);
    doTestCompoundNodeSize(node);
  }
}

describe('Issue475Test', () => {
  it('testCompoundNodeSize with configureFixedGraphSize', () => {
    const graph = layoutElkt(MODEL, FixedLayouterOptions.ALGORITHM_ID, configureFixedGraphSize);
    testCompoundNodeSize(graph, true);
  });

  it('testCompoundNodeSize with configureNoFixedGraphSize', () => {
    const graph = layoutElkt(MODEL, FixedLayouterOptions.ALGORITHM_ID, configureNoFixedGraphSize);
    testCompoundNodeSize(graph, false);
  });
});
