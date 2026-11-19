// SPDX-License-Identifier: EPL-2.0
/*
 * Port of CompactionTest (mission 8c, T12, PK10): every test with the Java graph construction and the Java assertions verbatim (delta 1).
 * The Java registers the algorithms through `PlainJavaInitialization.initializePlainJavaLayout()`, here the explicit
 * `RectPackingMetaDataProvider` registration. The oracle baseline of the Java suite is in plans/alg-packing/java-baseline.md.
 *
 * @see org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/CompactionTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { ElkRectangle } from '../../core/math/ElkRectangle.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RectPackingMetaDataProvider } from './options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { WidthApproximationStrategy } from './p1widthapproximation/WidthApproximationStrategy.js';
import { RectPackingLayoutProvider } from './RectPackingLayoutProvider.js';

describe('CompactionTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  /**
   * Test the compaction step for the case that a block, which was in the next row after placement, is placed on top
   * of the current block forming a stack of blocks.
   */
  it('testPlaceBlockFromNextRowOnTop', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    const n7 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 110.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 10);
    n3.setDimensions(30, 10);
    n4.setDimensions(30, 50);
    n5.setDimensions(30, 50);
    n6.setDimensions(100, 10);
    n7.setDimensions(100, 10);

    // ___  ___  ___
    //|   ||___||___|
    //|   | ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    // ____________
    //|____________|
    // ____________
    //|____________|
    //
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 110.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 40.0, n4.getX(), 1);
    assertEqualsWithin('', 20.0, n4.getY(), 1);
    assertEqualsWithin('', 80.0, n5.getX(), 1);
    assertEqualsWithin('', 20.0, n5.getY(), 1);
    assertEqualsWithin('', 0.0, n6.getX(), 1);
    assertEqualsWithin('', 80.0, n6.getY(), 1);
  });

  /**
   * Test the compaction step for the case that a block, which was in the next row after placement, is tried to be
   * placed on top of the current block but the block (and also not the first node) does not fit.
   */
  it('testPlaceBlockFromNextRowOnTopDoesNotWork', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    const n7 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 110.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(40, 10);
    n3.setDimensions(30, 10);
    n4.setDimensions(30, 50);
    n5.setDimensions(30, 50);
    n6.setDimensions(100, 10);
    n7.setDimensions(100, 10);

    // ___  ____
    //|   ||____|
    //|   | ___
    //|   ||___|
    //|   |
    //|   |
    //|   |
    //|___|
    // ___  ___
    //|   ||   |
    //|   ||   |
    //|   ||   |
    //|   ||   |
    //|___||___|
    // _____________
    //|_____________|
    // _____________
    //|_____________|
    //
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 100.0, parent.getWidth(), 1);
    assertEqualsWithin('', 170.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 40.0, n3.getX(), 1);
    assertEqualsWithin('', 20.0, n3.getY(), 1);
    assertEqualsWithin('', 0.0, n4.getX(), 1);
    assertEqualsWithin('', 80.0, n4.getY(), 1);
    assertEqualsWithin('', 40.0, n5.getX(), 1);
    assertEqualsWithin('', 80.0, n5.getY(), 1);
  });

  /**
   * Test how a block is absorbed in another block from the next row.
   */
  it('testAbsorbBlock', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    const n7 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 110.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    n5.setDimensions(30, 30);
    n6.setDimensions(100, 10);
    n7.setDimensions(100, 10);

    // ___  ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||___||___|
    //|   | ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    // ____________
    //|____________|
    // ____________
    //|____________|
    //
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 110.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 40.0, n4.getX(), 1);
    assertEqualsWithin('', 40.0, n4.getY(), 1);
    assertEqualsWithin('', 80.0, n5.getX(), 1);
    assertEqualsWithin('', 40.0, n5.getY(), 1);
    assertEqualsWithin('', 0.0, n6.getX(), 1);
    assertEqualsWithin('', 80.0, n6.getY(), 1);
  });

  /**
   * Test block absorption from a block in a stack.
   */
  it('testAbsorbBlockInStack', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    const n7 = ElkGraphUtil.createNode(parent);
    const n8 = ElkGraphUtil.createNode(parent);
    const n9 = ElkGraphUtil.createNode(parent);
    const n10 = ElkGraphUtil.createNode(parent);
    const n11 = ElkGraphUtil.createNode(parent);
    const n12 = ElkGraphUtil.createNode(parent);
    const n13 = ElkGraphUtil.createNode(parent);
    const n14 = ElkGraphUtil.createNode(parent);
    const n15 = ElkGraphUtil.createNode(parent);
    const n16 = ElkGraphUtil.createNode(parent);
    const n17 = ElkGraphUtil.createNode(parent);
    const n18 = ElkGraphUtil.createNode(parent);
    const n19 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 330.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 1.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(178, 162);
    n2.setDimensions(75, 23);
    n3.setDimensions(75, 23);
    n4.setDimensions(75, 23);
    n5.setDimensions(75, 23);
    n6.setDimensions(75, 23);
    n7.setDimensions(75, 23);
    n8.setDimensions(75, 23);
    n9.setDimensions(75, 23);
    n10.setDimensions(47, 23);
    n11.setDimensions(47, 23);
    n12.setDimensions(47, 23);
    n13.setDimensions(47, 23);
    n14.setDimensions(47, 23);
    n15.setDimensions(47, 23);
    n16.setDimensions(47, 23);
    n17.setDimensions(47, 23);
    n18.setDimensions(47, 23);
    n19.setDimensions(47, 23);
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 178 + 2 + 2 * 75, parent.getWidth(), 1);
    assertEqualsWithin('', 162 + 1 + 23, parent.getHeight(), 1);
  });

  /**
   * Test how a block is compacted inside a row to save space.
   */
  it('testCompactBlock', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 190.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    n5.setDimensions(30, 30);

    // ___  ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||___||___|
    //|   | ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    //
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 70.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 40.0, n4.getX(), 1);
    assertEqualsWithin('', 40.0, n4.getY(), 1);
    assertEqualsWithin('', 80.0, n5.getX(), 1);
    assertEqualsWithin('', 40.0, n5.getY(), 1);
  });

  /**
   * Test how a block is only partly absorbed by a previous block.
   */
  it('testSplitBlock', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    const n7 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 110.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    n5.setDimensions(30, 30);
    n6.setDimensions(30, 30);
    n7.setDimensions(100, 10);

    // ___  ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||___||___|
    //|   | ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    // ___
    //|   |
    //|   |
    //|___|
    // ___________
    //|___________|
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 130.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 40.0, n4.getX(), 1);
    assertEqualsWithin('', 40.0, n4.getY(), 1);
    assertEqualsWithin('', 80.0, n5.getX(), 1);
    assertEqualsWithin('', 40.0, n5.getY(), 1);
    assertEqualsWithin('', 0.0, n6.getX(), 1);
    assertEqualsWithin('', 80.0, n6.getY(), 1);
    assertEqualsWithin('', 0.0, n7.getX(), 1);
    assertEqualsWithin('', 120.0, n7.getY(), 1);
  });

  /**
   * Test the compaction step for the case that a block, which was in the next row after placement, is placed to the
   * right of the current block forming a new stack of blocks.
   */
  it('testPlaceBlockFromNextRowRight', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 110.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 30);
    n3.setDimensions(20, 20);
    n4.setDimensions(30, 70);

    // ___  ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||___||   |
    //|   | ___ |   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 70.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 40.0, n3.getX(), 1);
    assertEqualsWithin('', 40.0, n3.getY(), 1);
    assertEqualsWithin('', 80.0, n4.getX(), 1);
    assertEqualsWithin('', 0.0, n4.getY(), 1);
  });

  /**
   * Test the compaction step for the case that a block, which was in the current row after placement, is placed to
   * the right of the current block forming a new stack of blocks.
   * In this case the previous block is compacted to save horizontal space in the row.
   */
  it('testPlaceBlockFromCurrentRowRight', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 150.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 30);
    n3.setDimensions(20, 20);
    n4.setDimensions(30, 70);

    // ___  ___  ___
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||___||   |
    //|   | ___ |   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 70.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 40.0, n3.getX(), 1);
    assertEqualsWithin('', 40.0, n3.getY(), 1);
    assertEqualsWithin('', 80.0, n4.getX(), 1);
    assertEqualsWithin('', 0.0, n4.getY(), 1);
  });

  /**
   * Test the compaction step for the case that a block, which was in the current row after placement, is placed on
   * top of the current block forming a new stack of blocks.
   * In this case the previous block is compacted to save vertically space in the row.
   */
  it('testPlaceBlockFromCurrentRowOnTop', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 150.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 70);
    n2.setDimensions(30, 10);
    n3.setDimensions(30, 10);
    n4.setDimensions(30, 50);

    // ___  ___  ___
    //|   ||___||___|
    //|   | ___
    //|   ||   |
    //|   ||   |
    //|   ||   |
    //|   ||   |
    //|___||___|
    //
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 110.0, parent.getWidth(), 1);
    assertEqualsWithin('', 70.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 40.0, n4.getX(), 1);
    assertEqualsWithin('', 20.0, n4.getY(), 1);
  });

  /**
   * Test the case where a stack is put next to a stack with multiple blocks.
   */
  it('testPlaceStackNextToMultipleBlockStack', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    const n5 = ElkGraphUtil.createNode(parent);
    const n6 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 135.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 5.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 100);
    n2.setDimensions(30, 10);
    n3.setDimensions(30, 10);
    n4.setDimensions(30, 85);
    n5.setDimensions(30, 85);
    n6.setDimensions(30, 30);

    // ___  ___  ___  ___
    //|   ||___||___||   |
    //|   | ___  ___ |___|
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|   ||   ||   |
    //|___||___||___|
    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 135.0, parent.getWidth(), 1);
    assertEqualsWithin('', 100.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 35.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 70.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 35.0, n4.getX(), 1);
    assertEqualsWithin('', 15.0, n4.getY(), 1);
    assertEqualsWithin('', 70.0, n5.getX(), 1);
    assertEqualsWithin('', 15.0, n5.getY(), 1);
    assertEqualsWithin('', 105.0, n6.getX(), 1);
    assertEqualsWithin('', 0.0, n6.getY(), 1);
  });

  /**
   * Test the compaction step for the case that a block, which was in the next row after placement, is placed next to
   * the current block and the row is compacted again afterwards because of the row height reevaluation. The moved
   * block must then be treated as a block of the current row. If it is not, it is added to the row a second time and
   * the compaction never terminates.
   *
   * The Java's `@Test(timeout = 10000)` is the test timeout here. It cannot stop a synchronous loop: before
   * eclipse-elk/elk#1239 this input did not terminate (issue #73), which was shown in a child process, not in a worker.
   */
  it('testPlaceBlockFromNextRowRightWithRowHeightReevaluation', () => {
    const parent = ElkGraphUtil.createGraph();
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 288.0);
    parent.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
    parent.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true);
    const sizes: readonly (readonly [number, number])[] = [
      [117, 91],
      [31, 64],
      [124, 27],
      [88, 86],
      [38, 24],
      [23, 86],
      [38, 90],
    ];
    const nodes: ElkNode[] = [];
    for (const size of sizes) {
      const node = ElkGraphUtil.createNode(parent);
      node.setDimensions(size[0], size[1]);
      nodes.push(node);
    }

    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());

    for (const node of nodes) {
      const rect = new ElkRectangle(node.getX(), node.getY(), node.getWidth(), node.getHeight());
      expect(
        rect.x >= 0 && rect.y >= 0 && rect.getMaxX() <= parent.getWidth() && rect.getMaxY() <= parent.getHeight(),
        `Node outside of its parent: ${rect.toString()}`,
      ).toBe(true);
      for (const other of nodes) {
        if (other !== node) {
          const otherRect = new ElkRectangle(other.getX(), other.getY(), other.getWidth(), other.getHeight());
          expect(rect.intersects(otherRect), `Nodes overlap: ${rect.toString()} and ${otherRect.toString()}`).toBe(
            false,
          );
        }
      }
    }
  }, 10000);
});
