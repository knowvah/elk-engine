// SPDX-License-Identifier: EPL-2.0
/*
 * Port of PaddingTest (mission 8c, T12, PK10): every test with the Java graph construction and the Java assertions verbatim (delta 1).
 * The Java registers the algorithms through `PlainJavaInitialization.initializePlainJavaLayout()`, here the explicit
 * `RectPackingMetaDataProvider` registration. The oracle baseline of the Java suite is in plans/alg-packing/java-baseline.md.
 *
 * @see org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/PaddingTest.java
 */
import { beforeAll, describe, it } from 'vitest';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RectPackingMetaDataProvider } from './options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { RectPackingLayoutProvider } from './RectPackingLayoutProvider.js';

describe('PaddingTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  it('testTopPadding', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.ASPECT_RATIO, 1.3);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(1000, 0, 0, 0));
    n1.setDimensions(30, 30);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    //
    //
    //
    // __  __  __  __
    //|__||__||__||__|

    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 150.0, parent.getWidth(), 1);
    assertEqualsWithin('', 1030.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 1000.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 1000.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 1000.0, n3.getY(), 1);
    assertEqualsWithin('', 120.0, n4.getX(), 1);
    assertEqualsWithin('', 1000.0, n4.getY(), 1);
  });

  it('testLeftPadding', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.ASPECT_RATIO, 1.3);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0, 0, 0, 1000));
    n1.setDimensions(30, 30);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    //                    __
    //                   |__|
    //                   |__|
    //                   |__|
    //                   |__|

    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 1030.0, parent.getWidth(), 1);
    assertEqualsWithin('', 150.0, parent.getHeight(), 1);
    assertEqualsWithin('', 1000.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 1000.0, n2.getX(), 1);
    assertEqualsWithin('', 40.0, n2.getY(), 1);
    assertEqualsWithin('', 1000.0, n3.getX(), 1);
    assertEqualsWithin('', 80.0, n3.getY(), 1);
    assertEqualsWithin('', 1000.0, n4.getX(), 1);
    assertEqualsWithin('', 120.0, n4.getY(), 1);
  });

  it('testBottomPadding', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.ASPECT_RATIO, 1.3);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0, 0, 1000, 0));
    n1.setDimensions(30, 30);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    // __  __  __  __
    //|__||__||__||__|
    //
    //
    //
    //

    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 150.0, parent.getWidth(), 1);
    assertEqualsWithin('', 1030.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 40.0, n2.getX(), 1);
    assertEqualsWithin('', 0.0, n2.getY(), 1);
    assertEqualsWithin('', 80.0, n3.getX(), 1);
    assertEqualsWithin('', 0.0, n3.getY(), 1);
    assertEqualsWithin('', 120.0, n4.getX(), 1);
    assertEqualsWithin('', 0.0, n4.getY(), 1);
  });

  it('testRightPadding', () => {
    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(RectPackingOptions.ASPECT_RATIO, 1.3);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 10.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0, 1000, 0, 0));
    n1.setDimensions(30, 30);
    n2.setDimensions(30, 30);
    n3.setDimensions(30, 30);
    n4.setDimensions(30, 30);
    // __
    //|__|
    //|__|
    //|__|
    //|__|

    const layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 1030.0, parent.getWidth(), 1);
    assertEqualsWithin('', 150.0, parent.getHeight(), 1);
    assertEqualsWithin('', 0.0, n1.getX(), 1);
    assertEqualsWithin('', 0.0, n1.getY(), 1);
    assertEqualsWithin('', 0.0, n2.getX(), 1);
    assertEqualsWithin('', 40.0, n2.getY(), 1);
    assertEqualsWithin('', 0.0, n3.getX(), 1);
    assertEqualsWithin('', 80.0, n3.getY(), 1);
    assertEqualsWithin('', 0.0, n4.getX(), 1);
    assertEqualsWithin('', 120.0, n4.getY(), 1);
  });
});
