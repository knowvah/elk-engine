// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { InternalNodeModelUtils as U } from './InternalNodeModelUtils.js';

describe('InternalNodeModelUtils.computeLineBreaks', () => {
  it('records the offset of each LF', () => {
    expect(U.computeLineBreaks('a\nb\n')).toEqual([1, 3]);
  });
  it('records a lone CR', () => {
    expect(U.computeLineBreaks('a\rb\rc')).toEqual([1, 3]);
  });
  it('counts CRLF as one break at the CR offset', () => {
    expect(U.computeLineBreaks('a\r\nb')).toEqual([1]);
  });
  it('records a CR at the end of the text', () => {
    expect(U.computeLineBreaks('ab\r')).toEqual([2]);
  });
  it('handles mixed breaks, LFCR as two', () => {
    expect(U.computeLineBreaks('a\r\nb\rc\nd\n\re')).toEqual([1, 4, 6, 8, 9]);
  });
  it('is empty without breaks', () => {
    expect(U.computeLineBreaks('')).toEqual([]);
    expect(U.computeLineBreaks('abc')).toEqual([]);
  });
});

describe('InternalNodeModelUtils.getLine', () => {
  const line = (text: string, offset: number): number => U.getLine(text, U.computeLineBreaks(text), offset);

  it('puts a break on the line it ends (its index + 1) and the next offset on the following line', () => {
    expect(line('a\nb', 0)).toBe(1);
    expect(line('a\nb', 1)).toBe(1);
    expect(line('a\nb', 2)).toBe(2);
  });
  it('counts a lone CR as a break', () => {
    expect(line('a\rb', 2)).toBe(2);
    expect(line('a\rb\rc', 4)).toBe(3);
  });
  it('keeps the LF of CRLF on the line of the CR', () => {
    const text = 'a\r\nb';
    expect(line(text, 1)).toBe(1);
    expect(line(text, 2)).toBe(1);
    expect(line(text, 3)).toBe(2);
  });
  it('answers the offset after a trailing CR as the next line', () => {
    expect(line('ab\r', 3)).toBe(2);
  });
  it('rejects offsets outside the text', () => {
    expect(() => line('ab', 3)).toThrow(RangeError);
    expect(() => line('ab', -1)).toThrow(RangeError);
  });
});
