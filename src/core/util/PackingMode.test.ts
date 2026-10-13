// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { PackingMode } from './PackingMode.js';

const NAMES = ['SIMPLE', 'GROUP_DEC', 'GROUP_MIXED', 'GROUP_INC'];

describe('PackingMode', () => {
  it('declares the constants in the order of BoxLayoutProvider.java', () => {
    expect(PackingMode.values().map((c) => c.name())).toEqual(NAMES);
    expect(PackingMode.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(PackingMode.GROUP_MIXED.toString()).toBe('GROUP_MIXED');
  });

  it('resolves constants by name and rejects unknown names with the Java message', () => {
    expect(PackingMode.valueOf('GROUP_INC')).toBe(PackingMode.GROUP_INC);
    expect(() => PackingMode.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PackingMode.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.util.BoxLayoutProvider.PackingMode.FOO',
    );
  });

  it('orders by ordinal', () => {
    expect(PackingMode.SIMPLE.compareTo(PackingMode.GROUP_INC)).toBe(-3);
    expect(PackingMode.GROUP_DEC.compareTo(PackingMode.GROUP_DEC)).toBe(0);
  });
});
