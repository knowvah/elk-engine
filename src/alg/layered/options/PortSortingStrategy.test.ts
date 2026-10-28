// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { PortSortingStrategy } from './PortSortingStrategy.js';

const DECLARED = ['INPUT_ORDER', 'PORT_DEGREE'] as const;

describe('PortSortingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PortSortingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(PortSortingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(PortSortingStrategy.values()[1]).toBe(PortSortingStrategy.PORT_DEGREE);
  });

  it('toString is the name', () => {
    expect(PortSortingStrategy.PORT_DEGREE.toString()).toBe('PORT_DEGREE');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PortSortingStrategy.valueOf(name)).toBe(PortSortingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PortSortingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortSortingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.PortSortingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(PortSortingStrategy.PORT_DEGREE.compareTo(PortSortingStrategy.INPUT_ORDER)).toBe(1);
    expect(PortSortingStrategy.INPUT_ORDER.compareTo(PortSortingStrategy.PORT_DEGREE)).toBe(-1);
    expect(PortSortingStrategy.INPUT_ORDER.compareTo(PortSortingStrategy.INPUT_ORDER)).toBe(0);
  });
});
