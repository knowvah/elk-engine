// SPDX-License-Identifier: EPL-2.0
import type { IHiddenRegion } from './IHiddenRegion.js';
import type { ISemanticRegion } from './ISemanticRegion.js';
import type { ISemanticRegionFinder } from './ISemanticRegionFinder.js';
import type { ITextSegment } from './ITextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ISequentialRegion.java */
export interface ISequentialRegion extends ITextSegment {
  immediatelyFollowing(): ISemanticRegionFinder;
  immediatelyPreceding(): ISemanticRegionFinder;
  getNextHiddenRegion(): IHiddenRegion | null;
  getNextSemanticRegion(): ISemanticRegion | null;
  getNextSequentialRegion(): ISequentialRegion | null;
  getPreviousHiddenRegion(): IHiddenRegion | null;
  getPreviousSemanticRegion(): ISemanticRegion | null;
  getPreviousSequentialRegion(): ISequentialRegion | null;
}
