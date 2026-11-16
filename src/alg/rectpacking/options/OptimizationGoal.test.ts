// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { OptimizationGoal } from './OptimizationGoal.js';

const DECLARED = ['ASPECT_RATIO_DRIVEN', 'MAX_SCALE_DRIVEN', 'AREA_DRIVEN'] as const;

describe('OptimizationGoal', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(OptimizationGoal.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(OptimizationGoal.values()[2]).toBe(OptimizationGoal.AREA_DRIVEN);
  });

  it('compareTo orders by ordinal', () => {
    expect(OptimizationGoal.AREA_DRIVEN.compareTo(OptimizationGoal.ASPECT_RATIO_DRIVEN)).toBe(2);
    expect(OptimizationGoal.ASPECT_RATIO_DRIVEN.compareTo(OptimizationGoal.AREA_DRIVEN)).toBe(-2);
    expect(OptimizationGoal.ASPECT_RATIO_DRIVEN.compareTo(OptimizationGoal.ASPECT_RATIO_DRIVEN)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(OptimizationGoal.valueOf(name)).toBe(OptimizationGoal[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => OptimizationGoal.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => OptimizationGoal.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.rectpacking.options.OptimizationGoal.FOO',
    );
  });
});
