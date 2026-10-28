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

describe('ConstraintCalculationStrategy oracle row site/enums/ConstraintCalculationStrategy', () => {
  // oracle: site/enums/ConstraintCalculationStrategy
  it('site/enums/ConstraintCalculationStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(ConstraintCalculationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['QUADRATIC', 0, 'QUADRATIC'],
      ['SCANLINE', 1, 'SCANLINE'],
    ]);
  });

  // oracle: site/enums/ConstraintCalculationStrategy
  it('site/enums/ConstraintCalculationStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => ConstraintCalculationStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => ConstraintCalculationStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.ConstraintCalculationStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/ConstraintCalculationStrategy
  it('site/enums/ConstraintCalculationStrategy: compareTo first/last', () => {
    const values = ConstraintCalculationStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-1);
    expect(last.compareTo(first)).toBe(1);
    expect(first.compareTo(first)).toBe(0);
  });
});
