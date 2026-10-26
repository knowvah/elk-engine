// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { TraversalStrategy } from './TraversalStrategy.js';

const DECLARED = [
  'SPIRAL',
  'LINE_BY_LINE',
  'MANHATTAN',
  'JITTER',
  'QUADRANTS_LINE_BY_LINE',
  'QUADRANTS_MANHATTAN',
  'QUADRANTS_JITTER',
  'COMBINE_LINE_BY_LINE_MANHATTAN',
  'COMBINE_JITTER_MANHATTAN',
] as const;

describe('TraversalStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(TraversalStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(TraversalStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(TraversalStrategy.values()[8]).toBe(TraversalStrategy.COMBINE_JITTER_MANHATTAN);
  });

  it('toString is the name', () => {
    expect(TraversalStrategy.COMBINE_JITTER_MANHATTAN.toString()).toBe('COMBINE_JITTER_MANHATTAN');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TraversalStrategy.valueOf(name)).toBe(TraversalStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TraversalStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TraversalStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.compaction.options.TraversalStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(TraversalStrategy.COMBINE_JITTER_MANHATTAN.compareTo(TraversalStrategy.SPIRAL)).toBe(8);
    expect(TraversalStrategy.SPIRAL.compareTo(TraversalStrategy.COMBINE_JITTER_MANHATTAN)).toBe(-8);
    expect(TraversalStrategy.SPIRAL.compareTo(TraversalStrategy.SPIRAL)).toBe(0);
  });
});
