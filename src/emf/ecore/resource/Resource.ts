// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../common/util/EList.js';
import type { URI } from '../../common/util/URI.js';
import type { EObject } from '../EObject.js';
import type { InternalEList } from '../util/InternalEList.js';
import type { InternalEObject } from '../InternalEObject.js';
import type { ResourceSet } from './ResourceSet.js';

/**
 * The part of `Resource.Diagnostic` a port-side diagnostic can serve: message and line. EMF's
 * `getLocation` and `getColumn` are not ported (the Xtext diagnostics of the port carry neither).
 *
 * @see org.eclipse.emf.ecore.resource.Resource.Diagnostic
 */
export interface ResourceDiagnostic {
  getMessage(): string | null;
  getLine(): number;
}

/**
 * The `Resource` members of decision D13: URI, containing set, contents, diagnostics, load state and
 * fragment lookup. Not ported: `load`/`save`/`unload`/`delete`, `getAllContents`,
 * `getURIFragment`, modification tracking, timestamps, `Resource.Factory` and notifications.
 * EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.resource.Resource
 */
export interface Resource {
  getResourceSet(): ResourceSet | null;
  getURI(): URI | null;
  setURI(uri: URI | null): void;
  getContents(): EList<EObject>;
  getErrors(): EList<ResourceDiagnostic>;
  getWarnings(): EList<ResourceDiagnostic>;
  isLoaded(): boolean;
  /** The object named by `uriFragment`, or `null` if the fragment names nothing. */
  getEObject(uriFragment: string): EObject | null;
}

/**
 * The internal protocol the container classes call. Of EMF's `Resource.Internal` only
 * `basicSetResourceSet` and the typed contents list are ported (`attached`/`detached` do nothing in
 * the port: no modification tracking and no intrinsic-ID map).
 *
 * @see org.eclipse.emf.ecore.resource.Resource.Internal
 */
export interface ResourceInternal extends Resource {
  getContents(): InternalEList<InternalEObject>;
  /** Sets the containing set without touching the set's list (the inverse of `getResources().add`). */
  basicSetResourceSet(resourceSet: ResourceSet | null): void;
}
