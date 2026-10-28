// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ConstraintCalculationStrategy } from './ConstraintCalculationStrategy.js';

const DECLARED = ['QUADRATIC', 'SCANLINE'] as const;

describe('ConstraintCalculationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(ConstraintCalculationStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(ConstraintCalculationStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(ConstraintCalculationStrategy.values()[1]).toBe(ConstraintCalculationStrategy.SCANLINE);
  });

  it('toString is the name', () => {
    expect(ConstraintCalculationStrategy.SCANLINE.toString()).toBe('SCANLINE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(ConstraintCalculationStrategy.valueOf(name)).toBe(ConstraintCalculationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => ConstraintCalculationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ConstraintCalculationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.ConstraintCalculationStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(ConstraintCalculationStrategy.SCANLINE.compareTo(ConstraintCalculationStrategy.QUADRATIC)).toBe(1);
    expect(ConstraintCalculationStrategy.QUADRATIC.compareTo(ConstraintCalculationStrategy.SCANLINE)).toBe(-1);
    expect(ConstraintCalculationStrategy.QUADRATIC.compareTo(ConstraintCalculationStrategy.QUADRATIC)).toBe(0);
  });
});
