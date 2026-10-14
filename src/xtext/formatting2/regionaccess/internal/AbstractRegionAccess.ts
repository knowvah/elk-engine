// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import type { IEObjectRegion } from '../IEObjectRegion.js';
import type { IFormattedResource, ITextRegionAccess } from '../ITextRegionAccess.js';
import type { IHiddenRegion } from '../IHiddenRegion.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionFinder } from '../ISemanticRegionFinder.js';
import type { ISemanticRegionsFinder } from '../ISemanticRegionsFinder.js';
import type { ITextRegionExtensions } from '../ITextRegionExtensions.js';
import type { ITextSegment } from '../ITextSegment.js';
import type { AbstractEObjectRegion } from './AbstractEObjectRegion.js';
import { SemanticRegionNullFinder } from './SemanticRegionNullFinder.js';
import { TextRegionRewriter } from './TextRegionRewriter.js';

/**
 * Region access plus the extension methods. `regionForLineAtOffset`, `regionForOffset`, `getText` (line
 * regions) and `toString` (debug printer) are not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractRegionAccess.java
 */
export abstract class AbstractRegionAccess implements ITextRegionAccess, ITextRegionExtensions {
  abstract getResource(): IFormattedResource;
  abstract regionForDocument(): ITextSegment;
  abstract regionForRootEObject(): IEObjectRegion;
  abstract textForOffset(offset: number, length: number): string;
  abstract hasSyntaxError(): boolean;
  abstract regionForEObject(object: EObject): AbstractEObjectRegion | null;

  getExtensions(): ITextRegionExtensions {
    return this;
  }

  allSemanticRegions(object: EObject): Iterable<ISemanticRegion> {
    const region = this.regionForEObject(object);
    if (region === null) return [];
    return region.getAllSemanticRegions();
  }

  semanticRegions(object: EObject): Iterable<ISemanticRegion> {
    const region = this.regionForEObject(object);
    if (region === null) return [];
    return region.getSemanticRegions();
  }

  allRegionsFor(object: EObject): ISemanticRegionsFinder {
    const region = this.regionForEObject(object);
    if (region === null) return SemanticRegionNullFinder.INSTANCE;
    return region.getAllRegionsFor();
  }

  grammarElement(obj: EObject): string | null {
    const tokens = this.regionForEObject(obj);
    if (tokens === null) return null;
    return tokens.getGrammarElement();
  }

  getRewriter(): TextRegionRewriter {
    return new TextRegionRewriter(this);
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this;
  }

  immediatelyFollowing(owner: EObject): ISemanticRegionFinder {
    const region = this.regionForEObject(owner);
    if (region !== null) return region.immediatelyFollowing();
    return SemanticRegionNullFinder.INSTANCE;
  }

  immediatelyPreceding(owner: EObject): ISemanticRegionFinder {
    const region = this.regionForEObject(owner);
    if (region !== null) return region.immediatelyPreceding();
    return SemanticRegionNullFinder.INSTANCE;
  }

  isMultiline(object: EObject): boolean {
    const tokens = this.regionForEObject(object);
    if (tokens === null) return false;
    return tokens.isMultiline();
  }

  previousHiddenRegion(owner: EObject): IHiddenRegion | null {
    const tokens = this.regionForEObject(owner);
    if (tokens === null) return null;
    return tokens.getLeadingHiddenRegion();
  }

  regionFor(object: EObject): ISemanticRegionsFinder {
    const region = this.regionForEObject(object);
    if (region !== null) return region.getRegionFor();
    return SemanticRegionNullFinder.INSTANCE;
  }

  nextHiddenRegion(owner: EObject): IHiddenRegion | null {
    const tokens = this.regionForEObject(owner);
    if (tokens === null) return null;
    return tokens.getTrailingHiddenRegion();
  }
}
