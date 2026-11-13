// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { GreedyWidthApproximator } from './GreedyWidthApproximator.js';
import { TargetWidthWidthApproximator } from './TargetWidthWidthApproximator.js';
import { WidthApproximationStrategy } from './WidthApproximationStrategy.js';

const DECLARED = ['GREEDY', 'TARGET_WIDTH'] as const;

describe('WidthApproximationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(WidthApproximationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(WidthApproximationStrategy.values()[1]).toBe(WidthApproximationStrategy.TARGET_WIDTH);
  });

  it('compareTo orders by ordinal', () => {
    expect(WidthApproximationStrategy.TARGET_WIDTH.compareTo(WidthApproximationStrategy.GREEDY)).toBe(1);
    expect(WidthApproximationStrategy.GREEDY.compareTo(WidthApproximationStrategy.TARGET_WIDTH)).toBe(-1);
    expect(WidthApproximationStrategy.GREEDY.compareTo(WidthApproximationStrategy.GREEDY)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(WidthApproximationStrategy.valueOf(name)).toBe(WidthApproximationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => WidthApproximationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => WidthApproximationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.rectpacking.p1widthapproximation.WidthApproximationStrategy.FOO',
    );
  });

  it('create() returns a new phase of the Java class for each call (Java `create()` switch)', () => {
    const expected = [
      [WidthApproximationStrategy.GREEDY, GreedyWidthApproximator],
      [WidthApproximationStrategy.TARGET_WIDTH, TargetWidthWidthApproximator],
    ] as const;
    for (const [constant, phaseClass] of expected) {
      const first = constant.create();
      expect(first).toBeInstanceOf(phaseClass);
      expect(constant.create()).not.toBe(first);
    }
  });

  it('create() of a value without a case throws IllegalArgumentException with the Java message (java default arm)', () => {
    const forged = { toString: () => 'FORGED' } as WidthApproximationStrategy;
    expect(() => WidthApproximationStrategy.prototype.create.call(forged)).toThrow(IllegalArgumentException);
    expect(() => WidthApproximationStrategy.prototype.create.call(forged)).toThrow(
      'No implementation is available for the width approximator FORGED',
    );
  });

  it('is the type of the option the provider reads, with the default GREEDY', () => {
    expect(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY.getDefault()).toBe(WidthApproximationStrategy.GREEDY);
  });
});
