// SPDX-License-Identifier: EPL-2.0
import type { ITextReplacement } from './ITextReplacement.js';
import type { ITextSegment } from './ITextSegment.js';

/** Java `Appendable` (the `IOException` of `append` cannot occur for the in-memory targets used here). */
export interface Appendable {
  append(text: string): void;
}

/**
 * Applies replacements to the text of a region access. The Java overloads `renderToString(replacements)` /
 * `renderToString(input, replacements)` are `renderToString` / `renderSegmentToString`, and
 * `renderToAppendable(...)` pairs likewise `renderToAppendable` / `renderSegmentToAppendable`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ITextRegionRewriter.java
 */
export interface ITextRegionRewriter {
  renderToAppendable(replacements: Iterable<ITextReplacement>, result: Appendable): void;
  createReplacement(offset: number, length: number, text: string): ITextReplacement;
  renderSegmentToAppendable(segment: ITextSegment, replacements: Iterable<ITextReplacement>, result: Appendable): void;
  renderToString(replacements: Iterable<ITextReplacement>): string;
  renderSegmentToString(input: ITextSegment, replacements: Iterable<ITextReplacement>): string;
}
