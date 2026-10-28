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

describe('PortType oracle row site/enums/PortType', () => {
  // oracle: site/enums/PortType
  it('site/enums/PortType: constants in declaration order with name, ordinal and toString', () => {
    expect(PortType.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['UNDEFINED', 0, 'UNDEFINED'],
      ['INPUT', 1, 'INPUT'],
      ['OUTPUT', 2, 'OUTPUT'],
    ]);
  });

  // oracle: site/enums/PortType
  it('site/enums/PortType: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => PortType.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => PortType.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException('No enum constant org.eclipse.elk.alg.layered.options.PortType.NO_SUCH_CONSTANT'),
    );
  });

  // oracle: site/enums/PortType
  it('site/enums/PortType: compareTo first/last', () => {
    const values = PortType.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
