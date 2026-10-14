// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { AbstractFormatter2 } from './AbstractFormatter2.js';
import type { FormatterRequest } from './FormatterRequest.js';
import type { HiddenRegionFormatterInit } from './IHiddenRegionFormatter.js';
import type { ITextReplacer } from './ITextReplacer.js';
import type { IHiddenRegion } from './regionaccess/IHiddenRegion.js';
import type { ISemanticRegion } from './regionaccess/ISemanticRegion.js';
import type { ITextReplacement } from './regionaccess/ITextReplacement.js';
import type { ITextSegment } from './regionaccess/ITextSegment.js';

/** Java `Pair<A, B>` as returned by `set`/`interior`. */
export type RegionPair<A, B> = readonly [A | null, B | null];

/**
 * The document the formatter writes its formatting into. The Java overloads on `ISemanticRegion` / `EObject`
 * (`append`, `prepend`, `surround`, and the two-argument `interior`) are told apart at run time. Not ported:
 * `withReplacerFilter`, `formatConditionally` and the sub-document types (`ElkGraphFormatter` uses none).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IFormattableDocument.java
 */
export interface IFormattableDocument {
  getRegion(): ITextSegment;
  getFormatter(): AbstractFormatter2;
  getRequest(): FormatterRequest;
  addReplacer(replacer: ITextReplacer): void;
  renderToTextReplacements(): ITextReplacement[];
  append<T extends ISemanticRegion | EObject>(appendAfter: T | null, initializer: HiddenRegionFormatterInit): T | null;
  prepend<T extends ISemanticRegion | EObject>(
    prependBefore: T | null,
    initializer: HiddenRegionFormatterInit,
  ): T | null;
  surround<T extends ISemanticRegion | EObject>(target: T | null, beforeAndAfter: HiddenRegionFormatterInit): T | null;
  set(hiddenRegion: IHiddenRegion | null, init: HiddenRegionFormatterInit): IHiddenRegion | null;
  setPair(
    first: IHiddenRegion | null,
    second: IHiddenRegion | null,
    init: HiddenRegionFormatterInit,
  ): RegionPair<IHiddenRegion, IHiddenRegion>;
  interior<T1 extends ISemanticRegion, T2 extends ISemanticRegion>(
    first: T1 | null,
    second: T2 | null,
    init: HiddenRegionFormatterInit,
  ): RegionPair<T1, T2>;
  interiorOfPair<T1 extends ISemanticRegion, T2 extends ISemanticRegion>(
    pair: RegionPair<T1, T2>,
    init: HiddenRegionFormatterInit,
  ): RegionPair<T1, T2>;
  interiorOfObject<T extends EObject>(object: T | null, init: HiddenRegionFormatterInit): T | null;
  format<T>(obj: T): T;
}
