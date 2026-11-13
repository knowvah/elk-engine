// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GrowTreePhase } from '../p3execution/GrowTreePhase.js';
import { OverlapRemovalStrategy } from './OverlapRemovalStrategy.js';

const DECLARED = ['GROW_TREE'] as const;

describe('OverlapRemovalStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(OverlapRemovalStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(OverlapRemovalStrategy.values()[0]).toBe(OverlapRemovalStrategy.GROW_TREE);
  });

  it('compareTo of a constant with itself is 0', () => {
    expect(OverlapRemovalStrategy.GROW_TREE.compareTo(OverlapRemovalStrategy.GROW_TREE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(OverlapRemovalStrategy.valueOf(name)).toBe(OverlapRemovalStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => OverlapRemovalStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => OverlapRemovalStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.OverlapRemovalStrategy.FOO',
    );
  });

  it('create() instantiates the phase of each constant', () => {
    expect(OverlapRemovalStrategy.GROW_TREE.create().constructor).toBe(GrowTreePhase);
  });

  it('create() returns a new instance on every call', () => {
    const constant = OverlapRemovalStrategy.values()[0]!;
    expect(constant.create()).not.toBe(constant.create());
  });
});
