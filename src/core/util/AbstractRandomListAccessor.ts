// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';

/**
 * Abstract superclass for classes that offer random access to a list of items. Accessing an item at an index that is
 * not yet part of the list grows the list with default values supplied by {@link provideDefault}.
 *
 * @typeParam T type of the items in the list
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/AbstractRandomListAccessor.java
 */
export abstract class AbstractRandomListAccessor<T> {
  readonly #list: T[];

  protected constructor() {
    this.#list = [];
  }

  /** Provides a default value used to fill gaps in the list. */
  protected abstract provideDefault(): T;

  /**
   * Returns the item at the given index, growing the list with default values if necessary.
   *
   * @throws IndexOutOfBoundsException if the index is negative
   */
  protected getListItem(index: number): T {
    if (index < 0) {
      throw new IndexOutOfBoundsException(`Invalid index: ${index}`);
    }

    this.#ensureListSize(index + 1);
    return this.#list[index] as T;
  }

  /**
   * Sets the item at the given index, growing the list with default values if necessary.
   *
   * @throws IndexOutOfBoundsException if the index is negative
   */
  protected setListItem(index: number, value: T): void {
    if (index < 0) {
      throw new IndexOutOfBoundsException(`Invalid index: ${index}`);
    }

    if (index < this.#list.length) {
      this.#list[index] = value;
    } else {
      // Avoid creating a new default value which will be immediately overwritten anyway
      this.#ensureListSize(index);
      this.#list.push(value);
    }
  }

  /** Returns the current size of the list. */
  protected getListSize(): number {
    return this.#list.length;
  }

  /** Clears the list. */
  protected clearList(): void {
    this.#list.length = 0;
  }

  #ensureListSize(size: number): void {
    for (let i = this.#list.length; i < size; i++) {
      this.#list.push(this.provideDefault());
    }
  }
}
