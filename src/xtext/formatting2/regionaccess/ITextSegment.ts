// SPDX-License-Identifier: EPL-2.0
import type { ITextRegion } from './ITextRegion.js';
import type { ITextRegionAccess } from './ITextRegionAccess.js';
import type { ITextReplacement } from './ITextReplacement.js';

/**
 * A region of the text of an {@link ITextRegionAccess}. `getLineRegions`, `merge` and `ILineRegion` are not
 * ported: they serve comment replacers and autowrap only.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ITextSegment.java
 */
export interface ITextSegment extends ITextRegion {
  /** Java `Comparable.compareTo`. */
  compareTo(other: ITextSegment): number;
  getEndOffset(): number;
  getLineCount(): number;
  getText(): string;
  getTextRegionAccess(): ITextRegionAccess;
  isMultiline(): boolean;
  replaceWith(text: string): ITextReplacement;
}
