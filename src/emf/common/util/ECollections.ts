// SPDX-License-Identifier: EPL-2.0
import type { EList } from './EList.js';

/**
 * The index of `o` in `list` at or after `fromIndex` (a negative start counts from 0), or -1.
 * EMF's `o == element || o.equals(element)` is identity here: TypeScript has no `equals`.
 *
 * @see org.eclipse.emf.common.util.ECollections#indexOf(java.util.List, Object, int)
 */
function indexOf<E>(list: EList<E>, o: E, fromIndex: number): number {
  if (fromIndex < 0) {
    fromIndex = 0;
  }
  const size = list.size();
  for (let i = fromIndex; i < size; i++) {
    if (list.get(i) === o) {
      return i;
    }
  }
  return -1;
}

/**
 * Sorts a copy (Java's `Arrays.sort` on objects is stable, as is `Array.prototype.sort`), then
 * `move`s each element into place, so a unique or containment list never sees a duplicate or a
 * removal.
 *
 * @see org.eclipse.emf.common.util.ECollections#sort(EList, java.util.Comparator)
 */
function sort<E>(list: EList<E>, comparator: (a: E, b: E) => number): void {
  const listAsArray = list.toArray();
  listAsArray.sort(comparator);
  for (let i = 0; i < listAsArray.length; i++) {
    const oldIndex = indexOf(list, listAsArray[i] as E, i);
    if (i !== oldIndex) {
      list.move(i, oldIndex);
    }
  }
}

/**
 * The `ECollections` utilities the port needs. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common.util.ECollections
 */
export const ECollections = { indexOf, sort } as const;
