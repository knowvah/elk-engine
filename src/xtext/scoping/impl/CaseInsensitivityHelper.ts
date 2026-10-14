// SPDX-License-Identifier: EPL-2.0
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { ICaseInsensitivityHelper } from '../ICaseInsensitivityHelper.js';

/** The `@IgnoreCaseLinking` default; `ElkGraphRuntimeModule` does not bind it (`IgnoreCaseLinking = false`). */
const DEFAULT_IGNORE_CASE_LINKING = false;

/**
 * One flag for every reference (the Java field with the optional `@IgnoreCaseLinking` injection).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/CaseInsensitivityHelper.java
 */
export class CaseInsensitivityHelper implements ICaseInsensitivityHelper {
  constructor(private readonly ignoreCase: boolean = DEFAULT_IGNORE_CASE_LINKING) {}

  isIgnoreCase(_reference: EReferenceInfo): boolean {
    return this.ignoreCase;
  }
}
