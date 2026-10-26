// SPDX-License-Identifier: EPL-2.0
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';

/**
 * Java's private nested class `NNode.ChangeAwareArrayList`, split into its own file (M15): a list that counts its
 * structural modifications. `remove`, `contains`, `indexOf` and `lastIndexOf` compare with `===` (Java `equals`
 * is identity for ELK's elements). Java's overloads by parameter type are renamed: `addAt`, `addAllAt`, `removeAt`.
 * `subList` returns a copy, not a view; its only Java caller set is empty.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NNode.java
 */
export class ChangeAwareArrayList<E> implements Iterable<E> {
  readonly #list: E[] = [];
  #modCount = 0;

  /** The number of modifications so far (Java: private, read by the enclosing `NNode`). */
  getModCnt(): number {
    return this.#modCount;
  }

  size(): number {
    return this.#list.length;
  }

  isEmpty(): boolean {
    return this.#list.length === 0;
  }

  contains(o: unknown): boolean {
    return this.#list.includes(o as E);
  }

  /** Java returns an unmodifiable iterator. */
  [Symbol.iterator](): Iterator<E> {
    return this.#list[Symbol.iterator]();
  }

  toArray(): E[] {
    return [...this.#list];
  }

  add(e: E): boolean {
    this.#modCount++;
    this.#list.push(e);
    return true;
  }

  remove(o: unknown): boolean {
    this.#modCount++;
    const index = this.#list.indexOf(o as E);
    if (index < 0) return false;
    this.#list.splice(index, 1);
    return true;
  }

  containsAll(c: Iterable<unknown>): boolean {
    for (const o of c) {
      if (!this.contains(o)) return false;
    }
    return true;
  }

  addAll(c: Iterable<E>): boolean {
    this.#modCount++;
    const added = [...c];
    this.#list.push(...added);
    return added.length > 0;
  }

  addAllAt(index: number, c: Iterable<E>): boolean {
    this.#modCount++;
    this.#checkPositionIndex(index);
    const added = [...c];
    this.#list.splice(index, 0, ...added);
    return added.length > 0;
  }

  removeAll(c: Iterable<unknown>): boolean {
    const toRemove = [...c];
    return this.#retain((e) => !toRemove.includes(e));
  }

  retainAll(c: Iterable<unknown>): boolean {
    const toKeep = [...c];
    return this.#retain((e) => toKeep.includes(e));
  }

  clear(): void {
    this.#modCount++;
    this.#list.length = 0;
  }

  get(index: number): E {
    this.#checkElementIndex(index);
    return this.#list[index] as E;
  }

  set(index: number, element: E): E {
    this.#modCount++;
    this.#checkElementIndex(index);
    const old = this.#list[index] as E;
    this.#list[index] = element;
    return old;
  }

  addAt(index: number, element: E): void {
    this.#modCount++;
    this.#checkPositionIndex(index);
    this.#list.splice(index, 0, element);
  }

  removeAt(index: number): E {
    this.#modCount++;
    this.#checkElementIndex(index);
    return this.#list.splice(index, 1)[0] as E;
  }

  indexOf(o: unknown): number {
    return this.#list.indexOf(o as E);
  }

  lastIndexOf(o: unknown): number {
    return this.#list.lastIndexOf(o as E);
  }

  /** Java: "if implemented, must guarantee not to alter the list or to increment modCount". */
  listIterator(): never {
    throw new UnsupportedOperationException();
  }

  subList(fromIndex: number, toIndex: number): E[] {
    return this.#list.slice(fromIndex, toIndex);
  }

  #retain(keep: (e: E) => boolean): boolean {
    const kept = this.#list.filter(keep);
    const changed = kept.length !== this.#list.length;
    if (changed) {
      this.#list.splice(0, this.#list.length, ...kept);
      this.#modCount++;
    }
    return changed;
  }

  #checkElementIndex(index: number): void {
    if (index < 0 || index >= this.#list.length) {
      throw new RangeError(`Index ${index} out of bounds for length ${this.#list.length}`);
    }
  }

  #checkPositionIndex(index: number): void {
    if (index < 0 || index > this.#list.length) {
      throw new RangeError(`Index: ${index}, Size: ${this.#list.length}`);
    }
  }
}
