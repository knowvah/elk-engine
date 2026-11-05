// SPDX-License-Identifier: EPL-2.0
import type { ConstraintRow } from './ComponentGroupSides.js';

/**
 * The `static { MODEL_ORDER_CONSTRAINTS.put(...) }` block of `ModelOrderComponentGroup`, in Java order; the `//` rows are
 * commented out in the Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:56
 */
export const MODEL_ORDER_CONSTRAINT_ROWS: readonly ConstraintRow[] = [
  // Key is inserted in component group with value
  // E.g. NORTH can not be put in the same component group as NONE since it would be placed above NONE, which
  // is against the model order.
  ['NORTH', 'NONE'],
  ['WEST', 'NONE'],
  ['NORTH_EAST', 'NONE'],
  ['NORTH_WEST', 'NONE'],
  ['NORTH_SOUTH_WEST', 'NONE'],
  ['NORTH_EAST_WEST', 'NONE'],

  ['NORTH_WEST', 'NORTH'],

  ['NONE', 'EAST'],
  ['NORTH', 'EAST'],
  ['WEST', 'EAST'],
  ['NORTH_EAST', 'EAST'],
  ['NORTH_SOUTH', 'EAST'],
  ['NORTH_WEST', 'EAST'],
  ['NORTH_SOUTH_WEST', 'EAST'],
  ['NORTH_EAST_WEST', 'EAST'],
  ['EAST_WEST', 'EAST'], // XXX

  ['NONE', 'SOUTH'],
  ['NORTH', 'SOUTH'],
  ['EAST', 'SOUTH'],
  ['WEST', 'SOUTH'],
  ['NORTH_EAST', 'SOUTH'],
  ['NORTH_SOUTH', 'SOUTH'],
  ['NORTH_WEST', 'SOUTH'],
  ['EAST_WEST', 'SOUTH'],
  ['SOUTH_WEST', 'SOUTH'],
  ['NORTH_SOUTH_WEST', 'SOUTH'],
  ['NORTH_EAST_SOUTH', 'SOUTH'],
  ['NORTH_EAST_WEST', 'SOUTH'],

  ['NORTH', 'WEST'],
  ['NORTH_EAST', 'WEST'],
  ['NORTH_WEST', 'WEST'],
  ['NORTH_EAST_WEST', 'WEST'],

  ['NORTH', 'NORTH_EAST'],
  ['WEST', 'NORTH_EAST'],
  ['NORTH_WEST', 'NORTH_EAST'],
  ['NORTH_EAST', 'NORTH_EAST'],
  ['NORTH_SOUTH_WEST', 'NORTH_EAST'],

  // NW has nothing since it is in the first slot

  // Only conflicts since it is in the last slot
  ['NONE', 'EAST_SOUTH'],
  ['NORTH', 'EAST_SOUTH'],
  ['EAST', 'EAST_SOUTH'],
  ['SOUTH', 'EAST_SOUTH'],
  ['WEST', 'EAST_SOUTH'],
  ['NORTH_EAST', 'EAST_SOUTH'],
  ['NORTH_SOUTH', 'EAST_SOUTH'],
  ['NORTH_WEST', 'EAST_SOUTH'],
  ['SOUTH_WEST', 'EAST_SOUTH'],
  // ['EAST_SOUTH', 'EAST_SOUTH'],
  ['EAST_WEST', 'EAST_SOUTH'],
  ['NORTH_EAST_WEST', 'EAST_SOUTH'],
  // ['NORTH_EAST_SOUTH', 'EAST_SOUTH'],
  ['NORTH_SOUTH_WEST', 'EAST_SOUTH'],
  // ['EAST_SOUTH_WEST', 'EAST_SOUTH'],
  ['NORTH_EAST_SOUTH_WEST', 'EAST_SOUTH'],

  ['NONE', 'SOUTH_WEST'],
  ['NORTH', 'SOUTH_WEST'],
  ['EAST', 'SOUTH_WEST'],
  ['WEST', 'SOUTH_WEST'],
  ['NORTH_EAST', 'SOUTH_WEST'],
  ['NORTH_SOUTH', 'SOUTH_WEST'],
  ['NORTH_WEST', 'SOUTH_WEST'],
  ['EAST_WEST', 'SOUTH_WEST'],
  ['NORTH_EAST_WEST', 'SOUTH_WEST'],
  ['NORTH_EAST_SOUTH', 'SOUTH_WEST'],
  ['NORTH_EAST_SOUTH_WEST', 'SOUTH_WEST'],

  ['NORTH', 'EAST_WEST'],
  ['WEST', 'EAST_WEST'],
  ['NORTH_EAST', 'EAST_WEST'],
  ['NORTH_WEST', 'EAST_WEST'],
  ['SOUTH_WEST', 'EAST_WEST'],
  ['NORTH_EAST_WEST', 'EAST_WEST'],
  ['NORTH_SOUTH_WEST', 'EAST_WEST'],

  // NEW no additional conflicts

  ['NONE', 'EAST_SOUTH_WEST'],
  ['NORTH', 'EAST_SOUTH_WEST'],
  ['EAST', 'EAST_SOUTH_WEST'],
  ['WEST', 'EAST_SOUTH_WEST'],
  ['NORTH_EAST', 'EAST_SOUTH_WEST'],
  ['NORTH_SOUTH', 'EAST_SOUTH_WEST'],
  ['NORTH_WEST', 'EAST_SOUTH_WEST'],
  ['EAST_WEST', 'EAST_SOUTH_WEST'],
  ['NORTH_EAST_WEST', 'EAST_SOUTH_WEST'],

  ['NORTH', 'NORTH_SOUTH_WEST'],
  ['EAST', 'NORTH_SOUTH_WEST'],
  ['SOUTH', 'NORTH_SOUTH_WEST'],
  ['NORTH_EAST', 'NORTH_SOUTH_WEST'],

  ['NONE', 'NORTH_EAST_SOUTH'],
  ['NORTH', 'NORTH_EAST_SOUTH'],
  ['SOUTH', 'NORTH_EAST_SOUTH'],
  ['WEST', 'NORTH_EAST_SOUTH'],
  ['NORTH_EAST', 'NORTH_EAST_SOUTH'],
  ['NORTH_SOUTH', 'NORTH_EAST_SOUTH'],
  ['NORTH_WEST', 'NORTH_EAST_SOUTH'],

  ['NORTH_WEST', 'NORTH_EAST_SOUTH_WEST'],
  ['NORTH_EAST', 'NORTH_EAST_SOUTH_WEST'],

  // Conflicts that seem solvable but that arise since the order of C, EW, W, E is fix
  // EW is before C and W and E
  ['EAST_WEST', 'NONE'],
  ['EAST_WEST', 'WEST'],
  ['EAST_WEST', 'EAST'],

  // Conflicts that seem solvable but that arise since the order of C, NS, N, S is fix
  ['NORTH_SOUTH', 'NONE'],
  ['NORTH_SOUTH', 'NORTH'],
  ['NORTH_SOUTH', 'SOUTH'],
];
