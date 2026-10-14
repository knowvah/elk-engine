// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { FormatterRequest } from './FormatterRequest.js';
import type { IFormattableDocument } from './IFormattableDocument.js';
import type { IFormatter2 } from './IFormatter2.js';
import type { IHiddenRegionFormatter } from './IHiddenRegionFormatter.js';
import type { IHiddenRegionFormatting } from './IHiddenRegionFormatting.js';
import type { IMerger } from './IMerger.js';
import type { ITextReplacer } from './ITextReplacer.js';
import type { ITextReplacerContext } from './ITextReplacerContext.js';
import { DoubleHiddenRegionFormatter } from './internal/DoubleHiddenRegionFormatter.js';
import { HiddenRegionFormatting } from './internal/HiddenRegionFormatting.js';
import { HiddenRegionFormattingMerger } from './internal/HiddenRegionFormattingMerger.js';
import { HiddenRegionReplacer } from './internal/HiddenRegionReplacer.js';
import { RegionTraceMissingException } from './internal/RegionTraceMissingException.js';
import { RootDocument } from './internal/RootDocument.js';
import { SingleHiddenRegionFormatter } from './internal/SingleHiddenRegionFormatter.js';
import { TextReplacerContext } from './internal/TextReplacerContext.js';
import { TextReplacerMerger } from './internal/TextReplacerMerger.js';
import { WhitespaceReplacer } from './internal/WhitespaceReplacer.js';
import type { ITypedPreferenceValues } from './preferences/ITypedPreferenceValues.js';
import type { TypedPreferenceKey } from './preferences/TypedPreferenceKey.js';
import { isHiddenRegion, type IHiddenRegion } from './regionaccess/IHiddenRegion.js';
import type { IFormattedResource, ITextRegionAccess } from './regionaccess/ITextRegionAccess.js';
import type { ITextRegionExtensions } from './regionaccess/ITextRegionExtensions.js';
import type { ITextReplacement } from './regionaccess/ITextReplacement.js';
import type { ITextSegment } from './regionaccess/ITextSegment.js';
import { TextRegions } from './regionaccess/internal/TextRegions.js';

const NO_SPACE = '';
const SINGLE_SPACE = ' ';

/** Java `obj instanceof XtextResource` for the minimal resource view the formatter walks. */
export function isFormattedResource(obj: unknown): obj is IFormattedResource {
  return typeof obj === 'object' && obj !== null && 'getContents' in obj;
}

/**
 * Base of every `formatting2` formatter (`ElkGraphFormatter`, T21).
 *
 * The Xtend `dispatch format(...)` methods of a subclass become one `abstract format(obj, document)` that routes
 * on the runtime type; its fallbacks are `_formatObject` (the `_format(EObject)` default: format the contents),
 * `_formatResource` (`_format(XtextResource)`: format the first content) and nothing for any other object
 * (`_format(Object)`, `_format(Void)`). Not ported: `createCommentReplacer`, `createFormattableSubDocument`
 * (comments and sub-documents), the deprecated `initalize`, and the non-empty arms of
 * `isInRequestedRange` (lines 354-373, the request has no regions: `Serializer.java:150-155`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/AbstractFormatter2.java
 */
export abstract class AbstractFormatter2 implements IFormatter2 {
  private request: FormatterRequest | null = null;
  private extensions: ITextRegionExtensions | null = null;

  /** Java `@Extension protected ITextRegionExtensions textRegionExtensions` (`node.regionFor...`). */
  protected get textRegionExtensions(): ITextRegionExtensions {
    if (this.extensions === null) throw new IllegalStateException('the formatter is not formatting');
    return this.extensions;
  }

  protected _formatObject(obj: EObject, document: IFormattableDocument): void {
    for (const child of obj.eContents()) {
      document.format(child);
    }
  }

  protected _formatResource(resource: IFormattedResource, document: IFormattableDocument): void {
    const contents = resource.getContents();
    if (contents.length > 0) {
      document.format(contents[0]);
    }
  }

  createFormattableRootDocument(): IFormattableDocument {
    return new RootDocument(this);
  }

  createHiddenRegionFormatter(formatting: IHiddenRegionFormatting): IHiddenRegionFormatter;
  createHiddenRegionFormatter(f1: IHiddenRegionFormatting, f2: IHiddenRegionFormatting): IHiddenRegionFormatter;
  createHiddenRegionFormatter(f1: IHiddenRegionFormatting, f2?: IHiddenRegionFormatting): IHiddenRegionFormatter {
    return f2 === undefined ? new SingleHiddenRegionFormatter(f1) : new DoubleHiddenRegionFormatter(f1, f2);
  }

  createHiddenRegionFormatting(): IHiddenRegionFormatting {
    return new HiddenRegionFormatting(this);
  }

  createHiddenRegionFormattingMerger(): IMerger<IHiddenRegionFormatting> {
    return new HiddenRegionFormattingMerger(this);
  }

  createHiddenRegionReplacer(region: IHiddenRegion, formatting: IHiddenRegionFormatting): ITextReplacer {
    return new HiddenRegionReplacer(region, formatting);
  }

  createTextReplacerContext(document: IFormattableDocument): ITextReplacerContext {
    return new TextReplacerContext(document);
  }

  createTextReplacerMerger(): IMerger<ITextReplacer> {
    return new TextReplacerMerger(this);
  }

  createWhitespaceReplacer(hiddens: ITextSegment, formatting: IHiddenRegionFormatting): ITextReplacer {
    return new WhitespaceReplacer(hiddens, formatting);
  }

  /** `final` in Java, named `format` there: `format(FormatterRequest)` 271-287. */
  formatRequest(request: FormatterRequest): ITextReplacement[] {
    try {
      this.initialize(request);
      const resource = request.getTextRegionAccess().getResource();
      let document = this.createFormattableRootDocument();
      try {
        this.format(resource, document);
      } catch (e) {
        if (!(e instanceof RegionTraceMissingException)) throw e;
        document = this.handleTraceMissing(document);
      }
      const rendered = document.renderToTextReplacements();
      return this.postProcess(rendered);
    } finally {
      this.reset();
    }
  }

  /**
   * `abstract format(Object, IFormattableDocument)`: the Xtend dispatch of the subclass. The Java overload
   * `format(FormatterRequest)` of the same name is {@link formatRequest} here (a subclass cannot override one
   * overload of a TypeScript method).
   */
  abstract format(obj: unknown, document: IFormattableDocument): void;

  /**
   * 289-298: the first conflict had no trace; format again with debug tracing so that the conflict report has
   * the traces. If tracing was already on, the problematic document is kept.
   */
  protected handleTraceMissing(problematic: IFormattableDocument): IFormattableDocument {
    const request = this.getRequest();
    if (request.isEnableDebugTracing()) {
      return problematic;
    }
    request.setEnableDebugTracing(true);
    const resource = request.getTextRegionAccess().getResource();
    const document = this.createFormattableRootDocument();
    this.format(resource, document);
    return document;
  }

  getPreference<T>(key: TypedPreferenceKey<T>): T {
    const value = this.getRequest().getPreferences().getTypedPreference(key);
    if (value === null) throw new IllegalStateException(`no value or default for ${key.getId()}`);
    return value;
  }

  getPreferences(): ITypedPreferenceValues {
    return this.getRequest().getPreferences();
  }

  getRequest(): FormatterRequest {
    if (this.request === null) throw new IllegalStateException('the formatter is not formatting');
    return this.request;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.getRequest().getTextRegionAccess();
  }

  protected initialize(request: FormatterRequest): void {
    this.request = request;
    this.extensions = request.getTextRegionAccess().getExtensions();
  }

  /**
   * Lines 354-373 (both overloads) with the empty-regions arm only: the writer's request never has regions
   * (`Serializer.java:150-155`), so every object and offset range is in the requested range.
   */
  protected isInRequestedRange(_obj: EObject): boolean {
    return true;
  }

  /** Lines 385-411: the undefined hidden regions that nothing formatted get one space, or none at the ends. */
  protected postProcess(replacements: ITextReplacement[]): ITextReplacement[] {
    const expected: ITextSegment[] = [];
    let current: IHiddenRegion | null = this.getTextRegionAccess().regionForRootEObject().getPreviousHiddenRegion();
    while (current !== null) {
      // isInRequestedRange(offset, endOffset): empty-regions arm
      if (current.isUndefined()) expected.push(...current.getMergedSpaces());
      current = current.getNextHiddenRegion();
    }
    if (expected.length === 0) return replacements;
    const missing = TextRegions.difference(expected, replacements);
    if (missing.length === 0) return replacements;
    const result = [...replacements];
    for (const seg of missing) {
      // a merged space of a part-less hidden region is the hidden region itself (no IHiddenRegionPart exists)
      const h = isHiddenRegion(seg) ? seg : null;
      if (h !== null && (h.getNextSemanticRegion() === null || h.getPreviousSemanticRegion() === null)) {
        result.push(seg.replaceWith(NO_SPACE));
      } else {
        result.push(seg.replaceWith(SINGLE_SPACE));
      }
    }
    return result;
  }

  protected reset(): void {
    this.request = null;
    this.extensions = null;
  }

  shouldFormat(obj: unknown, _document: IFormattableDocument): boolean {
    if (isEObject(obj)) return this.isInRequestedRange(obj);
    return true;
  }
}

function isEObject(obj: unknown): obj is EObject {
  return typeof obj === 'object' && obj !== null && 'eContents' in obj;
}
