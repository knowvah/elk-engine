// SPDX-License-Identifier: EPL-2.0
/*
 * Port of MrTreeGraphSizeTest (TR8): tests that the graph size calculated by MrTree is correct, for three parameter rows
 * (the JUnit `Parameterized` runner). Configuration goes through a `LayoutConfigurator` and the `LayoutAlgorithmResolver`
 * as in the Java; `PlainJavaInitialization.initializePlainJavaLayout()` is the explicit `registerMrTree()` here.
 *
 * @see org.eclipse.elk.alg.mrtree.test/src/org/eclipse/elk/alg/mrtree/test/MrTreeGraphSizeTest.java
 */
import { describe, expect, it } from 'vitest';
import { registerMrTree } from '../../../test/helpers/mrtree-replay-state.js';
import { LayoutConfigurator } from '../../core/LayoutConfigurator.js';
import { LayoutAlgorithmResolver } from '../../core/data/LayoutAlgorithmResolver.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';

const DOUBLE_EQ_EPSILON = 10e-5;

/** nodeWidth, nodeHeight, paddingLeft, paddingRight, paddingTop, paddingBottom, nodeNodeSpacing */
const TEST_VALUES: readonly (readonly [number, number, number, number, number, number, number])[] = [
  [20, 20, 10, 10, 10, 10, 10],
  [15, 30, 7, 9, 11, 13, 15],
  [25, 15, 0, 0, 0, 0, 20],
];

/** JUnit's `assertEquals(expected, actual, delta)`: passes when the values differ by at most `delta`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  expect(Math.abs(expected - actual)).toBeLessThanOrEqual(delta);
}

/** The Java's `ElkUtil.applyVisitors(...)` then `layout(...)`, failing with the exception text on an `UnsupportedGraphException`. */
function applyAndLayout(graph: ElkNode): void {
  // prepare layout engine
  const config = new LayoutConfigurator();
  ElkUtil.applyVisitors(graph, config, new LayoutAlgorithmResolver());
  // call layout with layout engine
  try {
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  } catch (exception) {
    if (exception instanceof UnsupportedGraphException) {
      expect.fail(exception.toString());
    }
    throw exception;
  }
}

describe.each(TEST_VALUES)(
  'MrTreeGraphSizeTest(nodeWidth=%d, nodeHeight=%d, paddingLeft=%d, paddingRight=%d, paddingTop=%d, paddingBottom=%d, spacing=%d)',
  (nodeWidth, nodeHeight, paddingLeft, paddingRight, paddingTop, paddingBottom, nodeNodeSpacing) => {
    /** Tests that the graph size is correct. */
    it('GraphSizeCalculationTest', () => {
      registerMrTree();
      const graph = ElkGraphUtil.createGraph();
      graph.setProperty(CoreOptions.ALGORITHM, MrTreeOptions.ALGORITHM_ID);
      graph.setProperty(CoreOptions.PADDING, new ElkPadding(paddingTop, paddingRight, paddingBottom, paddingLeft));
      graph.setProperty(CoreOptions.SPACING_NODE_NODE, nodeNodeSpacing);

      const n1 = ElkGraphUtil.createNode(graph);
      n1.setDimensions(nodeWidth, nodeHeight);
      const n2 = ElkGraphUtil.createNode(graph);
      n2.setDimensions(nodeWidth, nodeHeight);
      const n3 = ElkGraphUtil.createNode(graph);
      n3.setDimensions(nodeWidth, nodeHeight);

      ElkGraphUtil.createSimpleEdge(n1, n2);
      ElkGraphUtil.createSimpleEdge(n1, n3);

      applyAndLayout(graph);

      assertEquals(
        paddingLeft + nodeWidth + nodeNodeSpacing + nodeWidth + paddingRight,
        graph.getWidth(),
        DOUBLE_EQ_EPSILON,
      );
      assertEquals(
        paddingTop + nodeHeight + nodeNodeSpacing + nodeHeight + paddingBottom,
        graph.getHeight(),
        DOUBLE_EQ_EPSILON,
      );
    });

    /** Tests that the graph size is correct when the graph consists of disconnected components. */
    it('ComponentsGraphSizeCalculationTest', () => {
      registerMrTree();
      const graph = ElkGraphUtil.createGraph();
      graph.setProperty(CoreOptions.ALGORITHM, MrTreeOptions.ALGORITHM_ID);
      graph.setProperty(CoreOptions.PADDING, new ElkPadding(0));
      graph.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
      // set aspect ratio to high value to force components to be laid out horizontally for the test
      graph.setProperty(CoreOptions.ASPECT_RATIO, 1000.0);

      const n1 = ElkGraphUtil.createNode(graph);
      n1.setDimensions(nodeWidth, nodeHeight);
      const n2 = ElkGraphUtil.createNode(graph);
      n2.setDimensions(nodeWidth, nodeHeight);

      applyAndLayout(graph);

      assertEquals(nodeWidth + nodeWidth, graph.getWidth(), DOUBLE_EQ_EPSILON);
      assertEquals(nodeHeight, graph.getHeight(), DOUBLE_EQ_EPSILON);
    });
  },
);
