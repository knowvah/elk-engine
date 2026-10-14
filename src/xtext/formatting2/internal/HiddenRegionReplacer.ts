// SPDX-License-Identifier: EPL-2.0
import type { AbstractFormatter2 } from '../AbstractFormatter2.js';
import type { IHiddenRegionFormatting } from '../IHiddenRegionFormatting.js';
import type { ITextReplacer } from '../ITextReplacer.js';
import type { ITextReplacerContext } from '../ITextReplacerContext.js';
import type { IHiddenRegion } from '../regionaccess/IHiddenRegion.js';

/**
 * Applies the formatting of a hidden region. A hidden region of the writer has no parts (no comments or
 * whitespace, see `AbstractHiddenRegion`), so only the first arm of `createReplacements` (lines 71-74: no
 * parts, one `WhitespaceReplacer` over the region itself) is reachable. The other two arms (a single
 * `IWhitespace` part; comment-bearing regions with `createReplacers`, `applyHiddenRegionFormatting`,
 * `applyIndentation`, `applySeparatorConfiguration`, `applyPriorityAndDefaultFormatting`,
 * `introduceNewlinesAroundMLComments`, `findWhitespaceThatSeparatesSemanticRegions`) need parts and are not
 * ported; `toString` (debug printer) is not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/HiddenRegionReplacer.java
 */
export class HiddenRegionReplacer implements ITextReplacer {
  private readonly formatting: IHiddenRegionFormatting;
  private readonly region: IHiddenRegion;

  constructor(region: IHiddenRegion, formatting: IHiddenRegionFormatting) {
    this.region = region;
    this.formatting = formatting;
  }

  createReplacements(context: ITextReplacerContext): ITextReplacerContext {
    const formatter: AbstractFormatter2 = context.getFormatter();
    return formatter.createWhitespaceReplacer(this.region, this.formatting).createReplacements(context);
  }

  getFormatting(): IHiddenRegionFormatting {
    return this.formatting;
  }

  getRegion(): IHiddenRegion {
    return this.region;
  }
}
