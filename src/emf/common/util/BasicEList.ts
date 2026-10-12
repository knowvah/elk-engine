// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { ListIterator } from '../../../java/util/ListIterator.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { BasicIndexOutOfBoundsException } from './BasicIndexOutOfBoundsException.js';
import type { EList } from './EList.js';

/** HotSpot's helpful `NullPointerException` text for `this.data[i]` while `data` is null (D10: NPE → TypeError). */
const NULL_DATA_MESSAGE = 'Cannot load from object array because "this.data" is null';

/**
 * EMF's array-backed list: `AbstractEList` (unique checks, index checks, list iterator) and
 * `BasicEList` (the `data` array, `size`, `grow`) in one class. The backing array grows exactly as
 * EMF's does, so the JVM's `ArrayIndexOutOfBoundsException` messages for negative indices (which
 * EMF never checks) name the same capacities. Elements compare by identity (`useEquals` has no
 * TypeScript counterpart). Not ported: notifications, `modCount`/`ConcurrentModificationException`,
 * proxies (`resolve`), `didChange` (no subclass here overrides it). EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common.util.BasicEList
 * @see org.eclipse.emf.common.util.AbstractEList
 */
export class BasicEList<E> implements EList<E> {
  /** Java `size`; renamed because `size()` is the accessor. */
  protected listSize = 0;
  protected data: Array<E | null> | null = null;

  /** @see org.eclipse.emf.common.util.AbstractEList#isUnique() */
  protected isUnique(): boolean {
    return false;
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#canContainNull() */
  protected canContainNull(): boolean {
    return true;
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#validate(int, Object) */
  protected validate(_index: number, object: E): E {
    if (!this.canContainNull() && object === null) {
      throw new IllegalArgumentException("The 'no null' constraint is violated");
    }
    return object;
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#didSet(int, Object, Object) */
  protected didSet(_index: number, _newObject: E, _oldObject: E): void {}

  /** @see org.eclipse.emf.common.util.AbstractEList#didAdd(int, Object) */
  protected didAdd(_index: number, _newObject: E): void {}

  /** @see org.eclipse.emf.common.util.AbstractEList#didRemove(int, Object) */
  protected didRemove(_index: number, _oldObject: E): void {}

  /** @see org.eclipse.emf.common.util.AbstractEList#didClear(int, Object[]) */
  protected didClear(size: number, oldObjects: ReadonlyArray<E | null> | null): void {
    if (oldObjects !== null) {
      for (let i = 0; i < size; ++i) {
        this.didRemove(i, oldObjects[i] as E);
      }
    }
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#didMove(int, Object, int) */
  protected didMove(_index: number, _movedObject: E, _oldIndex: number): void {}

  /** @see org.eclipse.emf.common.util.BasicEList#assign(int, Object) */
  protected assign(index: number, object: E): E {
    (this.data as Array<E | null>)[index] = object;
    return object;
  }

  size(): number {
    return this.listSize;
  }

  isEmpty(): boolean {
    return this.listSize === 0;
  }

  contains(object: E): boolean {
    return this.indexOf(object) !== -1;
  }

  indexOf(object: E): number {
    for (let i = 0; i < this.listSize; ++i) {
      if ((this.data as Array<E | null>)[i] === object) {
        return i;
      }
    }
    return -1;
  }

  toArray(): E[] {
    return (this.data ?? []).slice(0, this.listSize) as E[];
  }

  /** @see org.eclipse.emf.common.util.BasicEList#get(int) */
  get(index: number): E {
    if (this.data === null || index >= this.listSize) {
      throw new BasicIndexOutOfBoundsException(index, this.listSize);
    }
    return this.load(index);
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#set(int, Object) */
  set(index: number, object: E): E {
    const size = this.size();
    if (index >= size) {
      throw new BasicIndexOutOfBoundsException(index, size);
    }
    if (this.isUnique()) {
      const currentIndex = this.indexOf(object);
      if (currentIndex >= 0 && currentIndex !== index) {
        throw new IllegalArgumentException("The 'no duplicates' constraint is violated");
      }
    }
    return this.setUnique(index, object);
  }

  /** @see org.eclipse.emf.common.util.BasicEList#setUnique(int, Object) */
  setUnique(index: number, object: E): E {
    const oldObject = this.load(index);
    this.assign(index, this.validate(index, object));
    this.didSet(index, object, oldObject);
    return oldObject;
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#add(Object) */
  add(object: E): boolean {
    if (this.isUnique() && this.contains(object)) {
      return false;
    }
    this.addUnique(object);
    return true;
  }

  /** @see org.eclipse.emf.common.util.BasicEList#addUnique(Object) */
  addUnique(object: E): void {
    this.grow(this.listSize + 1);
    this.assign(this.listSize, this.validate(this.listSize, object));
    this.didAdd(this.listSize++, object);
  }

  /** Java `add(int, E)`. @see org.eclipse.emf.common.util.AbstractEList#add(int, Object) */
  addAt(index: number, object: E): void {
    const size = this.size();
    if (index > size) {
      throw new BasicIndexOutOfBoundsException(index, size);
    }
    if (this.isUnique() && this.contains(object)) {
      throw new IllegalArgumentException("The 'no duplicates' constraint is violated");
    }
    this.addUniqueAt(index, object);
  }

  /** Java `addUnique(int, E)`. @see org.eclipse.emf.common.util.BasicEList#addUnique(int, Object) */
  addUniqueAt(index: number, object: E): void {
    this.grow(this.listSize + 1);
    const validatedObject = this.validate(index, object);
    if (index !== this.listSize) {
      this.arraycopy(index, index + 1, this.listSize - index);
    }
    this.assign(index, validatedObject);
    ++this.listSize;
    this.didAdd(index, object);
  }

  /**
   * `getNonDuplicates` keeps the first occurrence of each element not already in this list.
   *
   * @see org.eclipse.emf.common.util.AbstractEList#addAll(java.util.Collection)
   */
  addAll(collection: Iterable<E>): boolean {
    const elements = this.isUnique() ? [...new Set(collection)].filter((e) => !this.contains(e)) : [...collection];
    return this.addAllUnique(elements);
  }

  /** @see org.eclipse.emf.common.util.BasicEList#addAllUnique(java.util.Collection) */
  addAllUnique(collection: readonly E[]): boolean {
    const growth = collection.length;
    this.grow(this.listSize + growth);
    const oldSize = this.listSize;
    this.listSize += growth;
    for (let i = oldSize; i < this.listSize; ++i) {
      const object = collection[i - oldSize] as E;
      this.assign(i, this.validate(i, object));
      this.didAdd(i, object);
    }
    return growth !== 0;
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#remove(Object) */
  remove(object: E): boolean {
    const index = this.indexOf(object);
    if (index >= 0) {
      this.removeAt(index);
      return true;
    }
    return false;
  }

  /** Java `remove(int)`. @see org.eclipse.emf.common.util.BasicEList#remove(int) */
  removeAt(index: number): E {
    if (index >= this.listSize) {
      throw new BasicIndexOutOfBoundsException(index, this.listSize);
    }
    const oldObject = this.load(index);
    const shifted = this.listSize - index - 1;
    if (shifted > 0) {
      this.arraycopy(index + 1, index, shifted);
    }
    (this.data as Array<E | null>)[--this.listSize] = null;
    this.didRemove(index, oldObject);
    return oldObject;
  }

  /** @see org.eclipse.emf.common.util.BasicEList#clear() */
  clear(): void {
    const oldData = this.data;
    const oldSize = this.listSize;
    this.data = null;
    this.listSize = 0;
    this.didClear(oldSize, oldData);
  }

  /** @see org.eclipse.emf.common.util.BasicEList#move(int, int) */
  move(targetIndex: number, sourceIndex: number): E {
    if (targetIndex >= this.listSize) {
      throw new IndexOutOfBoundsException(`targetIndex=${targetIndex}, size=${this.listSize}`);
    }
    if (sourceIndex >= this.listSize) {
      throw new IndexOutOfBoundsException(`sourceIndex=${sourceIndex}, size=${this.listSize}`);
    }
    const object = this.load(sourceIndex);
    if (targetIndex !== sourceIndex) {
      if (targetIndex < sourceIndex) {
        this.arraycopy(targetIndex, targetIndex + 1, sourceIndex - targetIndex);
      } else {
        this.arraycopy(sourceIndex + 1, sourceIndex, targetIndex - sourceIndex);
      }
      this.assign(targetIndex, object);
      this.didMove(targetIndex, object, sourceIndex);
    }
    return object;
  }

  /** Java `move(int, E)`. @see org.eclipse.emf.common.util.AbstractEList#move(int, Object) */
  moveElement(newPosition: number, object: E): void {
    this.move(newPosition, this.indexOf(object));
  }

  /** @see org.eclipse.emf.common.util.BasicEList#grow(int) */
  grow(minimumCapacity: number): void {
    const oldCapacity = this.data === null ? 0 : this.data.length;
    if (minimumCapacity > oldCapacity) {
      const oldData = this.data;
      let newCapacity = Int32.add(Int32.add(oldCapacity, Int32.div(oldCapacity, 2)), 4);
      if (newCapacity < minimumCapacity) {
        newCapacity = minimumCapacity;
      }
      const newData = new Array<E | null>(newCapacity).fill(null);
      for (let i = 0; i < this.listSize; ++i) {
        newData[i] = (oldData as Array<E | null>)[i] as E | null;
      }
      this.data = newData;
    }
  }

  /** EMF's `EIterator`: a live cursor over `get(cursor)`. @see org.eclipse.emf.common.util.AbstractEList#iterator() */
  *iterator(): Generator<E, void, undefined> {
    for (let cursor = 0; cursor !== this.size(); ++cursor) {
      yield this.get(cursor);
    }
  }

  [Symbol.iterator](): Iterator<E> {
    return this.iterator();
  }

  /** @see org.eclipse.emf.common.util.AbstractEList#listIterator(int) */
  listIterator(index = 0): ListIterator<E> {
    const size = this.size();
    if (index < 0 || index > size) {
      throw new BasicIndexOutOfBoundsException(index, size);
    }
    return new EListIterator(this, index);
  }

  /** Java `data[index]`: the JVM's bounds check against the capacity, not the size. */
  protected load(index: number): E {
    const data = this.data;
    if (data === null) {
      throw new TypeError(NULL_DATA_MESSAGE);
    }
    if (index < 0 || index >= data.length) {
      throw new ArrayIndexOutOfBoundsException(`Index ${index} out of bounds for length ${data.length}`);
    }
    return data[index] as E;
  }

  /**
   * Java `System.arraycopy(data, srcPos, data, destPos, length)`. Only the two failures EMF's call
   * sites can reach are checked: a negative source index and a negative length.
   */
  private arraycopy(srcPos: number, destPos: number, length: number): void {
    const data = this.data as Array<E | null>;
    if (srcPos < 0) {
      throw new ArrayIndexOutOfBoundsException(
        `arraycopy: source index ${srcPos} out of bounds for object array[${data.length}]`,
      );
    }
    if (length < 0) {
      throw new ArrayIndexOutOfBoundsException(`arraycopy: length ${length} is negative`);
    }
    data.copyWithin(destPos, srcPos, srcPos + length);
  }
}

/**
 * EMF's `EListIterator`: every mutation goes through the list, so unique checks, inverses and
 * containment apply. A failed `previous` leaves the cursor decremented, as EMF's does.
 *
 * @see org.eclipse.emf.common.util.AbstractEList.EListIterator
 */
class EListIterator<E> implements ListIterator<E> {
  private cursor: number;
  private lastCursor = -1;

  constructor(
    private readonly list: EList<E>,
    index: number,
  ) {
    this.cursor = index;
  }

  hasNext(): boolean {
    return this.cursor !== this.list.size();
  }

  next(): E {
    const next = this.getOrNoSuchElement(this.cursor);
    this.lastCursor = this.cursor++;
    return next;
  }

  hasPrevious(): boolean {
    return this.cursor !== 0;
  }

  previous(): E {
    const previous = this.getOrNoSuchElement(--this.cursor);
    this.lastCursor = this.cursor;
    return previous;
  }

  nextIndex(): number {
    return this.cursor;
  }

  previousIndex(): number {
    return this.cursor - 1;
  }

  remove(): void {
    this.checkLastCursor();
    this.list.removeAt(this.lastCursor);
    if (this.lastCursor < this.cursor) {
      --this.cursor;
    }
    this.lastCursor = -1;
  }

  set(object: E): void {
    this.checkLastCursor();
    this.list.set(this.lastCursor, object);
  }

  add(object: E): void {
    this.list.addAt(this.cursor++, object);
    this.lastCursor = -1;
  }

  private getOrNoSuchElement(index: number): E {
    try {
      return this.list.get(index);
    } catch (exception) {
      if (exception instanceof IndexOutOfBoundsException) {
        throw new NoSuchElementException();
      }
      throw exception;
    }
  }

  private checkLastCursor(): void {
    if (this.lastCursor === -1) {
      throw new IllegalStateException();
    }
  }
}
