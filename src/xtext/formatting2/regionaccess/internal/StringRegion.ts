// SPDX-License-Identifier: EPL-2.0
import type { ITextRegionAccess } from '../ITextRegionAccess.js';
import { AbstractTextSegment } from './AbstractTextSegment.js';
import type { StringBasedRegionAccess } from './StringBasedRegionAccess.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/StringRegion.java */
export class StringRegion extends AbstractTextSegment {
  private readonly length: number;
  private readonly offset: number;
  private readonly access: StringBasedRegionAccess;

  constructor(access: StringBasedRegionAccess, offset: number, length: number) {
    super();
    this.access = access;
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
    return this.access;
  }
}
