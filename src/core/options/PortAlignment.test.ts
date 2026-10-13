// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { PortAlignment } from './PortAlignment.js';

const DECLARED = ['DISTRIBUTED', 'JUSTIFIED', 'BEGIN', 'CENTER', 'END'] as const;

describe('PortAlignment', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PortAlignment.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(PortAlignment.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4]);
    expect(PortAlignment.values()).toHaveLength(5);
    expect(PortAlignment.values()[4]).toBe(PortAlignment.END);
  });

  it('toString is the name', () => {
    expect(PortAlignment.END.toString()).toBe('END');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PortAlignment.valueOf(name)).toBe(PortAlignment[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PortAlignment.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortAlignment.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.PortAlignment.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(PortAlignment.END.compareTo(PortAlignment.DISTRIBUTED)).toBe(4);
    expect(PortAlignment.DISTRIBUTED.compareTo(PortAlignment.END)).toBe(-4);
    expect(PortAlignment.DISTRIBUTED.compareTo(PortAlignment.DISTRIBUTED)).toBe(0);
  });
});
