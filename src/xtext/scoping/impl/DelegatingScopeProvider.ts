// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { IScope } from '../IScope.js';
import type { IScopeProvider } from '../IScopeProvider.js';
import { AbstractScopeProvider } from './AbstractScopeProvider.js';
import type { IDelegatingScopeProvider } from './IDelegatingScopeProvider.js';

/**
 * Forwards `getScope` to its delegate (Java: the `@Named(NAMED_DELEGATE)` injection; here the
 * constructor argument).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/DelegatingScopeProvider.java
 */
export class DelegatingScopeProvider extends AbstractScopeProvider implements IDelegatingScopeProvider {
  private delegate: IScopeProvider;

  constructor(delegate: IScopeProvider) {
    super();
    this.delegate = delegate;
  }

  override getScope(context: EObject, reference: EReferenceInfo): IScope {
    return this.delegateGetScope(context, reference);
  }

  protected delegateGetScope(context: EObject, reference: EReferenceInfo): IScope {
    return this.getDelegate().getScope(context, reference);
  }

  setDelegate(delegate: IScopeProvider): void {
    this.delegate = delegate;
  }

  getDelegate(): IScopeProvider {
    return this.delegate;
  }
}
