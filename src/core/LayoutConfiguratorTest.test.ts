// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkNode } from '../graph/ElkNode.js';
import { ElkGraphElementImpl } from '../graph/impl/ElkGraphElementImpl.js';
import { ElkNodeImpl } from '../graph/impl/ElkNodeImpl.js';
import { ElkGraphUtil } from '../graph/util/ElkGraphUtil.js';
import { LayoutMetaDataService } from './data/LayoutMetaDataService.js';
import { LayoutConfigurator } from './LayoutConfigurator.js';
import { CoreOptions } from './options/CoreOptions.js';
import { ElkUtil } from './util/ElkUtil.js';

/**
 * Test the LayoutConfigurator class with regard to proper configuration of a passed graph.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/LayoutConfiguratorTest.java
 */
/** The nested `Graph` helper of the JUnit test: a root with two child nodes. */
function graph(): { root: ElkNode; n1: ElkNode; n2: ElkNode } {
  const root = ElkGraphUtil.createGraph();
  const n1 = ElkGraphUtil.createNode(root);
  const n2 = ElkGraphUtil.createNode(root);
  return { root, n1, n2 };
}

describe('LayoutConfiguratorTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('testElementOverridesClass', () => {
    const g = graph();

    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_NODE_NODE, 22);
    lc.configure(g.n1).setProperty(CoreOptions.SPACING_NODE_NODE, 12);
    lc.configure(g.n2).setProperty(CoreOptions.SPACING_NODE_NODE, 32);

    ElkUtil.applyVisitors(g.root, lc);

    expect(g.root.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(22, 4);
    expect(g.n1.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(12, 4);
    expect(g.n2.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(32, 4);
  });

  it('testCombineElementAndClass', () => {
    const g = graph();

    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_NODE_NODE, 42);
    lc.configure(g.n1).setProperty(CoreOptions.SPACING_EDGE_NODE, 42);

    ElkUtil.applyVisitors(g.root, lc);

    expect(g.n1.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(42, 4);
    expect(g.n1.getProperty(CoreOptions.SPACING_EDGE_NODE)).toBeCloseTo(42, 4);
  });

  it('testCombineMultipleClass', () => {
    const g = graph();

    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_NODE_NODE, 42);
    lc.configure(ElkGraphElementImpl).setProperty(CoreOptions.SPACING_EDGE_NODE, 42);

    ElkUtil.applyVisitors(g.root, lc);

    expect(g.n1.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(42, 4);
    expect(g.n1.getProperty(CoreOptions.SPACING_EDGE_NODE)).toBeCloseTo(42, 4);
  });

  it('testOverridingExistingOptions', () => {
    const g = graph();
    g.root.setProperty(CoreOptions.SPACING_NODE_NODE, 13);

    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_NODE_NODE, 42);

    ElkUtil.applyVisitors(g.root, lc);

    expect(g.root.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(42, 4);
  });

  it('testPreventOverridingExistingOptions', () => {
    const g = graph();
    g.root.setProperty(CoreOptions.SPACING_NODE_NODE, 13);

    const lc = new LayoutConfigurator();
    lc.configure(ElkNodeImpl).setProperty(CoreOptions.SPACING_NODE_NODE, 42);
    lc.addFilter(LayoutConfigurator.NO_OVERWRITE);

    ElkUtil.applyVisitors(g.root, lc);

    expect(g.root.getProperty(CoreOptions.SPACING_NODE_NODE)).toBeCloseTo(13, 4);
  });
});
