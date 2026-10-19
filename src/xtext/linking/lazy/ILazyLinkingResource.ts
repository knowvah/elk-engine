// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { ResourceInternal } from '../../../emf/ecore/resource/Resource.js';
import type { INode } from '../../nodemodel/INode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';

/**
 * `org.eclipse.xtext.util.Triple` as `LazyLinkingResource` stores it: the object holding the reference,
 * the reference, and the node that provided its value.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/util/Triple.java
 */
export interface LazyProxyInformation {
  getFirst(): EObject;
  getSecond(): EReferenceInfo;
  getThird(): INode;
}

/**
 * What `LazyURIEncoder` and `LazyLinker` need from `LazyLinkingResource`. Xtext has no such interface
 * (both classes use the class itself, `instanceof` included); this port-local one lets `LazyLinkingResource`
 * (T12d) depend on the linker rather than the reverse. The brand replaces
 * `resource instanceof LazyLinkingResource`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/lazy/LazyLinkingResource.java:522-555
 */
export interface ILazyLinkingResource extends ResourceInternal {
  /** Always `true`: the marker `isLazyLinkingResource` tests. */
  readonly lazyLinkingResource: true;

  /** Records the triple and returns its index (the number in the `|n` fragment). */
  addLazyProxyInformation(obj: EObject, ref: EReferenceInfo, node: INode): number;

  /** The triple recorded under `idx`, or `null` (a removed or unknown index). */
  getLazyProxyInformation(idx: number): LazyProxyInformation | null;
}

/** `resource instanceof LazyLinkingResource`. */
export function isLazyLinkingResource(resource: unknown): resource is ILazyLinkingResource {
  return (
    typeof resource === 'object' &&
    resource !== null &&
    (resource as { lazyLinkingResource?: unknown }).lazyLinkingResource === true
  );
}

/**
 * `obj.eResource()`. The port's `EObject` omits `eResource` (decision D13 keeps it on `InternalEObject`
 * so test fixtures stay structural); an object without it is in no resource.
 */
export function eResourceOf(obj: EObject): ResourceInternal | null {
  const candidate = obj as { eResource?: () => ResourceInternal | null };
  return typeof candidate.eResource === 'function' ? candidate.eResource() : null;
}
