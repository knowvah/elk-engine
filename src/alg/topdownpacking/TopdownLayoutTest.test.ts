// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, it } from 'vitest';
import { LayoutConfigurator } from '../../core/LayoutConfigurator.js';
import { RecursiveGraphLayoutEngine } from '../../core/RecursiveGraphLayoutEngine.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { LayoutAlgorithmResolver } from '../../core/data/LayoutAlgorithmResolver.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { TopdownNodeTypes } from '../../core/options/TopdownNodeTypes.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';

/**
 * Tests for checking that topdown layout works correctly in different configurations.
 *
 * @see org.eclipse.elk.alg.topdown.test/src/org/eclipse/elk/alg/topdown/test/TopdownLayoutTest.java
 */

/** JUnit `assertEquals(double expected, double actual, double delta)`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  assertEqualsWithin('', expected, actual, delta);
}

/**
 * Java `PlainJavaInitialization.initializePlainJavaLayout()`: the metadata service registers every algorithm on the
 * class path; these tests run the core `fixed` algorithm and layered (the default algorithm), so layered is
 * registered (PK10).
 */
function initializePlainJavaLayout(): void {
  registerLayered();
}

/** The Java `try { engine.layout(...) } catch (UnsupportedGraphException e) { fail(e.toString()); }` block. */
function layoutWithEngine(graph: ElkNode): void {
  // prepare layout engine
  const config = new LayoutConfigurator();
  ElkUtil.applyVisitors(graph, config, new LayoutAlgorithmResolver());
  // call layout with layout engine
  try {
    new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  } catch (exception) {
    if (exception instanceof UnsupportedGraphException) {
      throw new Error(`fail: ${String(exception)}`);
    }
    throw exception;
  }
}

describe('TopdownLayoutTest', () => {
  /**
   * Tests a topdown layout with two hierarchical levels. All nodes are hierarchical nodes. Size of the toplevel node
   * causes a horizontal scaling.
   */
  it('testTwoLevelLayoutHorizontalScaling', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const toplevel = ElkGraphUtil.createNode(graph);
    toplevel.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    toplevel.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    toplevel.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.fixed');
    toplevel.setProperty(CoreOptions.PADDING, new ElkPadding());
    toplevel.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
    // set size of node so that children will be scaled down
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 20.0);
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 0.4);

    const child1 = ElkGraphUtil.createNode(toplevel);
    child1.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child1.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child1.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child1.setX(0);
    child1.setY(0);
    child1.setDimensions(30, 30);

    const child2 = ElkGraphUtil.createNode(toplevel);
    child2.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child2.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child2.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child2.setX(0);
    child2.setY(40);
    child2.setDimensions(30, 30);

    layoutWithEngine(graph);

    // topdown scale factor of toplevel node
    assertEquals(20.0 / 30.0, toplevel.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR), 0.00001);
  });

  /**
   * Tests a topdown layout with two hierarchical levels. All nodes are hierarchical nodes. Size of the toplevel node
   * causes a vertical scaling.
   */
  it('testTwoLevelLayoutVerticalScaling', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const toplevel = ElkGraphUtil.createNode(graph);
    toplevel.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    toplevel.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    toplevel.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.fixed');
    toplevel.setProperty(CoreOptions.PADDING, new ElkPadding());
    toplevel.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
    // set size of node so that children will be scaled down
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 40.0);
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 1.33333);

    const child1 = ElkGraphUtil.createNode(toplevel);
    child1.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child1.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child1.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child1.setX(0);
    child1.setY(0);
    child1.setDimensions(30, 30);

    const child2 = ElkGraphUtil.createNode(toplevel);
    child2.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child2.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child2.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child2.setX(0);
    child2.setY(40);
    child2.setDimensions(30, 30);

    layoutWithEngine(graph);

    // topdown scale factor of toplevel node
    assertEquals(30.0 / 70.0, toplevel.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR), 0.00001);
  });

  /** Test scale cap property when the result scale is larger than default, but smaller than the set scale cap. */
  it('testScaleCap', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const toplevel = ElkGraphUtil.createNode(graph);
    toplevel.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    toplevel.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_SCALE_CAP, 100.0);
    toplevel.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.fixed');
    toplevel.setProperty(CoreOptions.PADDING, new ElkPadding());
    toplevel.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
    // set size of node so that children will be scaled down
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 300.0);
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 1.0);

    const child1 = ElkGraphUtil.createNode(toplevel);
    child1.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child1.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child1.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child1.setX(0);
    child1.setY(0);
    child1.setDimensions(30, 30);

    const child2 = ElkGraphUtil.createNode(toplevel);
    child2.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child2.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child2.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child2.setX(0);
    child2.setY(40);
    child2.setDimensions(30, 30);

    layoutWithEngine(graph);

    // topdown scale factor of toplevel node
    assertEquals(300.0 / 70.0, toplevel.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR), 0.00001);
  });

  /** Test scale cap property when the scale cap bounds the resulting topdown scale factor. */
  it('testScaleCapBounded', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const toplevel = ElkGraphUtil.createNode(graph);
    toplevel.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    toplevel.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_SCALE_CAP, 3.0);
    toplevel.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.fixed');
    toplevel.setProperty(CoreOptions.PADDING, new ElkPadding());
    toplevel.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
    // set size of node so that children will be scaled down
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 300.0);
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 1.0);

    const child1 = ElkGraphUtil.createNode(toplevel);
    child1.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child1.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child1.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child1.setX(0);
    child1.setY(0);
    child1.setDimensions(30, 30);

    const child2 = ElkGraphUtil.createNode(toplevel);
    child2.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child2.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child2.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child2.setX(0);
    child2.setY(40);
    child2.setDimensions(30, 30);

    layoutWithEngine(graph);

    // topdown scale factor of toplevel node
    assertEquals(3.0, toplevel.getProperty(CoreOptions.TOPDOWN_SCALE_FACTOR), 0.00001);
  });

  /** Tests that paddings are correctly considered when computing the size of nodes with further children. */
  it('testChildDimensionCalculation', () => {
    initializePlainJavaLayout();
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    graph.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.ROOT_NODE);

    const toplevel = ElkGraphUtil.createNode(graph);
    toplevel.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    toplevel.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    toplevel.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    toplevel.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.layered');
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 20.0);
    toplevel.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 1.0);
    const padding = new ElkPadding(10);
    toplevel.setProperty(CoreOptions.PADDING, padding);

    const child1 = ElkGraphUtil.createNode(toplevel);
    child1.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    child1.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.HIERARCHICAL_NODE);
    child1.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    child1.setX(0);
    child1.setY(0);
    child1.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 20.0);
    child1.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 1.0);

    layoutWithEngine(graph);

    // child dimensions computed in fallback case depend on the paddings and the "topdown size"
    assertEquals(20.0 + padding.getHorizontal(), toplevel.getWidth(), 0.00001);
    assertEquals(20.0 + padding.getVertical(), toplevel.getHeight(), 0.00001);
  });
});
