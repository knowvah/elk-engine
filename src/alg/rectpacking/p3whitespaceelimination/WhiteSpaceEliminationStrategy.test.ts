// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import { EqualWhitespaceEliminator } from './EqualWhitespaceEliminator.js';
import { ToAspectratioNodeExpander } from './ToAspectratioNodeExpander.js';
import { WhiteSpaceEliminationStrategy } from './WhiteSpaceEliminationStrategy.js';

const DECLARED = ['EQUAL_BETWEEN_STRUCTURES', 'TO_ASPECT_RATIO', 'NONE'] as const;

describe('WhiteSpaceEliminationStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(WhiteSpaceEliminationStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(WhiteSpaceEliminationStrategy.values()[2]).toBe(WhiteSpaceEliminationStrategy.NONE);
  });

  it('compareTo orders by ordinal', () => {
    expect(WhiteSpaceEliminationStrategy.NONE.compareTo(WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES)).toBe(
      2,
    );
    expect(WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES.compareTo(WhiteSpaceEliminationStrategy.NONE)).toBe(
      -2,
    );
    expect(
      WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES.compareTo(
        WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES,
      ),
    ).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(WhiteSpaceEliminationStrategy.valueOf(name)).toBe(WhiteSpaceEliminationStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => WhiteSpaceEliminationStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => WhiteSpaceEliminationStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.rectpacking.p3whitespaceelimination.WhiteSpaceEliminationStrategy.FOO',
    );
  });

  it('create() returns a new phase of the Java class for each call (Java `create()` switch)', () => {
    const first = WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES.create();
    expect(first).toBeInstanceOf(EqualWhitespaceEliminator);
    expect(first).not.toBeInstanceOf(ToAspectratioNodeExpander);
    expect(WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES.create()).not.toBe(first);
    expect(WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO.create()).toBeInstanceOf(ToAspectratioNodeExpander);
  });

  it('create() of NONE and of a value without a case returns null (Java `case NONE: default: return null`)', () => {
    expect(WhiteSpaceEliminationStrategy.NONE.create()).toBeNull();
    const forged = {} as WhiteSpaceEliminationStrategy;
    expect(WhiteSpaceEliminationStrategy.prototype.create.call(forged)).toBeNull();
  });

  it('is the type of the option the provider reads', () => {
    expect(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY.getDefault()).toBe(WhiteSpaceEliminationStrategy.NONE);
  });
});
