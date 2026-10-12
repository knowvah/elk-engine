// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../lang/IndexOutOfBoundsException.js';
import { ArrayListIterator, type ListIterator } from './ListIterator.js';
import { NoSuchElementException } from './NoSuchElementException.js';

/**
 * Array-backed stand-in for `java.util.LinkedList`; only the API is Java's. `remove(e)`,
 * `contains` and `indexOf` compare with `===` (Java `equals` is identity for ELK's elements).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html
 */
export class LinkedList<E> implements Iterable<E> {
  readonly #items: E[];

  constructor(elements?: Iterable<E>) {
    this.#items = elements === undefined ? [] : [...elements];
  }

  add(e: E): boolean {
    this.#items.push(e);
    return true;
  }

  addAt(index: number, e: E): void {
    this.#checkPositionIndex(index);
    this.#items.splice(index, 0, e);
  }

  addAll(c: Iterable<E>): boolean {
    return this.addAllAt(this.#items.length, c);
  }

  addAllAt(index: number, c: Iterable<E>): boolean {
    this.#checkPositionIndex(index);
    const added = [...c];
    this.#items.splice(index, 0, ...added);
    return added.length > 0;
  }

  addFirst(e: E): void {
    this.#items.unshift(e);
  }

  addLast(e: E): void {
    this.#items.push(e);
  }

  getFirst(): E {
    this.#checkNotEmpty();
    return this.#items[0] as E;
  }

  getLast(): E {
    this.#checkNotEmpty();
    return this.#items[this.#items.length - 1] as E;
  }

  removeFirst(): E {
    this.#checkNotEmpty();
    return this.#items.shift() as E;
  }

  removeLast(): E {
    this.#checkNotEmpty();
    return this.#items.pop() as E;
  }

  get(i: number): E {
    this.#checkElementIndex(i);
    return this.#items[i] as E;
  }

  set(i: number, e: E): E {
    this.#checkElementIndex(i);
    const old = this.#items[i] as E;
    this.#items[i] = e;
    return old;
  }

  removeAt(i: number): E {
    this.#checkElementIndex(i);
    return this.#items.splice(i, 1)[0] as E;
  }

  remove(e: E): boolean {
    const index = this.#items.indexOf(e);
    if (index < 0) {
      return false;
    }
    this.#items.splice(index, 1);
    return true;
  }

  clear(): void {
    this.#items.length = 0;
  }

  size(): number {
    return this.#items.length;
  }

  isEmpty(): boolean {
    return this.#items.length === 0;
  }

  contains(e: E): boolean {
    return this.#items.includes(e);
  }

  indexOf(e: E): number {
    return this.#items.indexOf(e);
  }

  iterator(): Iterator<E> {
    return this.#items[Symbol.iterator]();
  }

  listIterator(index = 0): ListIterator<E> {
    this.#checkPositionIndex(index);
    return new ArrayListIterator(this.#items, index);
  }

  toArray(): E[] {
    return [...this.#items];
  }

  /**
   * Returns a shallow copy of this list; the elements themselves are not copied. As with
   * `Object.clone`, the copy has the run-time class of the original, so a subclass (`KVectorChain`)
   * clones to an instance of itself. The presence of this method is what makes a list `Cloneable`
   * for `ElkReflect.isCloneable`, as `LinkedList implements Cloneable` does in Java.
   */
  clone(): this {
    const copy = new (this.constructor as new () => this)();
    copy.#items.push(...this.#items);
    return copy;
  }

  [Symbol.iterator](): Iterator<E> {
    return this.iterator();
  }

  #checkNotEmpty(): void {
    if (this.#items.length === 0) {
      throw new NoSuchElementException();
    }
  }

  #checkElementIndex(index: number): void {
    if (index < 0 || index >= this.#items.length) {
      throw this.#outOfBounds(index);
    }
  }

  #checkPositionIndex(index: number): void {
    if (index < 0 || index > this.#items.length) {
      throw this.#outOfBounds(index);
    }
  }

  #outOfBounds(index: number): IndexOutOfBoundsException {
    return new IndexOutOfBoundsException(`Index: ${index}, Size: ${this.#items.length}`);
  }
}
