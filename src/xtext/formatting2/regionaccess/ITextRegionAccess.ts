// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IEObjectRegion } from './IEObjectRegion.js';
import type { ITextRegionExtensions } from './ITextRegionExtensions.js';
import type { ITextRegionRewriter } from './ITextRegionRewriter.js';
import type { ITextSegment } from './ITextSegment.js';

/**
 * What `AbstractFormatter2.format` formats: Java `getResource()` returns an `XtextResource`; here it is the
 * minimal view the formatter needs (`contents.get(0)` is the model root, `AbstractFormatter2._format(XtextResource)`).
 */
export interface IFormattedResource {
  getContents(): readonly EObject[];
}

/**
 * The text produced by the writer and the regions in it. `regionForLineAtOffset` and `regionForOffset` are not
 * ported (line regions serve comment replacers/autowrap; nothing reaches `regionForOffset`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ITextRegionAccess.java
 */
export interface ITextRegionAccess {
  getExtensions(): ITextRegionExtensions;
  getResource(): IFormattedResource;
  getRewriter(): ITextRegionRewriter;
  regionForEObject(semanticElement: EObject): IEObjectRegion | null;
  regionForDocument(): ITextSegment;
  regionForRootEObject(): IEObjectRegion;
  textForOffset(offset: number, length: number): string;
  hasSyntaxError(): boolean;
}
