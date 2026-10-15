// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';

/**
 * The trace of one segment added to a {@link TextSegmentSet} (title and region), kept for conflict reports.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/RegionTrace.java
 */
export class RegionTrace extends RuntimeException {
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
