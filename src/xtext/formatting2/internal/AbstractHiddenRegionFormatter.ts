// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from '../FormatterRequest.js';
import { HIGH_PRIORITY, LOW_PRIORITY, type IHiddenRegionFormatter } from '../IHiddenRegionFormatter.js';

/**
 * Shared commands in terms of `setPriority`/`setSpace`/`setNewLines`. `setNewLines(int)` sets min, default and
 * max alike.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/AbstractHiddenRegionFormatter.java
 */
export abstract class AbstractHiddenRegionFormatter implements IHiddenRegionFormatter {
  abstract getRequest(): FormatterRequest;
  abstract setPriority(priority: number): void;
  abstract noIndentation(): void;
  abstract indent(): void;
  abstract setSpace(space: string): void;
  protected abstract applyNewLines(minNewLines: number, defaultNewLines: number, maxNewLines: number): void;

  highPriority(): void {
    this.setPriority(HIGH_PRIORITY);
  }

  lowPriority(): void {
    this.setPriority(LOW_PRIORITY);
  }

  newLine(): void {
    this.setNewLines(1);
  }

  noSpace(): void {
    this.setSpace('');
  }

  oneSpace(): void {
    this.setSpace(' ');
  }

  setNewLines(newLines: number): void;
  setNewLines(minNewLines: number, defaultNewLines: number, maxNewLines: number): void;
  setNewLines(minNewLines: number, defaultNewLines?: number, maxNewLines?: number): void {
    if (defaultNewLines === undefined || maxNewLines === undefined) {
      this.applyNewLines(minNewLines, minNewLines, minNewLines);
    } else {
      this.applyNewLines(minNewLines, defaultNewLines, maxNewLines);
    }
  }
}
