// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { Cell } from './Cell.js';

/**
 * An atomic cell is a simple cell that simply holds a size. Its minimum size can be directly manipulated. This is
 * basically a placeholder for other things to be placed in the cell system later.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/AtomicCell.java
 */
export class AtomicCell extends Cell {
  /** The minimum size of a cell's content area (that is, this excludes the padding). */
  readonly #minimumContentAreaSize: KVector = new KVector();

  /**
   * Returns the minimum content area size, to be modified by clients. Note that this size does not include any
   * padding.
   */
  getMinimumContentAreaSize(): KVector {
    return this.#minimumContentAreaSize;
  }

  /**
   * Sets the cell's minimum size.
   *
   * @param newMinimumContentAreaSize the new minimum content area size.
   * @param includesPadding if `true`, the new size includes padding that needs to be subtracted.
   */
  setMinimumContentAreaSize(newMinimumContentAreaSize: KVector, includesPadding: boolean): void {
    if (includesPadding) {
      const padding = this.getPadding();
      this.#minimumContentAreaSize.x = newMinimumContentAreaSize.x - padding.left - padding.right;
      this.#minimumContentAreaSize.y = newMinimumContentAreaSize.y - padding.top - padding.bottom;
    } else {
      this.#minimumContentAreaSize.set(newMinimumContentAreaSize);
    }
  }

  override getMinimumWidth(): number {
    const padding = this.getPadding();
    return this.#minimumContentAreaSize.x + padding.left + padding.right;
  }

  override getMinimumHeight(): number {
    const padding = this.getPadding();
    return this.#minimumContentAreaSize.y + padding.top + padding.bottom;
  }
}
