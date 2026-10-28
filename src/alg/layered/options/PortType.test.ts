// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { PortType } from './PortType.js';

const DECLARED = ['UNDEFINED', 'INPUT', 'OUTPUT'] as const;

describe('PortType', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PortType.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(PortType.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(PortType.values()[2]).toBe(PortType.OUTPUT);
  });

  it('toString is the name', () => {
    expect(PortType.OUTPUT.toString()).toBe('OUTPUT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PortType.valueOf(name)).toBe(PortType[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PortType.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortType.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.alg.layered.options.PortType.FOO');
  });

  it('compareTo orders by ordinal', () => {
    expect(PortType.OUTPUT.compareTo(PortType.UNDEFINED)).toBe(2);
    expect(PortType.UNDEFINED.compareTo(PortType.OUTPUT)).toBe(-2);
    expect(PortType.UNDEFINED.compareTo(PortType.UNDEFINED)).toBe(0);
  });
});
