// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IQualifiedNameConverter } from '../../naming/IQualifiedNameConverter.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { EClassRef, EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { IScope } from '../../scoping/IScope.js';
import type { IScopeProvider } from '../../scoping/IScopeProvider.js';
import { AbstractLinkingService } from './AbstractLinkingService.js';
import type { LinkingHelper } from './LinkingHelper.js';

/**
 * Resolves a reference to the first element of the scope that matches the link text. Guice injection is
 * constructor parameters. The `ImportedNamesAdapter` register/unregister around `getScope` only records
 * the looked-up names for the incremental builder, so it is not ported; the `scopeProvider == null`
 * `IllegalStateException` is excluded by the constructor's type.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/DefaultLinkingService.java
 */
export class DefaultLinkingService extends AbstractLinkingService {
  readonly #scopeProvider: IScopeProvider;
  readonly #linkingHelper: LinkingHelper;
  readonly #qualifiedNameConverter: IQualifiedNameConverter;

  constructor(
    scopeProvider: IScopeProvider,
    linkingHelper: LinkingHelper,
    qualifiedNameConverter: IQualifiedNameConverter,
  ) {
    super();
    this.#scopeProvider = scopeProvider;
    this.#linkingHelper = linkingHelper;
    this.#qualifiedNameConverter = qualifiedNameConverter;
  }

  protected getScope(context: EObject, reference: EReferenceInfo): IScope {
    return this.#scopeProvider.getScope(context, reference);
  }

  /**
   * @returns the first element returned from the scope provider which matches the text of `node`
   * @throws IllegalNodeException when the node's text cannot be converted
   */
  override getLinkedObjects(
    context: EObject,
    reference: EReferenceInfo,
    node: ICrossReferenceNode,
  ): readonly EObject[] {
    // the Java null check on `getEReferenceType()`; the type excludes it, JS callers may not
    if ((reference.referenceType as EClassRef | null) === null) return [];
    const crossRefString = this.getCrossRefNodeAsString(node);
    if (crossRefString === null || crossRefString === '') return [];
    const scope = this.getScope(context, reference);
    // the Java AssertionError for a null scope; the type excludes null, JS callers may not
    if ((scope as IScope | null) === null) {
      const assertion = new Error(
        `Scope provider ${this.#scopeProvider.constructor.name} must not return null for context ${String(context)}, ` +
          `reference ${reference.name}! Consider to return IScope.NULLSCOPE instead.`,
      );
      assertion.name = 'AssertionError';
      throw assertion;
    }
    const qualifiedLinkName = this.#qualifiedNameConverter.toQualifiedName(crossRefString);
    const description = scope.getSingleElement(qualifiedLinkName);
    if (description === null) return [];
    return [description.getEObjectOrProxy()];
  }

  getCrossRefNodeAsString(node: ICrossReferenceNode): string | null {
    return this.#linkingHelper.getCrossRefNodeAsString(node, true);
  }

  getScopeProvider(): IScopeProvider {
    return this.#scopeProvider;
  }

  protected getLinkingHelper(): LinkingHelper {
    return this.#linkingHelper;
  }
}
