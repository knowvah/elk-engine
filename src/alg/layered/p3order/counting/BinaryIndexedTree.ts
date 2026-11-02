// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';

/**
 * Sorted list of integers storing values from 0 up to the maxNumber passed on creation. Adding, removing and indexOf
 * (and addAndIndexOf) is in O(log maxNumber).
 *
 * Implemented as a binary tree where each leaf stores the number of integers at the leaf index and each node stores the
 * number of values in the left branch of the node.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/BinaryIndexedTree.java
 */
export class BinaryIndexedTree {
  private binarySums: Int32Array;
  private numsPerIndex: Int32Array;
  private _size: number;
  private maxNum: number;

  /**
   * Construct tree given maximum number of elements.
   *
   * @param maxNum maximum number elements.
   * @see BinaryIndexedTree.java:35
   */
  constructor(maxNum: number) {
    this.maxNum = maxNum;
    this.binarySums = new Int32Array(Int32.add(maxNum, 1));
    this.numsPerIndex = new Int32Array(maxNum);
    this._size = 0;
  }

  /**
   * Increment given index.
   *
   * @param index The index to increment.
   * @see BinaryIndexedTree.java:49
   */
  add(index: number): void {
    this._size = Int32.add(this._size, 1);
    this.numsPerIndex[this.#checked(this.numsPerIndex, index)] = Int32.add(this.numsPerIndex[index]!, 1);
    let i = Int32.add(index, 1);
    while (i < this.binarySums.length) {
      this.binarySums[i] = Int32.add(this.binarySums[i]!, 1);
      i = Int32.add(i, i & Int32.neg(i));
    }
  }

  /** Java array access: out of range throws `ArrayIndexOutOfBoundsException` (typed arrays would answer `undefined`). */
  #checked(array: Int32Array, index: number): number {
    if (index < 0 || index >= array.length) {
      throw new ArrayIndexOutOfBoundsException(
        `Index ${String(index)} out of bounds for length ${String(array.length)}`,
      );
    }
    return index;
  }

  /**
   * Sum all entries before given index, i.e. index - 1.
   *
   * @param index Not included end index.
   * @returns sum.
   * @see BinaryIndexedTree.java:67
   */
  rank(index: number): number {
    let i = index;
    let sum = 0;
    while (i > 0) {
      sum = Int32.add(sum, this.binarySums[this.#checked(this.binarySums, i)]!);
      i = Int32.sub(i, i & Int32.neg(i));
    }
    return sum;
  }

  /**
   * @returns size of tree.
   * @see BinaryIndexedTree.java:80
   */
  size(): number {
    return this._size;
  }

  /**
   * Remove all entries for one index.
   *
   * @param index the index
   * @see BinaryIndexedTree.java:90
   */
  removeAll(index: number): void {
    const numEntries = this.numsPerIndex[this.#checked(this.numsPerIndex, index)]!;
    if (numEntries === 0) {
      return;
    }
    this.numsPerIndex[index] = 0;
    this._size = Int32.sub(this._size, numEntries);
    let i = Int32.add(index, 1);
    while (i < this.binarySums.length) {
      this.binarySums[i] = Int32.sub(this.binarySums[i]!, numEntries);
      i = Int32.add(i, i & Int32.neg(i));
    }
  }

  /**
   * Clears contents of tree.
   *
   * @see BinaryIndexedTree.java:106
   */
  clear(): void {
    this.binarySums = new Int32Array(Int32.add(this.maxNum, 1));
    this.numsPerIndex = new Int32Array(this.maxNum);
    this._size = 0;
  }

  /**
   * @returns true if this tree is empty
   * @see BinaryIndexedTree.java:116
   */
  isEmpty(): boolean {
    return this._size === 0;
  }
}
