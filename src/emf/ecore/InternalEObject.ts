// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../common/util/EList.js';
import type { URI } from '../common/util/URI.js';
import type { EObject } from './EObject.js';
import type { ResourceInternal } from './resource/Resource.js';

/**
 * Container feature ids below this base encode a containment without an opposite:
 * `EOPPOSITE_FEATURE_BASE - featureID` of the containing list.
 *
 * @see org.eclipse.emf.ecore.InternalEObject#EOPPOSITE_FEATURE_BASE
 */
export const EOPPOSITE_FEATURE_BASE = -1;

/**
 * The internal `EObject` protocol the lists and `BasicEObjectImpl` call (decision D4). EMF's
 * `NotificationChain` arguments and `Class<?> baseClass` arguments are dropped. Decision D13 adds the
 * proxy and resource members. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.InternalEObject
 */
export interface InternalEObject extends EObject {
  eContainer(): InternalEObject | null;
  eContents(): EList<InternalEObject>;
  eAllContents(): IterableIterator<InternalEObject>;
  eInternalContainer(): InternalEObject | null;
  eContainerFeatureID(): number;
  eBasicSetContainer(newContainer: InternalEObject | null, newContainerFeatureID: number): void;
  eBasicRemoveFromContainer(): void;
  eInverseAdd(otherEnd: InternalEObject, featureID: number): void;
  eInverseRemove(otherEnd: InternalEObject, featureID: number): void;
  /**
   * Whether this object is an unresolved proxy (it has a proxy URI). EMF declares this and
   * `eResource` on `EObject`; they live here because structural `EObject` implementations outside
   * `src/emf` (test fixtures) do not carry them.
   *
   * @see org.eclipse.emf.ecore.EObject#eIsProxy()
   */
  eIsProxy(): boolean;
  /** The resource holding this object or one of its containers as a direct content, or `null`. @see org.eclipse.emf.ecore.EObject#eResource() */
  eResource(): ResourceInternal | null;
  /** The proxy URI, or `null` for a resolved object. @see org.eclipse.emf.ecore.InternalEObject#eProxyURI() */
  eProxyURI(): URI | null;
  /** Makes this object a proxy of `uri` (`null` makes it a resolved object again). @see org.eclipse.emf.ecore.InternalEObject#eSetProxyURI(URI) */
  eSetProxyURI(uri: URI | null): void;
  /** Resolves `proxy` in the resource set of this object. @see org.eclipse.emf.ecore.InternalEObject#eResolveProxy(InternalEObject) */
  eResolveProxy(proxy: InternalEObject): EObject;
  /** The resource that holds this object itself as a root content, or `null`. @see org.eclipse.emf.ecore.InternalEObject#eDirectResource() */
  eDirectResource(): ResourceInternal | null;
  /** Like `eResource`, typed as the internal resource. @see org.eclipse.emf.ecore.InternalEObject#eInternalResource() */
  eInternalResource(): ResourceInternal | null;
  /** Sets (or with `null` clears) the direct resource. @see org.eclipse.emf.ecore.InternalEObject#eSetResource(Resource.Internal, org.eclipse.emf.common.notify.NotificationChain) */
  eSetResource(resource: ResourceInternal | null): void;
}
