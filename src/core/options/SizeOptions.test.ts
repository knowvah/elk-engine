// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

import { SizeOptions } from './SizeOptions.js';

const NAMES = [
  'DEFAULT_MINIMUM_SIZE',
  'MINIMUM_SIZE_ACCOUNTS_FOR_PADDING',
  'COMPUTE_PADDING',
  'OUTSIDE_NODE_LABELS_OVERHANG',
  'PORTS_OVERHANG',
  'UNIFORM_PORT_SPACING',
  'SPACE_EFFICIENT_PORT_LABELS',
  'FORCE_TABULAR_NODE_LABELS',
  'ASYMMETRICAL',
];

describe('SizeOptions', () => {
  it('declares the constants in Java order', () => {
    expect(SizeOptions.values().map((c) => c.name())).toEqual(NAMES);
    expect(SizeOptions.values().map((c) => c.ordinal())).toEqual(NAMES.map((_n, i) => i));
    expect(SizeOptions.values()[0]?.toString()).toBe(NAMES[0]);
  });

  it('valueOf resolves by name and throws the Java message for an unknown name', () => {
    for (const n of NAMES) {
      expect(SizeOptions.valueOf(n).name()).toBe(n);
    }
    expect(() => SizeOptions.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SizeOptions.valueOf('FOO')).toThrow('No enum constant org.eclipse.elk.core.options.SizeOptions.FOO');
  });

  it('compareTo orders by ordinal', () => {
    const last = SizeOptions.values()[NAMES.length - 1] as SizeOptions;
    const first = SizeOptions.values()[0] as SizeOptions;
    expect(last.compareTo(first)).toBe(NAMES.length - 1);
    expect(first.compareTo(last)).toBe(1 - NAMES.length);
    expect(first.compareTo(first)).toBe(0);
  });

  it('valueOf(int) indexes values() and throws out of range', () => {
    expect(SizeOptions.valueOf(0)).toBe(SizeOptions.values()[0]);
    expect(SizeOptions.valueOf(NAMES.length - 1)).toBe(SizeOptions.values()[NAMES.length - 1]);
    expect(() => SizeOptions.valueOf(NAMES.length)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => SizeOptions.valueOf(NAMES.length)).toThrow(
      'Index ' + NAMES.length + ' out of bounds for length ' + NAMES.length,
    );
    expect(() => SizeOptions.valueOf(-1)).toThrow(ArrayIndexOutOfBoundsException);
  });
});
