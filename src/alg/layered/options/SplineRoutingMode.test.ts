// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SplineRoutingMode } from './SplineRoutingMode.js';

const DECLARED = ['CONSERVATIVE', 'CONSERVATIVE_SOFT', 'SLOPPY'] as const;

describe('SplineRoutingMode', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SplineRoutingMode.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(SplineRoutingMode.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(SplineRoutingMode.values()[2]).toBe(SplineRoutingMode.SLOPPY);
  });

  it('toString is the name', () => {
    expect(SplineRoutingMode.SLOPPY.toString()).toBe('SLOPPY');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SplineRoutingMode.valueOf(name)).toBe(SplineRoutingMode[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SplineRoutingMode.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SplineRoutingMode.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.SplineRoutingMode.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SplineRoutingMode.SLOPPY.compareTo(SplineRoutingMode.CONSERVATIVE)).toBe(2);
    expect(SplineRoutingMode.CONSERVATIVE.compareTo(SplineRoutingMode.SLOPPY)).toBe(-2);
    expect(SplineRoutingMode.CONSERVATIVE.compareTo(SplineRoutingMode.CONSERVATIVE)).toBe(0);
  });
});
