// SPDX-License-Identifier: EPL-2.0
import type { IAstRegion } from './IAstRegion.js';
import type { IHiddenRegion } from './IHiddenRegion.js';
import type { ISemanticRegion } from './ISemanticRegion.js';
import type { ISemanticRegionsFinder } from './ISemanticRegionsFinder.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/IEObjectRegion.java */
export interface IEObjectRegion extends IAstRegion {
  /** Narrowed from the Java signature: the string-built region access sets both hidden regions on creation. */
  getPreviousHiddenRegion(): IHiddenRegion;
  getNextHiddenRegion(): IHiddenRegion;
  getAllRegionsFor(): ISemanticRegionsFinder;
  getAllSemanticRegions(): Iterable<ISemanticRegion>;
  getAstRegions(): Iterable<IAstRegion>;
  getRegionFor(): ISemanticRegionsFinder;
  getSemanticRegions(): Iterable<ISemanticRegion>;
}
