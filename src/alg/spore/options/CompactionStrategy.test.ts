// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { ShrinkTreeCompactionPhase } from '../p3execution/ShrinkTreeCompactionPhase.js';
import { CompactionStrategy } from './CompactionStrategy.js';

const DECLARED = ['DEPTH_FIRST'] as const;

describe('CompactionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CompactionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(CompactionStrategy.values()[0]).toBe(CompactionStrategy.DEPTH_FIRST);
  });

  it('compareTo of a constant with itself is 0', () => {
    expect(CompactionStrategy.DEPTH_FIRST.compareTo(CompactionStrategy.DEPTH_FIRST)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CompactionStrategy.valueOf(name)).toBe(CompactionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.CompactionStrategy.FOO',
    );
  });

  it('create() instantiates the phase of each constant', () => {
    expect(CompactionStrategy.DEPTH_FIRST.create().constructor).toBe(ShrinkTreeCompactionPhase);
  });

  it('create() returns a new instance on every call', () => {
    const constant = CompactionStrategy.values()[0]!;
    expect(constant.create()).not.toBe(constant.create());
  });

  it('create() throws the Java message for a constant it has no implementation for', () => {
    const unknown = { toString: () => 'NO_SUCH_STRATEGY' } as unknown as CompactionStrategy;
    expect(() => CompactionStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => CompactionStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation available for NO_SUCH_STRATEGY',
    );
  });
});
