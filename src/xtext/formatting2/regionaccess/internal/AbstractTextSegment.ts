// SPDX-License-Identifier: EPL-2.0
import type { ITextRegion } from '../ITextRegion.js';
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import type { ITextReplacement } from '../ITextReplacement.js';
import type { ITextSegment } from '../ITextSegment.js';

const CR = '\r';
const LF = '\n';

/**
 * `Strings.countLineBreaks(text)`: `\r`, `\n` and `\r\n` each count one (the `LineNumberReader` semantics).
 * Local copy of `org.eclipse.xtext.util.Strings.countLineBreaks(CharSequence, int, int)` (the util `Strings` port
 * is T7's and outside this task's write-set).
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Strings.java
 */
export function countLineBreaks(text: string): number {
  let result = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === CR) {
      result++;
      if (i + 1 < text.length && text.charAt(i + 1) === LF) {
        i++;
      }
    } else if (ch === LF) {
      result++;
    }
  }
  return result;
}

/**
 * Base of every region. `equals`/`hashCode` (no caller), `contains(int)`, `merge` and `getLineRegions` are not
 * ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractTextSegment.java
 */
export abstract class AbstractTextSegment implements ITextSegment {
  abstract getOffset(): number;
  abstract getLength(): number;
  abstract getTextRegionAccess(): ITextRegionAccess;

  compareTo(o: ITextSegment): number {
    const cmp1 = this.getOffset() - o.getOffset();
    if (cmp1 !== 0) return cmp1;
    const cmp2 = this.getLength() - o.getLength();
    if (cmp2 !== 0) return cmp2;
    return 0;
  }

  contains(other: ITextRegion): boolean {
    const offset = this.getOffset();
    const length = this.getLength();
    return other.getOffset() + other.getLength() <= offset + length && other.getOffset() >= offset;
  }

  getEndOffset(): number {
    return this.getOffset() + this.getLength();
  }

  getLineCount(): number {
    return countLineBreaks(this.getText()) + 1;
  }

  getText(): string {
    return this.getTextRegionAccess().textForOffset(this.getOffset(), this.getLength());
  }

  isMultiline(): boolean {
    return this.getText().includes(LF);
  }

  replaceWith(text: string): ITextReplacement {
    return this.getTextRegionAccess().getRewriter().createReplacement(this.getOffset(), this.getLength(), text);
  }
}
