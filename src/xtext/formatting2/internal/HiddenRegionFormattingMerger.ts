// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import type { IMerger } from '../IMerger.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/HiddenRegionFormattingMerger.java */
export class HiddenRegionFormattingMerger implements IMerger<IHiddenRegionFormatting> {
  private readonly formatter: AbstractFormatter2;

  constructor(formatter: AbstractFormatter2) {
    this.formatter = formatter;
  }

  merge(conflicting: readonly IHiddenRegionFormatting[]): IHiddenRegionFormatting {
    // If there are only 2 conflicts, usages of this method expect the second value to be updated to the merge
    // result (Xtext TODO: fix those usages so they no longer expect this method to edit its input)
    if (conflicting.length === 2) {
      conflicting[1]!.mergeValuesFrom(conflicting[0]!);
      return conflicting[1]!;
    }
    const result = this.formatter.createHiddenRegionFormatting();
    // Reversed so the merging order is consistent with the special case above
    for (const conflict of [...conflicting].reverse()) {
      result.mergeValuesFrom(conflict);
    }
    return result;
  }
}
