// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ConflictingFormattingException } from '../ConflictingFormattingException.js';
import { HIGH_PRIORITY, LOW_PRIORITY, NORMAL_PRIORITY } from '../IHiddenRegionFormatter.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import { FunctionFormatter } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { DoubleHiddenRegionFormatter } from './DoubleHiddenRegionFormatter.js';
import { HiddenRegionFormattingMerger } from './HiddenRegionFormattingMerger.js';
import { SingleHiddenRegionFormatter } from './SingleHiddenRegionFormatter.js';

// Expected values are hand-derived from HiddenRegionFormatting.java 83-131 and HiddenRegionFormattingMerger.java 32-47.
const formatter = new FunctionFormatter(() => {});
const fresh = (): IHiddenRegionFormatting => formatter.createHiddenRegionFormatting();

describe('HiddenRegionFormatting.mergeValuesFrom', () => {
  it('keeps a property that only one side sets, and equal values', () => {
    const a = fresh();
    a.setSpace(' ');
    a.setNewLinesMin(1);
    const b = fresh();
    b.setSpace(' ');
    b.setNewLinesDefault(2);
    b.setNewLinesMax(3);
    b.setNoIndentation(true);
    a.mergeValuesFrom(b);
    expect([a.getSpace(), a.getNewLineMin(), a.getNewLineDefault(), a.getNewLineMax(), a.getNoIndentation()]).toEqual([
      ' ',
      1,
      2,
      3,
      true,
    ]);
    expect(a.getPriority()).toBe(NORMAL_PRIORITY);
  });

  it('leaves unset properties unset', () => {
    const a = fresh();
    a.mergeValuesFrom(fresh());
    expect([a.getSpace(), a.getNewLineMin(), a.getNoIndentation(), a.getIndentationIncrease()]).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it.each([
    ['space', (f: IHiddenRegionFormatting, v: number) => f.setSpace(v === 1 ? ' ' : ''), "' ' and ''"],
    ['newLineMin', (f: IHiddenRegionFormatting, v: number) => f.setNewLinesMin(v), "'1' and '2'"],
    ['newLineDefault', (f: IHiddenRegionFormatting, v: number) => f.setNewLinesDefault(v), "'1' and '2'"],
    ['newLineMax', (f: IHiddenRegionFormatting, v: number) => f.setNewLinesMax(v), "'1' and '2'"],
    ['noIndentation', (f: IHiddenRegionFormatting, v: number) => f.setNoIndentation(v === 1), "'true' and 'false'"],
  ])('throws for different %s values of equal priority', (name, set, values) => {
    const a = fresh();
    set(a, 1);
    const b = fresh();
    set(b, 2);
    expect(() => a.mergeValuesFrom(b)).toThrow(ConflictingFormattingException);
    expect(() => a.mergeValuesFrom(b)).toThrow(`Conflicting values for '${name}': ${values}.`);
  });

  it('has merged the earlier properties when a later one conflicts (no rollback)', () => {
    const a = fresh();
    a.setNewLinesMin(1);
    const b = fresh();
    b.setSpace(' ');
    b.setNewLinesMin(2);
    expect(() => a.mergeValuesFrom(b)).toThrow("Conflicting values for 'newLineMin': '1' and '2'.");
    expect(a.getSpace()).toBe(' ');
  });

  it('lets the higher priority win whichever side holds it, and keeps that priority', () => {
    const high = fresh();
    high.setSpace(' ');
    high.setPriority(HIGH_PRIORITY);
    const normal = fresh();
    normal.setSpace('');
    high.mergeValuesFrom(normal);
    expect([high.getSpace(), high.getPriority()]).toEqual([' ', HIGH_PRIORITY]);

    const normal2 = fresh();
    normal2.setSpace('');
    const high2 = fresh();
    high2.setSpace(' ');
    high2.setPriority(HIGH_PRIORITY);
    normal2.mergeValuesFrom(high2);
    expect([normal2.getSpace(), normal2.getPriority()]).toEqual([' ', HIGH_PRIORITY]);
  });

  it('lets the normal priority win over the low priority', () => {
    const low = fresh();
    low.setSpace('');
    low.setPriority(LOW_PRIORITY);
    const normal = fresh();
    normal.setSpace(' ');
    low.mergeValuesFrom(normal);
    expect([low.getSpace(), low.getPriority()]).toEqual([' ', NORMAL_PRIORITY]);
  });

  it('adds up the indentation increase and decrease', () => {
    const a = fresh();
    a.setIndentationIncrease(1);
    a.setIndentationDecrease(null);
    const b = fresh();
    b.setIndentationIncrease(2);
    b.setIndentationDecrease(2);
    a.mergeValuesFrom(b);
    expect([a.getIndentationIncrease(), a.getIndentationDecrease()]).toEqual([3, 2]);
    const c = fresh();
    c.setIndentationDecrease(5);
    a.mergeValuesFrom(c);
    expect([a.getIndentationIncrease(), a.getIndentationDecrease()]).toEqual([3, 7]);
    const d = fresh();
    d.mergeValuesFrom(a);
    expect([d.getIndentationIncrease(), d.getIndentationDecrease()]).toEqual([3, 7]);
  });
});

describe('HiddenRegionFormattingMerger', () => {
  const merger = new HiddenRegionFormattingMerger(formatter);

  it('merges two formattings into the second one', () => {
    const first = fresh();
    first.setSpace(' ');
    const second = fresh();
    second.setNewLinesMin(1);
    const result = merger.merge([first, second]);
    expect(result).toBe(second);
    expect([second.getSpace(), second.getNewLineMin()]).toEqual([' ', 1]);
    expect(first.getNewLineMin()).toBeNull();
  });

  it('merges three formattings into a new one, last to first', () => {
    const x = fresh();
    const y = fresh();
    y.setSpace('');
    y.setPriority(HIGH_PRIORITY);
    const z = fresh();
    z.setSpace(' ');
    const result = merger.merge([x, y, z]);
    expect(result).not.toBe(x);
    expect([result.getSpace(), result.getPriority()]).toEqual(['', HIGH_PRIORITY]);
    expect([x.getSpace(), y.getSpace(), z.getSpace()]).toEqual([null, '', ' ']);
  });

  it('merges a single formatting into a new copy', () => {
    const only = fresh();
    only.setNewLinesMax(4);
    const result = merger.merge([only]);
    expect(result).not.toBe(only);
    expect(result.getNewLineMax()).toBe(4);
  });
});

describe('hidden region formatters', () => {
  it('SingleHiddenRegionFormatter sets one formatting', () => {
    const f = fresh();
    const single = new SingleHiddenRegionFormatter(f);
    single.oneSpace();
    expect(f.getSpace()).toBe(' ');
    single.noSpace();
    expect(f.getSpace()).toBe('');
    single.setSpace('xx');
    expect(f.getSpace()).toBe('xx');
    single.newLine();
    expect([f.getNewLineMin(), f.getNewLineDefault(), f.getNewLineMax()]).toEqual([1, 1, 1]);
    single.setNewLines(2);
    expect([f.getNewLineMin(), f.getNewLineDefault(), f.getNewLineMax()]).toEqual([2, 2, 2]);
    single.setNewLines(0, 1, 2);
    expect([f.getNewLineMin(), f.getNewLineDefault(), f.getNewLineMax()]).toEqual([0, 1, 2]);
    single.highPriority();
    expect(f.getPriority()).toBe(HIGH_PRIORITY);
    single.lowPriority();
    expect(f.getPriority()).toBe(LOW_PRIORITY);
    single.setPriority(5);
    expect(f.getPriority()).toBe(5);
    single.noIndentation();
    expect(f.getNoIndentation()).toBe(true);
    single.indent();
    single.indent();
    expect([f.getIndentationIncrease(), f.getIndentationDecrease()]).toEqual([2, 2]);
  });

  it('DoubleHiddenRegionFormatter increases the first and decreases the second indentation', () => {
    const first = fresh();
    const second = fresh();
    const both = new DoubleHiddenRegionFormatter(first, second);
    both.indent();
    both.indent();
    expect([first.getIndentationIncrease(), first.getIndentationDecrease()]).toEqual([2, null]);
    expect([second.getIndentationIncrease(), second.getIndentationDecrease()]).toEqual([null, 2]);
  });

  it('DoubleHiddenRegionFormatter applies every other command to both formattings', () => {
    const first = fresh();
    const second = fresh();
    const both = new DoubleHiddenRegionFormatter(first, second);
    both.oneSpace();
    both.setNewLines(1, 1, 2);
    both.highPriority();
    both.noIndentation();
    for (const f of [first, second]) {
      expect([f.getSpace(), f.getNewLineMin(), f.getNewLineDefault(), f.getNewLineMax()]).toEqual([' ', 1, 1, 2]);
      expect([f.getPriority(), f.getNoIndentation()]).toEqual([HIGH_PRIORITY, true]);
    }
  });
});
