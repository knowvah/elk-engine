// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';

/**
 * The operations a direction change performs, implemented by the {@link OneDimensionalCompactor}
 * facade (its private methods in Java).
 */
export interface DirectionChangeOperations {
  mirrorHitboxes(): void;
  transposeHitboxes(): void;
  calculateConstraints(): void;
  reverseConstraints(): void;
}

/**
 * Section of {@link OneDimensionalCompactor} (P1): the nested switch of `changeDirection`, one function
 * per outer `case` (the old direction), in Java order. Sections never import the facade.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/OneDimensionalCompactor.java
 */

function fromUndefined(dir: Direction, ops: DirectionChangeOperations): void {
  switch (dir) {
    case Direction.LEFT:
      ops.calculateConstraints();
      break;

    case Direction.RIGHT:
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.UP:
      ops.transposeHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.DOWN:
      ops.transposeHitboxes();
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    default:
      break;
  }
}

function fromLeft(dir: Direction, ops: DirectionChangeOperations): void {
  switch (dir) {
    case Direction.RIGHT:
      ops.mirrorHitboxes();
      ops.reverseConstraints();
      break;

    case Direction.UP:
      ops.transposeHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.DOWN:
      ops.transposeHitboxes();
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    default:
      break;
  }
}

function fromRight(dir: Direction, ops: DirectionChangeOperations): void {
  switch (dir) {
    case Direction.LEFT:
      ops.mirrorHitboxes();
      ops.reverseConstraints();
      break;

    case Direction.UP:
      ops.mirrorHitboxes();
      ops.transposeHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.DOWN:
      ops.mirrorHitboxes();
      ops.transposeHitboxes();
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    default:
      break;
  }
}

function fromUp(dir: Direction, ops: DirectionChangeOperations): void {
  switch (dir) {
    case Direction.LEFT:
      ops.transposeHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.RIGHT:
      ops.transposeHitboxes();
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.DOWN:
      ops.mirrorHitboxes();
      ops.reverseConstraints();
      break;

    default:
      break;
  }
}

function fromDown(dir: Direction, ops: DirectionChangeOperations): void {
  switch (dir) {
    case Direction.LEFT:
      ops.mirrorHitboxes();
      ops.transposeHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.RIGHT:
      ops.mirrorHitboxes();
      ops.transposeHitboxes();
      ops.mirrorHitboxes();
      ops.calculateConstraints();
      break;

    case Direction.UP:
      ops.mirrorHitboxes();
      ops.reverseConstraints();
      break;

    default:
      break;
  }
}

/**
 * Executes the required transformations and calculates constraints. If the graph is compacted in
 * opposing directions the constraints are reversed instead of being recalculated and CNodes are locked.
 *
 * @param oldDirection the direction before the change
 * @param dir the new direction
 * @param ops the operations to run
 */
export function transformForDirectionChange(
  oldDirection: Direction,
  dir: Direction,
  ops: DirectionChangeOperations,
): void {
  switch (oldDirection) {
    case Direction.UNDEFINED:
      fromUndefined(dir, ops);
      break;

    case Direction.LEFT:
      fromLeft(dir, ops);
      break;

    case Direction.RIGHT:
      fromRight(dir, ops);
      break;

    case Direction.UP:
      fromUp(dir, ops);
      break;

    case Direction.DOWN:
      fromDown(dir, ops);
      break;

    default:
      break;
  }
}
