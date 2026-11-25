// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from './FormatterRequest.js';

/**
 * The accumulated formatting of one hidden region. The `onAutowrap` property is not ported: nothing installs an
 * `IAutowrapFormatter` (see {@link IHiddenRegionFormatter}), so it is always `null`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IHiddenRegionFormatting.java
 */
export interface IHiddenRegionFormatting {
  mergeValuesFrom(other: IHiddenRegionFormatting): void;
  getAutowrap(): number | null;
  getIndentationDecrease(): number | null;
  getIndentationIncrease(): number | null;
  getNewLineDefault(): number | null;
  getNewLineMax(): number | null;
  getNewLineMin(): number | null;
  getNoIndentation(): boolean | null;
  getPriority(): number;
  getRequest(): FormatterRequest;
  getSpace(): string | null;
  setAutowrap(value: number | null): void;
  setIndentationDecrease(indentation: number | null): void;
  setIndentationIncrease(indentation: number | null): void;
  setNewLinesDefault(newLines: number | null): void;
  setNewLinesMax(newLines: number | null): void;
  setNewLinesMin(newLines: number | null): void;
  setNoIndentation(value: boolean | null): void;
  setPriority(priority: number): void;
  setSpace(space: string | null): void;
}
