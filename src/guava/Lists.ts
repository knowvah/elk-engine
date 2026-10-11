// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';

/**
 * A live reversed view of an array: reads reflect later source changes and writes go through.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#reverse(java.util.List)
 */
export class ReverseList<T> implements Iterable<T> {
  readonly #source: T[];

  constructor(source: T[]) {
    this.#source = source;
  }

  size(): number {
    return this.#source.length;
  }

  get(index: number): T {
    return this.#source[this.#sourceIndex(index)] as T;
  }

  set(index: number, value: T): T {
    const sourceIndex = this.#sourceIndex(index);
    const previous = this.#source[sourceIndex] as T;
    this.#source[sourceIndex] = value;
    return previous;
  }

  toArray(): T[] {
    return [...this];
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let i = this.#source.length - 1; i >= 0; i--) {
      yield this.#source[i] as T;
    }
  }

  #sourceIndex(index: number): number {
    if (index < 0) {
      throw new IndexOutOfBoundsException(`index (${index}) must not be negative`);
    }
    const size = this.#source.length;
    if (index >= size) {
      throw new IndexOutOfBoundsException(`index (${index}) must be less than size (${size})`);
    }
    return size - 1 - index;
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#newArrayList() */
export function newArrayList<T>(elements?: Iterable<T>): T[] {
  return elements === undefined ? [] : [...elements];
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#newArrayList(E...) */
export function newArrayListOf<T>(...elements: T[]): T[] {
  return elements;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#newLinkedList() */
export function newLinkedList<T>(elements?: Iterable<T>): T[] {
  return newArrayList(elements);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#newArrayListWithCapacity(int) */
export function newArrayListWithCapacity<T>(initialArraySize: number): T[] {
  if (initialArraySize < 0) {
    throw new IllegalArgumentException(`initialArraySize cannot be negative but was: ${initialArraySize}`);
  }
  return [];
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#newArrayListWithExpectedSize(int) */
export function newArrayListWithExpectedSize<T>(_estimatedSize: number): T[] {
  return [];
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Lists.html#reverse(java.util.List) */
export function reverse<T>(list: T[]): ReverseList<T> {
  return new ReverseList(list);
}
