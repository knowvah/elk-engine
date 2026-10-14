// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import { ConflictingFormattingException } from '../ConflictingFormattingException.js';
import type { FormatterRequest } from '../FormatterRequest.js';
import { NORMAL_PRIORITY } from '../IHiddenRegionFormatter.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';

/** `Integer.compare`. */
function compareInt(x: number, y: number): number {
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Sum of two optional counters (the indentation increase/decrease of merged formattings add up).
 */
function addOptional(first: number | null, second: number | null): number | null {
  if (first !== null && second !== null) return first + second;
  return first !== null ? first : second;
}

/**
 * The properties of one hidden-region formatting and their conflict-resolving merge. The autowrap properties
 * are not ported (see `IHiddenRegionFormatter`); `toString` (debug printer) is not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/HiddenRegionFormatting.java
 */
export class HiddenRegionFormatting implements IHiddenRegionFormatting {
  private readonly formatter: AbstractFormatter2;
  private indentationDecrease: number | null = null;
  private indentationIncrease: number | null = null;
  private newLineDefault: number | null = null;
  private newLineMax: number | null = null;
  private newLineMin: number | null = null;
  private noIndentation: boolean | null = null;
  private priority = NORMAL_PRIORITY;
  private space: string | null = null;

  constructor(formatter: AbstractFormatter2) {
    this.formatter = formatter;
  }

  getFormatter(): AbstractFormatter2 {
    return this.formatter;
  }

  getIndentationDecrease(): number | null {
    return this.indentationDecrease;
  }

  getIndentationIncrease(): number | null {
    return this.indentationIncrease;
  }

  getNewLineDefault(): number | null {
    return this.newLineDefault;
  }

  getNewLineMax(): number | null {
    return this.newLineMax;
  }

  getNewLineMin(): number | null {
    return this.newLineMin;
  }

  getNoIndentation(): boolean | null {
    return this.noIndentation;
  }

  getPriority(): number {
    return this.priority;
  }

  getRequest(): FormatterRequest {
    return this.formatter.getRequest();
  }

  getSpace(): string | null {
    return this.space;
  }

  /**
   * Both values set: equal, or `strategy < 0` (this one has the higher priority) keeps `val1`; `strategy > 0`
   * takes `val2`; otherwise they conflict. One value set: that one.
   */
  protected merge<T extends string | number | boolean>(
    val1: T | null,
    val2: T | null,
    strategy: number,
    propertyname: string,
  ): T | null {
    if (val1 !== null && val2 !== null) {
      if (val1 === val2 || strategy < 0) return val1;
      if (strategy > 0) return val2;
      const message = `Conflicting values for '${propertyname}': '${val1}' and '${val2}'.`;
      throw new ConflictingFormattingException(message);
    }
    return val1 !== null ? val1 : val2;
  }

  mergeValuesFrom(other: IHiddenRegionFormatting): void {
    const strategy = compareInt(other.getPriority(), this.getPriority());
    this.setSpace(this.merge(this.getSpace(), other.getSpace(), strategy, 'space'));
    this.setNewLinesMin(this.merge(this.getNewLineMin(), other.getNewLineMin(), strategy, 'newLineMin'));
    this.setNewLinesDefault(
      this.merge(this.getNewLineDefault(), other.getNewLineDefault(), strategy, 'newLineDefault'),
    );
    this.setNewLinesMax(this.merge(this.getNewLineMax(), other.getNewLineMax(), strategy, 'newLineMax'));
    this.setNoIndentation(this.merge(this.getNoIndentation(), other.getNoIndentation(), strategy, 'noIndentation'));
    // the priority itself is never null; Java boxes it through the same generic merge
    this.setPriority(this.merge(this.getPriority(), other.getPriority(), strategy, 'priority')!);
    this.setIndentationIncrease(addOptional(this.getIndentationIncrease(), other.getIndentationIncrease()));
    this.setIndentationDecrease(addOptional(this.getIndentationDecrease(), other.getIndentationDecrease()));
  }

  setIndentationDecrease(indentation: number | null): void {
    this.indentationDecrease = indentation;
  }

  setIndentationIncrease(indentation: number | null): void {
    this.indentationIncrease = indentation;
  }

  setNewLinesDefault(newLines: number | null): void {
    this.newLineDefault = newLines;
  }

  setNewLinesMax(newLines: number | null): void {
    this.newLineMax = newLines;
  }

  setNewLinesMin(newLines: number | null): void {
    this.newLineMin = newLines;
  }

  setNoIndentation(value: boolean | null): void {
    this.noIndentation = value;
  }

  setPriority(priority: number): void {
    this.priority = priority;
  }

  setSpace(space: string | null): void {
    this.space = space;
  }
}
