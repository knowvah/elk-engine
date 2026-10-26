// SPDX-License-Identifier: EPL-2.0
import type { Polyomino } from './structures/Polyomino.js';

/**
 * Utility class providing a simple filling algorithm for polyominoes with holes whose cells are at least 8-connected
 * (otherwise application of the filling method might result in the filling of unintended cells).
 *
 * Example of an 8-connected polyomino (`_` empty, `X` filled, `O` newly filled after applying the algorithm):
 * `_X_` / `XOX` / `_X_`. For an unconnected polyomino (`_XXX_X` / `XOX!_X` / `_XXX__`) the `!` is accidentally
 * filled although it is not part of a hole.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/ProfileFill.java
 */
export class ProfileFill {
  /** Constructor should never be called as this is simply a utility class. */
  private constructor() {}

  /** Fills the holes of a polyomino. */
  static fillPolyomino(poly: Polyomino): void {
    const width = poly.getWidth();
    const height = poly.getHeight();

    // Compute visible profiles from all four cardinal directions.
    const northProfile = ProfileFill.northProfile(poly, width, height);
    const southProfile = ProfileFill.southProfile(poly, width, height);
    const eastProfile = ProfileFill.eastProfile(poly, width, height);
    const westProfile = ProfileFill.westProfile(poly, width, height);

    // Fill all cells between these computed bounds.
    for (let xi = 0; xi < width; xi++) {
      for (let yi = 0; yi < height; yi++) {
        if (xi < westProfile[yi]! && xi > eastProfile[yi]! && yi < southProfile[xi]! && yi > northProfile[xi]!) {
          poly.setBlocked(xi, yi);
        }
      }
    }
  }

  /** First blocked row seen from the north per column (`height` if none). */
  private static northProfile(poly: Polyomino, width: number, height: number): number[] {
    const profile = new Array<number>(width).fill(0);
    for (let xi = 0; xi < width; xi++) {
      let y = 0;
      while (y < height && !poly.isBlocked(xi, y)) {
        y++;
      }
      profile[xi] = y;
    }
    return profile;
  }

  /** First blocked row seen from the south per column (`-1` if none). */
  private static southProfile(poly: Polyomino, width: number, height: number): number[] {
    const profile = new Array<number>(width).fill(0);
    for (let xi = 0; xi < width; xi++) {
      let y = height - 1;
      while (y >= 0 && !poly.isBlocked(xi, y)) {
        y--;
      }
      profile[xi] = y;
    }
    return profile;
  }

  /** First blocked column seen from the east per row (`width` if none); Java's naming, scanning from x = 0. */
  private static eastProfile(poly: Polyomino, width: number, height: number): number[] {
    const profile = new Array<number>(height).fill(0);
    for (let yi = 0; yi < height; yi++) {
      let x = 0;
      while (x < width && !poly.isBlocked(x, yi)) {
        x++;
      }
      profile[yi] = x;
    }
    return profile;
  }

  /** First blocked column seen from the west per row (`-1` if none); Java's naming, scanning from x = width - 1. */
  private static westProfile(poly: Polyomino, width: number, height: number): number[] {
    const profile = new Array<number>(height).fill(0);
    for (let yi = 0; yi < height; yi++) {
      let x = width - 1;
      while (x >= 0 && !poly.isBlocked(x, yi)) {
        x--;
      }
      profile[yi] = x;
    }
    return profile;
  }
}
