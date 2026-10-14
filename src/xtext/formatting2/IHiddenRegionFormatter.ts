// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from './FormatterRequest.js';

export const HIGH_PRIORITY = 1;
export const LOW_PRIORITY = -1;
export const NORMAL_PRIORITY = 0;

/**
 * The formatting commands of a hidden region (`noSpace`, `oneSpace`, `newLine`, `setNewLines`, `indent`, ...).
 * The autowrap commands (`autowrap`, `noAutowrap`, `setOnAutowrap`) and `IAutowrapFormatter` are not ported:
 * `ElkGraphFormatter` never calls them, so no formatting ever has an autowrap trigger (G1). The Java
 * overloads `setNewLines(int)` / `setNewLines(int, int, int)` are kept as TypeScript overloads.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IHiddenRegionFormatter.java
 */
export interface IHiddenRegionFormatter {
  getRequest(): FormatterRequest;
  highPriority(): void;
  lowPriority(): void;
  setPriority(priority: number): void;
  noIndentation(): void;
  indent(): void;
  newLine(): void;
  setNewLines(newLines: number): void;
  setNewLines(minNewLines: number, defaultNewLines: number, maxNewLines: number): void;
  noSpace(): void;
  oneSpace(): void;
  setSpace(space: string): void;
}

/** Java `Procedure1<? super IHiddenRegionFormatter>`: the `[oneSpace]` lambdas of the Xtend formatter. */
export type HiddenRegionFormatterInit = (formatter: IHiddenRegionFormatter) => void;
