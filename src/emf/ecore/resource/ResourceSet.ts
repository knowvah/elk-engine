// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../common/util/EList.js';
import type { URI } from '../../common/util/URI.js';
import type { EObject } from '../EObject.js';
import type { Resource } from './Resource.js';

/**
 * The `ResourceSet` members of decision D13. Not ported: `getAllContents`, `getPackageRegistry`,
 * `getResourceFactoryRegistry`, `getURIConverter`, `getURIResourceMap`, `getLoadOptions`,
 * `getAdapterFactories`, `createResource` (it needs the factory registry), `Resource.Factory`.
 * EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.resource.ResourceSet
 */
export interface ResourceSet {
  getResources(): EList<Resource>;
  /**
   * The resource whose URI equals `uri`; with `loadOnDemand`, an unloaded resource is demand loaded
   * and an unknown one is demand created. `null` for an unknown URI without `loadOnDemand`.
   */
  getResource(uri: URI, loadOnDemand: boolean): Resource | null;
  /** The object `uri` names: the fragment looked up in the resource of the fragment-less URI. */
  getEObject(uri: URI, loadOnDemand: boolean): EObject | null;
}
