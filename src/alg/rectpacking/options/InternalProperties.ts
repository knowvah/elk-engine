// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import type { RectRow } from '../util/RectRow.js';

/**
 * Container for property definitions for internal use of the algorithm. These properties should not be accessed from
 * outside.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/options/InternalProperties.java
 */
export class InternalProperties {
  /** Additional height of the drawing that is to be added during expansion. */
  static readonly ADDITIONAL_HEIGHT: IProperty<number> = new Property<number>('additionalHeight');

  /** The height of the parent. */
  static readonly DRAWING_HEIGHT: IProperty<number> = new Property<number>('drawingHeight');

  /** The width of the parent. */
  static readonly DRAWING_WIDTH: IProperty<number> = new Property<number>('drawingWidth');

  /** The minimum height of the parent. */
  static readonly MIN_HEIGHT: IProperty<number> = new Property<number>('minHeight');

  /** The minimum width of the parent. */
  static readonly MIN_WIDTH: IProperty<number> = new Property<number>('minWidth');

  /** The rows formed by the simple placement. */
  static readonly ROWS: IProperty<RectRow[]> = new Property<RectRow[]>('rows');

  /** The target width of the graph. */
  static readonly TARGET_WIDTH: IProperty<number> = new Property<number>('targetWidth');

  /**
   * The minimum width that has to be added to the target width to allow an element from the next row to be placed the
   * previous row.
   */
  static readonly MIN_ROW_INCREASE: IProperty<number> = new Property<number>('minRowIncrease', 0.0);

  /**
   * The maximum width that has to be added to the target width to allow an element from the next row to be placed the
   * previous row.
   */
  static readonly MAX_ROW_INCREASE: IProperty<number> = new Property<number>('maxRowIncrease', 0.0);

  /** The minimum width that has to be removed from the target width to not allow the last element of a row in it. */
  static readonly MIN_ROW_DECREASE: IProperty<number> = new Property<number>('minRowDecrease', 0.0);

  /** The maximum width that has to be removed from the target width to not allow the last element of a row in it. */
  static readonly MAX_ROW_DECREASE: IProperty<number> = new Property<number>('maxRowDecrease', 0.0);

  /** Hidden default constructor. */
  private constructor() {}
}
