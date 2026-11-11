// SPDX-License-Identifier: EPL-2.0
// CompactionStrategy.java declares one constant, POLYOMINO (:17-19); the enum protocol is the Java enum's (ordinal, name, toString,
// compareTo by ordinal, valueOf throwing IllegalArgumentException with the canonical constant name).
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CompactionStrategy } from './CompactionStrategy.js';

describe('CompactionStrategy (CompactionStrategy.java)', () => {
  it('declares POLYOMINO alone, with ordinal 0 and the name as its string', () => {
    expect(CompactionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['POLYOMINO', 0, 'POLYOMINO'],
    ]);
    expect(CompactionStrategy.values()[0]).toBe(CompactionStrategy.POLYOMINO);
  });

  it('compareTo of a constant with itself is 0 (ordinal difference)', () => {
    expect(CompactionStrategy.POLYOMINO.compareTo(CompactionStrategy.POLYOMINO)).toBe(0);
  });

  it('valueOf resolves POLYOMINO by name', () => {
    expect(CompactionStrategy.valueOf('POLYOMINO')).toBe(CompactionStrategy.POLYOMINO);
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CompactionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.disco.options.CompactionStrategy.FOO',
    );
  });
});
