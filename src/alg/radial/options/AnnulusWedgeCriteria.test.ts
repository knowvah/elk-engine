// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { AnnulusWedgeCriteria } from './AnnulusWedgeCriteria.js';
import { AnnulusWedgeByLeafs } from '../p1position/wedge/AnnulusWedgeByLeafs.js';
import { AnnulusWedgeByNodeSpace } from '../p1position/wedge/AnnulusWedgeByNodeSpace.js';

const DECLARED = ['LEAF_NUMBER', 'NODE_SIZE'] as const;

describe('AnnulusWedgeCriteria', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(AnnulusWedgeCriteria.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(AnnulusWedgeCriteria.values()[1]).toBe(AnnulusWedgeCriteria.NODE_SIZE);
  });

  it('compareTo orders by ordinal', () => {
    expect(AnnulusWedgeCriteria.NODE_SIZE.compareTo(AnnulusWedgeCriteria.LEAF_NUMBER)).toBe(1);
    expect(AnnulusWedgeCriteria.LEAF_NUMBER.compareTo(AnnulusWedgeCriteria.NODE_SIZE)).toBe(-1);
    expect(AnnulusWedgeCriteria.LEAF_NUMBER.compareTo(AnnulusWedgeCriteria.LEAF_NUMBER)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(AnnulusWedgeCriteria.valueOf(name)).toBe(AnnulusWedgeCriteria[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => AnnulusWedgeCriteria.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => AnnulusWedgeCriteria.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.options.AnnulusWedgeCriteria.FOO',
    );
  });

  it('create() of LEAF_NUMBER constructs AnnulusWedgeByLeafs', () => {
    expect(AnnulusWedgeCriteria.LEAF_NUMBER.create()).toBeInstanceOf(AnnulusWedgeByLeafs);
  });

  it('create() of NODE_SIZE constructs AnnulusWedgeByNodeSpace', () => {
    expect(AnnulusWedgeCriteria.NODE_SIZE.create()).toBeInstanceOf(AnnulusWedgeByNodeSpace);
  });
});
