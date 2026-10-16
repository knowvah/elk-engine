// SPDX-License-Identifier: EPL-2.0
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import { RuntimeException } from '../../../../java/lang/RuntimeException.js';
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';
import { BasicEList } from '../../../common/util/BasicEList.js';
import type { EList } from '../../../common/util/EList.js';
import type { URI } from '../../../common/util/URI.js';
import type { EObject } from '../../EObject.js';
import type { InternalEObject } from '../../InternalEObject.js';
import type { InternalEList } from '../../util/InternalEList.js';
import type { Resource, ResourceDiagnostic, ResourceInternal } from '../Resource.js';
import type { ResourceSet } from '../ResourceSet.js';

const PATH_SEPARATOR = '/';
const ID_ROOT_PREFIX = '?';
const ID_SUFFIX = '?';
const ROOT_SEGMENT_INDEX = 0;

/**
 * `ResourceImpl.ContentsEList`: the unique, non-null list of root objects. Adding an object makes
 * the resource its direct resource (`eSetResource`), removing it clears that. The list marks the
 * resource loaded when an element is added at the end or an empty list is cleared. The hook order
 * of `NotifyingListImpl` is kept: the plain list operation (with its `didAdd`/`didClear`), then the
 * inverse. Not ported: notifications, modification tracking (`modified()`), `attached`/`detached`
 * (they do nothing without tracking or an intrinsic-ID map) and the `contains` shortcut for more
 * than four elements, which gives the same answer for a consistent list.
 *
 * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl.ContentsEList
 */
export class ContentsEList extends BasicEList<InternalEObject> implements InternalEList<InternalEObject> {
  constructor(private readonly resource: ResourceImpl) {
    super();
  }

  protected override isUnique(): boolean {
    return true;
  }

  protected override canContainNull(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(Object) */
  override addUnique(object: InternalEObject): void {
    super.addUnique(object);
    this.inverseAdd(object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addUnique(int, Object) */
  override addUniqueAt(index: number, object: InternalEObject): void {
    super.addUniqueAt(index, object);
    this.inverseAdd(object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#addAllUnique(int, java.util.Collection) */
  override addAllUnique(collection: readonly InternalEObject[]): boolean {
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
  basicAdd(object: InternalEObject): void {
    super.addUniqueAt(this.listSize, object);
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#remove(int) */
  override removeAt(index: number): InternalEObject {
    const oldObject = super.removeAt(index);
    this.inverseRemove(oldObject);
    return oldObject;
  }

  /** Removes without the inverse. @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#basicRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicRemove(object: InternalEObject): void {
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
      this.inverseRemove((oldData as InternalEObject[])[i] as InternalEObject);
    }
  }

  /** @see org.eclipse.emf.common.notify.impl.NotifyingListImpl#setUnique(int, Object) */
  override setUnique(index: number, object: InternalEObject): InternalEObject {
    const oldObject = super.setUnique(index, object);
    if (oldObject !== object) {
      this.inverseRemove(oldObject);
      this.inverseAdd(object);
    }
    return oldObject;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl.ContentsEList#didAdd(int, Object) */
  protected override didAdd(index: number, object: InternalEObject): void {
    super.didAdd(index, object);
    if (index === this.listSize - 1) {
      this.resource.markLoaded();
    }
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl.ContentsEList#didClear(int, Object[]) */
  protected override didClear(oldSize: number, oldObjects: ReadonlyArray<InternalEObject | null> | null): void {
    if (oldSize === 0) {
      this.resource.markLoaded();
    } else {
      super.didClear(oldSize, oldObjects);
    }
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl.ContentsEList#inverseAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  private inverseAdd(object: InternalEObject): void {
    object.eSetResource(this.resource);
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl.ContentsEList#inverseRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  private inverseRemove(object: InternalEObject): void {
    object.eSetResource(null);
  }
}

/**
 * The base resource: URI, containing set, root contents, error and warning lists, load state and
 * fragment lookup. Subclasses override `getEObject(uriFragment)` (the point `LazyLinkingResource`
 * uses).
 *
 * Fragment lookup: `/`-paths resolve their root segment (position in the contents, `?id` for an
 * ID) as EMF does, but a path with further segments needs `eObjectForURIFragmentSegment`, which
 * is reflective and not ported, and throws `UnsupportedOperationException`. ID lookup
 * (`getEObjectByID`) finds nothing: no `EClass` of the port declares an `ID` attribute (ElkGraph's
 * `identifier` is a plain `EString`), so EMF's walk of the contents would match no object; the
 * intrinsic-ID map is not ported. A root segment that is not an integer throws a
 * `RuntimeException` with the `NumberFormatException` as cause (EMF throws `WrappedException`,
 * not ported).
 *
 * Not ported: `load`/`save`/`unload`/`delete` and their stream and option plumbing, `setTimeStamp`,
 * modification tracking, `attached`/`detached`, `getAllContents`, `getURIFragment` and
 * `getURIFragmentRootSegment`, `useZip`, `getURIConverter`, notifications (`eNotificationRequired`
 * is false), `toString`/`toKeyString`. `errors`/`warnings` are plain lists (EMF's
 * `NotifyingListImpl` without listeners). EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl
 */
export class ResourceImpl implements ResourceInternal {
  protected resourceSet: ResourceSet | null = null;
  protected uri: URI | null;
  protected contents: ContentsEList | null = null;
  protected errors: EList<ResourceDiagnostic> | null = null;
  protected warnings: EList<ResourceDiagnostic> | null = null;
  protected loaded = false;

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#ResourceImpl(org.eclipse.emf.common.util.URI) */
  constructor(uri: URI | null = null) {
    this.uri = uri;
  }

  getResourceSet(): ResourceSet | null {
    return this.resourceSet;
  }

  /**
   * The old set's `getResources()` loses this resource (`basicRemove`), then the new set is stored.
   *
   * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#basicSetResourceSet(ResourceSet, org.eclipse.emf.common.notify.NotificationChain)
   */
  basicSetResourceSet(resourceSet: ResourceSet | null): void {
    const oldResourceSet = this.resourceSet;
    if (oldResourceSet !== null) {
      (oldResourceSet.getResources() as InternalEList<Resource>).basicRemove(this);
    }
    this.resourceSet = resourceSet;
  }

  getURI(): URI | null {
    return this.uri;
  }

  setURI(uri: URI | null): void {
    this.uri = uri;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getContents() */
  getContents(): ContentsEList {
    this.contents ??= new ContentsEList(this);
    return this.contents;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getErrors() */
  getErrors(): EList<ResourceDiagnostic> {
    this.errors ??= new BasicEList<ResourceDiagnostic>();
    return this.errors;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getWarnings() */
  getWarnings(): EList<ResourceDiagnostic> {
    this.warnings ??= new BasicEList<ResourceDiagnostic>();
    return this.warnings;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#isLoaded() */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * EMF's protected `setLoaded(boolean)` without the notification; subclasses call it when their
   * own loading finishes.
   *
   * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#setLoaded(boolean)
   */
  protected setLoaded(isLoaded: boolean): void {
    this.loaded = isLoaded;
  }

  /** `ContentsEList.loaded()`: marks the resource loaded unless it already is. */
  markLoaded(): void {
    if (!this.isLoaded()) {
      this.setLoaded(true);
    }
  }

  /**
   * A `/`-path goes to the segment lookup; a fragment ending in `?` (a unique-name suffix) loses
   * the part from its last earlier `?`; everything else is an ID.
   *
   * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getEObject(String)
   */
  getEObject(uriFragment: string): EObject | null {
    const length = uriFragment.length;
    if (length > 0) {
      if (uriFragment.charAt(0) === PATH_SEPARATOR) {
        return this.getEObjectByPath(uriFragment.substring(1).split(PATH_SEPARATOR));
      } else if (uriFragment.charAt(length - 1) === ID_SUFFIX) {
        const index = uriFragment.lastIndexOf(ID_SUFFIX, length - 2);
        if (index > 0) {
          uriFragment = uriFragment.substring(0, index);
        }
      }
    }
    return this.getEObjectByID(uriFragment);
  }

  /**
   * The object for a fragment path: the root segment, then (not ported) the following segments.
   *
   * @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getEObject(java.util.List)
   */
  protected getEObjectByPath(uriFragmentPath: readonly string[]): EObject | null {
    const eObject = this.getEObjectForURIFragmentRootSegment(uriFragmentPath[ROOT_SEGMENT_INDEX] as string);
    if (uriFragmentPath.length > 1 && eObject !== null) {
      throw new UnsupportedOperationException('eObjectForURIFragmentSegment is not ported (decision D13)');
    }
    return eObject;
  }

  /** @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getEObjectForURIFragmentRootSegment(String) */
  protected getEObjectForURIFragmentRootSegment(uriFragmentRootSegment: string): EObject | null {
    let position = 0;
    if (uriFragmentRootSegment.length > 0) {
      if (uriFragmentRootSegment.charAt(0) === ID_ROOT_PREFIX) {
        return this.getEObjectByID(uriFragmentRootSegment.substring(1));
      }
      try {
        position = JavaInteger.valueOf(uriFragmentRootSegment);
      } catch (exception) {
        // Integer.parseInt throws only NumberFormatException.
        throw new RuntimeException((exception as NumberFormatException).message, { cause: exception });
      }
    }
    const contents = this.getContents();
    return position < contents.size() && position >= 0 ? contents.get(position) : null;
  }

  /** Always `null`: see the class documentation. @see org.eclipse.emf.ecore.resource.impl.ResourceImpl#getEObjectByID(String) */
  protected getEObjectByID(_id: string): EObject | null {
    return null;
  }
}
