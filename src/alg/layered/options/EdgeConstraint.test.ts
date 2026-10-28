// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeConstraint } from './EdgeConstraint.js';

const DECLARED = ['NONE', 'INCOMING_ONLY', 'OUTGOING_ONLY'] as const;

describe('EdgeConstraint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeConstraint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeConstraint.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(EdgeConstraint.values()[2]).toBe(EdgeConstraint.OUTGOING_ONLY);
  });

  it('toString is the name', () => {
    expect(EdgeConstraint.OUTGOING_ONLY.toString()).toBe('OUTGOING_ONLY');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeConstraint.valueOf(name)).toBe(EdgeConstraint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeConstraint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeConstraint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.EdgeConstraint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeConstraint.OUTGOING_ONLY.compareTo(EdgeConstraint.NONE)).toBe(2);
    expect(EdgeConstraint.NONE.compareTo(EdgeConstraint.OUTGOING_ONLY)).toBe(-2);
    expect(EdgeConstraint.NONE.compareTo(EdgeConstraint.NONE)).toBe(0);
  });
});
