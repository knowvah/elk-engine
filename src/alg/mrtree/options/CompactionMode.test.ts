// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CompactionMode } from './CompactionMode.js';

const DECLARED = ['NONE', 'LEVEL_PRESERVING', 'AGGRESSIVE'] as const;

describe('CompactionMode', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CompactionMode.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(CompactionMode.values()[2]).toBe(CompactionMode.AGGRESSIVE);
  });

  it('compareTo orders by ordinal', () => {
    expect(CompactionMode.AGGRESSIVE.compareTo(CompactionMode.NONE)).toBe(2);
    expect(CompactionMode.NONE.compareTo(CompactionMode.AGGRESSIVE)).toBe(-2);
    expect(CompactionMode.NONE.compareTo(CompactionMode.NONE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CompactionMode.valueOf(name)).toBe(CompactionMode[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CompactionMode.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CompactionMode.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.options.CompactionMode.FOO',
    );
  });
});
