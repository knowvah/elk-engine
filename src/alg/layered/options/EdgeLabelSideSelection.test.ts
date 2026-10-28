// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeLabelSideSelection } from './EdgeLabelSideSelection.js';

const DECLARED = ['ALWAYS_UP', 'ALWAYS_DOWN', 'DIRECTION_UP', 'DIRECTION_DOWN', 'SMART_UP', 'SMART_DOWN'] as const;

describe('EdgeLabelSideSelection', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeLabelSideSelection.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeLabelSideSelection.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(EdgeLabelSideSelection.values()[5]).toBe(EdgeLabelSideSelection.SMART_DOWN);
  });

  it('toString is the name', () => {
    expect(EdgeLabelSideSelection.SMART_DOWN.toString()).toBe('SMART_DOWN');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeLabelSideSelection.valueOf(name)).toBe(EdgeLabelSideSelection[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeLabelSideSelection.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeLabelSideSelection.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeLabelSideSelection.SMART_DOWN.compareTo(EdgeLabelSideSelection.ALWAYS_UP)).toBe(5);
    expect(EdgeLabelSideSelection.ALWAYS_UP.compareTo(EdgeLabelSideSelection.SMART_DOWN)).toBe(-5);
    expect(EdgeLabelSideSelection.ALWAYS_UP.compareTo(EdgeLabelSideSelection.ALWAYS_UP)).toBe(0);
  });

  it('transpose swaps up and down variants for every constant', () => {
    const expected: Record<(typeof DECLARED)[number], (typeof DECLARED)[number]> = {
      ALWAYS_UP: 'ALWAYS_DOWN',
      ALWAYS_DOWN: 'ALWAYS_UP',
      DIRECTION_UP: 'DIRECTION_DOWN',
      DIRECTION_DOWN: 'DIRECTION_UP',
      SMART_UP: 'SMART_DOWN',
      SMART_DOWN: 'SMART_UP',
    };
    for (const name of DECLARED) {
      expect(EdgeLabelSideSelection[name].transpose()).toBe(EdgeLabelSideSelection[expected[name]]);
    }
  });
});
