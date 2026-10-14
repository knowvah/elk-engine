// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { FormatterPreferenceKeys } from '../FormatterPreferenceKeys.js';
import type { IFormattableDocument } from '../IFormattableDocument.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { isHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import type { ITextReplacement } from '../regionaccess/ITextReplacement.js';
import { ArrayListTextSegmentSet } from './ArrayListTextSegmentSet.js';
import { ConflictingRegionsException } from './ConflictingRegionsException.js';
import { RegionsOutsideFrameException } from './RegionsOutsideFrameException.js';
import type { TextSegmentSet } from './TextSegmentSet.js';

/**
 * One link of the chain of contexts that a document's replacers are applied through.
 *
 * Not ported: the autowrap state and queries (`autowrap`, `canAutowrap`, `isWrapInRegion`, `isWrapSincePrevious`,
 * `getLeadingCharsInLineCount`, `logicalLength`, `getRegion(int)`; they are only reached when a formatting has an
 * autowrap trigger, which `ElkGraphFormatter` never sets), `getLocalReplacementsReverse`, `toString`
 * (debug). `isInRequestedRange(ITextReplacement)` ports its empty-regions arm only (lines 213-214): the request
 * of the writer never has regions (`Serializer.java:150-155`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/TextReplacerContext.java
 */
export class TextReplacerContext implements ITextReplacerContext {
  private readonly document: IFormattableDocument;
  private readonly indentation: number;
  private nextReplacerIsChild = false;
  private readonly previous: ITextReplacerContext | null;
  private readonly replacements: TextSegmentSet<ITextReplacement>;
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

  getLocalReplacements(): Iterable<ITextReplacement> {
    return this.replacements;
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
