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
