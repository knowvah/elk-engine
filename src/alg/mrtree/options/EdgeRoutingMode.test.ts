// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeRoutingMode } from './EdgeRoutingMode.js';

const DECLARED = ['NONE', 'MIDDLE_TO_MIDDLE', 'AVOID_OVERLAP'] as const;

describe('EdgeRoutingMode', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeRoutingMode.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(EdgeRoutingMode.values()[2]).toBe(EdgeRoutingMode.AVOID_OVERLAP);
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeRoutingMode.AVOID_OVERLAP.compareTo(EdgeRoutingMode.NONE)).toBe(2);
    expect(EdgeRoutingMode.NONE.compareTo(EdgeRoutingMode.AVOID_OVERLAP)).toBe(-2);
    expect(EdgeRoutingMode.NONE.compareTo(EdgeRoutingMode.NONE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeRoutingMode.valueOf(name)).toBe(EdgeRoutingMode[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeRoutingMode.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeRoutingMode.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.options.EdgeRoutingMode.FOO',
    );
  });
});
