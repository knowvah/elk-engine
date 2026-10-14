// SPDX-License-Identifier: EPL-2.0
import type { ITextReplacer } from '../ITextReplacer.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/internal/ICompositeTextReplacer.java */
export interface ICompositeTextReplacer extends ITextReplacer {
  addReplacer(replacer: ITextReplacer): void;
}

/** Java `replacer instanceof ICompositeTextReplacer`. */
export function isCompositeTextReplacer(replacer: ITextReplacer): replacer is ICompositeTextReplacer {
  return 'addReplacer' in replacer;
}
