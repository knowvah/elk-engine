// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../lang/IllegalStateException.js';
import { NoSuchElementException } from './NoSuchElementException.js';

/** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ListIterator.html */
export interface ListIterator<E> {
  hasNext(): boolean;
  next(): E;
  hasPrevious(): boolean;
  previous(): E;
  nextIndex(): number;
  previousIndex(): number;
  remove(): void;
  set(e: E): void;
  add(e: E): void;
}

/**
 * A `ListIterator` over a backing array; `remove`, `set` and `add` mutate that array in place.
 * The cursor lies between elements: `next` returns the element at the cursor, `previous` the
 * one before it. Callers are responsible for passing a start index within `0..array.length`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ListIterator.html
 */
export class ArrayListIterator<E> implements ListIterator<E> {
  readonly #array: E[];
  #cursor: number;
  /** Index of the element last returned by `next`/`previous`; -1 when `remove`/`set` are illegal. */
  #lastReturned = -1;

  constructor(array: E[], index = 0) {
    this.#array = array;
    this.#cursor = index;
  }

  hasNext(): boolean {
    return this.#cursor < this.#array.length;
  }

  next(): E {
    if (!this.hasNext()) {
      throw new NoSuchElementException();
    }
    this.#lastReturned = this.#cursor;
    this.#cursor++;
    return this.#array[this.#lastReturned] as E;
  }

  hasPrevious(): boolean {
    return this.#cursor > 0;
  }

  previous(): E {
    if (!this.hasPrevious()) {
      throw new NoSuchElementException();
    }
    this.#cursor--;
    this.#lastReturned = this.#cursor;
    return this.#array[this.#cursor] as E;
  }

  nextIndex(): number {
    return this.#cursor;
  }

  previousIndex(): number {
    return this.#cursor - 1;
  }

  remove(): void {
    this.#checkLastReturned();
    this.#array.splice(this.#lastReturned, 1);
    if (this.#lastReturned < this.#cursor) {
      this.#cursor--;
    }
    this.#lastReturned = -1;
  }

  set(e: E): void {
    this.#checkLastReturned();
    this.#array[this.#lastReturned] = e;
  }

  add(e: E): void {
    this.#array.splice(this.#cursor, 0, e);
    this.#cursor++;
    this.#lastReturned = -1;
  }

  #checkLastReturned(): void {
    if (this.#lastReturned < 0) {
      throw new IllegalStateException();
    }
  }
}
