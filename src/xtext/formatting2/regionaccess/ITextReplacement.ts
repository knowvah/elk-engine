// SPDX-License-Identifier: EPL-2.0
import type { ITextSegment } from './ITextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ITextReplacement.java */
export interface ITextReplacement extends ITextSegment {
  getReplacementText(): string;
}
