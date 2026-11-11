// SPDX-License-Identifier: EPL-2.0
// StressMajorization.java:268-275 declares Dimension as XY, X, Y; the enum protocol is the Java enum's.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { Dimension } from './Dimension.js';

const DECLARED = ['XY', 'X', 'Y'] as const;

describe('Dimension (StressMajorization.java:268-275)', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(Dimension.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(Dimension.values()[2]).toBe(Dimension.Y);
  });

  it('compareTo orders by ordinal', () => {
    expect(Dimension.Y.compareTo(Dimension.XY)).toBe(2);
    expect(Dimension.XY.compareTo(Dimension.Y)).toBe(-2);
    expect(Dimension.X.compareTo(Dimension.X)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(Dimension.valueOf(name)).toBe(Dimension[name]);
    }
  });

  it('valueOf throws the Java message (canonical nested name) for an unknown name', () => {
    expect(() => Dimension.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => Dimension.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.force.stress.StressMajorization.Dimension.FOO',
    );
  });
});
