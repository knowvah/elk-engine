// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { MapPropertyHolder } from '../../graph/properties/MapPropertyHolder.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { AbstractSpacingsBuilder, ElkCoreSpacingsBuilder, ElkSpacings } from './ElkSpacings.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

describe('ElkSpacings', () => {
  it('lists base plus the ten dependent options in factorMap order', () => {
    const ids = [...ElkSpacings.withBaseValue(33).getFactors().keys()].map((p) => p.getId());
    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
    expect(ids).toContain(CoreOptions.SPACING_NODE_NODE.getId());
  });

  it('gives the base option factor 1', () => {
    expect(ElkSpacings.withBaseValue(33).getFactors().get(CoreOptions.SPACING_NODE_NODE)).toBe(1);
  });

  it('exposes the base spacing option', () => {
    expect(ElkCoreSpacingsBuilder.BASE_SPACING_OPTION).toBe(CoreOptions.SPACING_NODE_NODE);
  });

  it('delegates ELK_OPTION_TARGET_FILTER to true for non-element properties', () => {
    const holder = new MapPropertyHolder();
    expect(AbstractSpacingsBuilder.ELK_OPTION_TARGET_FILTER.accept(holder, CoreOptions.SPACING_EDGE_EDGE)).toBe(true);
  });

  it('applies base value, overwriting with the default-equal base is a no-op without overwrite', () => {
    const holder = new MapPropertyHolder();
    const defaultBase = CoreOptions.SPACING_NODE_NODE.getDefault();
    ElkSpacings.withBaseValue(defaultBase).withOverwrite(false).apply(holder);
    expect(holder.hasProperty(CoreOptions.SPACING_NODE_NODE)).toBe(false);
  });

  it('applies scaled values to a plain holder when overwrite is requested', () => {
    const holder = new MapPropertyHolder();
    const defaultBase = CoreOptions.SPACING_NODE_NODE.getDefault();
    ElkSpacings.withBaseValue(defaultBase).withOverwrite(true).apply(holder);
    expect(holder.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(defaultBase);
    expect(holder.getProperty(CoreOptions.SPACING_EDGE_EDGE)).toBeCloseTo(
      CoreOptions.SPACING_EDGE_EDGE.getDefault(),
      9,
    );
  });

  it('keeps an existing value with withOverwrite(false)', () => {
    const node = ElkGraphUtil.createNode(null);
    node.setProperty(CoreOptions.SPACING_NODE_NODE, 7);
    ElkSpacings.withBaseValue(3).withOverwrite(false).apply(node);
    expect(node.getProperty(CoreOptions.SPACING_NODE_NODE)).toBe(7);
  });

  it('rejects withFactor/withValue for non-members and negative arguments', () => {
    const b = ElkSpacings.withBaseValue(3);
    expect(() => b.withFactor(CoreOptions.ASPECT_RATIO, 1)).toThrow(IllegalArgumentException);
    expect(() => b.withValue(CoreOptions.ASPECT_RATIO, 1)).toThrow(
      "'org.eclipse.elk.aspectRatio' is not a configurable",
    );
    expect(() => b.withValue(CoreOptions.SPACING_EDGE_EDGE, -1)).toThrow('must not be negative (-1)');
    expect(() => b.withFactor(CoreOptions.SPACING_NODE_NODE, 1)).toThrow("not allowed to use with 'withFactor'");
  });
});
