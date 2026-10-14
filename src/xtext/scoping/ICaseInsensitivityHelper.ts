// SPDX-License-Identifier: EPL-2.0
import type { EReferenceInfo } from './EReferenceInfo.js';

/**
 * Decides whether a reference is resolved ignoring case.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/ICaseInsensitivityHelper.java
 */
export interface ICaseInsensitivityHelper {
  isIgnoreCase(reference: EReferenceInfo): boolean;
}
