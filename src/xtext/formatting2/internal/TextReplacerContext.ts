// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { FormatterPreferenceKeys } from '../FormatterPreferenceKeys.js';
import type { IFormattableDocument } from '../IFormattableDocument.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { isHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import type { ITextRegionAccess } from '../regionaccess/ITextRegionAccess.js';
import type { ITextReplacement } from '../regionaccess/ITextReplacement.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';
import { ArrayListTextSegmentSet } from './ArrayListTextSegmentSet.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionsOutsideFrameException } from './RegionsOutsideFrameException.js';
import type { TextSegmentSet } from './TextSegmentSet.js';

const LINE_BREAK = '\n';
const TAB = '\t';

/** The walk of `getLeadingCharsInLineCount` (its local variables `lastOffset` and `count`). */
interface LeadingCharsWalk {
  lastOffset: number;
  count: number;
}

/**
 * One link of the chain of contexts that a document's replacers are applied through.
 *
 * Not ported: `getIndentationString()` (no-argument), `isInsideFormattedRegion` (no caller), `toString` and
 * `toStringLocal` (debug). `isInRequestedRange(ITextReplacement)` ports its empty-regions arm only (lines
 * 213-214): the request of the writer never has regions (`Serializer.java:150-155`). `getLocalReplacements` and
 * `getLocalReplacementsReverse` drop their `replacements == null` arms: the set is created in the constructor and
 * by `setAutowrap`, never cleared.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/TextReplacerContext.java
 */
export class TextReplacerContext implements ITextReplacerContext {
  private autowrap = false;
  private canAutowrapValue: number | null = null;
  private readonly document: IFormattableDocument;
  private readonly indentation: number;
  private nextReplacerIsChild = false;
  private readonly previous: ITextReplacerContext | null;
  private replacements: TextSegmentSet<ITextReplacement>;
  private readonly replacer: ITextReplacer | null;

  constructor(
    document: IFormattableDocument,
    previous: ITextReplacerContext | null = null,
    indentation = 0,
    replacer: ITextReplacer | null = null,
  ) {
    this.document = document;
    this.indentation = indentation;
    this.previous = previous;
    this.replacer = replacer;
    this.replacements = this.createTextReplacementsSet();
  }

  canAutowrap(): number | null {
    return this.canAutowrapValue;
  }

  protected createTextReplacementsSet(): TextSegmentSet<ITextReplacement> {
    return new ArrayListTextSegmentSet<ITextReplacement>(
      (replacement) => replacement,
      (input) => input.getReplacementText(),
      this.document.getRequest().isEnableDebugTracing(),
    );
  }

  getDocument(): IFormattableDocument {
    return this.document;
  }

  getFormatter(): AbstractFormatter2 {
    return this.document.getFormatter();
  }

  getIndentation(): number {
    return this.indentation;
  }

  getIndentationString(indentationLevel: number): string {
    const unit = this.document.getFormatter().getPreference(FormatterPreferenceKeys.indentation);
    return repeat(unit, indentationLevel);
  }

  /**
   * The width (tabs per `logicalLength`) of the text between the last line break and the start of this
   * context's replacer, walking back through the replacements of this and the previous contexts.
   */
  getLeadingCharsInLineCount(): number {
    const access = this.document.getRequest().getTextRegionAccess();
    const walk: LeadingCharsWalk = { lastOffset: this.replacer!.getRegion().getOffset(), count: 0 };
    let current: ITextReplacerContext | null = this;
    while (current !== null) {
      const fromReplacements = this.leadingCharsOfLocalReplacements(access, current, walk);
      if (fromReplacements !== null) return fromReplacements;
      const fromReplacer = this.leadingCharsOfReplacer(access, current, walk);
      if (fromReplacer !== null) return fromReplacer;
      current = current.getPreviousContext();
    }
    const rest = access.textForOffset(0, walk.lastOffset);
    const idx = rest.lastIndexOf(LINE_BREAK);
    if (idx >= 0) return walk.count + this.logicalLength(rest.substring(idx + 1));
    walk.count += walk.lastOffset;
    return walk.count;
  }

  /**
   * The inner loop of `getLeadingCharsInLineCount` (lines 113-131) over the replacements of `current`, last
   * first: the count up to a line break found, or `null` after adding the text and replacements to `walk`.
   */
  private leadingCharsOfLocalReplacements(
    access: ITextRegionAccess,
    current: ITextReplacerContext,
    walk: LeadingCharsWalk,
  ): number | null {
    for (const rep of current.getLocalReplacementsReverse()) {
      const endOffset = rep.getEndOffset();
      if (endOffset > walk.lastOffset) {
        continue;
      }
      const between = access.textForOffset(endOffset, walk.lastOffset - endOffset);
      const idx = between.lastIndexOf(LINE_BREAK);
      if (idx >= 0) return walk.count + this.logicalLength(between.substring(idx + 1));
      walk.count += this.logicalLength(between);
      const text = rep.getReplacementText();
      const idx2 = text.lastIndexOf(LINE_BREAK);
      if (idx2 >= 0) return walk.count + this.logicalLength(text.substring(idx2 + 1));
      walk.count += this.logicalLength(text);
      walk.lastOffset = rep.getOffset();
    }
    return null;
  }

  /** Lines 132-144: the text of `current`'s replacer before the walk position, up to a line break found. */
  private leadingCharsOfReplacer(
    access: ITextRegionAccess,
    current: ITextReplacerContext,
    walk: LeadingCharsWalk,
  ): number | null {
    const replacer = current.getReplacer();
    if (replacer !== null) {
      const offset = replacer.getRegion().getOffset();
      if (offset < walk.lastOffset) {
        const text = access.textForOffset(offset, walk.lastOffset - offset);
        const idx = text.lastIndexOf(LINE_BREAK);
        if (idx >= 0) {
          return walk.count + this.logicalLength(text.substring(idx + 1));
        }
        walk.count += this.logicalLength(text);
        walk.lastOffset = offset;
      }
    }
    return null;
  }

  getLocalReplacements(): Iterable<ITextReplacement> {
    return this.replacements;
  }

  getLocalReplacementsReverse(): Iterable<ITextReplacement> {
    return this.replacements.reverseIterable();
  }

  getNewLinesString(count: number): string {
    const separator = this.document.getFormatter().getPreference(FormatterPreferenceKeys.lineSeparator);
    return repeat(separator, count);
  }

  getPreviousContext(): ITextReplacerContext | null {
    return this.previous;
  }

  getReplacementsUntil(first: ITextReplacerContext): ITextReplacement[] {
    let current: ITextReplacerContext | null = this;
    const reversedReplacements: ITextReplacement[][] = [];
    while (current !== null) {
      const localReplacements = [...current.getLocalReplacements()];
      if (localReplacements.length > 0) reversedReplacements.push(localReplacements);
      if (current === first) break;
      current = current.getPreviousContext();
    }
    reversedReplacements.reverse();
    return reversedReplacements.flat();
  }

  getReplacer(): ITextReplacer | null {
    return this.replacer;
  }

  isAutowrap(): boolean {
    return this.autowrap;
  }

  /** Empty-regions arm of lines 205-215: every replacement is in the (absent) requested range. */
  protected isInRequestedRange(_replacement: ITextReplacement): boolean {
    return true;
  }

  addReplacement(replacement: ITextReplacement): void {
    if (this.replacer === null) throw new IllegalStateException('the context has no replacer');
    const replacerRegion = this.replacer.getRegion();
    const request = this.document.getRequest();
    if (!replacerRegion.contains(replacement)) {
      const exception = new RegionsOutsideFrameException(this.replacer.constructor.name, replacerRegion, {
        title: replacement.getReplacementText(),
        region: replacement,
      });
      request.getExceptionHandler()(exception);
      return;
    }
    if (!this.isInRequestedRange(replacement)) return;
    if (!this.isInUndefinedRegion()) {
      if (request.isFormatUndefinedHiddenRegionsOnly()) return;
      if (!request.allowIdentityEdits() && this.isIdentityEdit(replacement)) return;
    }
    try {
      this.replacements.add(replacement);
    } catch (e) {
      if (e instanceof ConflictingRegionsException) {
        request.getExceptionHandler()(e);
      } else {
        throw e;
      }
    }
  }

  /**
   * Whether the replacer's region is undefined (or no hidden region). Java also resolves an `IHiddenRegionPart`
   * to its hidden region; a hidden region has no parts here, so only the hidden-region arm exists.
   */
  protected isInUndefinedRegion(): boolean {
    const replacerRegion = this.replacer!.getRegion();
    const hidden = isHiddenRegion(replacerRegion) ? replacerRegion : null;
    return hidden === null || hidden.isUndefined();
  }

  protected isIdentityEdit(replacement: ITextReplacement): boolean {
    return replacement.getText() === replacement.getReplacementText();
  }

  /**
   * The width of `text`: its length, unless the indentation is a tab; then a tab counts the (deprecated)
   * `indentationLength`, or `tabWidth` when that is negative.
   */
  protected logicalLength(text: string): number {
    const preferences = this.document.getRequest().getPreferences();
    const indentation = preferences.getTypedPreference(FormatterPreferenceKeys.indentation);
    if (TAB !== indentation) return text.length;
    let tabWidth = preferences.getTypedPreference(FormatterPreferenceKeys.indentationLength)!;
    if (tabWidth < 0) {
      tabWidth = preferences.getTypedPreference(FormatterPreferenceKeys.tabWidth)!;
    }
    let length = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charAt(i) === TAB) length += tabWidth;
      else length++;
    }
    return length;
  }

  /** Also drops the replacements made so far: the replacer runs again in the new state. */
  setAutowrap(value: boolean): void {
    this.autowrap = value;
    this.replacements = this.createTextReplacementsSet();
  }

  setCanAutowrap(value: number | null): void {
    this.canAutowrapValue = value;
  }

  setNextReplacerIsChild(): void {
    this.nextReplacerIsChild = true;
  }

  withDocument(document: IFormattableDocument): ITextReplacerContext {
    if (document === this.document) return this;
    const context = new TextReplacerContext(document, this, this.indentation, null);
    if (this.nextReplacerIsChild) context.setNextReplacerIsChild();
    return context;
  }

  withIndentation(indentation: number): ITextReplacerContext {
    if (indentation === this.indentation) return this;
    return new TextReplacerContext(this.document, this, indentation, null);
  }

  withReplacer(replacer: ITextReplacer): ITextReplacerContext {
    if (replacer === this.replacer) return this;
    let current: ITextReplacerContext | null = this;
    while (current !== null) {
      const lastReplacer = current.getReplacer();
      if (lastReplacer !== null) {
        this.checkReplacerOrder(lastReplacer, replacer);
        break;
      }
      current = current.getPreviousContext();
    }
    return new TextReplacerContext(this.document, this, this.indentation, replacer);
  }

  /** The region of the `index`-th replacer back along the chain (0: the nearest), skipping contexts without one. */
  protected getRegion(index: number): ITextSegment | null {
    let current: ITextReplacerContext | null = this;
    while (current !== null) {
      const replacer2 = current.getReplacer();
      if (replacer2 !== null) {
        if (index === 0) {
          return replacer2.getRegion();
        } else index--;
      }
      current = current.getPreviousContext();
    }
    return null;
  }

  /** Whether the region of this context's replacer has, or gets, a line break. */
  isWrapInRegion(): boolean {
    const access = this.document.getRequest().getTextRegionAccess();
    const region = this.replacer!.getRegion();
    let lastOffset = region.getOffset();
    for (const rep of this.getLocalReplacements()) {
      const endOffset = rep.getOffset();
      const between = access.textForOffset(lastOffset, endOffset - lastOffset);
      if (between.includes(LINE_BREAK) || rep.getReplacementText().includes(LINE_BREAK)) {
        return true;
      }
      lastOffset = rep.getEndOffset();
    }
    const rest = access.textForOffset(lastOffset, region.getEndOffset() - lastOffset);
    if (rest.includes(LINE_BREAK)) {
      return true;
    }
    return false;
  }

  /** Whether the text between the previous replacer and this one has a line break. */
  isWrapSincePrevious(): boolean {
    const access = this.document.getRequest().getTextRegionAccess();
    const region = this.getRegion(0)!;
    const previousRegion = this.getRegion(1);
    if (previousRegion !== null) {
      const offset = previousRegion.getEndOffset();
      const between = access.textForOffset(offset, region.getOffset() - offset);
      if (between.includes(LINE_BREAK)) {
        return true;
      }
    }
    return false;
  }

  /** `Preconditions.checkArgument` of `withReplacer`: a child lies inside the last replacer, a sibling follows it. */
  private checkReplacerOrder(lastReplacer: ITextReplacer, replacer: ITextReplacer): void {
    const lastRegion = lastReplacer.getRegion();
    const valid = this.nextReplacerIsChild
      ? lastRegion.contains(replacer.getRegion())
      : lastRegion.getEndOffset() <= replacer.getRegion().getOffset();
    if (!valid) throw new IllegalArgumentException('the replacers are not in document order');
  }
}

/** Guava `Strings.repeat(string, count)`: the string repeated `count` times; a negative count is an error. */
function repeat(unit: string, count: number): string {
  if (count < 0) throw new IllegalArgumentException(`invalid count: ${count}`);
  return unit.repeat(count);
}
