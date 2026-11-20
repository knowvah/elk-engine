// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.common.test Issue475Test: the fixed layouter must honour (or grow to fit) compound node
 * sizes. The `@RunWith(LayoutTestRunner)` annotations become `defineLayoutTest`; each Java `@Configurator` is one experiment.
 *
 * @see org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/issues/Issue475Test.java
 */
import { expect } from 'vitest';
import { defineLayoutTest } from '../../../../test/helpers/layout-test-runner.js';
import { FixedLayouterOptions } from '../../../core/options/FixedLayouterOptions.js';
import type { ElkNode } from '../../../graph/ElkNode.js';

const MODEL = 'tickets/core/475_fixedLayoutWithLongLabels.elkt';

/** Default compound node size. */
const SIZE = 20;

/*
 * The value the running experiment's configurator set, read by the one check (the port-added `expectFixed` check).
 * Sound because `layout-test-runner.ts` realises an experiment, configurator included, lazily inside its first (here
 * only) check (`ExperimentRun.graph`, `casesOf`), and vitest runs the cases sequentially, so the configurator of an
 * experiment runs immediately before that experiment's own check and experiments never interleave.
 */
let expectFixed: boolean | null = null;

function configureFixedGraphSize(graph: ElkNode): void {
  expectFixed = true;
  for (const child of graph.getChildren()) {
    // Make sure we know the size the node shall have
    child.setProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child.setHeight(SIZE);
    child.setWidth(SIZE);
  }
}

function configureNoFixedGraphSize(graph: ElkNode): void {
  expectFixed = false;
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

defineLayoutTest({
  name: 'Issue475Test',
  algorithm: FixedLayouterOptions.ALGORITHM_ID,
  graphs: [{ path: MODEL }],
  configurators: { configureFixedGraphSize, configureNoFixedGraphSize },
  defaultConfiguration: true,
  afterLayout: {
    testCompoundNodeSize: (graph) => {
      expect(graph.getChildren().size()).toBeGreaterThan(0);
      for (const node of graph.getChildren()) {
        expect(node.getProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE)).toBe(expectFixed);
        doTestCompoundNodeSize(node);
      }
    },
  },
});
