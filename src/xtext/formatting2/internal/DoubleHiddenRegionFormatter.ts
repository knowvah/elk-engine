// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from '../FormatterRequest.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import { AbstractHiddenRegionFormatter } from './AbstractHiddenRegionFormatter.js';

/**
 * Formats two hidden regions (`interior`, `surround`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/DoubleHiddenRegionFormatter.java
 */
export class DoubleHiddenRegionFormatter extends AbstractHiddenRegionFormatter {
  private readonly first: IHiddenRegionFormatting;
  private readonly second: IHiddenRegionFormatting;

  constructor(first: IHiddenRegionFormatting, second: IHiddenRegionFormatting) {
    super();
    this.first = first;
    this.second = second;
  }

  getRequest(): FormatterRequest {
    return this.first.getRequest();
  }

  /** The first region increases the indentation, the second one decreases it again. */
  indent(): void {
    const inc = this.first.getIndentationIncrease();
    const dec = this.second.getIndentationDecrease();
    this.first.setIndentationIncrease(inc === null ? 1 : inc + 1);
    this.second.setIndentationDecrease(dec === null ? 1 : dec + 1);
  }

  noIndentation(): void {
    this.first.setNoIndentation(true);
    this.second.setNoIndentation(true);
  }

  protected applyNewLines(minNewLines: number, defaultNewLines: number, maxNewLines: number): void {
    for (const formatting of [this.first, this.second]) {
      formatting.setNewLinesMin(minNewLines);
      formatting.setNewLinesDefault(defaultNewLines);
      formatting.setNewLinesMax(maxNewLines);
    }
  }

  setPriority(priority: number): void {
    this.first.setPriority(priority);
    this.second.setPriority(priority);
  }

  setSpace(space: string): void {
    this.first.setSpace(space);
    this.second.setSpace(space);
  }
}
