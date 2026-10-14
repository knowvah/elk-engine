// SPDX-License-Identifier: EPL-2.0
import type { IScope } from '../IScope.js';

/**
 * Wraps the global scope a provider hands out.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/IScopeWrapper.java
 */
export interface IScopeWrapper {
  wrap(scope: IScope): IScope;
}
