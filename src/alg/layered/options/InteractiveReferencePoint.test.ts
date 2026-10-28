// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { InteractiveReferencePoint } from './InteractiveReferencePoint.js';

const DECLARED = ['CENTER', 'TOP_LEFT'] as const;

describe('InteractiveReferencePoint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(InteractiveReferencePoint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(InteractiveReferencePoint.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(InteractiveReferencePoint.values()[1]).toBe(InteractiveReferencePoint.TOP_LEFT);
  });

  it('toString is the name', () => {
    expect(InteractiveReferencePoint.TOP_LEFT.toString()).toBe('TOP_LEFT');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(InteractiveReferencePoint.valueOf(name)).toBe(InteractiveReferencePoint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => InteractiveReferencePoint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => InteractiveReferencePoint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.InteractiveReferencePoint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(InteractiveReferencePoint.TOP_LEFT.compareTo(InteractiveReferencePoint.CENTER)).toBe(1);
    expect(InteractiveReferencePoint.CENTER.compareTo(InteractiveReferencePoint.TOP_LEFT)).toBe(-1);
    expect(InteractiveReferencePoint.CENTER.compareTo(InteractiveReferencePoint.CENTER)).toBe(0);
  });
});
