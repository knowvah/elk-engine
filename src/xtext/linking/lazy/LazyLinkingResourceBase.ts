// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { ResourceImpl } from '../../../emf/ecore/resource/impl/ResourceImpl.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILazyLinkingResource, LazyProxyInformation } from './ILazyLinkingResource.js';
import { LazyProxyTriple } from './LazyLinkingResourceTypes.js';

/**
 * The state `LazyLinkingResource` keeps apart from linking: the `XtextResource` validation switch and
 * the list of installed lazy proxies. Split from the class at Java method boundaries to stay within the
 * 500-line file limit; `getParseResultWrapper().toProxyInformation(...)` is a {@link LazyProxyTriple}.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinkingResource.java:506-557
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/XtextResource.java:530-539
 */
export abstract class LazyLinkingResourceBase extends ResourceImpl implements ILazyLinkingResource {
  readonly lazyLinkingResource: true = true;

  #validationDisabled = false;
  #proxyInformation: (LazyProxyInformation | null)[] = [];

  /** @see org.eclipse.xtext/src/org/eclipse/xtext/resource/XtextResource.java:530-532 */
  isValidationDisabled(): boolean {
    return this.#validationDisabled;
  }

  /** Disabling clears the errors and warnings. @see XtextResource.java:534-539 */
  setValidationDisabled(validationDisabled: boolean): void {
    this.#validationDisabled = validationDisabled;
    if (validationDisabled) {
      this.getErrors().clear();
      this.getWarnings().clear();
    }
  }

  /**
   * The installed lazy linking proxies as triples (owning object, reference, node holding the link text);
   * modifiable by subclasses. Removed entries are `null`.
   *
   * @see LazyLinkingResource.java:514-517
   */
  protected getLazyProxyInformationList(): (LazyProxyInformation | null)[] {
    return this.#proxyInformation;
  }

  /** @see LazyLinkingResource.java:522-526 */
  addLazyProxyInformation(obj: EObject, ref: EReferenceInfo, node: INode): number {
    const index = this.#proxyInformation.length;
    this.#proxyInformation.push(new LazyProxyTriple(obj, ref, node));
    return index;
  }

  /** @see LazyLinkingResource.java:531-533 */
  hasLazyProxyInformation(idx: number): boolean {
    return this.#proxyInformation[idx] != null;
  }

  /** @throws IllegalArgumentException if no triple is recorded under `idx`. @see LazyLinkingResource.java:538-543 */
  getLazyProxyInformation(idx: number): LazyProxyInformation {
    if (!this.hasLazyProxyInformation(idx)) {
      throw new IllegalArgumentException(`No proxy information for index '${idx}' available.`);
    }
    return this.#proxyInformation[idx] as LazyProxyInformation;
  }

  /** @see LazyLinkingResource.java:548-550 */
  removeLazyProxyInformation(idx: number): LazyProxyInformation | null {
    const old = this.#proxyInformation[idx] ?? null;
    this.#proxyInformation[idx] = null;
    return old;
  }

  /** @see LazyLinkingResource.java:555-557 */
  clearLazyProxyInformation(): void {
    this.#proxyInformation = [];
  }
}
