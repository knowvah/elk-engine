// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SelfLoopDistributionStrategy } from './SelfLoopDistributionStrategy.js';

const DECLARED = ['EQUALLY', 'NORTH', 'NORTH_SOUTH'] as const;

describe('SelfLoopDistributionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SelfLoopDistributionStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(SelfLoopDistributionStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(SelfLoopDistributionStrategy.values()[2]).toBe(SelfLoopDistributionStrategy.NORTH_SOUTH);
  });

  it('toString is the name', () => {
    expect(SelfLoopDistributionStrategy.NORTH_SOUTH.toString()).toBe('NORTH_SOUTH');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SelfLoopDistributionStrategy.valueOf(name)).toBe(SelfLoopDistributionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SelfLoopDistributionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SelfLoopDistributionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.SelfLoopDistributionStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SelfLoopDistributionStrategy.NORTH_SOUTH.compareTo(SelfLoopDistributionStrategy.EQUALLY)).toBe(2);
    expect(SelfLoopDistributionStrategy.EQUALLY.compareTo(SelfLoopDistributionStrategy.NORTH_SOUTH)).toBe(-2);
    expect(SelfLoopDistributionStrategy.EQUALLY.compareTo(SelfLoopDistributionStrategy.EQUALLY)).toBe(0);
  });
});
