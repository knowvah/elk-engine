// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { RuntimeException } from '../../../java/lang/RuntimeException.js';
import type { EObject } from '../EObject.js';
import type { InternalEObject } from '../InternalEObject.js';
import type { ResourceSet } from '../resource/ResourceSet.js';

/** EMF restarts a container walk from the current container after this many steps. */
const MAX_CONTAINER_STEPS = 100000;

/**
 * Whether `ancestorEObject` is `eObject` or one of its transitive containers. A walk that comes
 * back to `eObject` stops; one stuck in a cycle above `eObject` restarts inside the cycle.
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#isAncestor(org.eclipse.emf.ecore.EObject, org.eclipse.emf.ecore.EObject)
 */
function isAncestor(ancestorEObject: InternalEObject | null, eObject: InternalEObject | null): boolean {
  if (eObject !== null) {
    if (eObject === ancestorEObject) {
      return true;
    }
    let count = 0;
    for (
      let eContainer = eObject.eInternalContainer();
      eContainer !== null && eContainer !== eObject;
      eContainer = eContainer.eInternalContainer()
    ) {
      if (++count > MAX_CONTAINER_STEPS) {
        return isAncestor(ancestorEObject, eContainer);
      }
      if (eContainer === ancestorEObject) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The topmost container of `eObject` (itself when uncontained).
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#getRootContainer(org.eclipse.emf.ecore.EObject)
 */
function getRootContainer(eObject: InternalEObject): InternalEObject;
function getRootContainer(eObject: InternalEObject | null): InternalEObject | null;
function getRootContainer(eObject: InternalEObject | null): InternalEObject | null {
  let result = eObject;
  if (eObject !== null) {
    let count = 0;
    for (let parent = eObject.eContainer(); parent !== null; parent = parent.eContainer()) {
      if (++count > MAX_CONTAINER_STEPS) {
        return getRootContainer(parent);
      }
      result = parent;
      if (parent === eObject) {
        throw new IllegalStateException(`There is a cycle in the containment hierarchy of ${eObject.toString()}`);
      }
    }
  }
  return result;
}

/**
 * The object a proxy stands for, found through its proxy URI in `resourceSet`; proxy chains are
 * followed. The result is the proxy itself when it has no proxy URI, the lookup finds nothing (or
 * the proxy), or the lookup throws. First the lookup runs with demand loading; if that throws a
 * `RuntimeException`, it runs again without. The outer catch swallows a failure of that retry or of
 * the chain, as EMF does ("Failure to resolve is ignored").
 *
 * EMF resolves against the global `EPackage` registry when `resourceSet` is `null`, looking for a
 * package registered under the proxy URI without its fragment. The port has no registry (nothing is
 * ever registered), so that arm finds nothing and the proxy is returned.
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#resolve(org.eclipse.emf.ecore.EObject, org.eclipse.emf.ecore.resource.ResourceSet)
 */
function resolve(proxy: EObject, resourceSet: ResourceSet | null): EObject {
  const proxyURI = (proxy as InternalEObject).eProxyURI();
  if (proxyURI !== null) {
    try {
      let resolvedObject: EObject | null = null;
      if (resourceSet !== null) {
        try {
          resolvedObject = resourceSet.getEObject(proxyURI, true);
        } catch (exception) {
          if (!(exception instanceof RuntimeException)) {
            throw exception;
          }
          resolvedObject = resourceSet.getEObject(proxyURI, false);
        }
      }
      if (resolvedObject !== null && resolvedObject !== proxy) {
        return resolve(resolvedObject, resourceSet);
      }
    } catch (exception) {
      if (!(exception instanceof RuntimeException)) {
        throw exception;
      }
      // Failure to resolve is ignored.
    }
  }
  return proxy;
}

/**
 * `resolve` against the resource set of the resource that holds `objectContext` (none for a
 * `null` context or an object outside a resource set).
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil#resolve(org.eclipse.emf.ecore.EObject, org.eclipse.emf.ecore.EObject)
 */
function resolveFromObject(proxy: EObject, objectContext: InternalEObject | null): EObject {
  const resourceContext = objectContext !== null ? objectContext.eResource() : null;
  return resolve(proxy, resourceContext !== null ? resourceContext.getResourceSet() : null);
}

/**
 * The `EcoreUtil` operations the port needs. Java's `resolve` overloads are split by their second
 * parameter: `resolve(EObject, ResourceSet)` is `resolve`, `resolve(EObject, EObject)` is
 * `resolveFromObject`; `resolve(EObject, Resource)` is not ported (no caller). EMF is EPL-2.0
 * (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.EcoreUtil
 */
export const EcoreUtil = { isAncestor, getRootContainer, resolve, resolveFromObject } as const;
