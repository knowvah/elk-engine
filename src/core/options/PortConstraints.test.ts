// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { PortConstraints } from './PortConstraints.js';

const DECLARED = ['UNDEFINED', 'FREE', 'FIXED_SIDE', 'FIXED_ORDER', 'FIXED_RATIO', 'FIXED_POS'] as const;

describe('PortConstraints', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PortConstraints.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(PortConstraints.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4, 5]);
    expect(PortConstraints.values()).toHaveLength(6);
    expect(PortConstraints.values()[5]).toBe(PortConstraints.FIXED_POS);
  });

  it('toString is the name', () => {
    expect(PortConstraints.FIXED_POS.toString()).toBe('FIXED_POS');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PortConstraints.valueOf(name)).toBe(PortConstraints[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PortConstraints.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortConstraints.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.PortConstraints.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(PortConstraints.FIXED_POS.compareTo(PortConstraints.UNDEFINED)).toBe(5);
    expect(PortConstraints.UNDEFINED.compareTo(PortConstraints.FIXED_POS)).toBe(-5);
    expect(PortConstraints.UNDEFINED.compareTo(PortConstraints.UNDEFINED)).toBe(0);
  });

  // [posFixed, ratioFixed, orderFixed, sideFixed] per the Java predicates.
  const TRUTH: Record<string, readonly [boolean, boolean, boolean, boolean]> = {
    UNDEFINED: [false, false, false, false],
    FREE: [false, false, false, false],
    FIXED_SIDE: [false, false, false, true],
    FIXED_ORDER: [false, false, true, true],
    FIXED_RATIO: [false, true, true, true],
    FIXED_POS: [true, false, true, true],
  };

  it('answers the Java truth table for all six constants and four predicates', () => {
    for (const constant of PortConstraints.values()) {
      expect(
        [constant.isPosFixed(), constant.isRatioFixed(), constant.isOrderFixed(), constant.isSideFixed()],
        constant.name(),
      ).toEqual(TRUTH[constant.name()]);
    }
  });
});
