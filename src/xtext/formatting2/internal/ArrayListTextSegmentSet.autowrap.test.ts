// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import { buildToyBlock } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { ArrayListTextSegmentSet } from './ArrayListTextSegmentSet.js';

// Expected values are hand-derived from ArrayListTextSegmentSet.java: iteratorAfter 128-143 (binary search + 1,
// an empty iterator for a non-member, then the live list from that index), reverseIterable 145-161.
interface Seg {
  readonly name: string;
  readonly region: ITextSegment;
}
const access = buildToyBlock([['a', '1']]).access;
const seg = (name: string, offset: number, length = 0): Seg => ({
  name,
  region: new TextSegment(access, offset, length),
});
const setOf = (...segments: Seg[]): ArrayListTextSegmentSet<Seg> => {
  const set = new ArrayListTextSegmentSet<Seg>(
    (s) => s.region,
    (s) => s.name,
  );
  for (const s of segments) set.add(s);
  return set;
};
const drain = (iterator: Iterator<Seg>): string[] => {
  const out: string[] = [];
  for (let next = iterator.next(); next.done !== true; next = iterator.next()) out.push(next.value.name);
  return out;
};

describe('ArrayListTextSegmentSet.iteratorAfter', () => {
  it('iterates the segments after a member', () => {
    const b = seg('b', 2);
    const set = setOf(seg('a', 0), b, seg('c', 4), seg('d', 6));
    expect(drain(set.iteratorAfter(b))).toEqual(['c', 'd']);
  });

  it('is empty after the last member', () => {
    const d = seg('d', 6);
    expect(drain(setOf(seg('a', 0), d).iteratorAfter(d))).toEqual([]);
  });

  it('is empty for a segment that is not in the set', () => {
    expect(drain(setOf(seg('a', 0), seg('c', 4)).iteratorAfter(seg('x', 2)))).toEqual([]);
  });

  it('finds the member by its region and reads the list live', () => {
    const set = setOf(seg('a', 0), seg('c', 4));
    const iterator = set.iteratorAfter(seg('same region as a', 0));
    set.add(seg('e', 8));
    expect(drain(iterator)).toEqual(['c', 'e']);
  });
});

describe('ArrayListTextSegmentSet.reverseIterable', () => {
  it('iterates from the last segment to the first, every time it is iterated', () => {
    const reversed = setOf(seg('a', 0), seg('b', 2), seg('c', 4)).reverseIterable();
    expect([...reversed].map((s) => s.name)).toEqual(['c', 'b', 'a']);
    expect([...reversed].map((s) => s.name)).toEqual(['c', 'b', 'a']);
  });

  it('is empty for an empty set', () => {
    expect([...setOf().reverseIterable()]).toEqual([]);
  });
});
