// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SpanningTreeCostFunction } from './SpanningTreeCostFunction.js';

const DECLARED = [
  'CENTER_DISTANCE',
  'CIRCLE_UNDERLAP',
  'RECTANGLE_UNDERLAP',
  'INVERTED_OVERLAP',
  'MINIMUM_ROOT_DISTANCE',
] as const;

describe('SpanningTreeCostFunction', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SpanningTreeCostFunction.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(SpanningTreeCostFunction.values()[4]).toBe(SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE);
  });

  it('compareTo orders by ordinal', () => {
    expect(SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE.compareTo(SpanningTreeCostFunction.CENTER_DISTANCE)).toBe(4);
    expect(SpanningTreeCostFunction.CENTER_DISTANCE.compareTo(SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE)).toBe(-4);
    expect(SpanningTreeCostFunction.CENTER_DISTANCE.compareTo(SpanningTreeCostFunction.CENTER_DISTANCE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SpanningTreeCostFunction.valueOf(name)).toBe(SpanningTreeCostFunction[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SpanningTreeCostFunction.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SpanningTreeCostFunction.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.SpanningTreeCostFunction.FOO',
    );
  });
});
