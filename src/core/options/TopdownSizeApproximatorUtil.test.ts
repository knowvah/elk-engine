// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
// CoreOptions first: it must be the entry module of the options import cycle.
import { CoreOptions } from './CoreOptions.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { TopdownSizeApproximatorUtil } from './TopdownSizeApproximatorUtil.js';

// Expected values are traced from TopdownSizeApproximatorUtil.java: categories 3, hierarchical weight 4.
function graphOf(leaves: number, hierarchical = 0): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  for (let i = 0; i < leaves; i++) {
    ElkGraphUtil.createNode(graph);
  }
  for (let i = 0; i < hierarchical; i++) {
    ElkGraphUtil.createNode(ElkGraphUtil.createNode(graph));
  }
  return graph;
}

/** A parent whose children are graphs of the given leaf counts; returns those children. */
function siblings(...leafCounts: number[]): ElkNode[] {
  const parent = ElkGraphUtil.createGraph();
  return leafCounts.map((leaves) => {
    const child = ElkGraphUtil.createNode(parent);
    for (let i = 0; i < leaves; i++) {
      ElkGraphUtil.createNode(child);
    }
    return child;
  });
}

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('getGraphSize', () => {
  it('is 0 for an empty graph', () => {
    expect(TopdownSizeApproximatorUtil.getGraphSize(graphOf(0))).toBe(0);
  });

  it('counts leaves as 1 and hierarchical children with the configured weight', () => {
    expect(TopdownSizeApproximatorUtil.getGraphSize(graphOf(2, 1))).toBe(2 + 4);
    const graph = graphOf(2, 2);
    graph.setProperty(CoreOptions.TOPDOWN_SIZE_CATEGORIES_HIERARCHICAL_NODE_WEIGHT, 10);
    expect(TopdownSizeApproximatorUtil.getGraphSize(graph)).toBe(2 + 20);
  });
});

describe('getSizeCategoryMultiplier', () => {
  it('is 1 without a parent', () => {
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(graphOf(50))).toBe(1);
  });

  it('maps sizes onto 2^i with cutoffs 4, 16, 64', () => {
    const [tiny, small, medium, large] = siblings(3, 5, 20, 63);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(tiny as ElkNode)).toBe(1);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(small as ElkNode)).toBe(2);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(medium as ElkNode)).toBe(4);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(large as ElkNode)).toBe(4);
  });

  it('extends the range to the largest sibling and returns the largest category for it', () => {
    // sizeMax becomes 100: cutoffs 4.64, 21.5, 100; the largest graph is not below the last cutoff
    const [tiny, huge] = siblings(3, 100);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(tiny as ElkNode)).toBe(1);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(huge as ElkNode)).toBe(4);
  });

  it('follows the configured number of categories', () => {
    const [a, b] = siblings(3, 30);
    a?.setProperty(CoreOptions.TOPDOWN_SIZE_CATEGORIES, 2);
    b?.setProperty(CoreOptions.TOPDOWN_SIZE_CATEGORIES, 2);
    // categories 2: sizeMax 16 raised to 30, factor sqrt(30)=5.48; 3 < 5.48 -> 1, 30 is not < 30 -> 2^(2-1)
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(a as ElkNode)).toBe(1);
    expect(TopdownSizeApproximatorUtil.getSizeCategoryMultiplier(b as ElkNode)).toBe(2);
  });
});
