// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { registerMrTree } from '../../../test/helpers/mrtree-replay-state.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../core/options/NodeLabelPlacement.js';
import { TreeLayoutProvider } from './TreeLayoutProvider.js';

describe('TreeLayoutProvider', () => {
  it('is an AbstractLayoutProvider', () => {
    expect(new TreeLayoutProvider()).toBeInstanceOf(AbstractLayoutProvider);
  });

  it('lays out a two-node tree: the child one level below its parent, the root sized to the content', () => {
    registerMrTree();
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true);
    const a = ElkGraphUtil.createNode(root);
    const b = ElkGraphUtil.createNode(root);
    for (const node of [a, b]) {
      node.setWidth(20);
      node.setHeight(10);
    }
    ElkGraphUtil.createSimpleEdge(a, b);
    new TreeLayoutProvider().layout(root, new BasicProgressMonitor());
    // Structure only: the coordinates are the oracle replay's (MrTreeVectors.test.ts), never hand-derived here (AD-13).
    expect(b.getY()).toBeGreaterThanOrEqual(a.getY() + a.getHeight());
    expect(b.getX()).toBe(a.getX());
    expect(root.getWidth()).toBeGreaterThanOrEqual(a.getX() + a.getWidth());
    expect(root.getHeight()).toBeGreaterThanOrEqual(b.getY() + b.getHeight());
  });

  it('skips the node micro layout when OMIT_NODE_MICRO_LAYOUT is true and runs it otherwise', () => {
    registerMrTree();
    const marginsAfter = (omit: boolean): number => {
      const root = ElkGraphUtil.createGraph();
      root.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, omit);
      const node = ElkGraphUtil.createNode(root);
      node.setDimensions(20, 10);
      const label = ElkGraphUtil.createLabelWithText('wide label', node);
      label.setDimensions(40, 8);
      node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.outsideTopLeft());
      new TreeLayoutProvider().layout(root, new BasicProgressMonitor());
      return node.getProperty(CoreOptions.MARGINS).top;
    };
    expect(marginsAfter(true)).toBe(0);
    expect(marginsAfter(false)).toBeGreaterThan(0);
  });
});
