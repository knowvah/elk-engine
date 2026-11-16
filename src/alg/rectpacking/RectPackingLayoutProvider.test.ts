// SPDX-License-Identifier: EPL-2.0
// Unit tests of the provider's own branches (mission 8c, T12): the cancel return (RectPackingLayoutProvider.java:112-113), the
// box-layout fallback (:94-103) and the stackable check (:60-85), the provider's logGraph tags (:117-120, :128-130, :170-172).
// The end-to-end behaviour is proven by `RectPackingVectors.test.ts` and the three ported JUnit suites.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { LoggedGraphType } from '../../core/util/LoggedGraph.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from './options/InternalProperties.js';
import { RectPackingMetaDataProvider } from './options/RectPackingMetaDataProvider.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { RectPackingLayoutProvider } from './RectPackingLayoutProvider.js';

const SPACING = 5;
const SIZE = 30;

/** A monitor that is canceled from the start. */
class CanceledMonitor extends BasicProgressMonitor {
  override isCanceled(): boolean {
    return true;
  }
}

/** A logging monitor that keeps the tags of the ElkNode graphs the provider logs, in order. */
class TagMonitor extends BasicProgressMonitor {
  constructor(readonly tags: string[] = []) {
    super();
    this.withLogging(true);
  }

  protected override doSubTask(): BasicProgressMonitor {
    return new TagMonitor(this.tags);
  }

  override logGraph(graph: ElkNode, tag: string): void;
  override logGraph(graph: unknown, tag: string, graphType: LoggedGraphType): void;
  override logGraph(graph: unknown, tag: string, graphType?: LoggedGraphType): void {
    if (graphType === undefined) {
      this.tags.push(tag);
    }
  }
}

/** A rectpacking graph whose children have the given heights (width 30). */
function graphWithHeights(heights: readonly number[], tryBox: boolean): { parent: ElkNode; nodes: ElkNode[] } {
  const parent = ElkGraphUtil.createGraph();
  parent.setProperty(CoreOptions.ALGORITHM, RectPackingOptions.ALGORITHM_ID);
  parent.setProperty(CoreOptions.SPACING_NODE_NODE, SPACING);
  parent.setProperty(RectPackingOptions.TRYBOX, tryBox);
  const nodes = heights.map((height) => {
    const node = ElkGraphUtil.createNode(parent);
    node.setDimensions(SIZE, height);
    return node;
  });
  return { parent, nodes };
}

describe('RectPackingLayoutProvider', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
      new RectPackingMetaDataProvider(),
      new RectPackingOptions(),
    );
  });

  it('returns before the first processor when the monitor is canceled', () => {
    const { parent, nodes } = graphWithHeights([SIZE, SIZE], false);
    new RectPackingLayoutProvider().layout(parent, new CanceledMonitor());
    expect(parent.hasProperty(InternalProperties.DRAWING_WIDTH)).toBe(false);
    expect(nodes.map((node) => [node.getX(), node.getY()])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('falls back to the box layout when no triple is stackable, numbering the priorities downwards', () => {
    const { parent, nodes } = graphWithHeights([SIZE, SIZE, SIZE], true);
    new RectPackingLayoutProvider().layout(parent, new BasicProgressMonitor());
    expect(nodes.map((node) => node.getProperty(CoreOptions.PRIORITY))).toEqual([3, 2, 1]);
    expect(parent.hasProperty(InternalProperties.DRAWING_WIDTH)).toBe(false);
  });

  it('keeps the rectpacking run when a triple is stackable (first height at least the sum of the others plus spacing)', () => {
    const { parent, nodes } = graphWithHeights([100, 10, 10], true);
    new RectPackingLayoutProvider().layout(parent, new BasicProgressMonitor());
    expect(nodes.some((node) => node.hasProperty(CoreOptions.PRIORITY))).toBe(false);
    expect(parent.hasProperty(InternalProperties.DRAWING_WIDTH)).toBe(true);
  });

  it('keeps the rectpacking run when the third height dominates the first two', () => {
    const { parent } = graphWithHeights([10, 10, 100], true);
    new RectPackingLayoutProvider().layout(parent, new BasicProgressMonitor());
    expect(parent.hasProperty(InternalProperties.DRAWING_WIDTH)).toBe(true);
  });

  it('logs one Before tag per processor in slot order, then Finished and Output', () => {
    const { parent } = graphWithHeights([SIZE, SIZE], false);
    const monitor = new TagMonitor();
    new RectPackingLayoutProvider().layout(parent, monitor);
    // the compaction logs its own tags through the processor's sub-monitor: keep the provider's three kinds
    const tags = monitor.tags.filter((tag) => /^\d+-(Before \w+|Finished)$|^Output$/.test(tag));
    const before = tags.slice(0, -2);
    expect(before.length).toBeGreaterThan(0);
    before.forEach((tag, slot) => {
      expect(tag).toMatch(new RegExp(`^${String(slot)}-Before \\w+$`));
    });
    expect(tags.slice(-2)).toEqual([`${String(before.length)}-Finished`, 'Output']);
  });
});
