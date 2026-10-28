// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { CrossingMinimizationStrategy } from './CrossingMinimizationStrategy.js';

const DECLARED = ['LAYER_SWEEP', 'MEDIAN_LAYER_SWEEP', 'INTERACTIVE', 'NONE'] as const;

/** Constant name to the class its `create()` arm will return, and the mission porting it. */
const ARMS: Record<(typeof DECLARED)[number], [string, string]> = {
  LAYER_SWEEP: ['LayerSweepCrossingMinimizer', '7c'],
  MEDIAN_LAYER_SWEEP: ['LayerSweepCrossingMinimizer', '7c'],
  INTERACTIVE: ['InteractiveCrossingMinimizer', '7c'],
  NONE: ['NoCrossingMinimizer', '7c'],
};

describe('CrossingMinimizationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CrossingMinimizationStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(CrossingMinimizationStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(CrossingMinimizationStrategy.values()[3]).toBe(CrossingMinimizationStrategy.NONE);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(CrossingMinimizationStrategy.NONE.toString()).toBe('NONE');
    expect(CrossingMinimizationStrategy.NONE.compareTo(CrossingMinimizationStrategy.LAYER_SWEEP)).toBe(3);
    expect(CrossingMinimizationStrategy.LAYER_SWEEP.compareTo(CrossingMinimizationStrategy.NONE)).toBe(-3);
    expect(CrossingMinimizationStrategy.LAYER_SWEEP.compareTo(CrossingMinimizationStrategy.LAYER_SWEEP)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CrossingMinimizationStrategy.valueOf(name)).toBe(CrossingMinimizationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CrossingMinimizationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CrossingMinimizationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy.FOO',
    );
  });

  it('create() of every constant throws UnsupportedOperationException naming its class and mission', () => {
    for (const name of DECLARED) {
      const [className, mission] = ARMS[name];
      expect(() => CrossingMinimizationStrategy[name].create()).toThrow(UnsupportedOperationException);
      expect(() => CrossingMinimizationStrategy[name].create()).toThrow(`${className} is ported in mission ${mission}`);
    }
  });

  it('create() of an unknown strategy keeps the Java IllegalArgumentException text', () => {
    const unknown = { toString: () => 'FAKE' } as unknown as CrossingMinimizationStrategy;
    expect(() => CrossingMinimizationStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => CrossingMinimizationStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation is available for the crossing minimizer FAKE',
    );
  });
});

describe('CrossingMinimizationStrategy oracle row site/enums/CrossingMinimizationStrategy', () => {
  // oracle: site/enums/CrossingMinimizationStrategy
  it('site/enums/CrossingMinimizationStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(CrossingMinimizationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['LAYER_SWEEP', 0, 'LAYER_SWEEP'],
      ['MEDIAN_LAYER_SWEEP', 1, 'MEDIAN_LAYER_SWEEP'],
      ['INTERACTIVE', 2, 'INTERACTIVE'],
      ['NONE', 3, 'NONE'],
    ]);
  });

  // oracle: site/enums/CrossingMinimizationStrategy
  it('site/enums/CrossingMinimizationStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => CrossingMinimizationStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => CrossingMinimizationStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/CrossingMinimizationStrategy
  it('site/enums/CrossingMinimizationStrategy: compareTo first/last', () => {
    const values = CrossingMinimizationStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-3);
    expect(last.compareTo(first)).toBe(3);
    expect(first.compareTo(first)).toBe(0);
  });
});
