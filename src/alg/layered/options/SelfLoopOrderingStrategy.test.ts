// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SelfLoopOrderingStrategy } from './SelfLoopOrderingStrategy.js';

const DECLARED = ['STACKED', 'REVERSE_STACKED', 'SEQUENCED'] as const;

describe('SelfLoopOrderingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SelfLoopOrderingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(SelfLoopOrderingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(SelfLoopOrderingStrategy.values()[2]).toBe(SelfLoopOrderingStrategy.SEQUENCED);
  });

  it('toString is the name', () => {
    expect(SelfLoopOrderingStrategy.SEQUENCED.toString()).toBe('SEQUENCED');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SelfLoopOrderingStrategy.valueOf(name)).toBe(SelfLoopOrderingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SelfLoopOrderingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SelfLoopOrderingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.SelfLoopOrderingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SelfLoopOrderingStrategy.SEQUENCED.compareTo(SelfLoopOrderingStrategy.STACKED)).toBe(2);
    expect(SelfLoopOrderingStrategy.STACKED.compareTo(SelfLoopOrderingStrategy.SEQUENCED)).toBe(-2);
    expect(SelfLoopOrderingStrategy.STACKED.compareTo(SelfLoopOrderingStrategy.STACKED)).toBe(0);
  });
});

describe('SelfLoopOrderingStrategy oracle row site/enums/SelfLoopOrderingStrategy', () => {
  // oracle: site/enums/SelfLoopOrderingStrategy
  it('site/enums/SelfLoopOrderingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(SelfLoopOrderingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['STACKED', 0, 'STACKED'],
      ['REVERSE_STACKED', 1, 'REVERSE_STACKED'],
      ['SEQUENCED', 2, 'SEQUENCED'],
    ]);
  });

  // oracle: site/enums/SelfLoopOrderingStrategy
  it('site/enums/SelfLoopOrderingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => SelfLoopOrderingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => SelfLoopOrderingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.SelfLoopOrderingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/SelfLoopOrderingStrategy
  it('site/enums/SelfLoopOrderingStrategy: compareTo first/last', () => {
    const values = SelfLoopOrderingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
