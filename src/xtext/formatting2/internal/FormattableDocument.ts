// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import type { FormatterRequest } from '../FormatterRequest.js';
import type { HiddenRegionFormatterInit } from '../IHiddenRegionFormatter.js';
import type { IFormattableDocument, RegionPair } from '../IFormattableDocument.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import type { IHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import { isSemanticRegion, type ISemanticRegion } from '../regionaccess/ISemanticRegion.js';
import type { ITextRegionAccess } from '../regionaccess/ITextRegionAccess.js';
import type { ITextReplacement } from '../regionaccess/ITextReplacement.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { ArrayListTextSegmentSet } from './ArrayListTextSegmentSet.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionTraceMissingException } from './RegionTraceMissingException.js';
import { RegionsOutsideFrameException } from './RegionsOutsideFrameException.js';
import type { TextSegmentSet } from './TextSegmentSet.js';
import { getReplacerRegion } from '../ITextReplacer.js';

/**
 * The formatting commands over a text region, collected as replacers and rendered to text replacements.
 *
 * Ported from `createReplacements` (124-170) without the autowrap bookkeeping (`wrappable`, `wrapped`,
 * `needsAutowrap`, `canAutowrap`): `wrappable` only becomes non-null for a context with `canAutowrap() >= 0`,
 * which needs a formatting with an autowrap trigger, and `ElkGraphFormatter` never creates one (the autowrap
 * commands are not ported, see `IHiddenRegionFormatter`). Not ported either: `applyTextReplacements` (no
 * caller), `formatConditionally`, `withReplacerFilter`, `toString` (debug), `getPreferences`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/FormattableDocument.java
 */
export abstract class FormattableDocument implements IFormattableDocument {
  private replacers: TextSegmentSet<ITextReplacer> | null = null;

  abstract getFormatter(): AbstractFormatter2;
  abstract getRegion(): ITextSegment;
  abstract getRequest(): FormatterRequest;

  protected getReplacers(): TextSegmentSet<ITextReplacer> {
    if (this.replacers === null) {
      this.replacers = this.createTextReplacerSet();
    }
    return this.replacers;
  }

  addReplacer(replacer: ITextReplacer): void {
    if (!this.getRegion().contains(replacer.getRegion())) {
      const frameTitle = this.constructor.name;
      const replacerTitle = replacer.constructor.name;
      const exception = new RegionsOutsideFrameException(frameTitle, this.getRegion(), {
        title: replacerTitle,
        region: replacer.getRegion(),
      });
      this.getRequest().getExceptionHandler()(exception);
      return;
    }
    try {
      this.getReplacers().add(replacer, this.getFormatter().createTextReplacerMerger());
    } catch (e) {
      if (e instanceof ConflictingRegionsException) {
        this.getRequest().getExceptionHandler()(e);
      } else {
        throw e;
      }
    }
  }

  append<T extends ISemanticRegion | EObject>(target: T | null, after: HiddenRegionFormatterInit): T | null {
    if (target !== null) {
      this.set(this.followingHiddenRegion(target), after);
    }
    return target;
  }

  prepend<T extends ISemanticRegion | EObject>(target: T | null, before: HiddenRegionFormatterInit): T | null {
    if (target !== null) {
      this.set(this.precedingHiddenRegion(target), before);
    }
    return target;
  }

  surround<T extends ISemanticRegion | EObject>(target: T | null, beforeAndAfter: HiddenRegionFormatterInit): T | null {
    if (target !== null) {
      this.setPair(this.precedingHiddenRegion(target), this.followingHiddenRegion(target), beforeAndAfter);
    }
    return target;
  }

  /**
   * `token.getNextHiddenRegion()` for a semantic region, `regionForEObject(owner).getNextHiddenRegion()` for an
   * object (`null` when the object has no region). Java picks the overload statically.
   */
  private followingHiddenRegion(target: ISemanticRegion | EObject): IHiddenRegion | null {
    if (isSemanticRegion(target)) return target.getNextHiddenRegion();
    const region = this.getTextRegionAccess().regionForEObject(target);
    return region === null ? null : region.getNextHiddenRegion();
  }

  private precedingHiddenRegion(target: ISemanticRegion | EObject): IHiddenRegion | null {
    if (isSemanticRegion(target)) return target.getPreviousHiddenRegion();
    const region = this.getTextRegionAccess().regionForEObject(target);
    return region === null ? null : region.getPreviousHiddenRegion();
  }

  protected createReplacements(previous: ITextReplacerContext): ITextReplacerContext {
    let context = previous.withDocument(this);
    for (const replacer of this.getReplacers()) {
      context = context.withReplacer(replacer);
      context = replacer.createReplacements(context);
    }
    return context.withDocument(previous.getDocument());
  }

  protected createTextReplacerSet(): TextSegmentSet<ITextReplacer> {
    return new ArrayListTextSegmentSet<ITextReplacer>(
      getReplacerRegion,
      // Java titles a HiddenRegionReplacer by its formatting's debug rendering; the class name serves here
      (input) => input.constructor.name,
      this.getRequest().isEnableDebugTracing(),
    );
  }

  format<T>(obj: T): T {
    const formatter = this.getFormatter();
    if (formatter.shouldFormat(obj, this)) {
      try {
        formatter.format(obj, this);
      } catch (e) {
        if (e instanceof RegionTraceMissingException) throw e;
        this.getRequest().getExceptionHandler()(e instanceof Error ? e : new Error(String(e)));
      }
    }
    return obj;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.getRequest().getTextRegionAccess();
  }

  interior<T1 extends ISemanticRegion, T2 extends ISemanticRegion>(
    first: T1 | null,
    second: T2 | null,
    init: HiddenRegionFormatterInit,
  ): RegionPair<T1, T2> {
    if (first !== null && second !== null) {
      this.setPair(first.getNextHiddenRegion(), second.getPreviousHiddenRegion(), init);
    }
    return [first, second];
  }

  interiorOfPair<T1 extends ISemanticRegion, T2 extends ISemanticRegion>(
    pair: RegionPair<T1, T2>,
    init: HiddenRegionFormatterInit,
  ): RegionPair<T1, T2> {
    return this.interior(pair[0], pair[1], init);
  }

  interiorOfObject<T extends EObject>(object: T | null, init: HiddenRegionFormatterInit): T | null {
    if (object !== null) {
      const objRegion = this.getTextRegionAccess().regionForEObject(object);
      if (objRegion !== null) {
        const previous = objRegion.getPreviousHiddenRegion();
        const next = objRegion.getNextHiddenRegion();
        if (previous !== null && next !== null && previous !== next) {
          this.interior(previous.getNextSemanticRegion(), next.getPreviousSemanticRegion(), init);
        }
      }
    }
    return object;
  }

  renderToTextReplacements(): ITextReplacement[] {
    const first = this.getFormatter().createTextReplacerContext(this);
    const last = this.createReplacements(first);
    return last.getReplacementsUntil(first);
  }

  setPair(
    first: IHiddenRegion | null,
    second: IHiddenRegion | null,
    init: HiddenRegionFormatterInit,
  ): RegionPair<IHiddenRegion, IHiddenRegion> {
    if (first !== null && second !== null) {
      const formatter = this.getFormatter();
      const f1 = formatter.createHiddenRegionFormatting();
      const f2 = formatter.createHiddenRegionFormatting();
      init(formatter.createHiddenRegionFormatter(f1, f2));
      const replacer1 = formatter.createHiddenRegionReplacer(first, f1);
      const replacer2 = formatter.createHiddenRegionReplacer(second, f2);
      this.addReplacer(replacer1);
      this.addReplacer(replacer2);
    }
    return [first, second];
  }

  set(hiddenRegion: IHiddenRegion | null, init: HiddenRegionFormatterInit): IHiddenRegion | null {
    if (hiddenRegion !== null) {
      const formatter = this.getFormatter();
      const formatting = formatter.createHiddenRegionFormatting();
      init(formatter.createHiddenRegionFormatter(formatting));
      const replacer = formatter.createHiddenRegionReplacer(hiddenRegion, formatting);
      this.addReplacer(replacer);
    }
    return hiddenRegion;
  }
}
