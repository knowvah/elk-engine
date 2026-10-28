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
