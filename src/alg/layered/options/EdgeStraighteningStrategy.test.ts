// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeStraighteningStrategy } from './EdgeStraighteningStrategy.js';

const DECLARED = ['NONE', 'IMPROVE_STRAIGHTNESS'] as const;

describe('EdgeStraighteningStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeStraighteningStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeStraighteningStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(EdgeStraighteningStrategy.values()[1]).toBe(EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS);
  });

  it('toString is the name', () => {
    expect(EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS.toString()).toBe('IMPROVE_STRAIGHTNESS');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeStraighteningStrategy.valueOf(name)).toBe(EdgeStraighteningStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeStraighteningStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeStraighteningStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.EdgeStraighteningStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS.compareTo(EdgeStraighteningStrategy.NONE)).toBe(1);
    expect(EdgeStraighteningStrategy.NONE.compareTo(EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS)).toBe(-1);
    expect(EdgeStraighteningStrategy.NONE.compareTo(EdgeStraighteningStrategy.NONE)).toBe(0);
  });
});
