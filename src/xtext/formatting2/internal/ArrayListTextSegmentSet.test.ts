// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { IMerger } from '../IMerger.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { TextSegment } from '../regionaccess/internal/TextSegment.js';
import { buildToyBlock } from '../../../../test/helpers/xtext/ToyBlockFixture.js';
import { ArrayListTextSegmentSet } from './ArrayListTextSegmentSet.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionComparator } from './RegionComparator.js';
import { RegionTraceMissingException } from './RegionTraceMissingException.js';

// Expected values are hand-derived from ArrayListTextSegmentSet.java 47-182 and TextSegmentSet.java 81-103.
interface Seg {
  readonly name: string;
  readonly region: ITextSegment;
}
const access = buildToyBlock([['a', '1']]).access;
const seg = (name: string, offset: number, length: number): Seg => ({
  name,
  region: new TextSegment(access, offset, length),
});
const setOf = (trace = true): ArrayListTextSegmentSet<Seg> =>
  new ArrayListTextSegmentSet<Seg>(
    (s) => s.region,
    (s) => s.name,
    trace,
  );
const names = (set: ArrayListTextSegmentSet<Seg>): string[] => [...set].map((s) => s.name);
/** Merges every conflicting segment into one covering all of them, named by joining the names. */
const covering: IMerger<Seg> = {
  merge(conflicting) {
    const start = Math.min(...conflicting.map((s) => s.region.getOffset()));
    const end = Math.max(...conflicting.map((s) => s.region.getEndOffset()));
    return seg(conflicting.map((s) => s.name).join('+'), start, end - start);
  },
};
const refusing: IMerger<Seg> = { merge: () => null };
const capture = (action: () => void): unknown => {
  try {
    action();
    return null;
  } catch (e) {
    return e;
  }
};

describe('ArrayListTextSegmentSet', () => {
  it('keeps non-overlapping segments sorted by offset, then length', () => {
    const set = setOf();
    set.add(seg('c', 8, 2));
    set.add(seg('a', 0, 2));
    set.add(seg('b', 4, 2));
    expect(names(set)).toEqual(['a', 'b', 'c']);
  });

  it('puts an empty segment before a non-empty one at the same offset without a conflict', () => {
    const set = setOf();
    set.add(seg('long', 5, 3));
    set.add(seg('empty', 5, 0));
    expect(names(set)).toEqual(['empty', 'long']);
  });

  it('merges two segments of equal region in place', () => {
    const set = setOf();
    set.add(seg('first', 3, 2), covering);
    set.add(seg('second', 3, 2), covering);
    expect(names(set)).toEqual(['second+first']);
  });

  it('merges several overlapping neighbours into one, newest first', () => {
    const set = setOf();
    set.add(seg('a', 0, 5), covering);
    set.add(seg('b', 6, 5), covering);
    set.add(seg('c', 3, 4), covering);
    expect(names(set)).toEqual(['c+a+b']);
    expect([...set][0]!.region.getOffset()).toBe(0);
    expect([...set][0]!.region.getLength()).toBe(11);
  });

  it('drops the existing segment and reports a conflict when equal regions cannot be merged', () => {
    const set = setOf();
    set.add(seg('first', 3, 2), refusing);
    const error = capture(() => set.add(seg('second', 3, 2), refusing)) as ConflictingRegionsException;
    expect(error).toBeInstanceOf(ConflictingRegionsException);
    expect(error.message).toBe('Conflicting Regions.\nsecond [3,2]\nfirst [3,2]');
    expect(error.getTraces().map((t) => t.message)).toEqual(['second', 'first']);
    expect(names(set)).toEqual([]);
  });

  it('asks for a trace first when tracing is off', () => {
    const set = setOf(false);
    set.add(seg('first', 3, 2), refusing);
    const error = capture(() => set.add(seg('second', 3, 2), refusing));
    // as in Java the no-trace exception thrown inside the try block is itself wrapped by the catch (Exception) arm
    expect(error).toBeInstanceOf(RegionTraceMissingException);
    expect((error as Error).message).toBe('RegionTraceMissingException');
    const inner = (error as Error).cause as Error;
    expect(inner).toBeInstanceOf(RegionTraceMissingException);
    expect([inner.message, inner.cause]).toEqual(['', undefined]);
  });

  it('wraps a merger failure as the cause of the conflict', () => {
    const failing: IMerger<Seg> = {
      merge: () => {
        throw new Error('merge failed');
      },
    };
    const set = setOf();
    set.add(seg('first', 3, 2), failing);
    const error = capture(() => set.add(seg('second', 3, 2), failing)) as ConflictingRegionsException;
    expect(error).toBeInstanceOf(ConflictingRegionsException);
    expect((error.cause as Error).message).toBe('merge failed');
    expect(names(set)).toEqual(['first']);
    const untraced = setOf(false);
    untraced.add(seg('first', 3, 2), failing);
    const missing = capture(() => untraced.add(seg('second', 3, 2), failing)) as RegionTraceMissingException;
    expect(missing).toBeInstanceOf(RegionTraceMissingException);
    expect(missing.message).toBe('Error: merge failed');
    expect((missing.cause as Error).message).toBe('merge failed');
  });

  it('wraps a thrown non-Error as the cause of the conflict', () => {
    const failing: IMerger<Seg> = {
      merge: () => {
        throw 'odd';
      },
    };
    const set = setOf();
    set.add(seg('first', 0, 2), failing);
    const error = capture(() => set.add(seg('second', 1, 2), failing)) as ConflictingRegionsException;
    expect((error.cause as Error).message).toBe('odd');
  });

  it('rethrows a ConflictingRegionsException of the merger unchanged', () => {
    const original = new ConflictingRegionsException('own', null, []);
    const rethrowing: IMerger<Seg> = {
      merge: () => {
        throw original;
      },
    };
    const set = setOf();
    set.add(seg('first', 0, 2), rethrowing);
    expect(capture(() => set.add(seg('second', 0, 2), rethrowing))).toBe(original);
    const other = setOf();
    other.add(seg('first', 0, 4), rethrowing);
    expect(capture(() => other.add(seg('second', 2, 4), rethrowing))).toBe(original);
  });

  it('removes a shorter overlapped segment and keeps the longer new one when merging is refused', () => {
    const set = setOf();
    set.add(seg('a', 0, 5), refusing);
    expect(capture(() => set.add(seg('b', 3, 10), refusing))).toBeInstanceOf(ConflictingRegionsException);
    expect(names(set)).toEqual(['b']);
  });

  it('removes both when the lengths are equal, and keeps the existing one when the new one is shorter', () => {
    const equal = setOf();
    equal.add(seg('a', 0, 5), refusing);
    expect(capture(() => equal.add(seg('b', 3, 5), refusing))).toBeInstanceOf(ConflictingRegionsException);
    expect(names(equal)).toEqual([]);

    const shorter = setOf();
    shorter.add(seg('a', 0, 10), refusing);
    expect(capture(() => shorter.add(seg('b', 3, 2), refusing))).toBeInstanceOf(ConflictingRegionsException);
    expect(names(shorter)).toEqual(['a']);
  });

  it('treats overlap without a merger as an unmergeable conflict', () => {
    const set = setOf();
    set.add(seg('a', 0, 5));
    expect(capture(() => set.add(seg('b', 2, 5)))).toBeInstanceOf(ConflictingRegionsException);
  });

  it('rejects a null segment', () => {
    expect(() => setOf().add(null as never)).toThrow(IllegalArgumentException);
  });

  it('exposes the region getter', () => {
    const set = setOf();
    const s = seg('a', 1, 1);
    expect(set.getRegionAccess()(s)).toBe(s.region);
    expect(new RegionComparator(set.getRegionAccess()).compare(seg('x', 1, 2), seg('y', 1, 1))).toBe(1);
    expect(new RegionComparator(set.getRegionAccess()).getRegionAccess()).toBe(set.getRegionAccess());
  });
});
