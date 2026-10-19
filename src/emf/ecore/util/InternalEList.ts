// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../common/util/EList.js';

/**
 * The members of EMF's `InternalEList` that the resource code calls: add and remove without the
 * inverse (containment bookkeeping). The other members (`basicGet`, `basicList`, `inverseAdd`,
 * proxy-resolving iterators, ...) are not ported. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.util.InternalEList
 */
export interface InternalEList<E> extends EList<E> {
  /** @see org.eclipse.emf.ecore.util.InternalEList#basicAdd(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicAdd(object: E): void;
  /** @see org.eclipse.emf.ecore.util.InternalEList#basicRemove(Object, org.eclipse.emf.common.notify.NotificationChain) */
  basicRemove(object: E): void;
}
