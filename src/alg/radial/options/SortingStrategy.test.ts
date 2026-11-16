// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { SortingStrategy } from './SortingStrategy.js';
import { PolarCoordinateSorter } from '../sorting/PolarCoordinateSorter.js';
import { IDSorter } from '../sorting/IDSorter.js';

const DECLARED = ['NONE', 'POLAR_COORDINATE', 'ID'] as const;

describe('SortingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SortingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(SortingStrategy.values()[2]).toBe(SortingStrategy.ID);
  });

  it('compareTo orders by ordinal', () => {
    expect(SortingStrategy.ID.compareTo(SortingStrategy.NONE)).toBe(2);
    expect(SortingStrategy.NONE.compareTo(SortingStrategy.ID)).toBe(-2);
    expect(SortingStrategy.NONE.compareTo(SortingStrategy.NONE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SortingStrategy.valueOf(name)).toBe(SortingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SortingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SortingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.options.SortingStrategy.FOO',
    );
  });

  it('create() of POLAR_COORDINATE constructs PolarCoordinateSorter', () => {
    expect(SortingStrategy.POLAR_COORDINATE.create()).toBeInstanceOf(PolarCoordinateSorter);
  });

  it('create() of ID constructs IDSorter', () => {
    expect(SortingStrategy.ID.create()).toBeInstanceOf(IDSorter);
  });

  it('create() of NONE returns null', () => {
    expect(SortingStrategy.NONE.create()).toBeNull();
  });
});
