// SPDX-License-Identifier: EPL-2.0
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import { isHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import type { ITextSegment } from '../regionaccess/ITextSegment.js';

const NEW_LINE = '\n';

/**
 * Replaces a whitespace region (or an empty hidden region) by the computed spaces/newlines/indentation. The
 * autowrap lines of `createReplacements` (`context.setCanAutowrap`, the `isAutowrap` arm) are not ported: no
 * formatting has an autowrap trigger and no context is ever in autowrap state.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/WhitespaceReplacer.java
 */
export class WhitespaceReplacer implements ITextReplacer {
  private readonly formatting: IHiddenRegionFormatting;
  private readonly region: ITextSegment;

  constructor(whitespace: ITextSegment, formatting: IHiddenRegionFormatting) {
    this.region = whitespace;
    this.formatting = formatting;
  }

  protected computeNewIndentation(context: ITextReplacerContext): number {
    const indentationIncrease = this.formatting.getIndentationIncrease();
    const indentationDecrease = this.formatting.getIndentationDecrease();
    let indentation = context.getIndentation();
    if (indentationIncrease !== null) indentation += indentationIncrease;
    if (indentationDecrease !== null) indentation -= indentationDecrease;
    if (indentation >= 0) return indentation;
    return 0; // Xtext TODO: handle indentation underflow
  }

  protected computeNewLineCount(): number {
    const newLineDefault = this.formatting.getNewLineDefault();
    const newLineMin = this.formatting.getNewLineMin();
    const newLineMax = this.formatting.getNewLineMax();
    if (newLineMin === null && newLineDefault === null && newLineMax === null) return 0;
    if (isHiddenRegion(this.region) && this.region.isUndefined()) {
      // an undefined region has no text to clamp: default, else min, else max (at least one is set)
      return newLineDefault ?? newLineMin ?? newLineMax!;
    }
    return this.clampExistingLineCount(newLineMin, newLineMax);
  }

  /** The existing number of line breaks of the region, raised to `min` and lowered to `max`. */
  private clampExistingLineCount(newLineMin: number | null, newLineMax: number | null): number {
    let lineCount = this.region.getLineCount() - 1;
    if (newLineMin !== null && newLineMin > lineCount) lineCount = newLineMin;
    if (newLineMax !== null && newLineMax < lineCount) lineCount = newLineMax;
    return lineCount;
  }

  createReplacements(context: ITextReplacerContext): ITextReplacerContext {
    const space = this.formatting.getSpace();
    const trailingNewLinesOfPreviousRegion = this.trailingNewLinesOfPreviousRegion();
    const computedNewLineCount = this.computeNewLineCount();
    const newLineCount = Math.max(computedNewLineCount - trailingNewLinesOfPreviousRegion, 0);
    const indentationCount = this.computeNewIndentation(context);
    if (newLineCount === 0 && trailingNewLinesOfPreviousRegion === 0) {
      if (space !== null) context.addReplacement(this.region.replaceWith(space));
    } else {
      const noIndentation = this.formatting.getNoIndentation() === true;
      const newLines = context.getNewLinesString(newLineCount);
      const indentation = noIndentation ? '' : context.getIndentationString(indentationCount);
      context.addReplacement(this.region.replaceWith(newLines + indentation));
    }
    return context.withIndentation(indentationCount);
  }

  getFormatting(): IHiddenRegionFormatting {
    return this.formatting;
  }

  getRegion(): ITextSegment {
    return this.region;
  }

  protected trailingNewLinesOfPreviousRegion(): number {
    const offset = this.region.getOffset();
    if (offset < 1) return 0;
    const previous = this.region.getTextRegionAccess().textForOffset(offset - 1, 1);
    if (previous === NEW_LINE) return 1;
    return 0;
  }
}
