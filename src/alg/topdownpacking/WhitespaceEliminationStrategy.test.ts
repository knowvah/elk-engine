// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { BottomRowEqualWhitespaceEliminator } from './BottomRowEqualWhitespaceEliminator.js';
import { WhitespaceEliminationStrategy } from './WhitespaceEliminationStrategy.js';

const DECLARED = ['BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR'] as const;

describe('WhitespaceEliminationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(WhitespaceEliminationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(WhitespaceEliminationStrategy.values()[0]).toBe(
      WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR,
    );
  });

  it('compareTo of a constant with itself is 0', () => {
    expect(
      WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR.compareTo(
        WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR,
      ),
    ).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(WhitespaceEliminationStrategy.valueOf(name)).toBe(WhitespaceEliminationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => WhitespaceEliminationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => WhitespaceEliminationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.topdownpacking.WhitespaceEliminationStrategy.FOO',
    );
  });

  it('create() returns a new BottomRowEqualWhitespaceEliminator for each call (Java `create()` switch)', () => {
    for (const constant of WhitespaceEliminationStrategy.values()) {
      const first = constant.create();
      const second = constant.create();
      expect(first).toBeInstanceOf(BottomRowEqualWhitespaceEliminator);
      expect(second).toBeInstanceOf(BottomRowEqualWhitespaceEliminator);
      expect(second).not.toBe(first);
    }
  });
});
