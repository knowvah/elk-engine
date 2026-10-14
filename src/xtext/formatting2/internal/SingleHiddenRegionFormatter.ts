// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from '../FormatterRequest.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import { AbstractHiddenRegionFormatter } from './AbstractHiddenRegionFormatter.js';

/**
 * Formats one hidden region (`append`/`prepend`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/SingleHiddenRegionFormatter.java
 */
export class SingleHiddenRegionFormatter extends AbstractHiddenRegionFormatter {
  private readonly formatting: IHiddenRegionFormatting;

  constructor(formatting: IHiddenRegionFormatting) {
    super();
    this.formatting = formatting;
  }

  getRequest(): FormatterRequest {
    return this.formatting.getRequest();
  }

  indent(): void {
    const inc = this.formatting.getIndentationIncrease();
    const dec = this.formatting.getIndentationDecrease();
    this.formatting.setIndentationIncrease(inc === null ? 1 : inc + 1);
    this.formatting.setIndentationDecrease(dec === null ? 1 : dec + 1);
  }

  noIndentation(): void {
    this.formatting.setNoIndentation(true);
  }

  protected applyNewLines(minNewLines: number, defaultNewLines: number, maxNewLines: number): void {
    this.formatting.setNewLinesMin(minNewLines);
    this.formatting.setNewLinesDefault(defaultNewLines);
    this.formatting.setNewLinesMax(maxNewLines);
  }

  setPriority(priority: number): void {
    this.formatting.setPriority(priority);
  }

  setSpace(space: string): void {
    this.formatting.setSpace(space);
  }
}
