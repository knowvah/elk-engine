// SPDX-License-Identifier: EPL-2.0
import type { FormatterRequest } from './FormatterRequest.js';
import type { ITextReplacement } from './regionaccess/ITextReplacement.js';

/**
 * The Java method is `format(FormatterRequest)`; it is `formatRequest` here because `AbstractFormatter2` also has
 * the abstract dispatch method `format(Object, IFormattableDocument)` (see there).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/IFormatter2.java
 */
export interface IFormatter2 {
  formatRequest(request: FormatterRequest): ITextReplacement[];
}
