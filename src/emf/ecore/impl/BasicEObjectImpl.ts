// SPDX-License-Identifier: EPL-2.0
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { BasicEList } from '../../common/util/BasicEList.js';
import type { EList } from '../../common/util/EList.js';
import type { URI } from '../../common/util/URI.js';
import type { EClass } from '../EClass.js';
import type { EObject } from '../EObject.js';
import { EOPPOSITE_FEATURE_BASE, type InternalEObject } from '../InternalEObject.js';
import type { ResourceInternal } from '../resource/Resource.js';
import { EcoreUtil } from '../util/EcoreUtil.js';

/** D10: `toString` names the generated ElkGraph implementation class, without `@identityHash`. */
const ELK_GRAPH_IMPL_PACKAGE = 'org.eclipse.elk.graph.impl.';
const IMPL_SUFFIX = 'Impl';

/** EMF restarts a container walk from the current container after this many steps. */
const MAX_CONTAINER_STEPS = 100000;

/** The `EPropertiesHolder` of `BasicEObjectImpl`: created on first write, so a plain object pays one null field. */
interface EProperties {
  eResource: ResourceInternal | null;
  eProxyURI: URI | null;
}

/**
 * EMF's `BasicEObjectImpl` with the container storage of `MinimalEObjectImpl.Container`, reduced to
 * decision D4: container pointer and feature id, `eContents`, `eAllContents`, `eClass`. The
 * `NotificationChain` returns are dropped and each `Class<?> baseClass` overload is merged with its
 * three-argument twin: subclasses override `eInverseAdd`/`eInverseRemove` with the generated
 * `switch` bodies and fall through to this base. Decision D13 adds the proxy URI, the direct
 * resource and `eResource`/`eResolveProxy`. Not ported: notifications, adapters, `eGet`/`eSet`/
 * `eIsSet`, `eURIFragmentSegment`/`eObjectForURIFragmentSegment`, the dynamic-feature paths.
 * EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl
 * @see org.eclipse.emf.ecore.impl.MinimalEObjectImpl.Container
 */
export abstract class BasicEObjectImpl implements InternalEObject {
  #eContainer: InternalEObject | null = null;
  #eContainerFeatureID = 0;
  #eProperties: EProperties | null = null;

  /**
   * EMF resolves a proxy container here (`eIsProxy()` then `eResolveProxy`, around line 807). That
   * arm is unreachable for ElkGraph: containment is never proxied (the generated lists are
   * non-resolving and every containment is `!IS_RESOLVE_PROXIES`), so the container is returned as is.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eContainer()
   */
  eContainer(): InternalEObject | null {
    return this.eInternalContainer();
  }

  eInternalContainer(): InternalEObject | null {
    return this.#eContainer;
  }

  eContainerFeatureID(): number {
    return this.#eContainerFeatureID;
  }

  /**
   * The three-argument EMF method with its resource handling: an object that is a direct content of
   * a resource and gets a container leaves the resource's contents (`basicRemove`) and loses its
   * direct resource (every ElkGraph containment is `!IS_RESOLVE_PROXIES`, so EMF takes this arm).
   * `attached`/`detached` of the old and new resource do nothing in the port; notifications are
   * not ported, leaving the two field writes.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eBasicSetContainer(InternalEObject, int, org.eclipse.emf.common.notify.NotificationChain)
   */
  eBasicSetContainer(newContainer: InternalEObject | null, newContainerFeatureID: number): void {
    const oldResource = this.eDirectResource();
    if (oldResource !== null && newContainer !== null) {
      oldResource.getContents().basicRemove(this);
      this.#eSetDirectResource(null);
    }
    this.#eContainer = newContainer;
    this.#eContainerFeatureID = newContainerFeatureID;
  }

  /**
   * Callers check for a container first; with none, the container call fails like Java's NPE.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eBasicRemoveFromContainer(org.eclipse.emf.common.notify.NotificationChain)
   */
  eBasicRemoveFromContainer(): void {
    const eContainerFeatureID = this.eContainerFeatureID();
    if (eContainerFeatureID >= 0) {
      this.eBasicRemoveFromContainerFeature();
    } else {
      (this.eInternalContainer() as InternalEObject).eInverseRemove(this, EOPPOSITE_FEATURE_BASE - eContainerFeatureID);
    }
  }

  /** The generated `switch` over `eContainerFeatureID()`. @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eBasicRemoveFromContainerFeature(org.eclipse.emf.common.notify.NotificationChain) */
  abstract eBasicRemoveFromContainerFeature(): void;

  /**
   * EMF's two overloads in one: generated subclasses override with their `switch` and end with
   * `default: super.eInverseAdd(otherEnd, featureID)`. A negative id is a containment without an
   * opposite (`EOPPOSITE_FEATURE_BASE - featureID` of the owner's list): leave the old container,
   * then take the new one. A non-negative id reaching this base would go to EMF's dynamic feature
   * delegate, which is not ported (D4).
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eInverseAdd(InternalEObject, int, Class, org.eclipse.emf.common.notify.NotificationChain)
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eInverseAdd(InternalEObject, int, org.eclipse.emf.common.notify.NotificationChain)
   */
  eInverseAdd(otherEnd: InternalEObject, featureID: number): void {
    if (featureID >= 0) {
      throw new UnsupportedOperationException(`eInverseAdd: no generated case for feature ${featureID}`);
    }
    if (this.eInternalContainer() !== null) {
      this.eBasicRemoveFromContainer();
    }
    this.eBasicSetContainer(otherEnd, featureID);
  }

  /**
   * The removal counterpart of {@link eInverseAdd}: a negative id clears the container (keeping
   * the feature id); a non-negative id reaching this base is not ported (D4).
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eInverseRemove(InternalEObject, int, Class, org.eclipse.emf.common.notify.NotificationChain)
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eInverseRemove(InternalEObject, int, org.eclipse.emf.common.notify.NotificationChain)
   */
  eInverseRemove(_otherEnd: InternalEObject, featureID: number): void {
    if (featureID >= 0) {
      throw new UnsupportedOperationException(`eInverseRemove: no generated case for feature ${featureID}`);
    }
    this.eBasicSetContainer(null, featureID);
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eProxyURI() */
  eProxyURI(): URI | null {
    return this.#eProperties === null ? null : this.#eProperties.eProxyURI;
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eSetProxyURI(URI) */
  eSetProxyURI(uri: URI | null): void {
    this.#eProps().eProxyURI = uri;
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eResolveProxy(InternalEObject) */
  eResolveProxy(proxy: InternalEObject): EObject {
    return EcoreUtil.resolveFromObject(proxy, this);
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eIsProxy() */
  eIsProxy(): boolean {
    return this.eProxyURI() !== null;
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eDirectResource() */
  eDirectResource(): ResourceInternal | null {
    return this.#eProperties === null ? null : this.#eProperties.eResource;
  }

  /** @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eResource() */
  eResource(): ResourceInternal | null {
    return this.eInternalResource();
  }

  /**
   * The direct resource, else that of the nearest container that has one. As in EMF the walk stops
   * on coming back to this object, and restarts recursively from the current container after
   * 100000 steps (a cycle above this object).
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eInternalResource()
   */
  eInternalResource(): ResourceInternal | null {
    let result = this.eDirectResource();
    if (result === null) {
      let count = 0;
      for (
        let eContainer = this.eInternalContainer();
        eContainer !== null;
        eContainer = eContainer.eInternalContainer()
      ) {
        if (++count > MAX_CONTAINER_STEPS) {
          return eContainer.eInternalResource();
        }
        result = eContainer.eDirectResource();
        if (result !== null || eContainer === this) {
          break;
        }
      }
    }
    return result;
  }

  /**
   * Replacing a direct resource first removes this object from the old resource's contents; an
   * object with a container then leaves it (the `!isResolveProxies` arm: every ElkGraph containment
   * is `!IS_RESOLVE_PROXIES`); finally the direct resource is stored. `attached`/`detached` are
   * not ported.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eSetResource(Resource.Internal, org.eclipse.emf.common.notify.NotificationChain)
   */
  eSetResource(resource: ResourceInternal | null): void {
    const oldResource = this.eDirectResource();
    if (oldResource !== null && resource !== null) {
      oldResource.getContents().basicRemove(this);
    }
    if (this.eInternalContainer() !== null) {
      this.eBasicRemoveFromContainer();
      this.eBasicSetContainer(null, -1);
    }
    this.#eSetDirectResource(resource);
  }

  #eSetDirectResource(resource: ResourceInternal | null): void {
    this.#eProps().eResource = resource;
  }

  /** `eProperties()`: the holder, created on first write. */
  #eProps(): EProperties {
    this.#eProperties ??= { eResource: null, eProxyURI: null };
    return this.#eProperties;
  }

  abstract eClass(): EClass;

  /** The containment lists in metamodel declaration order (EMF reads `eClass().getEAllContainments()`). */
  protected abstract eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>>;

  /**
   * A snapshot of every containment list, in declaration order. EMF returns a live, unmodifiable
   * `EContentsEList` view.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eContents()
   */
  eContents(): EList<InternalEObject> {
    const result = new BasicEList<InternalEObject>();
    for (const feature of this.eContainmentFeatures()) {
      result.addAll(feature);
    }
    return result;
  }

  /**
   * EMF's `AbstractTreeIterator(this, false)`: depth-first pre-order without the root, a stack of
   * child iterators, each element's children fetched when it is returned. There is no cycle guard,
   * so a containment cycle makes the walk endless, as in EMF.
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#eAllContents()
   */
  *eAllContents(): Generator<InternalEObject, void, undefined> {
    const stack: Array<Iterator<InternalEObject>> = [this.eContents().iterator()];
    while (stack.length > 0) {
      const next = (stack[stack.length - 1] as Iterator<InternalEObject>).next();
      if (next.done === true) {
        stack.pop();
      } else {
        stack.push(next.value.eContents().iterator());
        yield next.value;
      }
    }
  }

  /**
   * Java `getClass().getName()`: the generated impl class of this object's `EClass`.
   */
  protected javaClassName(): string {
    return `${ELK_GRAPH_IMPL_PACKAGE}${this.eClass().getName()}${IMPL_SUFFIX}`;
  }

  /**
   * EMF appends `'@' + Integer.toHexString(hashCode())` and, for proxies, the proxy URI; the port
   * has neither (decision D10).
   *
   * @see org.eclipse.emf.ecore.impl.BasicEObjectImpl#toString()
   */
  toString(): string {
    return this.javaClassName();
  }
}
