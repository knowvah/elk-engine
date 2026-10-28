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
