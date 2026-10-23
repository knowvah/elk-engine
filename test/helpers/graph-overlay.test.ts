// SPDX-License-Identifier: EPL-2.0
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AbstractLayoutProvider } from '../../src/core/AbstractLayoutProvider.js';
import { LayoutAlgorithmData } from '../../src/core/data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import type { IFactory } from '../../src/core/util/IFactory.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { applyOverlay, OracleFault, RANDOM_SEED } from './graph-overlay.js';

const BOX = 'org.eclipse.elk.box';
const STUB_FACTORY: IFactory<AbstractLayoutProvider> = {
  create: () => ({}) as AbstractLayoutProvider,
  destroy: () => undefined,
};

interface Graph {
  root: ElkNode;
  parent: ElkNode;
  leaf: ElkNode;
  sibling: ElkNode;
}

/** root -> { parent -> { leaf }, sibling }. */
function twoLevelGraph(): Graph {
  const root = ElkGraphUtil.createGraph();
  const parent = ElkGraphUtil.createNode(root);
  const leaf = ElkGraphUtil.createNode(parent);
  const sibling = ElkGraphUtil.createNode(root);
  return { root, parent, leaf, sibling };
}

describe('applyOverlay', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders({
      apply: (registry) => {
        registry.register(new LayoutAlgorithmData.Builder().id(BOX).name('box').providerFactory(STUB_FACTORY).create());
      },
    });
  });

  afterAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('retargets every node with children, root included, and leaves none', () => {
    const { root, parent, leaf, sibling } = twoLevelGraph();
    applyOverlay(root, BOX, 'default');
    expect(root.getProperty(CoreOptions.ALGORITHM)).toBe(BOX);
    expect(parent.getProperty(CoreOptions.ALGORITHM)).toBe(BOX);
    expect(leaf.hasProperty(CoreOptions.ALGORITHM)).toBe(false);
    expect(sibling.hasProperty(CoreOptions.ALGORITHM)).toBe(false);
  });

  it('seeds only the root when retargeting', () => {
    const { root, parent } = twoLevelGraph();
    applyOverlay(root, BOX, 'default');
    expect(root.getProperty(CoreOptions.RANDOM_SEED)).toBe(RANDOM_SEED);
    expect(parent.hasProperty(CoreOptions.RANDOM_SEED)).toBe(false);
  });

  it('applies a variant option, parsed through the option data, at the root only', () => {
    const { root, parent } = twoLevelGraph();
    applyOverlay(root, null, 'direction-left');
    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.LEFT);
    expect(parent.hasProperty(CoreOptions.DIRECTION)).toBe(false);
    expect(root.hasProperty(CoreOptions.ALGORITHM)).toBe(false);
  });

  it('parses a numeric variant value (random-seed-1)', () => {
    const { root } = twoLevelGraph();
    applyOverlay(root, null, 'random-seed-1');
    expect(root.getProperty(CoreOptions.RANDOM_SEED)).toBe(1);
  });

  it('does nothing for a null variant and a null algorithm', () => {
    const { root } = twoLevelGraph();
    applyOverlay(root, null, null);
    expect(root.getProperties().size()).toBe(0);
  });

  it('applies the variant before the retarget', () => {
    const { root } = twoLevelGraph();
    applyOverlay(root, BOX, 'direction-up');
    expect(root.getProperty(CoreOptions.DIRECTION)).toBe(Direction.UP);
    expect(root.getProperty(CoreOptions.ALGORITHM)).toBe(BOX);
  });

  it('retargets a leaf-only root with no children', () => {
    const root = ElkGraphUtil.createGraph();
    applyOverlay(root, BOX, null);
    expect(root.hasProperty(CoreOptions.ALGORITHM)).toBe(false);
    expect(root.getProperty(CoreOptions.RANDOM_SEED)).toBe(RANDOM_SEED);
  });

  it('throws OracleFault for an unknown variant', () => {
    expect(() => applyOverlay(ElkGraphUtil.createGraph(), null, 'nope')).toThrow(
      new OracleFault("unknown variant 'nope'"),
    );
  });

  it('throws OracleFault for an unknown algorithm', () => {
    expect(() => applyOverlay(ElkGraphUtil.createGraph(), 'org.eclipse.elk.nope', null)).toThrow(
      new OracleFault("unknown algorithm 'org.eclipse.elk.nope'"),
    );
  });
});
