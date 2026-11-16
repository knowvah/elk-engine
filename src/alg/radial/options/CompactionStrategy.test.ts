// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { AnnulusWedgeCompaction } from '../intermediate/compaction/AnnulusWedgeCompaction.js';
import { RadialCompaction } from '../intermediate/compaction/RadialCompaction.js';
import { CompactionStrategy } from './CompactionStrategy.js';

const DECLARED = ['NONE', 'RADIAL_COMPACTION', 'WEDGE_COMPACTION'] as const;

describe('CompactionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CompactionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(CompactionStrategy.values()[2]).toBe(CompactionStrategy.WEDGE_COMPACTION);
  });

  it('compareTo orders by ordinal', () => {
    expect(CompactionStrategy.WEDGE_COMPACTION.compareTo(CompactionStrategy.NONE)).toBe(2);
    expect(CompactionStrategy.NONE.compareTo(CompactionStrategy.WEDGE_COMPACTION)).toBe(-2);
    expect(CompactionStrategy.NONE.compareTo(CompactionStrategy.NONE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CompactionStrategy.valueOf(name)).toBe(CompactionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.options.CompactionStrategy.FOO',
    );
  });

  it('create() of RADIAL_COMPACTION constructs RadialCompaction', () => {
    expect(CompactionStrategy.RADIAL_COMPACTION.create()).toBeInstanceOf(RadialCompaction);
  });

  it('create() of WEDGE_COMPACTION constructs AnnulusWedgeCompaction', () => {
    expect(CompactionStrategy.WEDGE_COMPACTION.create()).toBeInstanceOf(AnnulusWedgeCompaction);
  });
});
