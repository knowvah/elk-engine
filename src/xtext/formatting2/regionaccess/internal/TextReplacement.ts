// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import type { ITextReplacement } from '../ITextReplacement.js';
import { AbstractTextSegment } from './AbstractTextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/TextReplacement.java */
export class TextReplacement extends AbstractTextSegment implements ITextReplacement {
  private readonly length: number;
  private readonly offset: number;
  private readonly replacement: string;
  private readonly access: ITextRegionAccess;

  constructor(access: ITextRegionAccess, offset: number, length: number, text: string) {
    super();
    if (offset < 0) throw new IllegalArgumentException('offset must be >= 0');
    if (length < 0) throw new IllegalArgumentException('length must be >= 0');
    this.access = access;
    this.offset = offset;
    this.length = length;
    this.replacement = text;
  }

  getLength(): number {
    return this.length;
  }

  getOffset(): number {
    return this.offset;
  }

  getReplacementText(): string {
    return this.replacement;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.access;
  }
}
