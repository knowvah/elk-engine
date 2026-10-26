// SPDX-License-Identifier: EPL-2.0
import { ArrayIndexOutOfBoundsException } from '../../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import * as Int64 from '../../../../java/lang/Int64.js';
import type { IThreeValueGrid } from './IThreeValueGrid.js';

const LSB_MASK = 0x01n;
const TWO_LSBS_MASK = 0x03n;
const EMPTY = 0x00n;
const BLOCKED = 0x01n;
const WEAKLY_BLOCKED = 0x02n;
const HALF_WORD = 32.0;
const REST_MASK = 0x1f;
const RIGHT_SHIFT = 5; // 2^5 = 32
const COUNT_MODULUS_LIMIT = 8;

/**
 * A grid holding one of three values per cell, packed two bits per cell into 64-bit words (Java `long`, held as
 * `bigint` through the {@link Int64} shim). Value 0 is empty, 1 is blocked and 2 is weakly blocked.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/TwoBitGrid.java
 */
export class TwoBitGrid implements IThreeValueGrid {
  private grid: bigint[][];
  private xSize: number;
  private ySize: number;

  /**
   * Creates a grid of the given size. The Java no-argument constructor (package-private, equivalent to
   * `this(0, 0)`) is the default of both parameters.
   */
  constructor(width = 0, height = 0) {
    this.grid = TwoBitGrid.newWords(width, height);
    this.xSize = width;
    this.ySize = height;
  }

  /** `new long[height][(int) Math.ceil(width / HALF_WORD)]`. */
  private static newWords(width: number, height: number): bigint[][] {
    const rowLength = Math.ceil(width / HALF_WORD);
    return Array.from({ length: height }, () => new Array<bigint>(rowLength).fill(0n));
  }

  getWidth(): number {
    return this.xSize;
  }

  getHeight(): number {
    return this.ySize;
  }

  isEmpty(x: number, y: number): boolean {
    try {
      return this.retrieve(x, y) === EMPTY;
    } catch (e) {
      throw this.rethrowOutOfBounds(e, x, y);
    }
  }

  isBlocked(x: number, y: number): boolean {
    try {
      return this.retrieve(x, y) === BLOCKED;
    } catch (e) {
      throw this.rethrowOutOfBounds(e, x, y);
    }
  }

  isWeaklyBlocked(x: number, y: number): boolean {
    try {
      return this.retrieve(x, y) === WEAKLY_BLOCKED;
    } catch (e) {
      throw this.rethrowOutOfBounds(e, x, y);
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.xSize && y < this.ySize;
  }

  reinitialize(width: number, height: number): void {
    this.grid = TwoBitGrid.newWords(width, height);
    this.xSize = width;
    this.ySize = height;
  }

  setEmpty(x: number, y: number): void {
    this.set(x, y, false, false);
  }

  setBlocked(x: number, y: number): void {
    this.set(x, y, false, true);
  }

  setWeaklyBlocked(x: number, y: number): void {
    this.set(x, y, true, false);
  }

  toString(): string {
    let output = ' ';
    // A basic coordinate system
    let count = 0;
    for (let x = 0; x < this.xSize; x++) {
      output += String(count);
      count = this.incModTen(count);
    }
    output += '\n';
    count = 0;
    for (let y = 0; y < this.ySize; y++) {
      output += String(count);
      count = this.incModTen(count);
      for (let x = 0; x < this.xSize; x++) {
        output += this.cellSymbol(this.retrieve(x, y));
      }
      output += '\n';
    }
    return output.substring(0, output.length - 1);
  }

  private cellSymbol(item: bigint): string {
    if (item === EMPTY) {
      return '_';
    }
    if (item === BLOCKED) {
      return 'X';
    }
    return '0';
  }

  /** Java array access `grid[y]` with its bounds check; the rows are dense, so `undefined` means out of bounds. */
  private checkedRow(y: number): bigint[] {
    const row = this.grid[y];
    if (row === undefined) {
      throw new ArrayIndexOutOfBoundsException(`Index ${y} out of bounds for length ${this.grid.length}`);
    }
    return row;
  }

  /** Java array access `row[xWord]` with its bounds check; the words are dense, so `undefined` means out of bounds. */
  private static checkedWord(row: bigint[], xWord: number): bigint {
    const word = row[xWord];
    if (word === undefined) {
      throw new ArrayIndexOutOfBoundsException(`Index ${xWord} out of bounds for length ${row.length}`);
    }
    return word;
  }

  private retrieve(x: number, y: number): bigint {
    const xWord = Int32.shr(x, RIGHT_SHIFT);
    const xRest = BigInt(x & REST_MASK);
    const word = TwoBitGrid.checkedWord(this.checkedRow(y), xWord);
    return Int64.ushr(word, Int64.shl(xRest, 1)) & TWO_LSBS_MASK;
  }

  private set(x: number, y: number, msb: boolean, lsb: boolean): void {
    try {
      if (x >= this.xSize) {
        throw new ArrayIndexOutOfBoundsException();
      }

      const xWord = Int32.shr(x, RIGHT_SHIFT);
      const xRest = BigInt(x & REST_MASK);
      let mask = Int64.shl(LSB_MASK, Int64.shl(xRest, 1));
      const row = this.checkedRow(y);
      // Java re-reads `grid[y][xWord]` in each assignment; `word` always holds the value last written there.
      let word = TwoBitGrid.checkedWord(row, xWord);
      word = lsb ? word | mask : word & ~mask;
      row[xWord] = word;
      mask = Int64.shl(mask, 1);
      word = msb ? word | mask : word & ~mask;
      row[xWord] = word;
    } catch (e) {
      throw this.rethrowOutOfBounds(e, x, y);
    }
  }

  /** The shared `catch (ArrayIndexOutOfBoundsException)` clause; any other error propagates unchanged. */
  private rethrowOutOfBounds(e: unknown, x: number, y: number): unknown {
    if (e instanceof ArrayIndexOutOfBoundsException) {
      return new IndexOutOfBoundsException(
        `Grid is only of size ${this.xSize}*${this.ySize}. Requested point (${x}, ${y}) is out of bounds.`,
      );
    }
    return e;
  }

  private incModTen(num: number): number {
    if (num > COUNT_MODULUS_LIMIT) {
      return 0;
    }
    return num + 1;
  }
}
