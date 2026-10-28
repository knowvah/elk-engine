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

describe('SelfLoopDistributionStrategy oracle row site/enums/SelfLoopDistributionStrategy', () => {
  // oracle: site/enums/SelfLoopDistributionStrategy
  it('site/enums/SelfLoopDistributionStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(SelfLoopDistributionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['EQUALLY', 0, 'EQUALLY'],
      ['NORTH', 1, 'NORTH'],
      ['NORTH_SOUTH', 2, 'NORTH_SOUTH'],
    ]);
  });

  // oracle: site/enums/SelfLoopDistributionStrategy
  it('site/enums/SelfLoopDistributionStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => SelfLoopDistributionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => SelfLoopDistributionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.SelfLoopDistributionStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/SelfLoopDistributionStrategy
  it('site/enums/SelfLoopDistributionStrategy: compareTo first/last', () => {
    const values = SelfLoopDistributionStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
