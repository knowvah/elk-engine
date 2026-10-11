// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";

/**
 * The part of Guava's `Table` ELK uses: `get`, `put` and `values`. Keys are compared by
 * `Map` identity/SameValueZero (AD-10: enum and object keys are identity-hashed).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Table.html
 */
export interface Table<R, C, V> {
  /** Value for the keys, or `null` if there is no mapping. */
  get(rowKey: R, columnKey: C): V | null;
  /** Associates `value`; returns the previous value or `null`. */
  put(rowKey: R, columnKey: C, value: V): V | null;
  /** Live view of all values, row-major. */
  values(): Iterable<V | null>;
}

function indexKeys<K>(keys: Iterable<K>, what: string): Map<K, number> {
  const index = new Map<K, number>();
  for (const key of keys) {
    if (index.has(key)) {
      throw new IllegalArgumentException(`Duplicate ${what} key: ${String(key)}`);
    }
    index.set(key, index.size);
  }
  return index;
}

class ArrayTable<R, C, V> implements Table<R, C, V> {
  readonly #rows: Map<R, number>;
  readonly #columns: Map<C, number>;
  readonly #cells: (V | null)[];

  constructor(rowKeys: Iterable<R>, columnKeys: Iterable<C>) {
    this.#rows = indexKeys(rowKeys, "row");
    this.#columns = indexKeys(columnKeys, "column");
    if ((this.#rows.size === 0) !== (this.#columns.size === 0)) {
      throw new IllegalArgumentException("Row and column keys must both be empty or both non-empty");
    }
    this.#cells = new Array<V | null>(this.#rows.size * this.#columns.size).fill(null);
  }

  #cellIndex(rowKey: R, columnKey: C): number | undefined {
    const row = this.#rows.get(rowKey);
    const column = this.#columns.get(columnKey);
    return row === undefined || column === undefined
      ? undefined
      : row * this.#columns.size + column;
  }

  get(rowKey: R, columnKey: C): V | null {
    const index = this.#cellIndex(rowKey, columnKey);
    return index === undefined ? null : (this.#cells[index] as V | null);
  }

  put(rowKey: R, columnKey: C, value: V): V | null {
    const index = this.#cellIndex(rowKey, columnKey);
    if (index === undefined) {
      throw new IllegalArgumentException(
        `Row ${String(rowKey)} or column ${String(columnKey)} is not in the table's key sets`,
      );
    }
    const previous = this.#cells[index] as V | null;
    this.#cells[index] = value;
    return previous;
  }

  values(): Iterable<V | null> {
    const cells = this.#cells;
    return {
      [Symbol.iterator]: (): Iterator<V | null> => cells[Symbol.iterator](),
    };
  }
}

/**
 * `ArrayTable.create(rowKeys, columnKeys)`: a table of null cells for exactly those key
 * pairs; `put` outside them throws {@link IllegalArgumentException}.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ArrayTable.html#create(java.lang.Iterable,java.lang.Iterable)
 */
export function createArrayTable<R, C, V>(
  rowKeys: Iterable<R>,
  columnKeys: Iterable<C>,
): Table<R, C, V> {
  return new ArrayTable<R, C, V>(rowKeys, columnKeys);
}
