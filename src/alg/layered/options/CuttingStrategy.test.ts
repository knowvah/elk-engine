// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CuttingStrategy } from './CuttingStrategy.js';

const DECLARED = ['ARD', 'MSD', 'MANUAL'] as const;

describe('CuttingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CuttingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(CuttingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(CuttingStrategy.values()[2]).toBe(CuttingStrategy.MANUAL);
  });

  it('toString is the name', () => {
    expect(CuttingStrategy.MANUAL.toString()).toBe('MANUAL');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CuttingStrategy.valueOf(name)).toBe(CuttingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CuttingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CuttingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.CuttingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(CuttingStrategy.MANUAL.compareTo(CuttingStrategy.ARD)).toBe(2);
    expect(CuttingStrategy.ARD.compareTo(CuttingStrategy.MANUAL)).toBe(-2);
    expect(CuttingStrategy.ARD.compareTo(CuttingStrategy.ARD)).toBe(0);
  });
});

describe('CuttingStrategy oracle row site/enums/CuttingStrategy', () => {
  // oracle: site/enums/CuttingStrategy
  it('site/enums/CuttingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(CuttingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['ARD', 0, 'ARD'],
      ['MSD', 1, 'MSD'],
      ['MANUAL', 2, 'MANUAL'],
    ]);
  });

  // oracle: site/enums/CuttingStrategy
  it('site/enums/CuttingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => CuttingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => CuttingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.CuttingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/CuttingStrategy
  it('site/enums/CuttingStrategy: compareTo first/last', () => {
    const values = CuttingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
