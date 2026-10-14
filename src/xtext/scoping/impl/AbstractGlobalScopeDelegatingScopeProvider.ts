// SPDX-License-Identifier: EPL-2.0
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { Resource } from '../../util/IResourceScopeCache.js';
import type { EReferenceInfo } from '../EReferenceInfo.js';
import type { ICaseInsensitivityHelper } from '../ICaseInsensitivityHelper.js';
import type { IGlobalScopeProvider } from '../IGlobalScopeProvider.js';
import type { IScope } from '../IScope.js';
import { AbstractScopeProvider } from './AbstractScopeProvider.js';
import type { IScopeWrapper } from './IScopeWrapper.js';

/**
 * A provider that starts from the global scope.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/AbstractGlobalScopeDelegatingScopeProvider.java
 */
export abstract class AbstractGlobalScopeDelegatingScopeProvider extends AbstractScopeProvider {
  private scopeWrapper: IScopeWrapper | null = null;

  protected constructor(
    private readonly globalScopeProvider: IGlobalScopeProvider,
    private readonly caseInsensitivityHelper: ICaseInsensitivityHelper,
  ) {
    super();
  }

  protected getGlobalScope(
    context: Resource,
    reference: EReferenceInfo,
    filter: ((d: IEObjectDescription) => boolean) | null = null,
  ): IScope {
    return this.wrap(this.globalScopeProvider.getScope(context, reference, filter));
  }

  setWrapper(wrapper: IScopeWrapper | null): void {
    this.scopeWrapper = wrapper;
  }

  protected wrap(scope: IScope): IScope {
    return this.scopeWrapper !== null ? this.scopeWrapper.wrap(scope) : scope;
  }

  protected isIgnoreCase(reference: EReferenceInfo): boolean {
    return this.caseInsensitivityHelper.isIgnoreCase(reference);
  }
}
