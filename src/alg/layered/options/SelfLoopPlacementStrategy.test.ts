// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SelfLoopPlacementStrategy } from './SelfLoopPlacementStrategy.js';

const DECLARED = ['EQUALLY_DISTRIBUTED', 'NORTH_STACKED', 'NORTH_SEQUENCE'] as const;

describe('SelfLoopPlacementStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SelfLoopPlacementStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(SelfLoopPlacementStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(SelfLoopPlacementStrategy.values()[2]).toBe(SelfLoopPlacementStrategy.NORTH_SEQUENCE);
  });

  it('toString is the name', () => {
    expect(SelfLoopPlacementStrategy.NORTH_SEQUENCE.toString()).toBe('NORTH_SEQUENCE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SelfLoopPlacementStrategy.valueOf(name)).toBe(SelfLoopPlacementStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SelfLoopPlacementStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SelfLoopPlacementStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.SelfLoopPlacementStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SelfLoopPlacementStrategy.NORTH_SEQUENCE.compareTo(SelfLoopPlacementStrategy.EQUALLY_DISTRIBUTED)).toBe(2);
    expect(SelfLoopPlacementStrategy.EQUALLY_DISTRIBUTED.compareTo(SelfLoopPlacementStrategy.NORTH_SEQUENCE)).toBe(-2);
    expect(SelfLoopPlacementStrategy.EQUALLY_DISTRIBUTED.compareTo(SelfLoopPlacementStrategy.EQUALLY_DISTRIBUTED)).toBe(
      0,
    );
  });
});
