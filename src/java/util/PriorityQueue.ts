// SPDX-License-Identifier: EPL-2.0

const MIN_CAPACITY = 1;

/**
 * Unbounded priority queue over an array binary heap.
 *
 * Spec: the Javadoc says the queue is "based on a priority heap", the head is the least element,
 * ties are "broken arbitrarily" and iterator order is unspecified. Tie and array order below is
 * observed behavior proven by the frozen JVM vectors (`priorityQueue` scripts `pq-tie-cmp-*`,
 * `pq-tie-cap1-*`, `pq-tie-cap50-*`, `rand-pq-*` in
 * `test/golden/refs/java/collections.json`), not a documented guarantee:
 * - `add`/`offer` appends and sifts up while the element compares strictly less than its parent
 *   (a tie never moves up).
 * - `poll` takes the root, moves the last element to the root and sifts it down: the smaller child
 *   is chosen, the right child only when the left compares strictly greater; it stops when the
 *   element compares less than or equal to that child.
 * - `remove(o)` finds the first element identical (`===`) to `o`, replaces it with the last
 *   element, sifts down, and sifts up if it did not move.
 * - `addAll` adds each item in order via `add`.
 * - `toArray` and iteration expose the heap array order. Capacity is not observable.
 *
 * Equality for `remove` is reference equality; ELK removes the same object it added.
 * The `PriorityQueue(Collection)` constructor is not ported: ELK never calls it.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html
 */
export class PriorityQueue<E> implements Iterable<E> {
  private readonly heap: E[] = [];
  private readonly comparator: (a: E, b: E) => number;

  /**
   * @param initialCapacity validated as in Java (at least 1) but otherwise unobservable
   * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#%3Cinit%3E(int,java.util.Comparator)
   */
  constructor(comparator: (a: E, b: E) => number, initialCapacity: number = MIN_CAPACITY) {
    if (initialCapacity < MIN_CAPACITY) {
      throw new RangeError(`initialCapacity ${initialCapacity} must be at least ${MIN_CAPACITY}`);
    }
    this.comparator = comparator;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#add(E) */
  add(e: E): boolean {
    return this.offer(e);
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#offer(E) */
  offer(e: E): boolean {
    this.heap.push(e);
    this.siftUp(this.heap.length - 1);
    return true;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/AbstractQueue.html#addAll(java.util.Collection) */
  addAll(items: Iterable<E>): boolean {
    let changed = false;
    for (const item of items) {
      this.add(item);
      changed = true;
    }
    return changed;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#poll() */
  poll(): E | undefined {
    return this.removeAt(0);
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#peek() */
  peek(): E | undefined {
    return this.heap[0];
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#remove(java.lang.Object) */
  remove(o: E): boolean {
    const index = this.heap.indexOf(o);
    if (index < 0) {
      return false;
    }
    this.removeAt(index);
    return true;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#size() */
  size(): number {
    return this.heap.length;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#isEmpty() */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#clear() */
  clear(): void {
    this.heap.length = 0;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#toArray() */
  toArray(): E[] {
    return [...this.heap];
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html#iterator() */
  [Symbol.iterator](): Iterator<E> {
    return this.heap[Symbol.iterator]();
  }

  private removeAt(index: number): E | undefined {
    const last = this.heap.length - 1;
    if (index > last) {
      return undefined;
    }
    const removed = this.heap[index];
    const moved = this.heap.pop() as E;
    if (index !== last) {
      this.heap[index] = moved;
      this.siftDown(index);
      if (this.heap[index] === moved) {
        this.siftUp(index);
      }
    }
    return removed;
  }

  private siftUp(start: number): void {
    const x = this.heap[start] as E;
    let k = start;
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      const p = this.heap[parent] as E;
      if (this.comparator(x, p) >= 0) {
        break;
      }
      this.heap[k] = p;
      k = parent;
    }
    this.heap[k] = x;
  }

  private siftDown(start: number): void {
    const x = this.heap[start] as E;
    const n = this.heap.length;
    let k = start;
    while (2 * k + 1 < n) {
      let child = 2 * k + 1;
      const right = child + 1;
      if (right < n && this.comparator(this.heap[child] as E, this.heap[right] as E) > 0) {
        child = right;
      }
      const c = this.heap[child] as E;
      if (this.comparator(x, c) <= 0) {
        break;
      }
      this.heap[k] = c;
      k = child;
    }
    this.heap[k] = x;
  }
}
