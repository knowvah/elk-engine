// SPDX-License-Identifier: EPL-2.0
import type { ITextRegion } from '../regionaccess/ITextRegion.js';

/** Orders by offset, then by length. @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RegionComparator.java */
export class RegionComparator<T> {
  private readonly regionAccess: (t: T) => ITextRegion;

  constructor(regionAccess: (t: T) => ITextRegion) {
    this.regionAccess = regionAccess;
  }

  getRegionAccess(): (t: T) => ITextRegion {
    return this.regionAccess;
  }

  compare(t1: T, t2: T): number {
    const o1 = this.regionAccess(t1);
    const o2 = this.regionAccess(t2);
    const cmp1 = o1.getOffset() - o2.getOffset();
    if (cmp1 !== 0) return cmp1;
    const cmp2 = o1.getLength() - o2.getLength();
    if (cmp2 !== 0) return cmp2;
    return 0;
  }
}
