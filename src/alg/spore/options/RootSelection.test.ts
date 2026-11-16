// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { RootSelection } from './RootSelection.js';

const DECLARED = ['FIXED', 'CENTER_NODE'] as const;

describe('RootSelection', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(RootSelection.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(RootSelection.values()[1]).toBe(RootSelection.CENTER_NODE);
  });

  it('compareTo orders by ordinal', () => {
    expect(RootSelection.CENTER_NODE.compareTo(RootSelection.FIXED)).toBe(1);
    expect(RootSelection.FIXED.compareTo(RootSelection.CENTER_NODE)).toBe(-1);
    expect(RootSelection.FIXED.compareTo(RootSelection.FIXED)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(RootSelection.valueOf(name)).toBe(RootSelection[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => RootSelection.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => RootSelection.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.RootSelection.FOO',
    );
  });
});
