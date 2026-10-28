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
