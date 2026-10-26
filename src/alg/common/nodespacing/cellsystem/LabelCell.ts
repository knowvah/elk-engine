// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { GraphAdapters } from '../../../../core/util/adapters/GraphAdapters.js';
import type { NodeLabelLocation } from '../internal/NodeLabelLocation.js';
import { Cell } from './Cell.js';
import { HorizontalLabelAlignment } from './HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from './VerticalLabelAlignment.js';

/**
 * A cell which manages the size and placement of labels. It inserts a customizable gap between each of the labels and
 * calculates its minimum size to be the area required to place all of its labels. The horizontal and vertical alignment
 * control what happens if the cell's actual size is larger than required by its labels. Call {@link applyLabelLayout}
 * to cause the cell to go ahead and assign positions to all of its labels.
 *
 * The cell can operate in horizontal and vertical layout mode (with horizontal being the default). Horizontal layout
 * mode is used for horizontal layout directions and assumes that labels are horizontal lines of text that need to be
 * stacked atop one another. Vertical layout mode assumes that labels are vertical columns of text that need to be
 * stacked next to each other. If in doubt, use horizontal layout mode.
 *
 * The four Java constructors are one overloaded constructor (§6.5): `(gap)`, `(gap, horizontalLayoutMode)`,
 * `(gap, nodeLabelLocation)` and `(gap, nodeLabelLocation, horizontalLayoutMode)`.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/cellsystem/LabelCell.java
 */
export class LabelCell extends Cell {
  /** Whether we operate in horizontal or vertical layout mode. */
  readonly #horizontalLayoutMode: boolean;
  /** Horizontal alignment of labels. */
  #horizontalAlignment: HorizontalLabelAlignment | null = HorizontalLabelAlignment.CENTER;
  /** Vertical alignment of labels. */
  #verticalAlignment: VerticalLabelAlignment | null = VerticalLabelAlignment.CENTER;
  /** The gap inserted between two consecutive labels. */
  readonly #gap: number;
  /** The labels in our cell. */
  readonly #labels: GraphAdapters.LabelAdapter<unknown>[] = [];
  /** Our minimum size. This is basically the space we need at minimum to place our labels. */
  readonly #minimumContentAreaSize: KVector = new KVector();

  /**
   * Constructs a new instance with the given properties.
   *
   * @param gap gap between labels.
   */
  constructor(gap: number);
  /**
   * Constructs a new instance with the given properties.
   *
   * @param gap gap between labels.
   * @param horizontalLayoutMode whether the cell should operate in horizontal or vertical layout mode.
   */
  constructor(gap: number, horizontalLayoutMode: boolean);
  /**
   * Constructs a new instance with the given properties.
   *
   * @param gap gap between labels.
   * @param nodeLabelLocation the label location represented by this cell. This determines things like alignment.
   * @param horizontalLayoutMode whether we operate in horizontal or vertical layout mode (default `true`).
   */
  constructor(gap: number, nodeLabelLocation: NodeLabelLocation, horizontalLayoutMode?: boolean);
  constructor(gap: number, second?: boolean | NodeLabelLocation, horizontalLayoutMode: boolean = true) {
    super();
    this.#gap = gap;
    if (second === undefined) {
      this.#horizontalLayoutMode = true;
    } else if (typeof second === 'boolean') {
      this.#horizontalLayoutMode = second;
    } else {
      this.#horizontalLayoutMode = horizontalLayoutMode;
      this.#horizontalAlignment = second.getHorizontalAlignment();
      this.#verticalAlignment = second.getVerticalAlignment();
    }
  }

  /** Returns the horizontal alignment of labels. */
  getHorizontalAlignment(): HorizontalLabelAlignment | null {
    return this.#horizontalAlignment;
  }

  /**
   * Sets the horizontal alignment of labels. Can be chained with further method calls.
   *
   * @throws TypeError if the alignment is null (Java: `Objects.requireNonNull` NPE).
   */
  setHorizontalAlignment(newHorizontalAlignment: HorizontalLabelAlignment | null): this {
    if (newHorizontalAlignment === null) {
      throw new TypeError('Horizontal alignment cannot be null');
    }
    this.#horizontalAlignment = newHorizontalAlignment;
    return this;
  }

  /** Returns the vertical alignment of labels. */
  getVerticalAlignment(): VerticalLabelAlignment | null {
    return this.#verticalAlignment;
  }

  /**
   * Sets the vertical alignment of labels. Can be chained with further method calls.
   *
   * @throws TypeError if the alignment is null (Java: `Objects.requireNonNull` NPE).
   */
  setVerticalAlignment(newVerticalAlignment: VerticalLabelAlignment | null): this {
    if (newVerticalAlignment === null) {
      throw new TypeError('Vertical alignment cannot be null');
    }
    this.#verticalAlignment = newVerticalAlignment;
    return this;
  }

  /**
   * Returns the list of labels in this cell. The list should not be modified, except to reorder the labels. To add
   * labels to the cell, call {@link addLabel} instead.
   *
   * @returns unmodifiable list of labels.
   */
  getLabels(): GraphAdapters.LabelAdapter<unknown>[] {
    return this.#labels;
  }

  override getMinimumWidth(): number {
    const padding = this.getPadding();
    return this.#minimumContentAreaSize.x + padding.left + padding.right;
  }

  override getMinimumHeight(): number {
    const padding = this.getPadding();
    return this.#minimumContentAreaSize.y + padding.top + padding.bottom;
  }

  /**
   * Adds a label to this cell.
   *
   * @param label the label.
   */
  addLabel(label: GraphAdapters.LabelAdapter<unknown>): void {
    this.#labels.push(label);

    // Update our minimum size (how this works depends on the layout mode)
    const labelSize = label.getSize();
    if (this.#horizontalLayoutMode) {
      this.#minimumContentAreaSize.x = Math.max(this.#minimumContentAreaSize.x, labelSize.x);
      this.#minimumContentAreaSize.y += labelSize.y;

      // If this is not our first label, insert a gap
      if (this.#labels.length > 1) {
        this.#minimumContentAreaSize.y += this.#gap;
      }
    } else {
      this.#minimumContentAreaSize.x += labelSize.x;
      this.#minimumContentAreaSize.y = Math.max(this.#minimumContentAreaSize.y, labelSize.y);

      // If this is not our first label, insert a gap
      if (this.#labels.length > 1) {
        this.#minimumContentAreaSize.x += this.#gap;
      }
    }
  }

  /**
   * Returns whether there are any labels in this cell.
   *
   * @returns `true` if this cell contains labels, `false` otherwise.
   */
  hasLabels(): boolean {
    return this.#labels.length > 0;
  }

  /** Actually applies coordinates to the labels based on this cell's content area rectangle. */
  applyLabelLayout(): void {
    // Delegate to the methods specialized for our two layout modes
    if (this.#horizontalLayoutMode) {
      this.#applyHorizontalModeLabelLayout();
    } else {
      this.#applyVerticalModeLabelLayout();
    }
  }

  /** Implementation of {@link applyLabelLayout} for horizontal layout mode. */
  #applyHorizontalModeLabelLayout(): void {
    const cellRect = this.getCellRectangle();
    const cellPadding = this.getPadding();

    // Calculate our starting y coordinate
    let yPos = cellRect.y;
    if (this.#verticalAlignment === VerticalLabelAlignment.CENTER) {
      yPos += (cellRect.height - this.#minimumContentAreaSize.y) / 2;
    } else if (this.#verticalAlignment === VerticalLabelAlignment.BOTTOM) {
      yPos += cellRect.height - this.#minimumContentAreaSize.y;
    }

    // Place them labels, I say!
    for (const label of this.#labels) {
      const labelSize = label.getSize();
      const labelPos = new KVector();

      // Y coordinate
      labelPos.y = yPos;
      yPos += labelSize.y + this.#gap;

      // X coordinate
      switch (this.#horizontalAlignment) {
        case HorizontalLabelAlignment.LEFT:
          labelPos.x = cellRect.x + cellPadding.left;
          break;
        case HorizontalLabelAlignment.CENTER:
          labelPos.x = cellRect.x + cellPadding.left + (cellRect.width - labelSize.x) / 2;
          break;
        case HorizontalLabelAlignment.RIGHT:
          labelPos.x = cellRect.x + cellRect.width - cellPadding.right - labelSize.x;
          break;
      }

      // Apply position
      label.setPosition(labelPos);
    }
  }

  /** Implementation of {@link applyLabelLayout} for vertical layout mode. */
  #applyVerticalModeLabelLayout(): void {
    const cellRect = this.getCellRectangle();
    const cellPadding = this.getPadding();

    // Calculate our starting x coordinate
    let xPos = cellRect.x;
    if (this.#horizontalAlignment === HorizontalLabelAlignment.CENTER) {
      xPos += (cellRect.width - this.#minimumContentAreaSize.x) / 2;
    } else if (this.#horizontalAlignment === HorizontalLabelAlignment.RIGHT) {
      xPos += cellRect.width - this.#minimumContentAreaSize.x;
    }

    // Place them labels, I say!
    for (const label of this.#labels) {
      const labelSize = label.getSize();
      const labelPos = new KVector();

      // X coordinate
      labelPos.x = xPos;
      xPos += labelSize.x + this.#gap;

      // Y coordinate
      switch (this.#verticalAlignment) {
        case VerticalLabelAlignment.TOP:
          labelPos.y = cellRect.y + cellPadding.top;
          break;
        case VerticalLabelAlignment.CENTER:
          labelPos.y = cellRect.y + cellPadding.top + (cellRect.height - labelSize.y) / 2;
          break;
        case VerticalLabelAlignment.BOTTOM:
          labelPos.y = cellRect.y + cellRect.height - cellPadding.bottom - labelSize.y;
          break;
      }

      // Apply position
      label.setPosition(labelPos);
    }
  }
}
