// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ConflictingFormattingException } from '../ConflictingFormattingException.js';
import { HIGH_PRIORITY, LOW_PRIORITY } from '../IHiddenRegionFormatter.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import { FunctionFormatter } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { DoubleHiddenRegionFormatter } from './DoubleHiddenRegionFormatter.js';
import { HiddenRegionFormattingMerger } from './HiddenRegionFormattingMerger.js';
import { SingleHiddenRegionFormatter } from './SingleHiddenRegionFormatter.js';

// Expected values are hand-derived from SingleHiddenRegionFormatter.java 31-35 / DoubleHiddenRegionFormatter.java
// 33-40 (`autowrap()`), HiddenRegionFormatting.java 95-112 (`mergeValuesFrom`, autowrap merged after newLineMax and
// before noIndentation) and HiddenRegionFormattingMerger.java 32-47.
const formatter = new FunctionFormatter(() => {});
const fresh = (): IHiddenRegionFormatting => formatter.createHiddenRegionFormatting();
const withAutowrap = (value: number | null): IHiddenRegionFormatting => {
  const formatting = fresh();
  formatting.setAutowrap(value);
  return formatting;
};

describe('autowrap() of the hidden region formatters', () => {
  it.each([
    [null, 0],
    [-1, 0],
    [0, 0],
    [7, 7],
  ])('single: an autowrap of %s becomes %s (only an unset or negative trigger is replaced by 0)', (old, expected) => {
    const formatting = withAutowrap(old);
    new SingleHiddenRegionFormatter(formatting).autowrap();
    expect(formatting.getAutowrap()).toBe(expected);
  });

  it('double: each of both formattings is treated alike', () => {
    const first = withAutowrap(5);
    const second = withAutowrap(-3);
    new DoubleHiddenRegionFormatter(first, second).autowrap();
    expect([first.getAutowrap(), second.getAutowrap()]).toEqual([5, 0]);
    const third = withAutowrap(null);
    const fourth = withAutowrap(2);
    new DoubleHiddenRegionFormatter(third, fourth).autowrap();
    expect([third.getAutowrap(), fourth.getAutowrap()]).toEqual([0, 2]);
  });
});

describe('HiddenRegionFormatting autowrap merge', () => {
  it('starts unset, keeps a value only one side sets, and equal values', () => {
    expect(fresh().getAutowrap()).toBeNull();
    const a = fresh();
    a.mergeValuesFrom(withAutowrap(0));
    expect(a.getAutowrap()).toBe(0);
    const b = withAutowrap(0);
    b.mergeValuesFrom(fresh());
    expect(b.getAutowrap()).toBe(0);
    const c = withAutowrap(0);
    c.mergeValuesFrom(withAutowrap(0));
    expect(c.getAutowrap()).toBe(0);
  });

  it('throws for different values of equal priority, after merging space and new lines, before noIndentation', () => {
    const a = withAutowrap(0);
    const b = withAutowrap(3);
    b.setSpace(' ');
    b.setNewLinesMax(1);
    b.setNoIndentation(true);
    expect(() => a.mergeValuesFrom(b)).toThrow(ConflictingFormattingException);
    expect(() => a.mergeValuesFrom(b)).toThrow("Conflicting values for 'autowrap': '0' and '3'.");
    expect([a.getSpace(), a.getNewLineMax(), a.getNoIndentation(), a.getAutowrap()]).toEqual([' ', 1, null, 0]);
  });

  it('takes the value of the higher priority', () => {
    const a = withAutowrap(0);
    const high = withAutowrap(4);
    high.setPriority(HIGH_PRIORITY);
    a.mergeValuesFrom(high);
    expect(a.getAutowrap()).toBe(4);
    const b = withAutowrap(0);
    const low = withAutowrap(4);
    low.setPriority(LOW_PRIORITY);
    b.mergeValuesFrom(low);
    expect(b.getAutowrap()).toBe(0);
  });

  it('moves the autowrap of a new formatting into the existing one (two conflicts: the second is updated)', () => {
    const merger = new HiddenRegionFormattingMerger(formatter);
    const added = withAutowrap(0);
    const existing = fresh();
    existing.setSpace(' ');
    const merged = merger.merge([added, existing]);
    expect(merged).toBe(existing);
    expect([merged.getAutowrap(), merged.getSpace()]).toEqual([0, ' ']);
  });

  it('merges the autowrap of three formattings into a fresh one', () => {
    const merger = new HiddenRegionFormattingMerger(formatter);
    const space = fresh();
    space.setSpace('');
    const merged = merger.merge([withAutowrap(0), space, withAutowrap(0)]);
    expect([merged.getAutowrap(), merged.getSpace()]).toEqual([0, '']);
  });
});
