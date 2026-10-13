// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LabelSide } from './LabelSide.js';

const DECLARED = ['UNKNOWN', 'ABOVE', 'BELOW', 'INLINE'] as const;

describe('LabelSide', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LabelSide.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LabelSide.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(LabelSide.values()).toHaveLength(4);
    expect(LabelSide.values()[3]).toBe(LabelSide.INLINE);
  });

  it('toString is the name', () => {
    expect(LabelSide.INLINE.toString()).toBe('INLINE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LabelSide.valueOf(name)).toBe(LabelSide[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LabelSide.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LabelSide.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.LabelSide.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(LabelSide.INLINE.compareTo(LabelSide.UNKNOWN)).toBe(3);
    expect(LabelSide.UNKNOWN.compareTo(LabelSide.INLINE)).toBe(-3);
    expect(LabelSide.UNKNOWN.compareTo(LabelSide.UNKNOWN)).toBe(0);
  });

  it('LABEL_SIDE has the Java id and defaults to UNKNOWN', () => {
    expect(LabelSide.LABEL_SIDE.getId()).toBe('org.eclipse.elk.labelSide');
    expect(LabelSide.LABEL_SIDE.getDefault()).toBe(LabelSide.UNKNOWN);
  });

  it('opposite swaps ABOVE and BELOW and maps UNKNOWN and INLINE to themselves per the Java switch', () => {
    expect(LabelSide.ABOVE.opposite()).toBe(LabelSide.BELOW);
    expect(LabelSide.BELOW.opposite()).toBe(LabelSide.ABOVE);
    expect(LabelSide.INLINE.opposite()).toBe(LabelSide.INLINE);
    expect(LabelSide.UNKNOWN.opposite()).toBe(LabelSide.UNKNOWN);
  });
});
