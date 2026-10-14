// SPDX-License-Identifier: EPL-2.0
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import { AbstractTextSegment } from './AbstractTextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/TextSegment.java */
export class TextSegment extends AbstractTextSegment {
  private readonly length: number;
  private readonly offset: number;
  private readonly regionAccess: ITextRegionAccess;

  constructor(regionAccess: ITextRegionAccess, offset: number, length: number) {
    super();
    this.regionAccess = regionAccess;
    this.offset = offset;
    this.length = length;
  }

  getLength(): number {
    return this.length;
  }

  getOffset(): number {
    return this.offset;
  }

  getTextRegionAccess(): ITextRegionAccess {
    return this.regionAccess;
  }
}
