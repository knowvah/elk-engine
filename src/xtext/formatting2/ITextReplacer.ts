// SPDX-License-Identifier: EPL-2.0
import type { ITextReplacerContext } from './ITextReplacerContext.js';
import type { ITextSegment } from './regionaccess/ITextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/ITextReplacer.java */
export interface ITextReplacer {
  getRegion(): ITextSegment;
  createReplacements(context: ITextReplacerContext): ITextReplacerContext;
}

/** `ITextReplacer.GET_REGION`. */
export function getReplacerRegion(replacer: ITextReplacer): ITextSegment {
  return replacer.getRegion();
}
