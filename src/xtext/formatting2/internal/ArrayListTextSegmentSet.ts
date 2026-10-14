// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { IMerger } from '../IMerger.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionComparator } from './RegionComparator.js';
import { TextSegmentSet } from './TextSegmentSet.js';

/** Wraps a non-`Error` throwable so that it can be the cause of a conflict. */
function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

/**
 * `Collections.binarySearch(list, key, c)` per its Javadoc: the index of a match, or `-(insertion point) - 1`.
 */
function binarySearch<T>(list: readonly T[], key: T, comparator: RegionComparator<T>): number {
  let low = 0;
  let high = list.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = comparator.compare(list[mid]!, key);
    if (cmp < 0) {
      low = mid + 1;
    } else if (cmp > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/ArrayListTextSegmentSet.java */
export class ArrayListTextSegmentSet<T> extends TextSegmentSet<T> {
  private readonly contents: T[] = [];

  constructor(region: (t: T) => ITextSegment, title: (t: T) => string, trace = true) {
    super(region, title, trace);
  }

  add(segment: T, merger: IMerger<T> | null = null): void {
    if (segment === null || segment === undefined) throw new IllegalArgumentException('segment must not be null');
    this.trace(segment);
    if (this.contents.length === 0) {
      this.contents.push(segment);
    } else {
      const searchResult = binarySearch(this.contents, segment, new RegionComparator(this.getRegionAccess()));
      if (searchResult >= 0) {
        this.replaceExistingEntry(segment, searchResult, merger);
      } else {
        this.insertAtIndex(segment, -searchResult - 1, merger);
      }
    }
  }

  /** The indices of the contiguous conflicting neighbours, `[low, high]` (exclusive bounds), plus the items. */
  private collectConflicts(segment: T, newIndex: number): { conflicting: T[]; low: number; high: number } {
    const conflicting: T[] = [];
    let low = newIndex;
    while (--low >= 0) {
      const item = this.contents[low]!;
      if (!this.isConflict(item, segment)) break;
      conflicting.push(item);
    }
    let high = newIndex - 1;
    while (++high < this.contents.length) {
      const item = this.contents[high]!;
      if (!this.isConflict(item, segment)) break;
      conflicting.push(item);
    }
    return { conflicting, low, high };
  }

  protected insertAtIndex(segment: T, newIndex: number, merger: IMerger<T> | null): void {
    const { conflicting, low, high } = this.collectConflicts(segment, newIndex);
    if (conflicting.length === 0) {
      this.trace(segment);
      this.contents.splice(newIndex, 0, segment);
      return;
    }
    conflicting.unshift(segment);
    try {
      const merged = merger !== null ? merger.merge(conflicting) : null;
      if (merged !== null) {
        this.contents.splice(low + 1, high - 1 - low, merged);
        this.trace(merged);
      } else {
        this.resolveUnmergeable(segment, conflicting, low, high);
      }
    } catch (e) {
      if (e instanceof ConflictingRegionsException) throw e;
      this.handleConflict(conflicting, asError(e));
    }
  }

  /** The no-merge arm of `insertAtIndex`: the longer segment replaces shorter conflicting ones, then conflict. */
  private resolveUnmergeable(segment: T, conflicting: readonly T[], low: number, high: number): void {
    const segmentLength = this.getRegion(segment).getLength();
    let totalLength = 0;
    for (let i = 1; i < conflicting.length; i++) {
      totalLength += this.getRegion(conflicting[i]!).getLength();
    }
    if (segmentLength >= totalLength) {
      this.contents.splice(low + 1, high - 1 - low);
    }
    if (segmentLength > totalLength) {
      this.trace(segment);
      this.contents.splice(low + 1, 0, segment);
    }
    this.handleConflict(conflicting, null);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.contents[Symbol.iterator]();
  }

  protected replaceExistingEntry(segment: T, index: number, merger: IMerger<T> | null): void {
    const existing = this.contents[index]!;
    const conflicting = [segment, existing];
    try {
      const merged = merger !== null ? merger.merge(conflicting) : null;
      if (merged !== null) {
        this.trace(merged);
        this.contents[index] = merged;
      } else {
        this.contents.splice(index, 1);
        this.handleConflict(conflicting, null);
      }
    } catch (e) {
      if (e instanceof ConflictingRegionsException) throw e;
      this.handleConflict(conflicting, asError(e));
    }
  }
}
