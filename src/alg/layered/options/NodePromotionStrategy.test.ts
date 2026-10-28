// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { NodePromotionStrategy } from './NodePromotionStrategy.js';

const DECLARED = [
  'NONE',
  'NIKOLOV',
  'NIKOLOV_PIXEL',
  'NIKOLOV_IMPROVED',
  'NIKOLOV_IMPROVED_PIXEL',
  'DUMMYNODE_PERCENTAGE',
  'NODECOUNT_PERCENTAGE',
  'NO_BOUNDARY',
  'MODEL_ORDER_LEFT_TO_RIGHT',
  'MODEL_ORDER_RIGHT_TO_LEFT',
] as const;

describe('NodePromotionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(NodePromotionStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(NodePromotionStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(NodePromotionStrategy.values()[9]).toBe(NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT);
  });

  it('toString is the name', () => {
    expect(NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT.toString()).toBe('MODEL_ORDER_RIGHT_TO_LEFT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(NodePromotionStrategy.valueOf(name)).toBe(NodePromotionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => NodePromotionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodePromotionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.NodePromotionStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT.compareTo(NodePromotionStrategy.NONE)).toBe(9);
    expect(NodePromotionStrategy.NONE.compareTo(NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT)).toBe(-9);
    expect(NodePromotionStrategy.NONE.compareTo(NodePromotionStrategy.NONE)).toBe(0);
  });
});

describe('NodePromotionStrategy oracle row site/enums/NodePromotionStrategy', () => {
  // oracle: site/enums/NodePromotionStrategy
  it('site/enums/NodePromotionStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(NodePromotionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['NIKOLOV', 1, 'NIKOLOV'],
      ['NIKOLOV_PIXEL', 2, 'NIKOLOV_PIXEL'],
      ['NIKOLOV_IMPROVED', 3, 'NIKOLOV_IMPROVED'],
      ['NIKOLOV_IMPROVED_PIXEL', 4, 'NIKOLOV_IMPROVED_PIXEL'],
      ['DUMMYNODE_PERCENTAGE', 5, 'DUMMYNODE_PERCENTAGE'],
      ['NODECOUNT_PERCENTAGE', 6, 'NODECOUNT_PERCENTAGE'],
      ['NO_BOUNDARY', 7, 'NO_BOUNDARY'],
      ['MODEL_ORDER_LEFT_TO_RIGHT', 8, 'MODEL_ORDER_LEFT_TO_RIGHT'],
      ['MODEL_ORDER_RIGHT_TO_LEFT', 9, 'MODEL_ORDER_RIGHT_TO_LEFT'],
    ]);
  });

  // oracle: site/enums/NodePromotionStrategy
  it('site/enums/NodePromotionStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => NodePromotionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => NodePromotionStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.NodePromotionStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/NodePromotionStrategy
  it('site/enums/NodePromotionStrategy: compareTo first/last', () => {
    const values = NodePromotionStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-9);
    expect(last.compareTo(first)).toBe(9);
    expect(first.compareTo(first)).toBe(0);
  });
});
