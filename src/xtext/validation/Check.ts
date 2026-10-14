// SPDX-License-Identifier: EPL-2.0
import { CheckType } from './CheckType.js';

/**
 * The check type of a check registered without one: the default of the `@Check` annotation's `value`.
 * The annotation itself is replaced by explicit `addCheck` registration (no reflection).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/Check.java
 */
export const DEFAULT_CHECK_TYPE: CheckType = CheckType.FAST;
