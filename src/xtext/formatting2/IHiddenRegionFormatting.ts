// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from './FormatterRequest.js';

/**
 * The accumulated formatting of one hidden region. The autowrap properties (`autowrap`, `onAutowrap`) are not
 * ported, see {@link IHiddenRegionFormatter}.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IHiddenRegionFormatting.java
 */
export interface IHiddenRegionFormatting {
  mergeValuesFrom(other: IHiddenRegionFormatting): void;
  getIndentationDecrease(): number | null;
  getIndentationIncrease(): number | null;
  getNewLineDefault(): number | null;
  getNewLineMax(): number | null;
  getNewLineMin(): number | null;
  getNoIndentation(): boolean | null;
  getPriority(): number;
  getRequest(): FormatterRequest;
  getSpace(): string | null;
  setIndentationDecrease(indentation: number | null): void;
  setIndentationIncrease(indentation: number | null): void;
  setNewLinesDefault(newLines: number | null): void;
  setNewLinesMax(newLines: number | null): void;
  setNewLinesMin(newLines: number | null): void;
  setNoIndentation(value: boolean | null): void;
  setPriority(priority: number): void;
  setSpace(space: string | null): void;
}
