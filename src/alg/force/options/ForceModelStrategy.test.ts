// SPDX-License-Identifier: EPL-2.0
// ForceModelStrategy.java declares EADES (:25) then FRUCHTERMAN_REINGOLD (:27); the enum protocol is the Java enum's.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ForceModelStrategy } from './ForceModelStrategy.js';

const DECLARED = ['EADES', 'FRUCHTERMAN_REINGOLD'] as const;

describe('ForceModelStrategy (ForceModelStrategy.java)', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(ForceModelStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(ForceModelStrategy.values()[1]).toBe(ForceModelStrategy.FRUCHTERMAN_REINGOLD);
  });

  it('compareTo orders by ordinal', () => {
    expect(ForceModelStrategy.FRUCHTERMAN_REINGOLD.compareTo(ForceModelStrategy.EADES)).toBe(1);
    expect(ForceModelStrategy.EADES.compareTo(ForceModelStrategy.FRUCHTERMAN_REINGOLD)).toBe(-1);
    expect(ForceModelStrategy.EADES.compareTo(ForceModelStrategy.EADES)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(ForceModelStrategy.valueOf(name)).toBe(ForceModelStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => ForceModelStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => ForceModelStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.force.options.ForceModelStrategy.FOO',
    );
  });
});
