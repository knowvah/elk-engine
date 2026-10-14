// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from './AbstractFormatter2.js';
import type { IFormattableDocument } from './IFormattableDocument.js';
import type { ITextReplacer } from './ITextReplacer.js';
import type { ITextReplacement } from './regionaccess/ITextReplacement.js';

/**
 * The state threaded through the replacers: indentation level, replacements made so far. Not ported:
 * the autowrap members (`canAutowrap`, `setCanAutowrap`, `isAutowrap`, `setAutowrap`, `isWrapInRegion`,
 * `isWrapSincePrevious`, `getLeadingCharsInLineCount`; no formatting has an autowrap trigger),
 * `getLocalReplacementsReverse`, `getIndentationString()` (no-argument), `isInsideFormattedRegion` (no caller).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/ITextReplacerContext.java
 */
export interface ITextReplacerContext {
  addReplacement(replacement: ITextReplacement): void;
  getDocument(): IFormattableDocument;
  getFormatter(): AbstractFormatter2;
  getIndentation(): number;
  getIndentationString(indentationLevel: number): string;
  getLocalReplacements(): Iterable<ITextReplacement>;
  getNewLinesString(count: number): string;
  getPreviousContext(): ITextReplacerContext | null;
  getReplacementsUntil(first: ITextReplacerContext): ITextReplacement[];
  getReplacer(): ITextReplacer | null;
  setNextReplacerIsChild(): void;
  withDocument(document: IFormattableDocument): ITextReplacerContext;
  withIndentation(indentation: number): ITextReplacerContext;
  withReplacer(replacer: ITextReplacer): ITextReplacerContext;
}
