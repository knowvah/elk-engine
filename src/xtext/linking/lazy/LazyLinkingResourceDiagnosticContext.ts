// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILinkingDiagnosticContext } from '../ILinkingDiagnosticMessageProvider.js';
import type { LinkingHelper } from '../impl/LinkingHelper.js';
import type { LazyProxyInformation } from './ILazyLinkingResource.js';

/** `LazyLinkingResource.DiagnosticMessageContext`. @see LazyLinkingResource.java:341-367 */
export class DiagnosticMessageContext implements ILinkingDiagnosticContext {
  readonly #triple: LazyProxyInformation;
  readonly #linkingHelper: LinkingHelper;

  constructor(triple: LazyProxyInformation, helper: LinkingHelper) {
    this.#triple = triple;
    this.#linkingHelper = helper;
  }

  getContext(): EObject {
    return this.#triple.getFirst();
  }

  getReference(): EReferenceInfo {
    return this.#triple.getSecond();
  }

  getLinkText(): string | null {
    return this.#linkingHelper.getCrossRefNodeAsString(this.#triple.getThird() as ICrossReferenceNode, true);
  }
}
