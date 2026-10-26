// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';

/**
 * Internal class representing a 4-tuple that, in one application as a 'compaction lock', states for
 * a {@link CNode} if the compaction should be locked in a particular direction.
 *
 * The overloads `set(l, r, u, d)` and `set(value, direction)` are told apart by the type of the
 * first argument; the constructors `Quadruplet()` and `Quadruplet(l, r, u, d)` by argument count.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/Quadruplet.java
 */
export class Quadruplet {
  /** Locking values. */
  left = false;
  right = false;
  up = false;
  down = false;

  /** The lock defaults to false. */
  constructor();
  /** This constructor initializes the lock. */
  constructor(l: boolean, r: boolean, u: boolean, d: boolean);
  constructor(...args: [] | [boolean, boolean, boolean, boolean]) {
    if (args.length === 0) {
      this.set(false, false, false, false);
    } else {
      this.set(...args);
    }
  }

  /** Sets the lock. */
  set(l: boolean, r: boolean, u: boolean, d: boolean): void;
  /** Sets the lock in a specific {@link Direction}. */
  set(value: boolean, direction: Direction): void;
  set(...args: [boolean, boolean, boolean, boolean] | [boolean, Direction]): void {
    if (args.length === 4) {
      [this.left, this.right, this.up, this.down] = args;
    } else {
      this.setDirection(args[0], args[1]);
    }
  }

  /**
   * Modifies this {@link Quadruplet} to represent the element-wise _or_ with `other`.
   *
   * @param other the other tuple
   */
  applyOr(other: Quadruplet): void {
    this.left ||= other.left;
    this.right ||= other.right;
    this.up ||= other.up;
    this.down ||= other.down;
  }

  private setDirection(value: boolean, direction: Direction): void {
    switch (direction) {
      case Direction.LEFT:
        this.left = value;
        break;
      case Direction.RIGHT:
        this.right = value;
        break;
      case Direction.UP:
        this.up = value;
        break;
      case Direction.DOWN:
        this.down = value;
        break;
      default:
        break;
    }
  }

  /**
   * Returns the state for a {@link Direction}.
   *
   * @param direction the {@link Direction}
   * @returns the state
   */
  get(direction: Direction): boolean {
    switch (direction) {
      case Direction.LEFT:
        return this.left;
      case Direction.RIGHT:
        return this.right;
      case Direction.UP:
        return this.up;
      case Direction.DOWN:
        return this.down;
      default:
        return false;
    }
  }
}
