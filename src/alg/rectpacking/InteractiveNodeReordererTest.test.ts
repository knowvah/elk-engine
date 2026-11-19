// SPDX-License-Identifier: EPL-2.0
/*
 * Port of InteractiveNodeReordererTest: the order the interactive node reorderer gives to nodes that share a desired
 * position. Such nodes keep their model order, also in lists long enough that a comparator that is not a total order
 * makes the sort throw or return an inconsistent order. The Java registers the algorithms through
 * `PlainJavaInitialization.initializePlainJavaLayout()`, here the explicit `RectPackingMetaDataProvider` registration.
 *
 * @see org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/InteractiveNodeReordererTest.java
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RectPackingMetaDataProvider } from './options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { RectPackingLayoutProvider } from './RectPackingLayoutProvider.js';

/** Desired positions of 32 nodes for which a sort with an inconsistent tie comparator threw. */
const THROWING_POSITIONS: readonly number[] = [
  1, 0, 0, 0, 1, 0, 2, 0, 0, 1, 2, 2, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 2, 0, 1, 0, 1, 1, 1, 0, 2, 1,
];

/** Desired positions of 32 nodes for which a sort with an inconsistent tie comparator split the ties of 2. */
const SPLIT_TIES_POSITIONS: readonly number[] = [
  2, 2, 0, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 2, 2, 2, 0, 0, 0, 2, 2,
];

function createParent(): ElkNode {
  const parent = ElkGraphUtil.createGraph();
  parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
  parent.setProperty(RectPackingOptions.INTERACTIVE, true);
  return parent;
}

/** Java's `createNode(parent)` and `createNode(parent, desiredPosition)` (no overloading by arity in one signature). */
function createNode(parent: ElkNode, desiredPosition?: number): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setDimensions(20, 20);
  if (desiredPosition !== undefined) {
    node.setProperty(RectPackingOptions.DESIRED_POSITION, desiredPosition);
  }
  return node;
}

function createNodes(parent: ElkNode, desiredPositions: readonly number[]): ElkNode[] {
  const nodes: ElkNode[] = [];
  for (const desiredPosition of desiredPositions) {
    nodes.push(createNode(parent, desiredPosition));
  }
  return nodes;
}

function layout(parent: ElkNode): void {
  new RectPackingLayoutProvider().layout(parent, new BasicProgressMonitor());
}

/**
 * Asserts that of any two nodes with the same desired position, the one earlier in the given model order gets the
 * lower current position.
 */
function assertTiesKeepModelOrder(nodesInModelOrder: readonly ElkNode[]): void {
  for (let i = 0; i < nodesInModelOrder.length; i++) {
    const earlier = nodesInModelOrder[i]!;
    for (let j = i + 1; j < nodesInModelOrder.length; j++) {
      const later = nodesInModelOrder[j]!;
      if (
        earlier.getProperty(RectPackingOptions.DESIRED_POSITION) ===
        later.getProperty(RectPackingOptions.DESIRED_POSITION)
      ) {
        const earlierPosition = earlier.getProperty(RectPackingOptions.CURRENT_POSITION);
        const laterPosition = later.getProperty(RectPackingOptions.CURRENT_POSITION);
        expect(
          earlierPosition < laterPosition,
          `Node ${String(i)} (current position ${String(earlierPosition)}) should precede node ${String(j)}` +
            ` (current position ${String(laterPosition)}), which has the same desired position`,
        ).toBe(true);
      }
    }
  }
}

describe('InteractiveNodeReordererTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  it('testTiesInShortListKeepModelOrder', () => {
    const parent = createParent();
    const x = createNode(parent);
    const a = createNode(parent, 1);
    const y = createNode(parent);
    const b = createNode(parent, 1);
    const z = createNode(parent);
    const c = createNode(parent, 1);

    layout(parent);

    expect(x.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(0);
    expect(a.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(1);
    expect(b.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(2);
    expect(c.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(3);
    expect(y.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(4);
    expect(z.getProperty(RectPackingOptions.CURRENT_POSITION)).toBe(5);
  });

  it('testManyTiesDoNotBreakTheSort', () => {
    const parent = createParent();
    const nodes = createNodes(parent, THROWING_POSITIONS);

    layout(parent);

    assertTiesKeepModelOrder(nodes);
  });

  it('testTiesInLongListKeepModelOrder', () => {
    const parent = createParent();
    const nodes = createNodes(parent, SPLIT_TIES_POSITIONS);

    layout(parent);

    assertTiesKeepModelOrder(nodes);
  });
});
