// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import type { IMerger } from '../IMerger.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { IHiddenRegion } from '../regionaccess/IHiddenRegion.js';
import { isCompositeTextReplacer, type ICompositeTextReplacer } from './ICompositeTextReplacer.js';
import { HiddenRegionReplacer } from './HiddenRegionReplacer.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/TextReplacerMerger.java */
export class TextReplacerMerger implements IMerger<ITextReplacer> {
  private readonly formatter: AbstractFormatter2;
  private readonly merger: IMerger<IHiddenRegionFormatting>;

  constructor(formatter: AbstractFormatter2) {
    this.formatter = formatter;
    this.merger = formatter.createHiddenRegionFormattingMerger();
  }

  merge(conflicting: readonly ITextReplacer[]): ITextReplacer | null {
    const result = this.mergeHiddenRegionReplacers(conflicting);
    if (result === null) return this.mergeCompositeReplacers(conflicting);
    return result;
  }

  protected mergeCompositeReplacers(conflicting: readonly ITextReplacer[]): ITextReplacer | null {
    let composite: ICompositeTextReplacer | null = null;
    for (const replacer of conflicting) {
      if (isCompositeTextReplacer(replacer)) {
        if (composite === null) {
          composite = replacer;
        } else {
          return null;
        }
      }
    }
    if (composite === null) return null;
    for (const r of conflicting) {
      if (r !== composite) composite.addReplacer(r);
    }
    return composite;
  }

  protected mergeHiddenRegionReplacers(conflicting: readonly ITextReplacer[]): ITextReplacer | null {
    const formattings: IHiddenRegionFormatting[] = [];
    let region: IHiddenRegion | null = null;
    for (const replacer of conflicting) {
      if (!(replacer instanceof HiddenRegionReplacer)) return null;
      formattings.push(replacer.getFormatting());
      if (region === null) {
        region = replacer.getRegion();
      } else if (region !== replacer.getRegion()) {
        return null;
      }
    }
    const mergedFormatting = this.merger.merge(formattings);
    if (mergedFormatting !== null && region !== null) {
      return this.formatter.createHiddenRegionReplacer(region, mergedFormatting);
    }
    return null;
  }
}
