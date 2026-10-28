// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GroupOrderStrategy } from './GroupOrderStrategy.js';

const DECLARED = ['ONLY_WITHIN_GROUP', 'MODEL_ORDER', 'ENFORCED'] as const;

describe('GroupOrderStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(GroupOrderStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(GroupOrderStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(GroupOrderStrategy.values()[2]).toBe(GroupOrderStrategy.ENFORCED);
  });

  it('toString is the name', () => {
    expect(GroupOrderStrategy.ENFORCED.toString()).toBe('ENFORCED');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(GroupOrderStrategy.valueOf(name)).toBe(GroupOrderStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => GroupOrderStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => GroupOrderStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.GroupOrderStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(GroupOrderStrategy.ENFORCED.compareTo(GroupOrderStrategy.ONLY_WITHIN_GROUP)).toBe(2);
    expect(GroupOrderStrategy.ONLY_WITHIN_GROUP.compareTo(GroupOrderStrategy.ENFORCED)).toBe(-2);
    expect(GroupOrderStrategy.ONLY_WITHIN_GROUP.compareTo(GroupOrderStrategy.ONLY_WITHIN_GROUP)).toBe(0);
  });
});
