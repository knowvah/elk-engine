// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import { ProfileFill } from '../ProfileFill.js';
import { PlanarGrid } from './PlanarGrid.js';
import type { Polyomino } from './Polyomino.js';

/**
 * Holds a bunch of polyominos and a grid to place them on.
 *
 * The Java constructors `(polys, aspectRatio)` and `(polys, aspectRatio, fill)` are one constructor with
 * `fill = false`. `serialVersionUID` is dropped (no Java serialization).
 *
 * @typeParam P a {@link Polyomino} or one of its derived classes
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/Polyominoes.java
 */
export class Polyominoes<P extends Polyomino> extends MapPropertyHolder {
  private polys: P[] = [];
  private grid: PlanarGrid;

  /**
   * Initializes the structure with some polyominoes and a desired aspect ratio for the underlying grid structure.
   * Optionally holes in polyominoes can be filled using {@link ProfileFill}.
   *
   * @param polys polyominoes or derivatives to add
   * @param aspectRatio desired aspect ratio given as the fraction width by height
   * @param fill true, fill holes in polyominoes, false, keep polyominoes as they are
   */
  constructor(polys: Iterable<P>, aspectRatio: number, fill = false) {
    super();
    let gridWidth = 0;
    let gridHeight = 0;

    for (const poly of polys) {
      if (fill) {
        ProfileFill.fillPolyomino(poly);
      }
      this.polys.push(poly);
      gridWidth = Int32.add(gridWidth, poly.getWidth());
      gridHeight = Int32.add(gridHeight, poly.getHeight());
    }

    // Add width and height of the future center polyomino once again, for avoiding
    // Indices Out of bounds (might get better, see last todo)
    if (this.polys.length > 0) {
      const poly = this.polys[0]!;
      gridWidth = Int32.add(gridWidth, poly.getWidth());
      gridHeight = Int32.add(gridHeight, poly.getHeight());
    }

    // Make the area 4 times greater for the case that all polyominoes can only be placed in one quadrant of the
    // coordinate system
    gridWidth = Int32.mul(gridWidth, 2);
    gridHeight = Int32.mul(gridHeight, 2);

    // Adjust grid size for desired aspect ratio
    if (aspectRatio > 1.0) {
      gridWidth = d2i(Math.ceil(gridWidth * aspectRatio));
    } else {
      gridHeight = d2i(Math.ceil(gridHeight / aspectRatio));
    }

    this.grid = new PlanarGrid(gridWidth, gridHeight);
  }

  /** Returns the list of polyominoes. */
  getPolyominoes(): P[] {
    return this.polys;
  }

  /** Returns the underlying grid structure the polyominoes can be placed on. */
  getGrid(): PlanarGrid {
    return this.grid;
  }
}
