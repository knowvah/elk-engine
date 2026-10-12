// SPDX-License-Identifier: EPL-2.0
import type { ListIterator } from '../../../java/util/ListIterator.js';

/**
 * A `java.util.List` with EMF's `move` operations. Java overloads are renamed: `add(int, E)` →
 * `addAt`, `remove(int)` → `removeAt`, `move(int, E)` → `moveElement`. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common.util.EList
 */
export interface EList<E> extends Iterable<E> {
  get(index: number): E;
  set(index: number, object: E): E;
  add(object: E): boolean;
  addAt(index: number, object: E): void;
  addAll(collection: Iterable<E>): boolean;
  remove(object: E): boolean;
  removeAt(index: number): E;
  clear(): void;
  size(): number;
  isEmpty(): boolean;
  contains(object: E): boolean;
  indexOf(object: E): number;
  iterator(): Iterator<E>;
  listIterator(index?: number): ListIterator<E>;
  move(newPosition: number, oldPosition: number): E;
  moveElement(newPosition: number, object: E): void;
  toArray(): E[];
}
