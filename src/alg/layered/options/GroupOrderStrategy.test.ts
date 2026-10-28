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

describe('GroupOrderStrategy oracle row site/enums/GroupOrderStrategy', () => {
  // oracle: site/enums/GroupOrderStrategy
  it('site/enums/GroupOrderStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(GroupOrderStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['ONLY_WITHIN_GROUP', 0, 'ONLY_WITHIN_GROUP'],
      ['MODEL_ORDER', 1, 'MODEL_ORDER'],
      ['ENFORCED', 2, 'ENFORCED'],
    ]);
  });

  // oracle: site/enums/GroupOrderStrategy
  it('site/enums/GroupOrderStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => GroupOrderStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => GroupOrderStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.GroupOrderStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/GroupOrderStrategy
  it('site/enums/GroupOrderStrategy: compareTo first/last', () => {
    const values = GroupOrderStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
