// SPDX-License-Identifier: EPL-2.0
/*
 * Port of Issue583Test (mission 8c, T12, PK10): every test with the Java graph construction and the Java assertions verbatim (delta 1).
 * The Java registers the algorithms through `PlainJavaInitialization.initializePlainJavaLayout()`, here the explicit
 * `RectPackingMetaDataProvider` registration. The oracle baseline of the Java suite is in plans/alg-packing/java-baseline.md.
 *
 * @see org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/issues/Issue583Test.java
 */
import { beforeAll, describe, it } from 'vitest';
import { assertEqualsWithin } from '../../../../test/helpers/junit-delta.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { RectPackingMetaDataProvider } from '../options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { PackingStrategy } from '../p2packing/PackingStrategy.js';
import { RectPackingLayoutProvider } from '../RectPackingLayoutProvider.js';

describe('Issue583Test', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  it('testDecreaseApproximatedWidth', () => {
    // Create a graph that has a higher approximated width than actual width

    const parent = ElkGraphUtil.createGraph();
    const n1 = ElkGraphUtil.createNode(parent);
    const n2 = ElkGraphUtil.createNode(parent);
    const n3 = ElkGraphUtil.createNode(parent);
    const n4 = ElkGraphUtil.createNode(parent);
    parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 0.0);
    parent.setProperty(CoreOptions.PADDING, new ElkPadding(0.0));
    n1.setDimensions(30, 30);
    n2.setDimensions(10, 10);
    n3.setDimensions(30, 30);
    // n4 is added to disable last row optimization
    n4.setDimensions(40, 10);

    // ___
    //|   | O
    //|___| ___
    //     |   |
    //     |___|
    // ______
    //|______|
    // Expected drawing with width approximation only
    parent.setProperty(RectPackingOptions.PACKING_STRATEGY, PackingStrategy.NONE);
    let layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 60.0, parent.getWidth(), 1);

    // ___
    //|   | O  | Approximated maximum width
    //|___|    |
    // ___     |
    //|   |    |
    //|___|    |
    // ______  |
    //|______| |
    // Expected drawing with full algorithm
    parent.setProperty(RectPackingOptions.PACKING_STRATEGY, PackingStrategy.COMPACTION);
    layoutProvider = new RectPackingLayoutProvider();
    layoutProvider.layout(parent, new BasicProgressMonitor());
    assertEqualsWithin('', 40.0, parent.getWidth(), 1);
  });
});
