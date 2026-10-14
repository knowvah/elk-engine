// SPDX-License-Identifier: EPL-2.0
import type { ITextSegment } from '../regionaccess/ITextSegment.js';

/**
 * The trace of one segment added to a {@link TextSegmentSet} (title and region), kept for conflict reports.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RegionTrace.java
 */
export class RegionTrace extends Error {
  private readonly region: ITextSegment;

  constructor(message: string, region: ITextSegment) {
    super(message);
    this.name = 'RegionTrace';
    this.region = region;
  }

  getRegion(): ITextSegment {
    return this.region;
  }
}
