// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IEObjectRegion } from './IEObjectRegion.js';
import type { IHiddenRegion } from './IHiddenRegion.js';
import type { ISemanticRegion } from './ISemanticRegion.js';
import type { ISemanticRegionFinder } from './ISemanticRegionFinder.js';
import type { ISemanticRegionsFinder } from './ISemanticRegionsFinder.js';
import type { ITextRegionAccess } from './ITextRegionAccess.js';

/**
 * The Xtend extension methods of `AbstractFormatter2` (`node.regionFor...`). `grammarElement(obj)` returns the
 * id of the grammar element of the object's region.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ITextRegionExtensions.java
 */
export interface ITextRegionExtensions {
  allRegionsFor(semanticElement: EObject): ISemanticRegionsFinder;
  allSemanticRegions(semanticElement: EObject): Iterable<ISemanticRegion>;
  getTextRegionAccess(): ITextRegionAccess;
  grammarElement(semanticElement: EObject): string | null;
  immediatelyFollowing(semanticElement: EObject): ISemanticRegionFinder;
  immediatelyPreceding(semanticElement: EObject): ISemanticRegionFinder;
  isMultiline(semanticElement: EObject): boolean;
  nextHiddenRegion(semanticElement: EObject): IHiddenRegion | null;
  previousHiddenRegion(semanticElement: EObject): IHiddenRegion | null;
  regionFor(semanticElement: EObject): ISemanticRegionsFinder;
  regionForEObject(semanticElement: EObject): IEObjectRegion | null;
  semanticRegions(semanticElement: EObject): Iterable<ISemanticRegion>;
}
