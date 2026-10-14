// SPDX-License-Identifier: EPL-2.0
import type { IMerger } from '../IMerger.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionTrace } from './RegionTrace.js';
import { RegionTraceMissingException } from './RegionTraceMissingException.js';

/**
 * An ordered set of segments that detects overlaps. Not ported: `get`, `iteratorAfter`, `reverseIterable`
 * (they serve autowrap and `getLocalReplacementsReverse` only), `getTraces` (deprecated), `toString` (debug
 * printer). `IdentityHashMap` is a `Map` (identity keys).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/TextSegmentSet.java
 */
export abstract class TextSegmentSet<T> implements Iterable<T> {
  private readonly regionGetter: (t: T) => ITextSegment;
  private readonly titleGetter: (t: T) => string;
  private readonly traces: Map<T, RegionTrace> | null;

  protected constructor(region: (t: T) => ITextSegment, title: (t: T) => string, trace = true) {
    this.regionGetter = region;
    this.titleGetter = title;
    this.traces = trace ? new Map() : null;
  }

  /** Java `add(T)` / `add(T, IMerger)`: the merger is optional. */
  abstract add(segment: T, merger?: IMerger<T> | null): void;

  abstract [Symbol.iterator](): Iterator<T>;

  protected getRegion(t: T): ITextSegment {
    return this.regionGetter(t);
  }

  getRegionAccess(): (t: T) => ITextSegment {
    return this.regionGetter;
  }

  protected getTitle(t: T): string {
    return this.titleGetter(t);
  }

  protected handleConflict(conflicts: readonly T[], cause: Error | null): never {
    if (this.traces === null) {
      throw new RegionTraceMissingException(cause);
    }
    const causes: RegionTrace[] = [];
    for (const t of conflicts) {
      const exception = this.traces.get(t);
      if (exception !== undefined) causes.push(exception);
    }
    throw new ConflictingRegionsException('Conflicting Regions', cause, causes);
  }

  protected isConflictBetweenRegions(region1: ITextSegment, region2: ITextSegment): boolean {
    const offset1 = region1.getOffset();
    const length1 = region1.getLength();
    const offset2 = region2.getOffset();
    const length2 = region2.getLength();
    if (offset1 < offset2) {
      return offset1 + length1 > offset2;
    } else if (offset1 > offset2) {
      return offset2 + length2 > offset1;
    }
    return !((length1 === 0) !== (length2 === 0));
  }

  protected isConflict(t1: T, t2: T): boolean {
    return this.isConflictBetweenRegions(this.getRegion(t1), this.getRegion(t2));
  }

  protected trace(segment: T): void {
    if (this.traces !== null) {
      this.traces.set(segment, new RegionTrace(this.getTitle(segment), this.getRegion(segment)));
    }
  }
}
