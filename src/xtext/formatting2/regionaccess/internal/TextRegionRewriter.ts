// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import type { Appendable, ITextRegionRewriter } from '../ITextRegionRewriter.js';
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import type { ITextReplacement } from '../ITextReplacement.js';
import type { ITextSegment } from '../ITextSegment.js';
import { TextReplacement } from './TextReplacement.js';

/** `CharSequence.subSequence(start, end)`: throws on an invalid range where `slice` would clamp. */
function subSequence(text: string, start: number, end: number): string {
  if (start < 0 || end > text.length || start > end) {
    throw new IndexOutOfBoundsException(`begin ${start}, end ${end}, length ${text.length}`);
  }
  return text.slice(start, end);
}

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/TextRegionRewriter.java */
export class TextRegionRewriter implements ITextRegionRewriter {
  private readonly access: ITextRegionAccess;

  constructor(access: ITextRegionAccess) {
    this.access = access;
  }

  renderToAppendable(replacements: Iterable<ITextReplacement>, result: Appendable): void {
    this.renderSegmentToAppendable(this.access.regionForDocument(), replacements, result);
  }

  renderSegmentToAppendable(input: ITextSegment, rep: Iterable<ITextReplacement>, result: Appendable): void {
    const offset = input.getOffset();
    const text = input.getText();
    // Array.prototype.sort is stable, like Collections.sort
    const list = [...rep].sort((a, b) => a.compareTo(b));
    let lastOffset = 0;
    for (const r of list) {
      result.append(subSequence(text, lastOffset, r.getOffset() - offset));
      result.append(r.getReplacementText());
      lastOffset = r.getOffset() - offset + r.getLength();
    }
    if (lastOffset <= text.length) {
      result.append(subSequence(text, lastOffset, text.length));
    }
  }

  renderToString(replacements: Iterable<ITextReplacement>): string {
    return this.renderSegmentToString(this.access.regionForDocument(), replacements);
  }

  renderSegmentToString(input: ITextSegment, replacements: Iterable<ITextReplacement>): string {
    let result = '';
    this.renderSegmentToAppendable(input, replacements, {
      append: (text: string): void => {
        result += text;
      },
    });
    return result;
  }

  createReplacement(offset: number, length: number, text: string): ITextReplacement {
    return new TextReplacement(this.access, offset, length, text);
  }
}
