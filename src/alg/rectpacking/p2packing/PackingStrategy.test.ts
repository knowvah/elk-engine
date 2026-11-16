// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { Compactor } from './Compactor.js';
import { NoPlacement } from './NoPlacement.js';
import { SimplePlacement } from './SimplePlacement.js';
import { PackingStrategy } from './PackingStrategy.js';

const DECLARED = ['COMPACTION', 'SIMPLE', 'NONE'] as const;

describe('PackingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(PackingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(PackingStrategy.values()[2]).toBe(PackingStrategy.NONE);
  });

  it('compareTo orders by ordinal', () => {
    expect(PackingStrategy.NONE.compareTo(PackingStrategy.COMPACTION)).toBe(2);
    expect(PackingStrategy.COMPACTION.compareTo(PackingStrategy.NONE)).toBe(-2);
    expect(PackingStrategy.COMPACTION.compareTo(PackingStrategy.COMPACTION)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(PackingStrategy.valueOf(name)).toBe(PackingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => PackingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PackingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.rectpacking.p2packing.PackingStrategy.FOO',
    );
  });

  it('create() builds the phase of each constant', () => {
    expect(PackingStrategy.COMPACTION.create()).toBeInstanceOf(Compactor);
    expect(PackingStrategy.SIMPLE.create()).toBeInstanceOf(SimplePlacement);
    expect(PackingStrategy.NONE.create()).toBeInstanceOf(NoPlacement);
  });

  it('create() answers null from the default arm of the Java switch (a receiver that is no constant)', () => {
    const notAConstant = Object.create(PackingStrategy.prototype) as PackingStrategy;
    expect(notAConstant.create()).toBeNull();
  });
});
