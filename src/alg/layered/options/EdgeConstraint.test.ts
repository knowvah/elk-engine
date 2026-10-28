// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeConstraint } from './EdgeConstraint.js';

const DECLARED = ['NONE', 'INCOMING_ONLY', 'OUTGOING_ONLY'] as const;

describe('EdgeConstraint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeConstraint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeConstraint.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(EdgeConstraint.values()[2]).toBe(EdgeConstraint.OUTGOING_ONLY);
  });

  it('toString is the name', () => {
    expect(EdgeConstraint.OUTGOING_ONLY.toString()).toBe('OUTGOING_ONLY');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeConstraint.valueOf(name)).toBe(EdgeConstraint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeConstraint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeConstraint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.EdgeConstraint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeConstraint.OUTGOING_ONLY.compareTo(EdgeConstraint.NONE)).toBe(2);
    expect(EdgeConstraint.NONE.compareTo(EdgeConstraint.OUTGOING_ONLY)).toBe(-2);
    expect(EdgeConstraint.NONE.compareTo(EdgeConstraint.NONE)).toBe(0);
  });
});

describe('EdgeConstraint oracle row site/enums/EdgeConstraint', () => {
  // oracle: site/enums/EdgeConstraint
  it('site/enums/EdgeConstraint: constants in declaration order with name, ordinal and toString', () => {
    expect(EdgeConstraint.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['INCOMING_ONLY', 1, 'INCOMING_ONLY'],
      ['OUTGOING_ONLY', 2, 'OUTGOING_ONLY'],
    ]);
  });

  // oracle: site/enums/EdgeConstraint
  it('site/enums/EdgeConstraint: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => EdgeConstraint.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => EdgeConstraint.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.EdgeConstraint.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/EdgeConstraint
  it('site/enums/EdgeConstraint: compareTo first/last', () => {
    const values = EdgeConstraint.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-2);
    expect(last.compareTo(first)).toBe(2);
    expect(first.compareTo(first)).toBe(0);
  });
});
