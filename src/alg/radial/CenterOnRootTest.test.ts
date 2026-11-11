// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.eclipse.elk.alg.radial.test CenterOnRootTest (mission 8a, T13, TR8): both cases with the Java graph construction,
 * assertions verbatim, delta 0.1. The Java registers the algorithms through `PlainJavaInitialization.initializePlainJavaLayout()`,
 * here the explicit `RadialMetaDataProvider` registration (TR5). The oracle baseline of the Java suite is runs=2, failures=0.
 *
 * @see org.eclipse.elk.alg.radial.test/src/org/eclipse/elk/alg/radial/test/CenterOnRootTest.java
 */
import { beforeAll, describe, it } from 'vitest';
import { assertEqualsWithin } from '../../../test/helpers/junit-delta.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RadialMetaDataProvider } from './options/RadialMetaDataProvider.js';
import { RadialOptions } from './options/RadialOptions.js';
import { RadialLayoutProvider } from './RadialLayoutProvider.js';

const DELTA = 0.1;

describe('CenterOnRootTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new RadialMetaDataProvider());
  });

  /**
   * Layout a tree of height 1 and center it. The center point of the root node should be placed in the middle of the graph as
   * defined by its width and height.
   */
  it('testSimpleCentering', () => {
    const parent = ElkGraphUtil.createGraph();
    const root = ElkGraphUtil.createNode(parent);
    const n1 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n1);
    const n2 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n2);
    const n3 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n3);

    parent.setProperty(CoreOptions.ALGORITHM, RadialOptions.ALGORITHM_ID);
    parent.setProperty(RadialOptions.CENTER_ON_ROOT, true);

    const layoutProvider = new RadialLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());

    const margins = root.getProperty(CoreOptions.MARGINS);
    assertEqualsWithin(
      'Horizontal centering',
      parent.getWidth() / 2,
      root.getX() + margins.left + root.getWidth() / 2,
      DELTA,
    );
    assertEqualsWithin(
      'Vertical centering',
      parent.getHeight() / 2,
      root.getY() + margins.top + root.getHeight() / 2,
      DELTA,
    );
  });

  /** Layout of a tree with a height larger than 1. */
  it('testLargerGraphCentering', () => {
    const parent = ElkGraphUtil.createGraph();
    const root = ElkGraphUtil.createNode(parent);

    const n1 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n1);
    const n2 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n2);
    const n3 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(root, n3);

    const n11 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(n1, n11);
    const n12 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(n1, n12);
    const n13 = ElkGraphUtil.createNode(parent);
    ElkGraphUtil.createSimpleEdge(n1, n13);

    parent.setProperty(CoreOptions.ALGORITHM, RadialOptions.ALGORITHM_ID);
    parent.setProperty(RadialOptions.CENTER_ON_ROOT, true);

    const layoutProvider = new RadialLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());

    const margins = root.getProperty(CoreOptions.MARGINS);
    assertEqualsWithin(
      'Horizontal centering',
      parent.getWidth() / 2,
      root.getX() + margins.left + root.getWidth() / 2,
      DELTA,
    );
    assertEqualsWithin(
      'Vertical centering',
      parent.getHeight() / 2,
      root.getY() + margins.top + root.getHeight() / 2,
      DELTA,
    );
  });
});
