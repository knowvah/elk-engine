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

describe('SplineRoutingMode oracle row site/enums/SplineRoutingMode', () => {
  // oracle: site/enums/SplineRoutingMode
  it('site/enums/SplineRoutingMode: constants in declaration order with name, ordinal and toString', () => {
    expect(SplineRoutingMode.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['CONSERVATIVE', 0, 'CONSERVATIVE'],
      ['CONSERVATIVE_SOFT', 1, 'CONSERVATIVE_SOFT'],
      ['SLOPPY', 2, 'SLOPPY'],
    ]);
  });

  // oracle: site/enums/SplineRoutingMode
  it('site/enums/SplineRoutingMode: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => SplineRoutingMode.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => SplineRoutingMode.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.SplineRoutingMode.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/SplineRoutingMode
  it('site/enums/SplineRoutingMode: compareTo first/last', () => {
    const values = SplineRoutingMode.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
