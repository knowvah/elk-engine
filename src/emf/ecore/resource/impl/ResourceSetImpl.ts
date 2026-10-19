// SPDX-License-Identifier: EPL-2.0
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { BasicEList } from '../../../common/util/BasicEList.js';
import type { EList } from '../../../common/util/EList.js';
import type { URI } from '../../../common/util/URI.js';
import type { EObject } from '../../EObject.js';
import type { InternalEList } from '../../util/InternalEList.js';
import type { Resource, ResourceInternal } from '../Resource.js';
import type { ResourceSet } from '../ResourceSet.js';

/**
 * `ResourceSetImpl.ResourcesEList`: the unique, non-null list of resources of the set. Adding a
 * resource sets its containing set, removing it clears that. The `uriResourceMap` cache of the
 * set and the `contains` shortcut for more than four elements are not ported.
 *
 * @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl.ResourcesEList
 */
export class ResourcesEList extends BasicEList<Resource> implements InternalEList<Resource> {
  constructor(private readonly resourceSet: ResourceSet) {
    super();
  }

  protected override isUnique(): boolean {
    return true;
  }

  protected override canContainNull(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(Object) */
  override addUnique(object: Resource): void {
    super.addUnique(object);
    this.inverseAdd(object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(int, Object) */
  override addUniqueAt(index: number, object: Resource): void {
    super.addUniqueAt(index, object);
    this.inverseAdd(object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addAllUnique(int, java.util.Collection) */
  override addAllUnique(collection: readonly Resource[]): boolean {
    if (collection.length === 0) {
      return false;
    }
    super.addAllUnique(collection);
    for (const object of collection) {
      this.inverseAdd(object);
    }
    return true;
  }

  /** Adds without the inverse. @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#basicAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicAdd(object: Resource): void {
    super.addUniqueAt(this.listSize, object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#remove(int) */
  override removeAt(index: number): Resource {
    const oldObject = super.removeAt(index);
    this.inverseRemove(oldObject);
    return oldObject;
  }

  /** Removes without the inverse. @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#basicRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicRemove(object: Resource): void {
    const index = this.indexOf(object);
    if (index !== -1) {
      super.removeAt(index);
    }
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#clear() */
  override clear(): void {
    const oldData = this.data;
    const oldSize = this.listSize;
    super.clear();
    for (let i = 0; i < oldSize; ++i) {
      this.inverseRemove((oldData as Resource[])[i] as Resource);
    }
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#setUnique(int, Object) */
  override setUnique(index: number, object: Resource): Resource {
    const oldObject = super.setUnique(index, object);
    if (oldObject !== object) {
      this.inverseRemove(oldObject);
      this.inverseAdd(object);
    }
    return oldObject;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl.ResourcesEList#inverseAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  private inverseAdd(object: Resource): void {
    (object as ResourceInternal).basicSetResourceSet(this.resourceSet);
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl.ResourcesEList#inverseRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  private inverseRemove(object: Resource): void {
    (object as ResourceInternal).basicSetResourceSet(null);
  }
}

/**
 * The resource set: the list of resources and lookup of a resource or an object by URI, for
 * resources already in the set (and demand loading hooks).
 *
 * `getResource`: EMF consults a `ResourceLocator` (none installed), the `uriResourceMap` cache
 * (null by default), the resources compared after `URIConverter.normalize` (the identity here: no
 * URI mappings are ported), `delegatedGetResource` (looks the URI up in the `EPackage` registry,
 * which holds no package in the port), and with `loadOnDemand` creates the resource through
 * `demandCreateResource`. Creation needs a registered `Resource.Factory`, and the port has no
 * factory registry, so it fails exactly as EMF does without a factory: the `RuntimeException`
 * "Cannot create a resource for ...". `demandLoad` (EMF: `resource.load(loadOptions)`) throws
 * `UnsupportedOperationException` because the port's resources have no `load`; a subclass that can
 * load overrides it. EMF's `IOException` wrapping (`handleDemandLoadException`) goes with it.
 *
 * Not ported: `createResource` (factory registry), `getAllContents`, `getPackageRegistry`,
 * `getResourceFactoryRegistry`, `getURIConverter`, `getURIResourceMap`, `getLoadOptions`,
 * `getAdapterFactories`, `toString`. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl
 */
export class ResourceSetImpl implements ResourceSet {
  protected resources: EList<Resource> | null = null;

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl#getResources() */
  getResources(): EList<Resource> {
    this.resources ??= new ResourcesEList(this);
    return this.resources;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl#getEObject(URI, boolean) */
  getEObject(uri: URI, loadOnDemand: boolean): EObject | null {
    const resource = this.getResource(uri.trimFragment(), loadOnDemand);
    if (resource !== null) {
      return resource.getEObject(uri.fragment() as string);
    }
    return null;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl#getResource(URI, boolean) */
  getResource(uri: URI, loadOnDemand: boolean): Resource | null {
    for (const resource of this.getResources()) {
      if ((resource.getURI() as URI).equals(uri)) {
        if (loadOnDemand && !resource.isLoaded()) {
          this.demandLoadHelper(resource);
        }
        return resource;
      }
    }
    if (loadOnDemand) {
      throw new RuntimeException(
        `Cannot create a resource for '${uri.toString()}'; a registered resource factory is needed`,
      );
    }
    return null;
  }

  /** Loads the resource; the port has no `Resource.load`, so the base fails. @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl#demandLoad(Resource) */
  protected demandLoad(_resource: Resource): void {
    throw new UnsupportedOperationException('Demand loading is not ported (decision D13)');
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceSetImpl#demandLoadHelper(Resource) */
  protected demandLoadHelper(resource: Resource): void {
    this.demandLoad(resource);
  }
}
