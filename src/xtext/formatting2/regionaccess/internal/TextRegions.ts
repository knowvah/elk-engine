// SPDX-License-Identifier: EPL-2.0
import type { ITextRegion } from '../ITextRegion.js';

function compare(o1: ITextRegion, o2: ITextRegion): number {
  const cmp1 = o1.getOffset() - o2.getOffset();
  if (cmp1 !== 0) return cmp1;
  const cmp2 = o1.getLength() - o2.getLength();
  if (cmp2 !== 0) return cmp2;
  return 0;
}

/**
 * Region utilities. `merge` and `expandToLines` are not ported (no caller in the formatter flow).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/TextRegions.java
 */
export class TextRegions {
  /** The regions of `r1` that have no region of equal offset and length in `r2`. */
  static difference<T extends ITextRegion>(r1: Iterable<T>, r2: Iterable<ITextRegion>): T[] {
    const regions1 = [...r1].sort(compare);
    const regions2 = [...r2].sort(compare);
    const missing: T[] = [];
    let i1 = 0;
    let i2 = 0;
    while (i1 < regions1.length && i2 < regions2.length) {
      const compareTo = compare(regions1[i1]!, regions2[i2]!);
      if (compareTo === 0) {
        i1++;
        i2++;
      } else if (compareTo < 1) {
        missing.push(regions1[i1]!);
        i1++;
      } else {
        i2++;
      }
    }
    while (i1 < regions1.length) {
      missing.push(regions1[i1]!);
      i1++;
    }
    return missing;
  }
}
