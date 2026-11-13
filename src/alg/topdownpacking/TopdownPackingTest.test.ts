// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { TopdownpackingLayoutProvider } from './TopdownpackingLayoutProvider.js';

/**
 * Tests the topdown packing algorithm. The node sizes must be externally set and determine the layout results.
 * Unless otherwise specified, the tests expect the default values of properties to be used.
 *
 * @see org.eclipse.elk.alg.topdown.test/src/org/eclipse/elk/alg/topdown/test/TopdownPackingTest.java
 */

/** JUnit `assertEquals(double expected, double actual, double delta)`. */
function assertEquals(expected: number, actual: number, delta: number): void {
  assertEqualsWithin('', expected, actual, delta);
}

/** Java `PlainJavaInitialization.initializePlainJavaLayout()`: the metadata service with the core options. */
function initializePlainJavaLayout(): void {
  LayoutMetaDataService.getInstance();
}

function createEmptyGraph(): ElkNode {
  return ElkGraphUtil.createGraph();
}

function createGraph(numberOfNodes: number): ElkNode {
  if (numberOfNodes < 0) {
    throw new Error('fail()');
  }
  const graph = ElkGraphUtil.createGraph();
  for (let i = 0; i < numberOfNodes; i++) {
    ElkGraphUtil.createNode(graph);
  }
  return graph;
}

describe('TopdownPackingTest', () => {
  /** Test topdown packing on an empty graph. */
  it('testEmptyGraph', () => {
    initializePlainJavaLayout();
    const graph = createEmptyGraph();
    const layoutProvider = new TopdownpackingLayoutProvider();
    layoutProvider.layout(graph, new BasicProgressMonitor());
  });

  /**
   * Test topdown packing for a graph with two nodes. In this case the resulting graph size should be vertically
   * compacted.
   */
  it('testTwoNodes', () => {
    initializePlainJavaLayout();
    const graph = createGraph(2);
    // property default values
    const hierarchicalWidth = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
    const hierarchicalAspectRatio = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);
    const padding = graph.getProperty(CoreOptions.PADDING);
    const nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    const layoutProvider = new TopdownpackingLayoutProvider();

    // test size prediction
    const predictedSize = layoutProvider.getPredictedGraphSize(graph);
    const expectedWidth = padding.left + 2 * hierarchicalWidth + nodeNodeSpacing + padding.right;
    assertEquals(expectedWidth, predictedSize.x, 0.00001);

    const expectedHeight = padding.top + hierarchicalWidth / hierarchicalAspectRatio + padding.bottom;
    assertEquals(expectedHeight, predictedSize.y, 0.00001);

    // test actual layout
    layoutProvider.layout(graph, new BasicProgressMonitor());
    const childOneX = graph.getChildren().get(0).getX();
    const childOneY = graph.getChildren().get(0).getY();
    const childOneWidth = graph.getChildren().get(0).getWidth();
    const childOneHeight = graph.getChildren().get(0).getHeight();

    assertEquals(padding.left, childOneX, 0.00001);
    assertEquals(padding.top, childOneY, 0.00001);
    assertEquals(hierarchicalWidth, childOneWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childOneHeight, 0.00001);

    const childTwoX = graph.getChildren().get(1).getX();
    const childTwoY = graph.getChildren().get(1).getY();
    const childTwoWidth = graph.getChildren().get(1).getWidth();
    const childTwoHeight = graph.getChildren().get(1).getHeight();

    assertEquals(padding.left + hierarchicalWidth + nodeNodeSpacing, childTwoX, 0.00001);
    assertEquals(padding.top, childTwoY, 0.00001);
    assertEquals(hierarchicalWidth, childTwoWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childTwoHeight, 0.00001);
  });

  /**
   * Test topdown packing for a graph with three nodes. In this case the third node should be expanded to fill the
   * whitespace of the parent.
   */
  it('testThreeNodes', () => {
    initializePlainJavaLayout();
    const graph = createGraph(3);
    // property default values
    const hierarchicalWidth = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
    const hierarchicalAspectRatio = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);
    const padding = graph.getProperty(CoreOptions.PADDING);
    const nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    const layoutProvider = new TopdownpackingLayoutProvider();

    // test size prediction
    const predictedSize = layoutProvider.getPredictedGraphSize(graph);
    const expectedWidth = padding.left + 2 * hierarchicalWidth + nodeNodeSpacing + padding.right;
    assertEquals(expectedWidth, predictedSize.x, 0.00001);

    const expectedHeight =
      padding.top + 2 * (hierarchicalWidth / hierarchicalAspectRatio) + nodeNodeSpacing + padding.bottom;
    assertEquals(expectedHeight, predictedSize.y, 0.00001);

    // test actual layout
    layoutProvider.layout(graph, new BasicProgressMonitor());
    const childOneX = graph.getChildren().get(0).getX();
    const childOneY = graph.getChildren().get(0).getY();
    const childOneWidth = graph.getChildren().get(0).getWidth();
    const childOneHeight = graph.getChildren().get(0).getHeight();

    assertEquals(padding.left, childOneX, 0.00001);
    assertEquals(padding.top, childOneY, 0.00001);
    assertEquals(hierarchicalWidth, childOneWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childOneHeight, 0.00001);

    const childTwoX = graph.getChildren().get(1).getX();
    const childTwoY = graph.getChildren().get(1).getY();
    const childTwoWidth = graph.getChildren().get(1).getWidth();
    const childTwoHeight = graph.getChildren().get(1).getHeight();

    assertEquals(padding.left + hierarchicalWidth + nodeNodeSpacing, childTwoX, 0.00001);
    assertEquals(padding.top, childTwoY, 0.00001);
    assertEquals(hierarchicalWidth, childTwoWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childTwoHeight, 0.00001);

    // test third node is expanded correctly
    const childThreeX = graph.getChildren().get(2).getX();
    const childThreeY = graph.getChildren().get(2).getY();
    const childThreeWidth = graph.getChildren().get(2).getWidth();
    const childThreeHeight = graph.getChildren().get(2).getHeight();

    assertEquals(padding.left, childThreeX, 0.00001);
    assertEquals(padding.top + hierarchicalWidth / hierarchicalAspectRatio + nodeNodeSpacing, childThreeY, 0.00001);
    assertEquals(2 * hierarchicalWidth + nodeNodeSpacing, childThreeWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childThreeHeight, 0.00001);
  });

  /**
   * Test topdown packing for a graph with five nodes. In this case there is both vertical compaction and whitespace
   * elimination in the second row (involving two nodes).
   */
  it('testFiveNodes', () => {
    initializePlainJavaLayout();
    const graph = createGraph(5);
    // property default values
    const hierarchicalWidth = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH);
    const hierarchicalAspectRatio = graph.getProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO);
    const padding = graph.getProperty(CoreOptions.PADDING);
    const nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);
    const layoutProvider = new TopdownpackingLayoutProvider();

    // test size prediction
    const predictedSize = layoutProvider.getPredictedGraphSize(graph);
    const expectedWidth = padding.left + 3 * hierarchicalWidth + 2 * nodeNodeSpacing + padding.right;
    assertEquals(expectedWidth, predictedSize.x, 0.00001);

    const expectedHeight =
      padding.top + 2 * (hierarchicalWidth / hierarchicalAspectRatio) + nodeNodeSpacing + padding.bottom;
    assertEquals(expectedHeight, predictedSize.y, 0.00001);

    // test white space expansion in bottom row is performed correctly
    layoutProvider.layout(graph, new BasicProgressMonitor());
    const childFourX = graph.getChildren().get(3).getX();
    const childFourY = graph.getChildren().get(3).getY();
    const childFourWidth = graph.getChildren().get(3).getWidth();
    const childFourHeight = graph.getChildren().get(3).getHeight();

    // additional half of empty space
    const expandedWidth = hierarchicalWidth + 0.5 * (hierarchicalWidth + nodeNodeSpacing);

    assertEquals(padding.left, childFourX, 0.00001);
    assertEquals(padding.top + hierarchicalWidth / hierarchicalAspectRatio + nodeNodeSpacing, childFourY, 0.00001);
    assertEquals(expandedWidth, childFourWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childFourHeight, 0.00001);

    layoutProvider.layout(graph, new BasicProgressMonitor());
    const childFiveX = graph.getChildren().get(4).getX();
    const childFiveY = graph.getChildren().get(4).getY();
    const childFiveWidth = graph.getChildren().get(4).getWidth();
    const childFiveHeight = graph.getChildren().get(4).getHeight();

    assertEquals(padding.left + expandedWidth + nodeNodeSpacing, childFiveX, 0.00001);
    assertEquals(padding.top + hierarchicalWidth / hierarchicalAspectRatio + nodeNodeSpacing, childFiveY, 0.00001);
    assertEquals(expandedWidth, childFiveWidth, 0.00001);
    assertEquals(hierarchicalWidth / hierarchicalAspectRatio, childFiveHeight, 0.00001);
  });
});
