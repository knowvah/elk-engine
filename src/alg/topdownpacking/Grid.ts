// SPDX-License-Identifier: EPL-2.0

/**
 * Provides an interface to store and access items in a grid structure. The grid size is bounded by the size set. The
 * index for the first column and row begins at 0. Empty cells of the grid contain null.
 *
 * Java's `List<T>` results hold `null` for empty cells, so they are `(T | null)[]` here.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/Grid.java
 */
export interface Grid<T> {
  /**
   * Stores an item at the requested position in the grid. If the requested index is out of bounds an exception is
   * thrown.
   *
   * @param col index of requested column
   * @param row index of requested row
   * @param item object to be stored in the grid
   * @throws IndexOutOfBoundsException
   */
  put(col: number, row: number, item: T): void;

  /**
   * Returns the item stored at the requested position in the grid. If the requested index is out of bounds an
   * exception is thrown.
   *
   * @param col index of requested column
   * @param row index of requested row
   * @returns object stored at requested index
   * @throws IndexOutOfBoundsException
   */
  get(col: number, row: number): T | null;

  /**
   * Returns the requested row of the grid as a list. If the requested row is outside of the bounds of the grid an
   * exception is thrown.
   *
   * @param row the row number that should be returned
   * @returns the list containing the entries of the row
   * @throws IndexOutOfBoundsException
   */
  getRow(row: number): (T | null)[];

  /**
   * Returns the requested column of the grid as a list. If the requested column is outside of the bounds of the grid
   * an exception is thrown.
   *
   * @param col the column number that should be returned
   * @returns the list containing the entries of the column
   * @throws IndexOutOfBoundsException
   */
  getColumn(col: number): (T | null)[];

  /**
   * Returns the number of columns in the grid.
   *
   * @returns the width of the grid
   */
  getColumns(): number;

  /**
   * Returns the number of rows in the grid.
   *
   * @returns the height of the grid
   */
  getRows(): number;

  /**
   * Defines the size of the grid. Access to coordinates outside the grid should throw an error.
   *
   * @param cols the width of the grid
   * @param rows the height of the grid
   */
  setGridSize(cols: number, rows: number): void;
}
