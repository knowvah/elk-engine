// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../common/util/EList.js';
import type { EClass } from './EClass.js';

/**
 * The public `EObject` surface of decision D4. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.EObject
 */
export interface EObject {
  eClass(): EClass;
  eContainer(): EObject | null;
  eContents(): EList<EObject>;
  eAllContents(): IterableIterator<EObject>;
}
