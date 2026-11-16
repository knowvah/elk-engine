// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { RadiusExtensionOverlapRemoval } from '../intermediate/overlaps/RadiusExtensionOverlapRemoval.js';
import { OverlapRemovalStrategy } from './OverlapRemovalStrategy.js';

const DECLARED = ['EXTENT_RADII'] as const;

describe('OverlapRemovalStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(OverlapRemovalStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(OverlapRemovalStrategy.values()[0]).toBe(OverlapRemovalStrategy.EXTENT_RADII);
  });

  it('compareTo orders by ordinal', () => {
    expect(OverlapRemovalStrategy.EXTENT_RADII.compareTo(OverlapRemovalStrategy.EXTENT_RADII)).toBe(0);
    expect(OverlapRemovalStrategy.EXTENT_RADII.compareTo(OverlapRemovalStrategy.EXTENT_RADII)).toBe(0);
    expect(OverlapRemovalStrategy.EXTENT_RADII.compareTo(OverlapRemovalStrategy.EXTENT_RADII)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(OverlapRemovalStrategy.valueOf(name)).toBe(OverlapRemovalStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => OverlapRemovalStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => OverlapRemovalStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.options.OverlapRemovalStrategy.FOO',
    );
  });

  it('create() of EXTENT_RADII constructs RadiusExtensionOverlapRemoval', () => {
    expect(OverlapRemovalStrategy.EXTENT_RADII.create()).toBeInstanceOf(RadiusExtensionOverlapRemoval);
  });
});
