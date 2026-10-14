// SPDX-License-Identifier: EPL-2.0
import type { IScopeProvider } from '../IScopeProvider.js';

/**
 * A provider that forwards to another. The `setWrapper` default and its static helper are not
 * ported: no scope wrapper is ever installed (the `ImportedNamesAdapter` tracking they serve
 * is not reached).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/IDelegatingScopeProvider.java
 */
export interface IDelegatingScopeProvider extends IScopeProvider {
  getDelegate(): IScopeProvider;
}
