// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import type { PolyominoSuccessor } from './PolyominoSuccessor.js';
import { Direction } from './structures/Direction.js';
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Computes the successor of a point by modifying an existing way: based on the directions the extensions of a
 * polyomino are facing, only certain quadrants of the coordinate system are allowed as candidates; the wrapped
 * function is applied repeatedly until a candidate lies in an allowed quadrant. (0,0) belongs to the positive quadrant.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/SuccessorQuadrantsGeneric.java
 */
export class SuccessorQuadrantsGeneric implements PolyominoSuccessor {
  private lastPoly: Polyomino | null = null;
  private posX = false;
  private posY = false;
  private negX = false;
  private negY = false;
  private costFun: PolyominoSuccessor;

  /**
   * @param costFun the traversal function to restrict to the quadrants allowed by the polyomino's extensions
   */
  constructor(costFun: PolyominoSuccessor) {
    this.costFun = costFun;
  }

  apply(coords: Pair<number, number>, poly: Polyomino): Pair<number, number> {
    if (poly !== this.lastPoly) {
      this.refreshQuadrants(poly);
    }

    const nextCoords = this.costFun.apply(coords, poly);

    const newX = nextCoords.getFirst() as number;
    const newY = nextCoords.getSecond() as number;

    const invalid = this.isInvalid(newX, newY);

    if (invalid) {
      return this.apply(nextCoords, poly);
    } else {
      return nextCoords;
    }
  }

  /** The recomputation of the allowed quadrants for a polyomino that differs from the last one. */
  private refreshQuadrants(poly: Polyomino): void {
    this.lastPoly = poly;
    const dirSet = new Set<Direction>(poly.getPolyominoExtensions().map((polyExt) => polyExt.getFirst()));
    this.posX = true;
    this.posY = true;
    this.negX = true;
    this.negY = true;

    let containsPos = dirSet.has(Direction.NORTH);
    let containsNeg = dirSet.has(Direction.SOUTH);
    // Beware of the non mathematical coordinate system (inverted y-axis)!
    if (containsPos && !containsNeg) {
      this.posY = false;
    }
    if (!containsPos && containsNeg) {
      this.negY = false;
    }

    containsPos = dirSet.has(Direction.EAST);
    containsNeg = dirSet.has(Direction.WEST);
    if (containsPos && !containsNeg) {
      this.negX = false;
    }
    if (!containsPos && containsNeg) {
      this.posX = false;
    }
  }

  /** The quadrant check of {@link apply}: true if the candidate lies in a forbidden quadrant. */
  private isInvalid(newX: number, newY: number): boolean {
    // (0,0) is part of the positive quadrant
    let invalid = false;
    if (newX < 0) {
      if (!this.negX) {
        invalid = true;
      }
    } else {
      if (!this.posX) {
        invalid = true;
      }
    }
    if (newY < 0) {
      if (!this.negY) {
        invalid = true;
      }
    } else {
      if (!this.posY) {
        invalid = true;
      }
    }

    return invalid;
  }
}
