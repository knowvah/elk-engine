// SPDX-License-Identifier: EPL-2.0
import type { ISequentialRegion } from './ISequentialRegion.js';
import type { ITextSegment } from './ITextSegment.js';

/**
 * The (possibly empty) gap between two semantic regions. `getParts`, `containsComment` and
 * `getAlternatingMergedSpaceAndComments` are not ported: the writer input has no comments or whitespace
 * parts (G2), so a hidden region never has parts (see `TextRegionAccessBuildingSequencer`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/IHiddenRegion.java
 */
export interface IHiddenRegion extends ISequentialRegion {
  isUndefined(): boolean;
  getMergedSpaces(): ITextSegment[];
}

/** Java `instanceof IHiddenRegion`. */
export function isHiddenRegion(value: unknown): value is IHiddenRegion {
  return typeof value === 'object' && value !== null && 'isUndefined' in value;
}
