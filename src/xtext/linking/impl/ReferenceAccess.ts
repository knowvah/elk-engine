// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';

/**
 * The reflection the linker uses on semantic objects (mission-2 D4: `EObject` has no
 * `eGet`/`eSet`/`eUnset` or metamodel). The language implements it; port-local, no Java counterpart.
 */
export interface ReferenceAccess {
  /** `obj.eClass().getEAllReferences()`. */
  getEAllReferences(obj: EObject): readonly EReferenceInfo[];

  /** `GrammarUtil.getReference(crossReference, obj.eClass())` for the feature of that name, or `null`. */
  getReference(obj: EObject, featureName: string): EReferenceInfo | null;

  /** `obj.eUnset(ref)`: clears a single value or empties a list, including inverse references. */
  eUnset(obj: EObject, ref: EReferenceInfo): void;

  /** `obj.eSet(ref, value)` for a single-valued reference, setting the opposite where EMF does. */
  eSet(obj: EObject, ref: EReferenceInfo, value: EObject): void;

  /** `(List<EObject>) obj.eGet(ref)` for a multi-valued reference; `addAll` is `false` when nothing was added. */
  eGetList(obj: EObject, ref: EReferenceInfo): { addAll(values: readonly EObject[]): boolean };
}
