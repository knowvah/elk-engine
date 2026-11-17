// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue1214Test: the rectpacking algorithm can place nodes without a size if there is no spacing between the nodes.
 * All options to place such a node have the same drawing, which used to cause a `NullPointerException`. The Java registers the
 * algorithms through `PlainJavaInitialization.initializePlainJavaLayout()`, here the explicit `RectPackingMetaDataProvider`
 * registration as in Issue583Test. `assertEquals(double, double, 0)` is `assertEqualsWithin` with delta 0.
 *
 * @see org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/issues/Issue1214Test.java
 */
import { beforeAll, describe, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { RectPackingMetaDataProvider } from '../options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { RectPackingLayoutProvider } from '../RectPackingLayoutProvider.js';

function createParent(): ElkNode {
  const parent = ElkGraphUtil.createGraph();
  parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
  parent.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
  parent.setProperty(CoreOptions.PADDING, new ElkPadding(10.0));
  return parent;
}

function layout(parent: ElkNode): void {
  new RectPackingLayoutProvider().layout(parent, new BasicProgressMonitor());
}

describe('Issue1214Test', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  it('testTwoNodesWithoutSize', () => {
    const parent = createParent();
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);

    layout(parent);

    assertEqualsWithin('', 20.0, parent.getWidth(), 0);
    assertEqualsWithin('', 20.0, parent.getHeight(), 0);
  });

  it('testThreeNodesWithoutSize', () => {
    const parent = createParent();
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);

    layout(parent);

    assertEqualsWithin('', 20.0, parent.getWidth(), 0);
    assertEqualsWithin('', 20.0, parent.getHeight(), 0);
  });

  it('testNodeWithoutSizeAfterNodeWithSize', () => {
    const parent = createParent();
    const regular = ElkGraphUtil.createNode(parent);
    regular.setDimensions(10, 10);
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);

    layout(parent);

    assertEqualsWithin('', 10.0, regular.getX(), 0);
    assertEqualsWithin('', 10.0, regular.getY(), 0);
    assertEqualsWithin('', 30.0, parent.getWidth(), 0);
  });

  it('testNodeWithoutSizeBeforeNodeWithSize', () => {
    const parent = createParent();
    ElkGraphUtil.createNode(parent).setDimensions(0, 0);
    const regular = ElkGraphUtil.createNode(parent);
    regular.setDimensions(10, 10);

    layout(parent);

    assertEqualsWithin('', 30.0, parent.getWidth(), 0);
  });
});
