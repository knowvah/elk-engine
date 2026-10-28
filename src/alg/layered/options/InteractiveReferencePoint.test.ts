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

describe('InteractiveReferencePoint oracle row site/enums/InteractiveReferencePoint', () => {
  // oracle: site/enums/InteractiveReferencePoint
  it('site/enums/InteractiveReferencePoint: constants in declaration order with name, ordinal and toString', () => {
    expect(InteractiveReferencePoint.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['CENTER', 0, 'CENTER'],
      ['TOP_LEFT', 1, 'TOP_LEFT'],
    ]);
  });

  // oracle: site/enums/InteractiveReferencePoint
  it('site/enums/InteractiveReferencePoint: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => InteractiveReferencePoint.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => InteractiveReferencePoint.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.InteractiveReferencePoint.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/InteractiveReferencePoint
  it('site/enums/InteractiveReferencePoint: compareTo first/last', () => {
    const values = InteractiveReferencePoint.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-1);
    expect(last.compareTo(first)).toBe(1);
    expect(first.compareTo(first)).toBe(0);
  });
});
