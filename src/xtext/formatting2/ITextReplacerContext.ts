// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from './AbstractFormatter2.js';
import type { IFormattableDocument } from './IFormattableDocument.js';
import type { ITextReplacer } from './ITextReplacer.js';
import type { ITextReplacement } from './regionaccess/ITextReplacement.js';

/**
 * The state threaded through the replacers: indentation level, replacements made so far, autowrap state. Not
 * ported: `getIndentationString()` (no-argument) and `isInsideFormattedRegion` (no caller).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/ITextReplacerContext.java
 */
export interface ITextReplacerContext {
  addReplacement(replacement: ITextReplacement): void;
  canAutowrap(): number | null;
  getDocument(): IFormattableDocument;
  getFormatter(): AbstractFormatter2;
  getIndentation(): number;
  getIndentationString(indentationLevel: number): string;
  getLeadingCharsInLineCount(): number;
  getLocalReplacements(): Iterable<ITextReplacement>;
  getLocalReplacementsReverse(): Iterable<ITextReplacement>;
  getNewLinesString(count: number): string;
  getPreviousContext(): ITextReplacerContext | null;
  getReplacementsUntil(first: ITextReplacerContext): ITextReplacement[];
  getReplacer(): ITextReplacer | null;
  isAutowrap(): boolean;
  isWrapInRegion(): boolean;
  isWrapSincePrevious(): boolean;
  setAutowrap(value: boolean): void;
  setCanAutowrap(value: number | null): void;
  setNextReplacerIsChild(): void;
  withDocument(document: IFormattableDocument): ITextReplacerContext;
  withIndentation(indentation: number): ITextReplacerContext;
  withReplacer(replacer: ITextReplacer): ITextReplacerContext;
}
