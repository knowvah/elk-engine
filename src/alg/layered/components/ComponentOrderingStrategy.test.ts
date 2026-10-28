// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ComponentOrderingStrategy } from './ComponentOrderingStrategy.js';

const DECLARED = ['NONE', 'INSIDE_PORT_SIDE_GROUPS', 'GROUP_MODEL_ORDER', 'MODEL_ORDER'] as const;

describe('ComponentOrderingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(ComponentOrderingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(ComponentOrderingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(ComponentOrderingStrategy.values()[3]).toBe(ComponentOrderingStrategy.MODEL_ORDER);
  });

  it('toString is the name', () => {
    expect(ComponentOrderingStrategy.MODEL_ORDER.toString()).toBe('MODEL_ORDER');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(ComponentOrderingStrategy.valueOf(name)).toBe(ComponentOrderingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => ComponentOrderingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ComponentOrderingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(ComponentOrderingStrategy.MODEL_ORDER.compareTo(ComponentOrderingStrategy.NONE)).toBe(3);
    expect(ComponentOrderingStrategy.NONE.compareTo(ComponentOrderingStrategy.MODEL_ORDER)).toBe(-3);
    expect(ComponentOrderingStrategy.NONE.compareTo(ComponentOrderingStrategy.NONE)).toBe(0);
  });
});

describe('ComponentOrderingStrategy oracle row site/enums/ComponentOrderingStrategy', () => {
  // oracle: site/enums/ComponentOrderingStrategy
  it('site/enums/ComponentOrderingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(ComponentOrderingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['INSIDE_PORT_SIDE_GROUPS', 1, 'INSIDE_PORT_SIDE_GROUPS'],
      ['GROUP_MODEL_ORDER', 2, 'GROUP_MODEL_ORDER'],
      ['MODEL_ORDER', 3, 'MODEL_ORDER'],
    ]);
  });

  // oracle: site/enums/ComponentOrderingStrategy
  it('site/enums/ComponentOrderingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => ComponentOrderingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => ComponentOrderingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/ComponentOrderingStrategy
  it('site/enums/ComponentOrderingStrategy: compareTo first/last', () => {
    const values = ComponentOrderingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-3);
    expect(last.compareTo(first)).toBe(3);
    expect(first.compareTo(first)).toBe(0);
  });
});
