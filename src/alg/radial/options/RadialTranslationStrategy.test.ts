// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { RadialTranslationStrategy } from './RadialTranslationStrategy.js';
import { EdgeLengthOptimization } from '../intermediate/optimization/EdgeLengthOptimization.js';
import { EdgeLengthPositionOptimization } from '../intermediate/optimization/EdgeLengthPositionOptimization.js';
import { CrossingMinimizationPosition } from '../intermediate/optimization/CrossingMinimizationPosition.js';

const DECLARED = ['NONE', 'EDGE_LENGTH', 'EDGE_LENGTH_BY_POSITION', 'CROSSING_MINIMIZATION_BY_POSITION'] as const;

describe('RadialTranslationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(RadialTranslationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(RadialTranslationStrategy.values()[3]).toBe(RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION);
  });

  it('compareTo orders by ordinal', () => {
    expect(RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION.compareTo(RadialTranslationStrategy.NONE)).toBe(
      3,
    );
    expect(RadialTranslationStrategy.NONE.compareTo(RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION)).toBe(
      -3,
    );
    expect(RadialTranslationStrategy.NONE.compareTo(RadialTranslationStrategy.NONE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(RadialTranslationStrategy.valueOf(name)).toBe(RadialTranslationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => RadialTranslationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => RadialTranslationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.options.RadialTranslationStrategy.FOO',
    );
  });

  it('create() of EDGE_LENGTH constructs EdgeLengthOptimization', () => {
    expect(RadialTranslationStrategy.EDGE_LENGTH.create()).toBeInstanceOf(EdgeLengthOptimization);
  });

  it('create() of EDGE_LENGTH_BY_POSITION constructs EdgeLengthPositionOptimization', () => {
    expect(RadialTranslationStrategy.EDGE_LENGTH_BY_POSITION.create()).toBeInstanceOf(EdgeLengthPositionOptimization);
  });

  it('create() of CROSSING_MINIMIZATION_BY_POSITION constructs CrossingMinimizationPosition', () => {
    expect(RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION.create()).toBeInstanceOf(
      CrossingMinimizationPosition,
    );
  });

  it('create() of NONE returns null', () => {
    expect(RadialTranslationStrategy.NONE.create()).toBeNull();
  });
});
